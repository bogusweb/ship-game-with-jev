import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOpponentView } from "../game/shooting";
import {
  asShotPercent,
  chosenShotPercent,
  rankShotPreferences,
} from "../game/journal";
import {
  JEV_MODEL,
  buildSystemOneBody,
  chooseJevShot,
  fallbackShot,
  parseJevResponse,
  toJournalEntry,
  type JevShotRequest,
} from "./shot";

function requestWithCells(labels: string[]): JevShotRequest {
  const legalMoves = labels.map((label) => ({
    col: label.charCodeAt(0) - 65,
    row: parseInt(label.slice(1), 10) - 1,
  }));
  return {
    move: 1,
    legalMoves,
    playerView: createOpponentView(),
  };
}

describe("TypeSafe System One payload", () => {
  it("sends model jev-latest and Choice criteria, not options", () => {
    const body = buildSystemOneBody(requestWithCells(["E5", "F6", "G5"]));
    assert.equal(body.model, JEV_MODEL);
    assert.equal(body.model, "jev-latest");
    assert.equal(body.questions.shot.type, "choice");
    assert.deepEqual(body.questions.shot.criteria, {
      E5: "Fire at E5",
      F6: "Fire at F6",
      G5: "Fire at G5",
    });
    assert.equal(
      "options" in body.questions.shot,
      false,
      "Choice must use criteria; options causes HTTP 422",
    );
    assert.ok(body.state.includes("Opponent board"));
  });
});

describe("journal honesty", () => {
  it("converts 0–1 fractions and leaves already-percent values", () => {
    assert.equal(asShotPercent(0.017), 1.7);
    assert.equal(asShotPercent(0.81), 81);
    assert.equal(asShotPercent(1.7), 1.7);
    assert.equal(asShotPercent(undefined), 0);
  });

  it("ranks the chosen cell first even when it is not the densest leftover bar", () => {
    const ranked = rankShotPreferences(
      { row: 4, col: 6 },
      [
        { cell: { row: 4, col: 4 }, label: "E5", percent: 1.8 },
        { cell: { row: 5, col: 5 }, label: "F6", percent: 1.8 },
        { cell: { row: 3, col: 5 }, label: "F4", percent: 1.7 },
        { cell: { row: 4, col: 6 }, label: "G5", percent: 1.7 },
        { cell: { row: 5, col: 3 }, label: "D6", percent: 1.7 },
      ],
    );
    assert.equal(ranked[0]?.label, "G5");
    assert.equal(ranked[0]?.percent, 1.7);
    assert.equal(chosenShotPercent({ row: 4, col: 6 }, ranked), 1.7);
  });

  it("does not show 7% confidence as G5's cell probability", () => {
    const request = requestWithCells([
      "E5",
      "F6",
      "F4",
      "G5",
      "D6",
      "E7",
      "E3",
      "D4",
    ]);
    const parsed = parseJevResponse(
      request,
      {
        choice: "G5",
        probabilities: {
          E5: 0.018,
          F6: 0.018,
          F4: 0.017,
          G5: 0.017,
          D6: 0.017,
          E7: 0.017,
          E3: 0.016,
          D4: 0.016,
        },
        confidence: 0.07,
      },
      performance.now(),
    );

    assert.equal(parsed.source, "jev");
    assert.equal(parsed.label, "G5");
    assert.equal(parsed.chosenPercent, 1.7);
    assert.equal(parsed.probabilities[0]?.label, "G5");
    assert.equal(parsed.probabilities[0]?.percent, 1.7);
    assert.equal(parsed.confidence, 0.07);
    assert.notEqual(
      parsed.chosenPercent,
      (parsed.confidence ?? 0) * 100,
      "cell % must not be fabricated from confidence",
    );

    const entry = toJournalEntry(3, parsed);
    assert.equal(entry.chosenPercent, entry.probabilities[0]?.percent);
    assert.equal(entry.chosenPercent, 1.7);
    assert.equal(entry.confidence, 0.07);
    assert.equal(entry.source, "jev");
  });

  it("keeps a peaked Jev distribution: chosen cell % matches the list, not model confidence", () => {
    const request = requestWithCells(["E5", "F6", "G5"]);
    const parsed = parseJevResponse(
      request,
      {
        choice: "F6",
        probabilities: { F6: 0.76, E5: 0.22, G5: 0.02 },
        confidence: 0.65,
      },
      performance.now(),
    );
    assert.equal(parsed.source, "jev");
    assert.equal(parsed.label, "F6");
    assert.equal(parsed.chosenPercent, 76);
    assert.equal(parsed.probabilities[0]?.label, "F6");
    assert.equal(parsed.probabilities[0]?.percent, 76);
    assert.equal(parsed.confidence, 0.65);
  });

  it("heuristic fallback omits fabricated confidence and still lists the chosen cell first", () => {
    const parsed = fallbackShot(requestWithCells(["A1", "B2", "C3", "D4"]), 0);
    assert.equal(parsed.source, "fallback");
    assert.equal(parsed.confidence, undefined);
    assert.equal(parsed.probabilities[0]?.label, parsed.label);
    assert.equal(parsed.chosenPercent, parsed.probabilities[0]?.percent);
    assert.ok(parsed.chosenPercent > 0);
  });
});

describe("live TypeSafe", () => {
  const apiKey = process.env.SHIP_GAME_TYPESAFE_API_KEY;
  it("returns source jev with chosen cell % matching the list", {
    skip: !apiKey,
  }, async () => {
    const response = await chooseJevShot(
      apiKey,
      requestWithCells(["E5", "F6", "G5"]),
    );
    assert.equal(response.source, "jev");
    assert.equal(response.probabilities[0]?.label, response.label);
    assert.equal(response.chosenPercent, response.probabilities[0]?.percent);
  });
});
