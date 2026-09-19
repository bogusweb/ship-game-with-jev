import { cellLabel } from "@/lib/game/coords";
import type { Coord, OpponentView } from "@/lib/game/types";
import type { JournalEntry } from "@/lib/game/journal";
import { formatBoardState } from "./tactics";

export type JevShotRequest = {
  move: number;
  legalMoves: Coord[];
  playerView: OpponentView;
};

export type JevShotResponse = {
  chosen: Coord;
  label: string;
  probabilities: { cell: Coord; label: string; percent: number }[];
  confidence: number;
  ms: number;
  source: "jev" | "fallback";
};

type ChoiceAnswer = {
  choice: string;
  probabilities: Record<string, number>;
  confidence?: number;
};

function coordToKey(cell: Coord): string {
  return cellLabel(cell.row, cell.col);
}

function keyToCoord(key: string): Coord {
  const col = key.charCodeAt(0) - 65;
  const row = parseInt(key.slice(1), 10) - 1;
  return { row, col };
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
    return legalKeys[Math.floor(Math.random() * legalKeys.length)];
  }
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.key;
  }
  return entries[entries.length - 1].key;
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
  const chosen = keyToCoord(chosenKey);
  const sorted = legalKeys
    .map((k) => ({
      cell: keyToCoord(k),
      label: k,
      percent: probMap[k],
    }))
    .sort((a, b) => b.percent - a.percent);

  const chosenProb = probMap[chosenKey] ?? 0;
  return {
    chosen,
    label: chosenKey,
    probabilities: sorted.slice(0, 8),
    confidence: Math.min(0.99, chosenProb / 100 + 0.05),
    ms: Math.round(performance.now() - startMs),
    source: "fallback",
  };
}

export function buildJevQuestions(legalMoves: Coord[]) {
  const options: Record<string, string> = {};
  for (const cell of legalMoves) {
    const key = coordToKey(cell);
    options[key] = `Fire at ${key}`;
  }
  return {
    shot: {
      type: "choice" as const,
      instructions:
        "Pick the best cell to fire at given the board state and tactics.",
      options,
    },
  };
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

  const chosen = keyToCoord(chosenKey);
  const probabilities = legalKeys
    .map((k) => ({
      cell: keyToCoord(k),
      label: k,
      percent:
        (answer.probabilities[k] ?? 0) *
        (answer.probabilities[k] <= 1 ? 100 : 1),
    }))
    .sort((a, b) => b.percent - a.percent);

  const chosenProb =
    probabilities.find((p) => p.label === chosenKey)?.percent ?? 0;

  return {
    chosen,
    label: chosenKey,
    probabilities: probabilities.slice(0, 8),
    confidence: answer.confidence ?? Math.min(0.99, chosenProb / 100 + 0.05),
    ms: Math.round(performance.now() - startMs),
    source: "jev",
  };
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
    confidence: response.confidence,
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
  const state = buildStateFromView(request.playerView);
  const questions = buildJevQuestions(request.legalMoves);

  const res = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state, questions }),
  });

  if (!res.ok) {
    throw new Error(`Jev API error: ${res.status}`);
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
