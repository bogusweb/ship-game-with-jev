import { FLEET_LENGTHS } from "./constants";
import { getShipCells } from "./coords";
import { createEmptyBoard, placeShip, validatePlacement } from "./placement";
import { placePlayerShip } from "./session";
import type { Coord, GameState, Orientation, PlayerBoard } from "./types";

/**
 * One roster slot on the setup screen. `index` is the slot in FLEET_LENGTHS, so
 * the fleet shape 4,3,3,2,2,2,1,1,1,1 is fixed and a slot can be repositioned
 * without disturbing the others.
 */
export type DraftShip = {
  index: number;
  length: number;
  origin: Coord;
  orientation: Orientation;
};

export function emptyDraft(): (DraftShip | null)[] {
  return FLEET_LENGTHS.map(() => null);
}

export function draftShips(draft: (DraftShip | null)[]): DraftShip[] {
  return draft.filter((entry): entry is DraftShip => entry !== null);
}

/** Board built from the placed slots, optionally excluding one slot. */
export function draftBoard(
  draft: (DraftShip | null)[],
  excludeIndex?: number,
): PlayerBoard {
  let board = createEmptyBoard();
  for (const ship of draftShips(draft)) {
    if (ship.index === excludeIndex) continue;
    board = placeShip(board, {
      id: `draft-${ship.index}`,
      length: ship.length,
      orientation: ship.orientation,
      origin: ship.origin,
    });
  }
  return board;
}

/**
 * Validates a candidate slot against the engine's own rules (bounds, overlap
 * and the no-touch rule including diagonals).
 */
export function draftPlacementError(
  draft: (DraftShip | null)[],
  candidate: DraftShip,
): string | null {
  return validatePlacement(draftBoard(draft, candidate.index), {
    id: `draft-${candidate.index}`,
    length: candidate.length,
    orientation: candidate.orientation,
    origin: candidate.origin,
  });
}

/** Roster slot occupying a cell, or null. Used to pick a ship up again. */
export function draftIndexAtCell(
  draft: (DraftShip | null)[],
  row: number,
  col: number,
): number | null {
  for (const ship of draftShips(draft)) {
    const cells = getShipCells(ship.origin, ship.length, ship.orientation);
    if (cells.some((cell) => cell.row === row && cell.col === col)) {
      return ship.index;
    }
  }
  return null;
}

/** First unfilled roster slot, or null when the fleet is complete. */
export function nextDraftIndex(draft: (DraftShip | null)[]): number | null {
  const index = draft.findIndex((entry) => entry === null);
  return index < 0 ? null : index;
}

export function draftComplete(draft: (DraftShip | null)[]): boolean {
  return draftShips(draft).length === FLEET_LENGTHS.length;
}

/** Fills the roster from a board produced by the engine's own placement. */
export function draftFromBoard(board: PlayerBoard): (DraftShip | null)[] {
  return board.ships.map((ship, index) => ({
    index,
    length: ship.length,
    origin: ship.origin,
    orientation: ship.orientation,
  }));
}

/**
 * Applies a complete roster through `placePlayerShip`, so the transition into
 * the playing phase runs the same validation as manual placement.
 */
export function gameFromDraft(
  state: GameState,
  draft: (DraftShip | null)[],
): GameState {
  if (!draftComplete(draft)) {
    throw new Error("All ships already placed");
  }
  let next = state;
  for (let index = 0; index < FLEET_LENGTHS.length; index++) {
    const ship = draft[index];
    if (!ship) throw new Error("All ships already placed");
    next = placePlayerShip(next, ship.origin, ship.orientation);
  }
  return next;
}

/** Ships to draw for the player's own board, with sunk/damaged state. */
export function ownBoardShips(board: PlayerBoard) {
  return board.ships.map((ship, index) => ({
    key: ship.id || `own-${index}`,
    row: ship.origin.row,
    col: ship.origin.col,
    length: ship.length,
    orientation: ship.orientation,
    damaged: ship.sunk,
  }));
}

/** Sunk opponent ships only — unsunk positions stay hidden. */
export function revealedOpponentShips(board: PlayerBoard) {
  return board.ships
    .filter((ship) => ship.sunk)
    .map((ship, index) => ({
      key: ship.id || `sunk-${index}`,
      row: ship.origin.row,
      col: ship.origin.col,
      length: ship.length,
      orientation: ship.orientation,
      damaged: true,
    }));
}
