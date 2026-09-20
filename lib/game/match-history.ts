import type { JournalEntry } from "./journal";
import type { ShotResult } from "./types";

export type HistoryOutcome = "HIT" | "MISS" | "SUNK";

export type MatchHistoryActor = "you" | "jev";

export type MatchHistoryItem = {
  id: string;
  actor: MatchHistoryActor;
  label: string;
  outcome: HistoryOutcome;
  journal?: JournalEntry;
};

export function shotOutcomeToHistory(
  outcome: ShotResult["outcome"] | HistoryOutcome,
): HistoryOutcome {
  if (outcome === "hit" || outcome === "HIT") return "HIT";
  if (outcome === "sunk" || outcome === "SUNK") return "SUNK";
  return "MISS";
}

/** Chronological log → display order with the newest shot first (left). */
export function newestFirst<T>(items: readonly T[]): T[] {
  return [...items].reverse();
}

export function makeYouHistoryItem(options: {
  index: number;
  label: string;
  outcome: ShotResult["outcome"] | HistoryOutcome;
}): MatchHistoryItem {
  return {
    id: `you-${options.index}-${options.label}`,
    actor: "you",
    label: options.label,
    outcome: shotOutcomeToHistory(options.outcome),
  };
}

export function makeJevHistoryItem(options: {
  journal: JournalEntry;
  outcome: ShotResult["outcome"] | HistoryOutcome;
}): MatchHistoryItem {
  return {
    id: `jev-${options.journal.move}-${options.journal.label}`,
    actor: "jev",
    label: options.journal.label,
    outcome: shotOutcomeToHistory(options.outcome),
    journal: options.journal,
  };
}
