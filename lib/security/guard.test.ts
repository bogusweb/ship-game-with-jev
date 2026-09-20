import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOpponentView } from "../game/shooting";
import { loadAbuseConfig, type AbuseConfig } from "./config";
import { mintPlaySession, processJevShotRequest, PUBLIC_ERRORS } from "./jev-http";
import { headerMapFromRecord } from "./request-meta";
import { createAbuseStore } from "./store";
import { parseJevShotRequest } from "./validate-shot-request";
import type { JevShotRequest } from "../jev/types";
import type { JevShotResponse } from "../jev/types";

function testConfig(overrides: Partial<AbuseConfig> = {}): AbuseConfig {
  return {
    ...loadAbuseConfig({
      NODE_ENV: "test",
      SHIP_GAME_SESSION_SECRET: "test-session-secret-value",
    }),
    ...overrides,
  };
}

function headers(extra: Record<string, string> = {}) {
  return headerMapFromRecord({
    host: "localhost:4317",
    origin: "http://localhost:4317",
    ...extra,
  });
}

function remoteHeaders(extra: Record<string, string> = {}) {
  return headerMapFromRecord({
    host: "ship.example",
    origin: "https://ship.example",
    "x-forwarded-proto": "https",
    "x-forwarded-for": "203.0.113.10",
    ...extra,
  });
}

function validRequest(): JevShotRequest {
  return {
    move: 1,
    legalMoves: [
      { row: 4, col: 4 },
      { row: 4, col: 5 },
      { row: 5, col: 4 },
    ],
    playerView: createOpponentView(),
  };
}

async function withSession(
  config: AbuseConfig,
  store = createAbuseStore(),
  now = 1_700_000_000_000,
) {
  const minted = mintPlaySession({
    headers: headers(),
    cookieHeader: undefined,
    config,
    store,
    now,
  });
  assert.equal(minted.status, 200);
  const cookie = minted.setCookie?.split(";")[0];
  assert.ok(cookie);
  return { store, cookieHeader: cookie, now };
}

describe("shot payload validation", () => {
  it("accepts a legal 10×10 view", () => {
    const parsed = parseJevShotRequest(validRequest());
    assert.equal(parsed.ok, true);
  });

  it("rejects coordinates off the board", () => {
    const parsed = parseJevShotRequest({
      ...validRequest(),
      legalMoves: [{ row: 99, col: 0 }],
    });
    assert.equal(parsed.ok, false);
  });

  it("rejects a truncated board", () => {
    const view = createOpponentView();
    view.cells = view.cells.slice(0, 3);
    const parsed = parseJevShotRequest({ ...validRequest(), playerView: view });
    assert.equal(parsed.ok, false);
  });
});

describe("Jev cost and bot guards", () => {
  it("refuses a shot without a play session", async () => {
    const result = await processJevShotRequest({
      headers: remoteHeaders(),
      cookieHeader: undefined,
      bodyText: JSON.stringify(validRequest()),
      apiKey: "fake-key",
      config: testConfig({ enforceOrigin: true }),
      store: createAbuseStore(),
    });
    assert.equal(result.status, 403);
    assert.deepEqual(result.json, { error: PUBLIC_ERRORS.forbidden });
  });

  it("refuses a forged session cookie", async () => {
    const result = await processJevShotRequest({
      headers: remoteHeaders(),
      cookieHeader: "sgj_session=totally.forged",
      bodyText: JSON.stringify(validRequest()),
      apiKey: "fake-key",
      config: testConfig({ enforceOrigin: true }),
      store: createAbuseStore(),
    });
    assert.equal(result.status, 403);
  });

  it("does not call TypeSafe when the remote daily budget is spent", async () => {
    const config = testConfig({ dailyPaidBudget: 0, enforceOrigin: true });
    const store = createAbuseStore();
    const minted = mintPlaySession({
      headers: remoteHeaders(),
      cookieHeader: undefined,
      config,
      store,
      now: 1_700_000_000_000,
    });
    assert.equal(minted.status, 200);
    const cookieHeader = minted.setCookie?.split(";")[0];
    assert.ok(cookieHeader);
    let fetches = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetches += 1;
      return new Response("should-not-run");
    }) as typeof fetch;
    try {
      const result = await processJevShotRequest({
        headers: remoteHeaders(),
        cookieHeader,
        bodyText: JSON.stringify(validRequest()),
        apiKey: "fake-key",
        config,
        store,
        now: 1_700_000_000_000,
      });
      assert.equal(result.status, 200);
      assert.equal((result.json as JevShotResponse).source, "fallback");
      assert.equal(fetches, 0);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("does not call TypeSafe without a session even if a key is present", async () => {
    let fetches = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetches += 1;
      return new Response("nope");
    }) as typeof fetch;
    try {
      await processJevShotRequest({
        headers: remoteHeaders(),
        cookieHeader: undefined,
        bodyText: JSON.stringify(validRequest()),
        apiKey: "fake-key",
        config: testConfig({ enforceOrigin: true }),
        store: createAbuseStore(),
      });
      assert.equal(fetches, 0);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("accepts a rapid burst of localhost shots, including HIT-chain timing", async () => {
    const config = testConfig({ enforceOrigin: true });
    const store = createAbuseStore();
    const bodyText = JSON.stringify(validRequest());
    const now = 1_700_000_000_000;
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const result = await processJevShotRequest({
        headers: headers(),
        cookieHeader: undefined,
        bodyText,
        apiKey: undefined,
        config,
        store,
        now: now + i,
      });
      statuses.push(result.status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 200, 200, 200]);
  });

  it("rejects cross-origin calls when origin is enforced", async () => {
    const config = testConfig({
      enforceOrigin: true,
      allowedOrigins: ["https://ship.example"],
    });
    const result = await processJevShotRequest({
      headers: headers({ origin: "https://evil.example" }),
      cookieHeader: undefined,
      bodyText: JSON.stringify(validRequest()),
      apiKey: "fake-key",
      config,
      store: createAbuseStore(),
    });
    assert.equal(result.status, 403);
  });

  it("rejects oversized bodies before JSON parse work explodes", async () => {
    const config = testConfig({ maxBodyBytes: 32 });
    const { store, cookieHeader, now } = await withSession(config);
    const result = await processJevShotRequest({
      headers: headers(),
      cookieHeader,
      bodyText: "x".repeat(64),
      apiKey: "fake-key",
      config,
      store,
      now,
    });
    assert.equal(result.status, 400);
    assert.deepEqual(result.json, { error: PUBLIC_ERRORS.invalid });
  });

  it("does not leak upstream TypeSafe error text", async () => {
    const config = testConfig();
    const { store, cookieHeader, now } = await withSession(config);
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("secret quota token=abc", { status: 500 })) as typeof fetch;
    try {
      const result = await processJevShotRequest({
        headers: headers(),
        cookieHeader,
        bodyText: JSON.stringify(validRequest()),
        apiKey: "fake-key",
        config,
        store,
        now,
      });
      assert.equal(result.status, 200);
      const body = JSON.stringify(result.json);
      assert.equal(body.includes("secret quota"), false);
      assert.equal(body.includes("token=abc"), false);
      assert.equal((result.json as JevShotResponse).source, "fallback");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("lets a replayed session cookie keep playing instead of 429", async () => {
    const config = testConfig();
    const { store, cookieHeader } = await withSession(config);
    const first = await processJevShotRequest({
      headers: headers(),
      cookieHeader,
      bodyText: JSON.stringify(validRequest()),
      apiKey: undefined,
      config,
      store,
      now: 1_700_000_000_100,
    });
    const replay = await processJevShotRequest({
      headers: headers(),
      cookieHeader,
      bodyText: JSON.stringify(validRequest()),
      apiKey: undefined,
      config,
      store,
      now: 1_700_000_000_101,
    });
    assert.equal(first.status, 200);
    assert.equal(replay.status, 200);
  });

  it("lets localhost mint many play sessions", () => {
    const config = testConfig({ enforceOrigin: true });
    const store = createAbuseStore();
    const first = mintPlaySession({
      headers: headers(),
      cookieHeader: undefined,
      config,
      store,
      now: 1_700_000_000_000,
    });
    const second = mintPlaySession({
      headers: headers(),
      cookieHeader: undefined,
      config,
      store,
      now: 1_700_000_000_001,
    });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
  });

  it("lets localhost play without a prior session even when origin is enforced", async () => {
    const result = await processJevShotRequest({
      headers: headers(),
      cookieHeader: undefined,
      bodyText: JSON.stringify(validRequest()),
      apiKey: undefined,
      config: testConfig({ enforceOrigin: true }),
      store: createAbuseStore(),
    });
    assert.equal(result.status, 200);
    assert.equal((result.json as JevShotResponse).source, "fallback");
    assert.match(result.setCookie ?? "", /sgj_session=/);
  });

  it("treats 127.0.0.1 and localhost as the same local origin", () => {
    const minted = mintPlaySession({
      headers: headerMapFromRecord({
        host: "localhost:4317",
        origin: "http://127.0.0.1:4317",
      }),
      cookieHeader: undefined,
      config: testConfig({ enforceOrigin: true }),
      store: createAbuseStore(),
    });
    assert.equal(minted.status, 200);
  });
});
