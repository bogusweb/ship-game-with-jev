import { BOARD_SIZE } from "@/lib/game/constants";
import { MAX_RECENT_SHOTS } from "@/lib/game/player-shot-history";
import type { Coord, OpponentView, ShotCellState } from "@/lib/game/types";
import type { JevShotRequest } from "@/lib/jev/types";
import type { PlayerShotHistoryBundle, PlayerShotRecord } from "@/lib/game/player-shot-history";

const CELL_STATES = new Set<ShotCellState>(["unknown", "miss", "hit", "halo"]);
const SHOT_OUTCOMES = new Set(["HIT", "MISS", "SUNK"]);

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function parseCoord(value: unknown): Coord | null {
  if (!value || typeof value !== "object") return null;
  const row = (value as { row?: unknown }).row;
  const col = (value as { col?: unknown }).col;
  if (!isInt(row) || !isInt(col)) return null;
  if (row < 0 || col < 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) return null;
  return { row, col };
}

function parseCoordList(value: unknown, max: number): Coord[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const out: Coord[] = [];
  for (const item of value) {
    const coord = parseCoord(item);
    if (!coord) return null;
    out.push(coord);
  }
  return out;
}

function parseShotRecord(value: unknown): PlayerShotRecord | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as { cell?: unknown; label?: unknown; outcome?: unknown };
  const cell = parseCoord(rec.cell);
  if (!cell) return null;
  if (typeof rec.label !== "string" || rec.label.length > 4) return null;
  if (typeof rec.outcome !== "string" || !SHOT_OUTCOMES.has(rec.outcome)) {
    return null;
  }
  return {
    cell,
    label: rec.label,
    outcome: rec.outcome as PlayerShotRecord["outcome"],
  };
}

function parseHistory(
  value: unknown,
): PlayerShotHistoryBundle | undefined | null {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") return null;
  const raw = value as { thisMatch?: unknown; recent?: unknown };
  if (!Array.isArray(raw.thisMatch) || raw.thisMatch.length > 100) return null;
  if (!Array.isArray(raw.recent) || raw.recent.length > MAX_RECENT_SHOTS) {
    return null;
  }
  const thisMatch: PlayerShotRecord[] = [];
  for (const item of raw.thisMatch) {
    const rec = parseShotRecord(item);
    if (!rec) return null;
    thisMatch.push(rec);
  }
  const recent: PlayerShotRecord[] = [];
  for (const item of raw.recent) {
    const rec = parseShotRecord(item);
    if (!rec) return null;
    recent.push(rec);
  }
  return { thisMatch, recent };
}

function parseView(value: unknown): OpponentView | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { cells?: unknown; sunkShipLengths?: unknown };
  if (!Array.isArray(raw.cells) || raw.cells.length !== BOARD_SIZE) return null;
  const cells: ShotCellState[][] = [];
  for (const row of raw.cells) {
    if (!Array.isArray(row) || row.length !== BOARD_SIZE) return null;
    const parsed: ShotCellState[] = [];
    for (const cell of row) {
      if (typeof cell !== "string" || !CELL_STATES.has(cell as ShotCellState)) {
        return null;
      }
      parsed.push(cell as ShotCellState);
    }
    cells.push(parsed);
  }
  if (!Array.isArray(raw.sunkShipLengths) || raw.sunkShipLengths.length > 16) {
    return null;
  }
  const sunkShipLengths: number[] = [];
  for (const len of raw.sunkShipLengths) {
    if (!isInt(len) || len < 1 || len > BOARD_SIZE) return null;
    sunkShipLengths.push(len);
  }
  return { cells, sunkShipLengths };
}

export function parseJevShotRequest(
  raw: unknown,
): { ok: true; value: JevShotRequest } | { ok: false } {
  if (!raw || typeof raw !== "object") return { ok: false };
  const body = raw as Record<string, unknown>;
  if (!isInt(body.move) || body.move < 0 || body.move > 400) return { ok: false };

  const legalMoves = parseCoordList(body.legalMoves ?? [], BOARD_SIZE * BOARD_SIZE);
  if (!legalMoves) return { ok: false };
  const playerLegalTargets = parseCoordList(
    body.playerLegalTargets ?? [],
    BOARD_SIZE * BOARD_SIZE,
  );
  if (!playerLegalTargets) return { ok: false };
  const playerView = parseView(body.playerView);
  if (!playerView) return { ok: false };
  const playerShotHistory = parseHistory(body.playerShotHistory);
  if (playerShotHistory === null) return { ok: false };

  if (legalMoves.length === 0 && playerLegalTargets.length === 0) {
    return { ok: false };
  }

  const value: JevShotRequest = {
    move: body.move,
    legalMoves,
    playerView,
  };
  if (playerLegalTargets.length > 0) {
    value.playerLegalTargets = playerLegalTargets;
  }
  if (playerShotHistory) {
    value.playerShotHistory = playerShotHistory;
  }
  return { ok: true, value };
}
