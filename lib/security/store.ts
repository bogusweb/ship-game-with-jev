import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AbuseConfig } from "./config";

export type MinuteBucket = { count: number; resetAt: number };
export type HourBucket = { count: number; resetAt: number };
export type SessionRecord = { n: number; lastPaidAt: number; iat: number };
export type DailyBudget = { day: string; n: number };

export type AbuseStore = {
  ipMinute: Map<string, MinuteBucket>;
  ipHour: Map<string, HourBucket>;
  ipMints: Map<string, HourBucket>;
  sessions: Map<string, SessionRecord>;
  daily: DailyBudget;
};

export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function createAbuseStore(now = Date.now()): AbuseStore {
  return {
    ipMinute: new Map(),
    ipHour: new Map(),
    ipMints: new Map(),
    sessions: new Map(),
    daily: { day: utcDay(now), n: 0 },
  };
}

function bumpWindow(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  now: number,
  windowMs: number,
): number {
  const current = map.get(key);
  if (!current || now >= current.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  current.count += 1;
  return current.count;
}

export function bumpIpRequests(store: AbuseStore, ip: string, now: number): number {
  return bumpWindow(store.ipMinute, ip, now, 60_000);
}

export function peekIpRequests(store: AbuseStore, ip: string, now: number): number {
  const current = store.ipMinute.get(ip);
  if (!current || now >= current.resetAt) return 0;
  return current.count;
}

export function bumpIpPaid(store: AbuseStore, ip: string, now: number): number {
  return bumpWindow(store.ipHour, ip, now, 60 * 60 * 1000);
}

export function bumpIpMints(store: AbuseStore, ip: string, now: number): number {
  return bumpWindow(store.ipMints, ip, now, 60 * 60 * 1000);
}

export function peekDaily(store: AbuseStore, now: number): number {
  const day = utcDay(now);
  if (store.daily.day !== day) {
    store.daily = { day, n: 0 };
  }
  return store.daily.n;
}

export function bumpDaily(store: AbuseStore, now: number): number {
  peekDaily(store, now);
  store.daily.n += 1;
  return store.daily.n;
}

export function touchSession(
  store: AbuseStore,
  sid: string,
  issuedAt: number,
  cookieN: number,
): SessionRecord {
  const existing = store.sessions.get(sid);
  if (!existing) {
    const record = { n: cookieN, lastPaidAt: 0, iat: issuedAt };
    store.sessions.set(sid, record);
    return record;
  }
  existing.n = Math.max(existing.n, cookieN);
  return existing;
}

export function persistDailyBudget(store: AbuseStore, file: string | null): void {
  if (!file) return;
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      JSON.stringify(store.daily),
      { encoding: "utf8", mode: 0o600 },
    );
  } catch {
    // Passenger / serverless may not allow writes; memory still applies.
  }
}

export function loadDailyBudget(store: AbuseStore, file: string | null, now: number): void {
  if (!file) return;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as DailyBudget;
    if (parsed && parsed.day === utcDay(now) && typeof parsed.n === "number") {
      store.daily = { day: parsed.day, n: Math.max(0, parsed.n) };
    }
  } catch {
    // Missing or unreadable file is fine.
  }
}

const globalStore = createAbuseStore();
let loadedFile: string | null = null;

export function defaultAbuseStore(config: AbuseConfig, now = Date.now()): AbuseStore {
  if (config.budgetFile && loadedFile !== config.budgetFile) {
    loadDailyBudget(globalStore, config.budgetFile, now);
    loadedFile = config.budgetFile;
  }
  return globalStore;
}

export function pruneAbuseStore(store: AbuseStore, now: number): void {
  for (const [key, bucket] of store.ipMinute) {
    if (now >= bucket.resetAt) store.ipMinute.delete(key);
  }
  for (const [key, bucket] of store.ipHour) {
    if (now >= bucket.resetAt) store.ipHour.delete(key);
  }
  for (const [key, bucket] of store.ipMints) {
    if (now >= bucket.resetAt) store.ipMints.delete(key);
  }
}
