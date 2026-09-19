import { cellLabel } from "./coords";
import type { Coord, ShotResult } from "./types";

export const PLAYER_SHOT_HISTORY_KEY = "ship-game-with-jev:player-shots:v1";
export const MAX_RECENT_SHOTS = 48;

export type PlayerShotOutcome = "HIT" | "MISS" | "SUNK";

export type PlayerShotRecord = {
  cell: Coord;
  label: string;
  outcome: PlayerShotOutcome;
};

export type PlayerShotHistoryBundle = {
  thisMatch: PlayerShotRecord[];
  recent: PlayerShotRecord[];
};

type CompactShot = {
  l: string;
  o: "H" | "M" | "S";
};

type StoredPayload = {
  v: 1;
  r: CompactShot[];
  c: CompactShot[];
};

const OUTCOME_TO_COMPACT: Record<PlayerShotOutcome, CompactShot["o"]> = {
  HIT: "H",
  MISS: "M",
  SUNK: "S",
};

const COMPACT_TO_OUTCOME: Record<CompactShot["o"], PlayerShotOutcome> = {
  H: "HIT",
  M: "MISS",
  S: "SUNK",
};

export function shotResultToOutcome(
  outcome: ShotResult["outcome"],
): PlayerShotOutcome {
  if (outcome === "hit") return "HIT";
  if (outcome === "sunk") return "SUNK";
  return "MISS";
}

export function makePlayerShotRecord(
  cell: Coord,
  outcome: ShotResult["outcome"] | PlayerShotOutcome,
): PlayerShotRecord {
  const normalized: PlayerShotOutcome =
    outcome === "hit" || outcome === "miss" || outcome === "sunk"
      ? shotResultToOutcome(outcome)
      : outcome;
  return {
    cell: { row: cell.row, col: cell.col },
    label: cellLabel(cell.row, cell.col),
    outcome: normalized,
  };
}

export function capPlayerShotHistory(
  shots: PlayerShotRecord[],
  max = MAX_RECENT_SHOTS,
): PlayerShotRecord[] {
  if (shots.length <= max) return shots;
  return shots.slice(shots.length - max);
}

function toCompact(shot: PlayerShotRecord): CompactShot {
  return { l: shot.label, o: OUTCOME_TO_COMPACT[shot.outcome] };
}

function labelToCell(label: string): Coord | null {
  const match = /^([A-Z])(\d+)$/.exec(label);
  if (!match) return null;
  const col = match[1]!.charCodeAt(0) - 65;
  const row = parseInt(match[2]!, 10) - 1;
  if (!Number.isFinite(row) || row < 0 || col < 0) return null;
  return { row, col };
}

function fromCompact(shot: CompactShot): PlayerShotRecord | null {
  if (!shot || typeof shot.l !== "string") return null;
  const outcome = COMPACT_TO_OUTCOME[shot.o];
  const cell = labelToCell(shot.l);
  if (!outcome || !cell) return null;
  return { cell, label: shot.l, outcome };
}

function parseCompactList(value: unknown): PlayerShotRecord[] {
  if (!Array.isArray(value)) return [];
  const shots: PlayerShotRecord[] = [];
  for (const item of value) {
    const parsed = fromCompact(item as CompactShot);
    if (parsed) shots.push(parsed);
  }
  return shots;
}

export function serializePlayerShotHistory(
  thisMatch: PlayerShotRecord[],
  recent: PlayerShotRecord[] = [],
): string {
  const payload: StoredPayload = {
    v: 1,
    r: capPlayerShotHistory(recent).map(toCompact),
    c: thisMatch.map(toCompact),
  };
  return JSON.stringify(payload);
}

export function parsePlayerShotHistory(
  raw: string | null | undefined,
): { thisMatch: PlayerShotRecord[]; recent: PlayerShotRecord[] } {
  if (!raw || typeof raw !== "string") {
    return { thisMatch: [], recent: [] };
  }
  try {
    const data = JSON.parse(raw) as Partial<StoredPayload> | PlayerShotRecord[];
    if (Array.isArray(data)) {
      return { thisMatch: [], recent: capPlayerShotHistory(data) };
    }
    if (!data || data.v !== 1) {
      return { thisMatch: [], recent: [] };
    }
    return {
      thisMatch: parseCompactList(data.c),
      recent: capPlayerShotHistory(parseCompactList(data.r)),
    };
  } catch {
    return { thisMatch: [], recent: [] };
  }
}

export function emptyPlayerShotHistory(): {
  thisMatch: PlayerShotRecord[];
  recent: PlayerShotRecord[];
} {
  return { thisMatch: [], recent: [] };
}

export function archiveMatchShots(
  thisMatch: PlayerShotRecord[],
  recent: PlayerShotRecord[],
): PlayerShotRecord[] {
  return capPlayerShotHistory([...recent, ...thisMatch]);
}

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function browserStorage(): StorageLike | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadStoredPlayerShotHistory(
  storage: StorageLike | null = browserStorage(),
): { thisMatch: PlayerShotRecord[]; recent: PlayerShotRecord[] } {
  if (!storage) return emptyPlayerShotHistory();
  try {
    return parsePlayerShotHistory(storage.getItem(PLAYER_SHOT_HISTORY_KEY));
  } catch {
    return emptyPlayerShotHistory();
  }
}

export function saveStoredPlayerShotHistory(
  thisMatch: PlayerShotRecord[],
  recent: PlayerShotRecord[],
  storage: StorageLike | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(
      PLAYER_SHOT_HISTORY_KEY,
      serializePlayerShotHistory(thisMatch, recent),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function formatPlayerShotHistoryForState(
  thisMatch: PlayerShotRecord[],
  recent: PlayerShotRecord[] = [],
): string {
  const lines = [
    "Player hunting history — humans hunt similarly over time. Use this to predict where the player fires next on remaining unknown cells of Jev's waters.",
  ];

  if (thisMatch.length === 0) {
    lines.push("This match, in order: no shots yet.");
  } else {
    lines.push("This match, in order:");
    thisMatch.forEach((shot, index) => {
      lines.push(`${index + 1}. ${shot.label} ${shot.outcome}`);
    });
  }

  if (recent.length > 0) {
    const compact = recent
      .map((shot) => `${shot.label} ${shot.outcome}`)
      .join(", ");
    lines.push(`Earlier matches (compact, oldest first): ${compact}`);
  }

  return lines.join("\n");
}
