import { BOARD_SIZE } from "./constants";
import type { Coord, Orientation } from "./types";

export function coordKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function parseCoordKey(key: string): Coord {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function getShipCells(
  origin: Coord,
  length: number,
  orientation: Orientation,
): Coord[] {
  const cells: Coord[] = [];
  for (let i = 0; i < length; i++) {
    const row = orientation === "vertical" ? origin.row + i : origin.row;
    const col = orientation === "horizontal" ? origin.col + i : origin.col;
    cells.push({ row, col });
  }
  return cells;
}

/** 8-neighborhood offsets including diagonals */
const NEIGHBOR_OFFSETS: Coord[] = [
  { row: -1, col: -1 },
  { row: -1, col: 0 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
];

export function getNeighbors(row: number, col: number): Coord[] {
  return NEIGHBOR_OFFSETS
    .map(({ row: dr, col: dc }) => ({ row: row + dr, col: col + dc }))
    .filter(({ row, col }) => isInBounds(row, col));
}

export function cellLabel(row: number, col: number): string {
  const colLetter = String.fromCharCode(65 + col);
  return `${colLetter}${row + 1}`;
}
