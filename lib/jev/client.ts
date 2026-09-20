import type { JournalEntry } from "@/lib/game/journal";
import type { JevShotResponse } from "./types";

export type {
  JevShotRequest,
  JevShotResponse,
  PlayerNextShotResponse,
  PlayerShotPrediction,
} from "./types";

export function toJournalEntry(
  move: number,
  response: JevShotResponse,
): JournalEntry {
  return {
    move,
    ms: response.ms,
    chosen: response.chosen,
    label: response.label,
    probabilities: response.probabilities,
    chosenPercent: response.chosenPercent,
    confidence: response.confidence,
    source: response.source,
  };
}
