import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_RECENT_SHOTS,
  archiveMatchShots,
  capPlayerShotHistory,
  formatPlayerShotHistoryForState,
  makePlayerShotRecord,
  parsePlayerShotHistory,
  serializePlayerShotHistory,
  shotResultToOutcome,
} from "./player-shot-history";

describe("player shot history serialization", () => {
  it("round-trips cell, HIT/MISS/SUNK, and order in a compact payload", () => {
    const thisMatch = [
      makePlayerShotRecord({ row: 4, col: 4 }, "hit"),
      makePlayerShotRecord({ row: 4, col: 5 }, "HIT"),
      makePlayerShotRecord({ row: 4, col: 6 }, "sunk"),
    ];
    const recent = [
      makePlayerShotRecord({ row: 0, col: 0 }, "miss"),
      makePlayerShotRecord({ row: 9, col: 9 }, "MISS"),
    ];

    const raw = serializePlayerShotHistory(thisMatch, recent);
    assert.ok(!raw.includes("HIT"));
    assert.ok(raw.includes('"o":"H"'));
    assert.ok(raw.includes('"o":"S"'));
    assert.ok(raw.includes('"l":"E5"'));

    const parsed = parsePlayerShotHistory(raw);
    assert.deepEqual(parsed.thisMatch, [
      { cell: { row: 4, col: 4 }, label: "E5", outcome: "HIT" },
      { cell: { row: 4, col: 5 }, label: "F5", outcome: "HIT" },
      { cell: { row: 4, col: 6 }, label: "G5", outcome: "SUNK" },
    ]);
    assert.deepEqual(parsed.recent, [
      { cell: { row: 0, col: 0 }, label: "A1", outcome: "MISS" },
      { cell: { row: 9, col: 9 }, label: "J10", outcome: "MISS" },
    ]);
    assert.equal(shotResultToOutcome("hit"), "HIT");
    assert.equal(shotResultToOutcome("miss"), "MISS");
    assert.equal(shotResultToOutcome("sunk"), "SUNK");
  });

  it("caps persisted recent history and returns empty on garbage", () => {
    const many = Array.from({ length: MAX_RECENT_SHOTS + 12 }, (_, i) =>
      makePlayerShotRecord({ row: i % 10, col: i % 10 }, i % 2 === 0 ? "MISS" : "HIT"),
    );
    const capped = capPlayerShotHistory(many);
    assert.equal(capped.length, MAX_RECENT_SHOTS);
    assert.equal(capped[0]?.label, many[12]?.label);
    assert.equal(capped[capped.length - 1]?.label, many[many.length - 1]?.label);

    const archived = archiveMatchShots(many.slice(-5), many.slice(0, 10));
    assert.ok(archived.length <= MAX_RECENT_SHOTS);

    assert.deepEqual(parsePlayerShotHistory(null), { thisMatch: [], recent: [] });
    assert.deepEqual(parsePlayerShotHistory("{not json"), {
      thisMatch: [],
      recent: [],
    });
    assert.deepEqual(parsePlayerShotHistory("{}"), { thisMatch: [], recent: [] });
  });

  it("formats English hunting history for System One state", () => {
    const text = formatPlayerShotHistoryForState(
      [
        makePlayerShotRecord({ row: 4, col: 4 }, "HIT"),
        makePlayerShotRecord({ row: 4, col: 5 }, "MISS"),
      ],
      [makePlayerShotRecord({ row: 0, col: 2 }, "SUNK")],
    );
    assert.match(text, /humans hunt similarly over time/i);
    assert.match(text, /1\. E5 HIT/);
    assert.match(text, /2\. F5 MISS/);
    assert.match(text, /Earlier matches \(compact, oldest first\): C1 SUNK/);
    assert.match(
      formatPlayerShotHistoryForState([]),
      /This match, in order: no shots yet/,
    );
  });
});
