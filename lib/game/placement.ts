import { BOARD_SIZE, FLEET_LENGTHS } from "./constants";
import { coordKey, getNeighbors, getShipCells, isInBounds } from "./coords";
import type { Coord, Orientation, PlayerBoard, Ship, ShipPlacement } from "./types";

export function createEmptyBoard(): PlayerBoard {
  return { ships: [] };
}

export function occupiedCells(board: PlayerBoard): Set<string> {
  const set = new Set<string>();
  for (const ship of board.ships) {
    for (const cell of ship.cells) {
      set.add(coordKey(cell.row, cell.col));
    }
  }
  return set;
}

export function forbiddenPlacementCells(board: PlayerBoard): Set<string> {
  const occupied = occupiedCells(board);
  const forbidden = new Set<string>(occupied);

  for (const key of occupied) {
    const [row, col] = key.split(",").map(Number);
    for (const neighbor of getNeighbors(row, col)) {
      forbidden.add(coordKey(neighbor.row, neighbor.col));
    }
  }

  return forbidden;
}

export function validatePlacement(
  board: PlayerBoard,
  placement: ShipPlacement,
): string | null {
  const cells = getShipCells(
    placement.origin,
    placement.length,
    placement.orientation,
  );

  for (const { row, col } of cells) {
    if (!isInBounds(row, col)) {
      return "Ship is out of bounds";
    }
  }

  const forbidden = forbiddenPlacementCells(board);
  for (const { row, col } of cells) {
    if (forbidden.has(coordKey(row, col))) {
      return "Ships cannot touch, including diagonally";
    }
  }

  return null;
}

export function placeShip(
  board: PlayerBoard,
  placement: ShipPlacement,
): PlayerBoard {
  const error = validatePlacement(board, placement);
  if (error) {
    throw new Error(error);
  }

  const cells = getShipCells(
    placement.origin,
    placement.length,
    placement.orientation,
  );

  const ship: Ship = {
    ...placement,
    cells,
    hits: [],
    sunk: false,
  };

  return {
    ships: [...board.ships, ship],
  };
}

export function allFleetPlaced(board: PlayerBoard): boolean {
  return board.ships.length === FLEET_LENGTHS.length;
}

export function remainingFleetLengths(board: PlayerBoard): number[] {
  const placed = board.ships.map((s) => s.length);
  const remaining = [...FLEET_LENGTHS];
  for (const length of placed) {
    const idx = remaining.indexOf(length);
    if (idx >= 0) {
      remaining.splice(idx, 1);
    }
  }
  return remaining;
}

export function nextShipLength(board: PlayerBoard): number | null {
  const remaining = remainingFleetLengths(board);
  return remaining[0] ?? null;
}

export function listValidPlacements(
  board: PlayerBoard,
  length: number,
): ShipPlacement[] {
  const placements: ShipPlacement[] = [];
  let idCounter = board.ships.length;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (const orientation of ["horizontal", "vertical"] as Orientation[]) {
        const placement: ShipPlacement = {
          id: `ship-${idCounter}`,
          length,
          orientation,
          origin: { row, col },
        };
        if (!validatePlacement(board, placement)) {
          placements.push(placement);
        }
      }
    }
  }

  return placements;
}

/** Random valid fleet placement for Jev */
export function randomFleetPlacement(
  lengths: readonly number[] = FLEET_LENGTHS,
): PlayerBoard {
  let board = createEmptyBoard();

  for (const length of lengths) {
    const options = listValidPlacements(board, length);
    if (options.length === 0) {
      throw new Error(`No valid placement for ship length ${length}`);
    }
    const pick = options[Math.floor(Math.random() * options.length)];
    board = placeShip(board, { ...pick, id: `jev-${board.ships.length}` });
  }

  return board;
}

export function placementHeatMap(board: PlayerBoard, length: number): boolean[][] {
  const heat = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => false),
  );

  for (const placement of listValidPlacements(board, length)) {
    for (const cell of getShipCells(
      placement.origin,
      placement.length,
      placement.orientation,
    )) {
      heat[cell.row][cell.col] = true;
    }
  }

  return heat;
}

export function shipAtCell(
  board: PlayerBoard,
  row: number,
  col: number,
): Ship | undefined {
  return board.ships.find((ship) =>
    ship.cells.some((c) => c.row === row && c.col === col),
  );
}
