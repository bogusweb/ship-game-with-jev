import { cellLabel } from "@/lib/game/coords";
import type { Coord, OpponentView } from "@/lib/game/types";
import {
  asShotPercent,
  chosenShotPercent,
  rankShotPreferences,
  type JournalEntry,
  type ShotPreference,
} from "@/lib/game/journal";
import { formatBoardState } from "./tactics";

export const JEV_MODEL = "jev-latest";

export type JevShotRequest = {
  move: number;
  legalMoves: Coord[];
  playerView: OpponentView;
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
};

export type ChoiceAnswer = {
  choice: string;
  probabilities: Record<string, number>;
  confidence?: number;
};

export type SystemOneRequestBody = {
  model: string;
  state: string;
  questions: {
    shot: {
      type: "choice";
      instructions: string;
      criteria: Record<string, string>;
    };
  };
};

function coordToKey(cell: Coord): string {
  return cellLabel(cell.row, cell.col);
}

function keyToCoord(key: string): Coord {
  const col = key.charCodeAt(0) - 65;
  const row = parseInt(key.slice(1), 10) - 1;
  return { row, col };
}

export function asModelConfidence(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  const unit = value > 1 ? value / 100 : value;
  return Math.min(1, unit);
}

export function sampleChoice(
  probabilities: Record<string, number>,
  legalKeys: string[],
): string {
  const entries = legalKeys.map((k) => ({
    key: k,
    weight: Math.max(0, probabilities[k] ?? 0),
  }));
  const total = entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) {
    return legalKeys[Math.floor(Math.random() * legalKeys.length)]!;
  }
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.key;
  }
  return entries[entries.length - 1]!.key;
}

export function buildJevQuestions(legalMoves: Coord[]) {
  const criteria: Record<string, string> = {};
  for (const cell of legalMoves) {
    const key = coordToKey(cell);
    criteria[key] = `Fire at ${key}`;
  }
  return {
    shot: {
      type: "choice" as const,
      instructions:
        "Pick the best cell to fire at given the board state and tactics.",
      criteria,
    },
  };
}

export function buildSystemOneBody(request: JevShotRequest): SystemOneRequestBody {
  return {
    model: JEV_MODEL,
    state: buildStateFromView(request.playerView),
    questions: buildJevQuestions(request.legalMoves),
  };
}

function preferencesFromMap(
  legalKeys: string[],
  probabilities: Record<string, number>,
): ShotPreference[] {
  return legalKeys.map((k) => ({
    cell: keyToCoord(k),
    label: k,
    percent: asShotPercent(probabilities[k] ?? 0),
  }));
}

function finishResponse(
  chosenKey: string,
  preferences: ShotPreference[],
  startMs: number,
  source: JevShotResponse["source"],
  confidence?: number,
): JevShotResponse {
  const chosen = keyToCoord(chosenKey);
  const ranked = rankShotPreferences(chosen, preferences);
  return {
    chosen,
    label: chosenKey,
    probabilities: ranked,
    chosenPercent: chosenShotPercent(chosen, preferences),
    confidence,
    ms: Math.round(performance.now() - startMs),
    source,
  };
}

export function fallbackShot(
  request: JevShotRequest,
  startMs: number,
): JevShotResponse {
  const { legalMoves, playerView } = request;
  const hits: Coord[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (playerView.cells[r][c] === "hit") hits.push({ row: r, col: c });
    }
  }

  const weights = new Map<string, number>();
  for (const cell of legalMoves) {
    const key = coordToKey(cell);
    let w = 1;
    if (hits.length > 0) {
      for (const h of hits) {
        const dist = Math.abs(h.row - cell.row) + Math.abs(h.col - cell.col);
        if (dist === 1) w += 4;
        if (dist === 2) w += 1;
      }
    } else {
      if ((cell.row + cell.col) % 2 === 0) w += 1.5;
      const center = Math.abs(cell.row - 4.5) + Math.abs(cell.col - 4.5);
      w += Math.max(0, 6 - center) * 0.2;
    }
    weights.set(key, w);
  }

  const legalKeys = legalMoves.map(coordToKey);
  const probMap: Record<string, number> = {};
  const total = legalKeys.reduce((s, k) => s + (weights.get(k) ?? 1), 0);
  for (const k of legalKeys) {
    probMap[k] = ((weights.get(k) ?? 1) / total) * 100;
  }

  const chosenKey = sampleChoice(probMap, legalKeys);
  return finishResponse(
    chosenKey,
    preferencesFromMap(legalKeys, probMap),
    startMs,
    "fallback",
  );
}

export function parseJevResponse(
  request: JevShotRequest,
  answer: ChoiceAnswer,
  startMs: number,
): JevShotResponse {
  const legalKeys = request.legalMoves.map(coordToKey);
  const chosenKey = legalKeys.includes(answer.choice)
    ? answer.choice
    : sampleChoice(answer.probabilities, legalKeys);

  return finishResponse(
    chosenKey,
    preferencesFromMap(legalKeys, answer.probabilities),
    startMs,
    "jev",
    asModelConfidence(answer.confidence),
  );
}

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

export function buildStateFromView(playerView: OpponentView): string {
  const grid = playerView.cells.map((row) => row.map((c) => c as string));
  return formatBoardState(grid, playerView.sunkShipLengths);
}

export async function callTypeSafeJev(
  apiKey: string,
  request: JevShotRequest,
): Promise<ChoiceAnswer> {
  const body = buildSystemOneBody(request);

  const res = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Jev API error: ${res.status}${detail ? ` ${detail.slice(0, 240)}` : ""}`,
    );
  }

  const data = (await res.json()) as {
    answers: { shot: ChoiceAnswer };
  };
  return data.answers.shot;
}

export async function chooseJevShot(
  apiKey: string | undefined,
  request: JevShotRequest,
): Promise<JevShotResponse> {
  const start = performance.now();
  if (!apiKey) {
    return fallbackShot(request, start);
  }
  try {
    const answer = await callTypeSafeJev(apiKey, request);
    return parseJevResponse(request, answer, start);
  } catch {
    return fallbackShot(request, start);
  }
}
