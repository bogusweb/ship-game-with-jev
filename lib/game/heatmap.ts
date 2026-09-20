import { BOARD_SIZE, FLEET_LENGTHS } from "./constants";
import { cellLabel, getShipCells, isInBounds } from "./coords";
import type { Coord, OpponentView } from "./types";

export type HuntMode = "HUNT" | "TARGET";
export type KnownAxis = "horizontal" | "vertical";

export type ShotCellScore = {
  cell: Coord;
  label: string;
  heat: number;
  mode: HuntMode;
  parity: boolean;
  rank: number;
  reason: string;
};

/** A collinear cluster of unresolved hits with a known ship axis. */
export type AxisLock = {
  axis: KnownAxis;
  hits: Coord[];
  /** Unknown cells on the line: the two ends plus any gaps. */
  extend: Coord[];
  /** Perpendicular unknown neighbors — still unknown on the board, not offered. */
  flanks: Coord[];
};

const ORTHO: Coord[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

/** Remaining unsunk lengths from the canonical fleet minus sunk lengths (multiset). */
export function remainingFleetFromSunk(sunkLengths: number[]): number[] {
  const remaining: number[] = [...FLEET_LENGTHS];
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

function coordKey(cell: Coord): string {
  return `${cell.row},${cell.col}`;
}

function uniqueCoords(cells: Coord[]): Coord[] {
  const seen = new Set<string>();
  const out: Coord[] = [];
  for (const cell of cells) {
    const key = coordKey(cell);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cell);
  }
  return out;
}

function unknownAt(view: OpponentView, row: number, col: number): boolean {
  return isInBounds(row, col) && view.cells[row][col] === "unknown";
}

/**
 * 2+ unresolved hits on the same row or column lock that axis.
 * Ships cannot bend, so perpendicular flanks cannot be ship.
 */
export function knownAxisLocks(view: OpponentView): AxisLock[] {
  const hits = unresolvedHits(view);
  const locks: AxisLock[] = [];

  const byRow = new Map<number, Coord[]>();
  const byCol = new Map<number, Coord[]>();
  for (const hit of hits) {
    const rowGroup = byRow.get(hit.row) ?? [];
    rowGroup.push(hit);
    byRow.set(hit.row, rowGroup);
    const colGroup = byCol.get(hit.col) ?? [];
    colGroup.push(hit);
    byCol.set(hit.col, colGroup);
  }

  for (const [row, group] of byRow) {
    if (group.length < 2) continue;
    const cols = group.map((h) => h.col).sort((a, b) => a - b);
    const minC = cols[0]!;
    const maxC = cols[cols.length - 1]!;
    const extend: Coord[] = [];
    for (const col of [minC - 1, maxC + 1]) {
      if (unknownAt(view, row, col)) extend.push({ row, col });
    }
    for (let col = minC + 1; col < maxC; col++) {
      if (unknownAt(view, row, col)) extend.push({ row, col });
    }
    const flanks: Coord[] = [];
    for (const hit of group) {
      for (const dr of [-1, 1]) {
        const r = hit.row + dr;
        if (unknownAt(view, r, hit.col)) flanks.push({ row: r, col: hit.col });
      }
    }
    locks.push({
      axis: "horizontal",
      hits: group,
      extend: uniqueCoords(extend),
      flanks: uniqueCoords(flanks),
    });
  }

  for (const [col, group] of byCol) {
    if (group.length < 2) continue;
    const rows = group.map((h) => h.row).sort((a, b) => a - b);
    const minR = rows[0]!;
    const maxR = rows[rows.length - 1]!;
    const extend: Coord[] = [];
    for (const row of [minR - 1, maxR + 1]) {
      if (unknownAt(view, row, col)) extend.push({ row, col });
    }
    for (let row = minR + 1; row < maxR; row++) {
      if (unknownAt(view, row, col)) extend.push({ row, col });
    }
    const flanks: Coord[] = [];
    for (const hit of group) {
      for (const dc of [-1, 1]) {
        const c = hit.col + dc;
        if (unknownAt(view, hit.row, c)) flanks.push({ row: hit.row, col: c });
      }
    }
    locks.push({
      axis: "vertical",
      hits: group,
      extend: uniqueCoords(extend),
      flanks: uniqueCoords(flanks),
    });
  }

  return locks;
}

export function describeAxisLock(view: OpponentView): {
  axisLine: string;
  extendLine: string;
} {
  const locks = knownAxisLocks(view);
  if (locks.length === 0) {
    return {
      axisLine: "Known axis: none",
      extendLine: "Legal extend cells: none",
    };
  }
  const axes = [...new Set(locks.map((lock) => lock.axis))];
  const extend = uniqueCoords(locks.flatMap((lock) => lock.extend)).map((cell) =>
    cellLabel(cell.row, cell.col),
  );
  return {
    axisLine: `Known axis: ${axes.join(", ")}`,
    extendLine: `Legal extend cells: ${extend.length > 0 ? extend.join(", ") : "none"}`,
  };
}

/**
 * Cells offered in the fire Choice. When an axis is known, flanks stay
 * unknown on the board but are not in `criteria`. Isolated single-hit
 * neighbors remain offered. Hunt (no lock) still offers every legal move.
 */
export function offeredFireCells(
  view: OpponentView,
  legalMoves: Coord[],
): Coord[] {
  const legalKeys = new Set(legalMoves.map(coordKey));
  const isLegal = (cell: Coord) => legalKeys.has(coordKey(cell));
  const locks = knownAxisLocks(view);
  if (locks.length === 0) return legalMoves;

  const flankKeys = new Set(
    locks.flatMap((lock) => lock.flanks.map(coordKey)),
  );
  const extend = uniqueCoords(locks.flatMap((lock) => lock.extend)).filter(
    isLegal,
  );

  const lockedHitKeys = new Set(
    locks.flatMap((lock) => lock.hits.map(coordKey)),
  );
  const isolatedNeighbors: Coord[] = [];
  for (const hit of unresolvedHits(view)) {
    if (lockedHitKeys.has(coordKey(hit))) continue;
    for (const { row: dr, col: dc } of ORTHO) {
      const row = hit.row + dr;
      const col = hit.col + dc;
      const cell = { row, col };
      if (!unknownAt(view, row, col) || !isLegal(cell)) continue;
      if (flankKeys.has(coordKey(cell))) continue;
      isolatedNeighbors.push(cell);
    }
  }

  const offered = uniqueCoords([...extend, ...isolatedNeighbors]);
  if (offered.length > 0) return offered;
  return legalMoves.filter((cell) => !flankKeys.has(coordKey(cell)));
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
