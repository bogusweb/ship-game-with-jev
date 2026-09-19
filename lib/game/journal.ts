import { cellLabel } from "./coords";
import type { Coord } from "./types";

export type JournalEntry = {
  move: number;
  ms: number;
  chosen: Coord;
  label: string;
  probabilities: { cell: Coord; label: string; percent: number }[];
  confidence: number;
};

export function buildMockJournalEntry(
  move: number,
  chosen: Coord,
  legalMoves: Coord[],
  ms = 320,
): JournalEntry {
  const weights = legalMoves.map(() => Math.random() + 0.1);
  const total = weights.reduce((a, b) => a + b, 0);
  const probabilities = legalMoves
    .map((cell, i) => ({
      cell,
      label: cellLabel(cell.row, cell.col),
      percent: (weights[i] / total) * 100,
    }))
    .sort((a, b) => b.percent - a.percent);

  const chosenProb =
    probabilities.find(
      (p) => p.cell.row === chosen.row && p.cell.col === chosen.col,
    )?.percent ?? 0;

  return {
    move,
    ms,
    chosen,
    label: cellLabel(chosen.row, chosen.col),
    probabilities: probabilities.slice(0, 8),
    confidence: Math.min(0.99, chosenProb / 100 + 0.1),
  };
}
