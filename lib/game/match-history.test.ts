import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMockJournalEntry } from "./journal";
import {
  makeJevHistoryItem,
  makeYouHistoryItem,
  newestFirst,
  shotOutcomeToHistory,
} from "./match-history";

describe("match history", () => {
  it("maps fire results to history outcomes", () => {
    assert.equal(shotOutcomeToHistory("hit"), "HIT");
    assert.equal(shotOutcomeToHistory("miss"), "MISS");
    assert.equal(shotOutcomeToHistory("sunk"), "SUNK");
    assert.equal(shotOutcomeToHistory("HIT"), "HIT");
  });

  it("puts the newest shot first for left-to-right display", () => {
    const a = makeYouHistoryItem({ index: 0, label: "A1", outcome: "miss" });
    const b = makeYouHistoryItem({ index: 1, label: "C4", outcome: "hit" });
    const c = makeJevHistoryItem({
      journal: buildMockJournalEntry(1, { row: 2, col: 2 }, [
        { row: 2, col: 2 },
      ]),
      outcome: "miss",
    });
    const chronological = [a, b, c];
    assert.deepEqual(
      newestFirst(chronological).map((item) => item.label),
      [c.label, "C4", "A1"],
    );
  });

  it("keeps Jev journal payload on history items", () => {
    const journal = buildMockJournalEntry(3, { row: 0, col: 4 }, [
      { row: 0, col: 4 },
      { row: 1, col: 1 },
    ]);
    const item = makeJevHistoryItem({ journal, outcome: "sunk" });
    assert.equal(item.actor, "jev");
    assert.equal(item.outcome, "SUNK");
    assert.equal(item.journal, journal);
    assert.equal(item.label, journal.label);
  });
});
