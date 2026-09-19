import { BOARD_SIZE, FLEET_LENGTHS } from "./constants";
import { cellLabel, getShipCells, isInBounds } from "./coords";
import type { Coord, OpponentView } from "./types";

export type HuntMode = "HUNT" | "TARGET";

export type ShotCellScore = {
  cell: Coord;
  label: string;
  heat: number;
  mode: HuntMode;
  parity: boolean;
  rank: number;
  reason: string;
};

const ORTHO: Coord[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

/** Remaining unsunk lengths from the canonical fleet minus sunk lengths (multiset). */
export function remainingFleetFromSunk(sunkLengths: number[]): number[] {
  const remaining = [...FLEET_LENGTHS];
  for (const len of sunkLengths) {
    const idx = remaining.indexOf(len);
    if (idx >= 0) remaining.splice(idx, 1);
  }
  return remaining;
}

/**
 * Hits that still have an orthogonal unknown neighbor.
 * Sunk ships keep `hit` cells, but their 8-neighborhood is halo, so they drop out.
 */
export function unresolvedHits(view: OpponentView): Coord[] {
  const hits: Coord[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (view.cells[row][col] !== "hit") continue;
      const open = ORTHO.some(({ row: dr, col: dc }) => {
        const r = row + dr;
        const c = col + dc;
        return isInBounds(r, c) && view.cells[r][c] === "unknown";
      });
      if (open) hits.push({ row, col });
    }
  }
  return hits;
}

function placementFits(
  view: OpponentView,
  origin: Coord,
  length: number,
  orientation: "horizontal" | "vertical",
): boolean {
  const cells = getShipCells(origin, length, orientation);
  for (const cell of cells) {
    if (!isInBounds(cell.row, cell.col)) return false;
    const state = view.cells[cell.row][cell.col];
    if (state === "miss" || state === "halo") return false;
  }
  return true;
}

/** How many remaining-fleet placements cover each unknown cell. */
export function placementOccupancy(view: OpponentView): number[][] {
  const heat = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0),
  );
  const lengths = remainingFleetFromSunk(view.sunkShipLengths);
  const fleet = lengths.length > 0 ? lengths : [...FLEET_LENGTHS];
  const hits = unresolvedHits(view);

  for (const length of fleet) {
    for (const orientation of ["horizontal", "vertical"] as const) {
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (!placementFits(view, { row, col }, length, orientation)) {
            continue;
          }
          const cells = getShipCells({ row, col }, length, orientation);
          const coversHit =
            hits.length > 0 &&
            cells.some((c) =>
              hits.some((h) => h.row === c.row && h.col === c.col),
            );
          const weight = hits.length > 0 ? (coversHit ? 8 : 1) : 1;
          for (const cell of cells) {
            if (view.cells[cell.row][cell.col] === "unknown") {
              heat[cell.row][cell.col] += weight;
            }
          }
        }
      }
    }
  }
  return heat;
}

function lineExtendReason(cell: Coord, hits: Coord[]): string | null {
  const rowHits = hits
    .filter((h) => h.row === cell.row)
    .sort((a, b) => a.col - b.col);
  if (rowHits.length >= 2) {
    const minC = rowHits[0]!.col;
    const maxC = rowHits[rowHits.length - 1]!.col;
    if (cell.col === minC - 1 || cell.col === maxC + 1) return "line-extend";
  }
  const colHits = hits
    .filter((h) => h.col === cell.col)
    .sort((a, b) => a.row - b.row);
  if (colHits.length >= 2) {
    const minR = colHits[0]!.row;
    const maxR = colHits[colHits.length - 1]!.row;
    if (cell.row === minR - 1 || cell.row === maxR + 1) return "line-extend";
  }
  return null;
}

function adjacentHit(cell: Coord, hits: Coord[]): boolean {
  return hits.some(
    (h) => Math.abs(h.row - cell.row) + Math.abs(h.col - cell.col) === 1,
  );
}

export function scoreLegalShots(
  view: OpponentView,
  legalMoves: Coord[],
): ShotCellScore[] {
  const occupancy = placementOccupancy(view);
  const hits = unresolvedHits(view);
  const mode: HuntMode = hits.length > 0 ? "TARGET" : "HUNT";
  const remaining = remainingFleetFromSunk(view.sunkShipLengths);
  const smallest = remaining.length > 0 ? Math.min(...remaining) : 1;

  const scored = legalMoves.map((cell) => {
    let heat = occupancy[cell.row]?.[cell.col] ?? 0;
    const parity = smallest < 2 ? true : (cell.row + cell.col) % 2 === 0;
    let reason = "density";
    if (mode === "TARGET") {
      const extend = lineExtendReason(cell, hits);
      if (extend) {
        heat += 40;
        reason = extend;
      } else if (adjacentHit(cell, hits)) {
        heat += 24;
        reason = "adjacent-hit";
      } else {
        reason = "hunt-density";
      }
    } else if (smallest >= 2 && parity) {
      heat += Math.max(2, Math.round(heat * 0.35));
      reason = "parity";
    } else if (smallest >= 2) {
      reason = "off-parity";
    }
    return {
      cell,
      label: cellLabel(cell.row, cell.col),
      heat,
      mode,
      parity,
      rank: 0,
      reason,
    };
  });

  scored.sort((a, b) => {
    if (b.heat !== a.heat) return b.heat - a.heat;
    if (a.parity !== b.parity) return a.parity ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
  return scored.map((score, index) => ({ ...score, rank: index + 1 }));
}

export function describeShotCriterion(score: ShotCellScore): string {
  const text = `${score.mode} ${score.parity ? "parity" : "off-parity"} heat=${score.heat} rank=${score.rank} ${score.reason}. Fire at ${score.label}.`;
  return text.length > 255 ? text.slice(0, 255) : text;
}
