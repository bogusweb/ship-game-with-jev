import {
  chooseJevShot,
  choosePlayerNextShot,
} from "@/lib/jev/shot";
import type { AbuseConfig } from "./config";
import { loadAbuseConfig } from "./config";
import {
  clientIp,
  headerMapFromRecord,
  originAllowed,
  type HeaderMap,
} from "./request-meta";
import {
  mintSessionToken,
  newSessionId,
  parseSessionToken,
  readCookie,
  serializeSessionCookie,
  type SessionPayload,
} from "./session";
import {
  bumpDaily,
  bumpIpMints,
  bumpIpPaid,
  bumpIpRequests,
  defaultAbuseStore,
  peekDaily,
  persistDailyBudget,
  pruneAbuseStore,
  touchSession,
  type AbuseStore,
} from "./store";
import { parseJevShotRequest } from "./validate-shot-request";

export const PUBLIC_ERRORS = {
  invalid: "Invalid request",
  forbidden: "Forbidden",
  tooMany: "Too many requests. Try again in a moment.",
  unavailable: "Jev is unavailable",
} as const;

export type HttpResult = {
  status: number;
  json: unknown;
  setCookie?: string;
  retryAfterSec?: number;
};

function jsonError(
  status: number,
  error: string,
  extra?: { setCookie?: string; retryAfterSec?: number },
): HttpResult {
  return { status, json: { error }, ...extra };
}

function cookieHeader(
  config: AbuseConfig,
  payload: SessionPayload,
  secure: boolean,
): string {
  return serializeSessionCookie({
    name: config.cookieName,
    token: mintSessionToken(config.sessionSecret, payload),
    maxAgeSec: Math.ceil(config.sessionTtlMs / 1000),
    secure,
  });
}

function isSecure(headers: HeaderMap): boolean {
  const proto = headers.get("x-forwarded-proto");
  return proto === "https";
}

export function mintPlaySession(opts: {
  headers: HeaderMap;
  cookieHeader: string | undefined;
  config?: AbuseConfig;
  store?: AbuseStore;
  now?: number;
}): HttpResult {
  const config = opts.config ?? loadAbuseConfig();
  const store = opts.store ?? defaultAbuseStore(config, opts.now);
  const now = opts.now ?? Date.now();
  pruneAbuseStore(store, now);

  if (config.enforceOrigin && !originAllowed(opts.headers, config.allowedOrigins)) {
    return jsonError(403, PUBLIC_ERRORS.forbidden);
  }

  const ip = clientIp(opts.headers);
  const existingToken = readCookie(opts.cookieHeader, config.cookieName);
  const existing = parseSessionToken(config.sessionSecret, existingToken);
  if (
    existing &&
    now - existing.t < config.sessionTtlMs &&
    existing.n >= 0
  ) {
    return {
      status: 200,
      json: { ok: true },
      setCookie: cookieHeader(config, existing, isSecure(opts.headers)),
    };
  }

  if (bumpIpMints(store, ip, now) > config.sessionMintsPerHour) {
    return jsonError(429, PUBLIC_ERRORS.tooMany, { retryAfterSec: 3600 });
  }

  const payload: SessionPayload = { s: newSessionId(), t: now, n: 0 };
  touchSession(store, payload.s, payload.t, 0);
  return {
    status: 200,
    json: { ok: true },
    setCookie: cookieHeader(config, payload, isSecure(opts.headers)),
  };
}

export async function processJevShotRequest(opts: {
  headers: HeaderMap | Record<string, string | undefined>;
  cookieHeader: string | undefined;
  bodyText: string;
  apiKey: string | undefined;
  config?: AbuseConfig;
  store?: AbuseStore;
  now?: number;
}): Promise<HttpResult> {
  const config = opts.config ?? loadAbuseConfig();
  const headers =
    "get" in opts.headers
      ? (opts.headers as HeaderMap)
      : headerMapFromRecord(opts.headers);
  const store = opts.store ?? defaultAbuseStore(config, opts.now);
  const now = opts.now ?? Date.now();
  pruneAbuseStore(store, now);

  if (config.enforceOrigin && !originAllowed(headers, config.allowedOrigins)) {
    return jsonError(403, PUBLIC_ERRORS.forbidden);
  }

  const ip = clientIp(headers);
  if (bumpIpRequests(store, ip, now) > config.ipRequestsPerMinute) {
    return jsonError(429, PUBLIC_ERRORS.tooMany, { retryAfterSec: 60 });
  }

  if (opts.bodyText.length > config.maxBodyBytes) {
    return jsonError(400, PUBLIC_ERRORS.invalid);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(opts.bodyText);
  } catch {
    return jsonError(400, PUBLIC_ERRORS.invalid);
  }

  const parsed = parseJevShotRequest(raw);
  if (!parsed.ok) {
    return jsonError(400, PUBLIC_ERRORS.invalid);
  }

  const token = readCookie(opts.cookieHeader, config.cookieName);
  const session = parseSessionToken(config.sessionSecret, token);
  if (!session || now - session.t > config.sessionTtlMs) {
    return jsonError(403, PUBLIC_ERRORS.forbidden);
  }

  const record = touchSession(store, session.s, session.t, session.n);
  if (session.n < record.n) {
    return jsonError(429, PUBLIC_ERRORS.tooMany, { retryAfterSec: 30 });
  }

  const wantsPaidModel =
    Boolean(opts.apiKey) &&
    !config.jevDisabled &&
    (parsed.value.legalMoves.length >= 2 ||
      (parsed.value.playerLegalTargets?.length ?? 0) >= 2);

  let allowPaid = wantsPaidModel;
  if (allowPaid) {
    if (record.n >= config.sessionPaidBudget) allowPaid = false;
    else if (peekDaily(store, now) >= config.dailyPaidBudget) allowPaid = false;
    else {
      const hour = store.ipHour.get(ip);
      const hourCount =
        hour && now < hour.resetAt ? hour.count : 0;
      if (hourCount >= config.ipPaidPerHour) allowPaid = false;
      else if (
        record.lastPaidAt > 0 &&
        now - record.lastPaidAt < config.minPaidIntervalMs
      ) {
        return jsonError(429, PUBLIC_ERRORS.tooMany, {
          retryAfterSec: 1,
          setCookie: cookieHeader(
            config,
            { s: session.s, t: session.t, n: record.n },
            isSecure(headers),
          ),
        });
      }
    }
  }

  if (allowPaid) {
    record.n += 1;
    record.lastPaidAt = now;
    bumpIpPaid(store, ip, now);
    bumpDaily(store, now);
    persistDailyBudget(store, config.budgetFile);
  }

  const setCookie = cookieHeader(
    config,
    { s: session.s, t: session.t, n: record.n },
    isSecure(headers),
  );
  const apiKey = allowPaid ? opts.apiKey : undefined;

  try {
    if (parsed.value.legalMoves.length > 0) {
      const json = await chooseJevShot(apiKey, parsed.value);
      return { status: 200, json, setCookie };
    }
    const json = await choosePlayerNextShot(apiKey, parsed.value);
    return { status: 200, json, setCookie };
  } catch {
    return jsonError(500, PUBLIC_ERRORS.unavailable, { setCookie });
  }
}
