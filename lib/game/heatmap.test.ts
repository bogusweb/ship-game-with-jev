import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyBoard, placeShip } from "./placement";
import {
  createOpponentView,
  fireAt,
  legalMoves,
} from "./shooting";
import {
  describeShotCriterion,
  placementOccupancy,
  remainingFleetFromSunk,
  scoreLegalShots,
  unresolvedHits,
} from "./heatmap";
import { FLEET_LENGTHS } from "./constants";

describe("remainingFleetFromSunk", () => {
  it("starts as the canonical fleet and drops sunk lengths", () => {
    assert.deepEqual(remainingFleetFromSunk([]), [...FLEET_LENGTHS]);
    assert.deepEqual(remainingFleetFromSunk([2]), [4, 3, 3, 2, 2, 1, 1, 1, 1]);
    assert.deepEqual(remainingFleetFromSunk([4, 3, 1]), [3, 2, 2, 2, 1, 1, 1]);
  });
});

describe("placement heatmap", () => {
  it("is zero on miss and halo, positive on unknown", () => {
    const view = createOpponentView();
    view.cells[0][0] = "miss";
    const heat = placementOccupancy(view);
    assert.equal(heat[0][0], 0);
    assert.ok(heat[4][4] > heat[0][1]);
  });

  it("gives TARGET cells next to an unresolved hit more heat than the first leftover", () => {
    const view = createOpponentView();
    for (let col = 0; col < 10; col++) view.cells[0][col] = "miss";
    view.cells[4][4] = "hit";
    const scores = scoreLegalShots(view, legalMoves(view));
    assert.equal(scores[0]?.mode, "TARGET");
    assert.ok(["D5", "F5", "E4", "E6"].includes(scores[0]?.label ?? ""));
    assert.notEqual(scores[0]?.label, "A2");
    const firstLeftover = scores.find((s) => s.label === "A2");
    assert.ok(firstLeftover);
    assert.ok((scores[0]?.heat ?? 0) > firstLeftover.heat);
  });

  it("boosts line-extend cells once two hits align", () => {
    const view = createOpponentView();
    view.cells[4][4] = "hit";
    view.cells[4][5] = "hit";
    const scores = scoreLegalShots(view, legalMoves(view));
    const labels = scores.slice(0, 4).map((s) => s.label);
    assert.ok(labels.includes("D5") && labels.includes("G5"));
    const extend = scores.find((s) => s.label === "D5" || s.label === "G5");
    assert.equal(extend?.reason, "line-extend");
  });

  it("drops sunk-ship hits from unresolved once the 8-neighborhood is halo", () => {
    let board = createEmptyBoard();
    board = placeShip(board, {
      id: "d",
      length: 2,
      orientation: "horizontal",
      origin: { row: 5, col: 5 },
    });
    const first = fireAt(board, createOpponentView(), 5, 5);
    assert.equal(unresolvedHits(first.view).length, 1);
    const second = fireAt(first.board, first.view, 5, 6);
    assert.equal(second.result.outcome, "sunk");
    assert.equal(unresolvedHits(second.view).length, 0);
    assert.equal(second.view.cells[4][5], "halo");
    assert.ok(!legalMoves(second.view).some((m) => m.row === 4 && m.col === 5));
  });

  it("keeps criterion copy under 255 characters", () => {
    const view = createOpponentView();
    const [top] = scoreLegalShots(view, legalMoves(view));
    assert.ok(top);
    const text = describeShotCriterion(top);
    assert.ok(text.length <= 255);
    assert.match(text, /HUNT/);
    assert.match(text, /Fire at /);
  });
});
