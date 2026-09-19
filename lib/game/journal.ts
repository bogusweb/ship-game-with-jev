import { cellLabel } from "./coords";
import type { Coord } from "./types";

export type ShotPreference = {
  cell: Coord;
  label: string;
  percent: number;
};

export type JournalEntry = {
  move: number;
  ms: number;
  chosen: Coord;
  label: string;
  probabilities: ShotPreference[];
  /** Shot probability of the chosen cell, 0–100. Same number as that cell’s bar. */
  chosenPercent: number;
  /**
   * Optional TypeSafe model confidence, 0–1.
   * Distinct from per-cell shot probability — never display this as the chosen cell’s %.
   */
  confidence?: number;
  source?: "jev" | "fallback";
};

export function coordEquals(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

/** TypeSafe may send 0–1 fractions or 0–100 percents. */
export function asShotPercent(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  const percent = value <= 1 ? value * 100 : value;
  return Math.round(Math.min(100, percent) * 10) / 10;
}

export function chosenShotPercent(
  chosen: Coord,
  probabilities: ShotPreference[],
): number {
  return (
    probabilities.find((p) => coordEquals(p.cell, chosen))?.percent ?? 0
  );
}

export function rankShotPreferences(
  chosen: Coord,
  probabilities: ShotPreference[],
  limit = 8,
): ShotPreference[] {
  const sorted = [...probabilities].sort((a, b) => {
    const aChosen = coordEquals(a.cell, chosen);
    const bChosen = coordEquals(b.cell, chosen);
    if (aChosen !== bChosen) return aChosen ? -1 : 1;
    if (b.percent !== a.percent) return b.percent - a.percent;
    return a.label.localeCompare(b.label);
  });

  const top = sorted.slice(0, limit);
  const chosenPref = sorted.find((p) => coordEquals(p.cell, chosen));
  if (chosenPref && !top.some((p) => coordEquals(p.cell, chosen))) {
    top[top.length - 1] = chosenPref;
    return rankShotPreferences(chosen, top, limit);
  }
  return top;
}

export function buildMockJournalEntry(
  move: number,
  chosen: Coord,
  legalMoves: Coord[],
  ms = 320,
): JournalEntry {
  const weights = legalMoves.map(() => Math.random() + 0.1);
  const total = weights.reduce((a, b) => a + b, 0);
  const probabilities = rankShotPreferences(
    chosen,
    legalMoves.map((cell, i) => ({
      cell,
      label: cellLabel(cell.row, cell.col),
      percent: (weights[i] / total) * 100,
    })),
  );

  return {
    move,
    ms,
    chosen,
    label: cellLabel(chosen.row, chosen.col),
    probabilities,
    chosenPercent: chosenShotPercent(chosen, probabilities),
  };
}
