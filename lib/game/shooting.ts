import { BOARD_SIZE } from "./constants";
import { coordKey, getNeighbors } from "./coords";
import { shipAtCell } from "./placement";
import type {
  Coord,
  OpponentView,
  PlayerBoard,
  ShotCellState,
  ShotResult,
} from "./types";

export function createOpponentView(): OpponentView {
  return {
    cells: Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => "unknown" as ShotCellState),
    ),
    sunkShipLengths: [],
  };
}

export function isShotCell(state: ShotCellState): boolean {
  return state === "miss" || state === "hit" || state === "halo";
}

export function legalMoves(view: OpponentView): Coord[] {
  const moves: Coord[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (view.cells[row][col] === "unknown") {
        moves.push({ row, col });
      }
    }
  }
  return moves;
}

function markHaloAroundShip(
  view: OpponentView,
  shipCells: Coord[],
): OpponentView {
  const cells = view.cells.map((row) => [...row]);
  const shipKeys = new Set(shipCells.map((c) => coordKey(c.row, c.col)));

  for (const cell of shipCells) {
    for (const neighbor of getNeighbors(cell.row, cell.col)) {
      const { row, col } = neighbor;
      if (shipKeys.has(coordKey(row, col))) continue;
      if (cells[row][col] === "unknown") {
        cells[row][col] = "halo";
      }
    }
  }

  return { ...view, cells };
}

export function fireAt(
  board: PlayerBoard,
  view: OpponentView,
  row: number,
  col: number,
): { board: PlayerBoard; view: OpponentView; result: ShotResult } {
  if (!legalMoves(view).some((m) => m.row === row && m.col === col)) {
    throw new Error("Cell is not a legal move");
  }

  const ship = shipAtCell(board, row, col);
  const cells = view.cells.map((r) => [...r]);

  if (!ship) {
    cells[row][col] = "miss";
    return {
      board,
      view: { ...view, cells },
      result: { row, col, outcome: "miss" },
    };
  }

  const updatedShips = board.ships.map((s) => {
    if (s.id !== ship.id) return s;
    const alreadyHit = s.hits.some((h) => h.row === row && h.col === col);
    const hits = alreadyHit ? s.hits : [...s.hits, { row, col }];
    const sunk = hits.length === s.length;
    return { ...s, hits, sunk };
  });

  const updatedBoard: PlayerBoard = { ships: updatedShips };
  const updatedShip = updatedShips.find((s) => s.id === ship.id)!;

  cells[row][col] = "hit";

  if (updatedShip.sunk) {
    const viewWithHalo = markHaloAroundShip(
      { ...view, cells },
      updatedShip.cells,
    );
    return {
      board: updatedBoard,
      view: {
        ...viewWithHalo,
        sunkShipLengths: [...view.sunkShipLengths, updatedShip.length],
      },
      result: {
        row,
        col,
        outcome: "sunk",
        shipId: updatedShip.id,
        shipLength: updatedShip.length,
      },
    };
  }

  return {
    board: updatedBoard,
    view: { ...view, cells },
    result: { row, col, outcome: "hit", shipId: ship.id, shipLength: ship.length },
  };
}

export function allShipsSunk(board: PlayerBoard): boolean {
  return board.ships.length > 0 && board.ships.every((s) => s.sunk);
}

/** Remaining afloat ship lengths from real board state, longest first. */
export function unsunkShipLengths(board: PlayerBoard): number[] {
  return board.ships
    .filter((ship) => !ship.sunk)
    .map((ship) => ship.length)
    .sort((a, b) => b - a);
}

export function shotHeatMap(view: OpponentView): boolean[][] {
  return view.cells.map((row) => row.map((cell) => cell === "unknown"));
}
