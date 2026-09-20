import type { Coord, OpponentView } from "@/lib/game/types";
import type { ShotPreference } from "@/lib/game/journal";
import type { PlayerShotHistoryBundle } from "@/lib/game/player-shot-history";

export type JevShotRequest = {
  move: number;
  legalMoves: Coord[];
  playerView: OpponentView;
  playerShotHistory?: PlayerShotHistoryBundle;
  playerLegalTargets?: Coord[];
};

export type PlayerShotPrediction = {
  chosen: Coord;
  label: string;
  chosenPercent: number;
  source: "jev";
};

export type JevShotResponse = {
  chosen: Coord;
  label: string;
  probabilities: ShotPreference[];
  chosenPercent: number;
  /** TypeSafe model confidence 0–1 when the API provided it. Not a cell probability. */
  confidence?: number;
  ms: number;
  source: "jev" | "fallback";
  prediction?: PlayerShotPrediction | null;
  predictionError?: string | null;
};

export type PlayerNextShotResponse = {
  prediction: PlayerShotPrediction | null;
  predictionError?: string | null;
};
