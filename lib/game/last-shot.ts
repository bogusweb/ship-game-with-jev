import type { Coord } from "./types";

export type LastShotBy = "player" | "jev";

export function isLastShotCell(
  row: number,
  col: number,
  last: Coord | null | undefined,
): boolean {
  return last != null && last.row === row && last.col === col;
}

export function lastShotAriaSuffix(
  lastShotBy: LastShotBy | null | undefined,
): string {
  if (lastShotBy === "player") return ", last shot by you";
  if (lastShotBy === "jev") return ", last shot by Jev";
  return "";
}
