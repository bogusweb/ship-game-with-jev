import { BOARD_SIZE } from "./constants";
import type { Coord } from "./types";

export const ROVING_ARROWS: Record<string, Coord> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
};

/** Next enabled cell in a direction, or the starting cell if the edge is closed. */
export function moveRoving(
  from: Coord,
  delta: Coord,
  enabled: (row: number, col: number) => boolean,
  size = BOARD_SIZE,
): Coord {
  let row = from.row;
  let col = from.col;
  for (let step = 0; step < size; step++) {
    row += delta.row;
    col += delta.col;
    if (row < 0 || row >= size || col < 0 || col >= size) break;
    if (enabled(row, col)) return { row, col };
  }
  return from;
}

export function firstEnabledCell(
  enabled: (row: number, col: number) => boolean,
  size = BOARD_SIZE,
): Coord {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (enabled(row, col)) return { row, col };
    }
  }
  return { row: 0, col: 0 };
}
