import { cellLabel, isInBounds } from "@/lib/game/coords";
import {
  describeAxisLock,
  remainingFleetFromSunk,
} from "@/lib/game/heatmap";
import type { OpponentView, ShotCellState } from "@/lib/game/types";

export const JEV_TACTICS = `
You are Jev playing Battleship on a 10×10 grid (rows 1-10, columns A-J).
Fleet: 4, 3, 3, 2, 2, 2, 1, 1, 1, 1. Ships cannot touch, including diagonally.

Tactics:
1. HUNT mode (no unresolved hits): prefer checkerboard parity cells for the smallest remaining ship; use the placement heatmap; spread across quadrants. Never walk the grid in row-major or column-major order.
2. TARGET mode: ships are straight — they cannot bend. Fire orthogonally adjacent to a single unresolved hit. After two or more collinear unresolved hits the axis is known: fire only at the two line ends; never shoot flanks (perpendicular neighbors). Do not wander back to A1-style leftovers.
3. When a ship is sunk, its 8-neighborhood (including diagonals) is already miss/halo and is not a legal move.
4. Never repeat a cell that was already shot (miss, hit, or halo).
5. Prefer cells that reduce uncertainty; avoid random scatter when a clear line extension exists.
6. Code owns legalMoves and the placement heatmap. Choose among the offered scored cells; do not invent illegal squares.
`.trim();

export const SHOT_CHOICE_INSTRUCTIONS =
  "Hunt: checkerboard parity for the smallest remaining ship; prefer high placement-heatmap cells; spread across quadrants. Ships are straight — they cannot bend. Target: unresolved hits — fire orthogonal neighbors. After 2+ collinear hits the axis is known: fire only at the two line ends; never shoot flanks (perpendicular neighbors). After a sink the 8-neighborhood is already illegal. Never walk the grid in row or column order. Never pick the first leftover cell just because it is listed first. Code already filtered legalMoves; choose only among the offered cells.";

const ORTHO = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

function unresolvedHitLabels(cells: string[][]): string[] {
  const labels: string[] = [];
  for (let row = 0; row < cells.length; row++) {
    for (let col = 0; col < (cells[row]?.length ?? 0); col++) {
      if (cells[row]![col] !== "hit") continue;
      const open = ORTHO.some(({ row: dr, col: dc }) => {
        const r = row + dr;
        const c = col + dc;
        return isInBounds(r, c) && cells[r]?.[c] === "unknown";
      });
      if (open) labels.push(cellLabel(row, col));
    }
  }
  return labels;
}

export function formatBoardState(
  cells: string[][],
  sunkLengths: number[],
): string {
  const header = "   " + "ABCDEFGHIJ".split("").join(" ");
  const rows = cells.map((row, r) => {
    const label = String(r + 1).padStart(2, " ");
    const chars = row
      .map((c) => {
        if (c === "hit") return "X";
        if (c === "miss") return "o";
        if (c === "halo") return ".";
        return "?";
      })
      .join(" ");
    return `${label} ${chars}`;
  });
  const remaining = remainingFleetFromSunk(sunkLengths);
  const hits = unresolvedHitLabels(cells);
  const mode = hits.length > 0 ? "TARGET" : "HUNT";
  const view: OpponentView = {
    cells: cells.map((row) => row.map((c) => c as ShotCellState)),
    sunkShipLengths: sunkLengths,
  };
  const { axisLine, extendLine } = describeAxisLock(view);
  const sunk =
    sunkLengths.length > 0
      ? `Sunk enemy ships (lengths): ${sunkLengths.join(", ")}`
      : "No enemy ships sunk yet.";
  const remainingLine =
    remaining.length > 0
      ? `Remaining unsunk lengths: ${remaining.join(", ")}`
      : "No unsunk enemy ships remain.";
  const hitsLine =
    hits.length > 0
      ? `Unresolved hits: ${hits.join(", ")}`
      : "Unresolved hits: none";
  return `${JEV_TACTICS}\n\nMode: ${mode}\n${axisLine}\n${extendLine}\n${remainingLine}\n${hitsLine}\n${sunk}\n\nOpponent board (?=unknown, o=miss, X=hit, .=halo):\n${header}\n${rows.join("\n")}`;
}
