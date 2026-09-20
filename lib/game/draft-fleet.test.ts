import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FLEET_LENGTHS } from "./constants";
import {
  draftComplete,
  draftFromBoard,
  draftIndexAtCell,
  draftPlacementError,
  emptyDraft,
  gameFromDraft,
  nextDraftIndex,
  revealedOpponentShips,
  type DraftShip,
} from "./draft-fleet";
import { randomFleetPlacement } from "./placement";
import { createNewGame } from "./session";

function slot(
  index: number,
  row: number,
  col: number,
  orientation: DraftShip["orientation"] = "horizontal",
): DraftShip {
  return { index, length: FLEET_LENGTHS[index], origin: { row, col }, orientation };
}

describe("draft fleet", () => {
  it("starts with one empty slot per fleet ship", () => {
    const draft = emptyDraft();
    assert.equal(draft.length, FLEET_LENGTHS.length);
    assert.equal(nextDraftIndex(draft), 0);
    assert.equal(draftComplete(draft), false);
  });

  it("accepts a placement that keeps a one-cell gap", () => {
    const draft = emptyDraft();
    draft[0] = slot(0, 0, 0);
    assert.equal(draftPlacementError(draft, slot(1, 2, 0)), null);
  });

  it("rejects placements that touch, including diagonally", () => {
    const draft = emptyDraft();
    draft[0] = slot(0, 0, 0);
    assert.equal(
      draftPlacementError(draft, slot(1, 1, 4)),
      "Ships cannot touch, including diagonally",
    );
  });

  it("rejects placements that leave the board", () => {
    const draft = emptyDraft();
    assert.equal(
      draftPlacementError(draft, slot(0, 0, 8)),
      "Ship is out of bounds",
    );
  });

  it("ignores the slot being moved when validating its new position", () => {
    const draft = emptyDraft();
    draft[0] = slot(0, 0, 0);
    // Same slot, shifted by one: only a collision with itself would block it.
    assert.equal(draftPlacementError(draft, slot(0, 0, 1)), null);
  });

  it("finds the roster slot occupying a cell", () => {
    const draft = emptyDraft();
    draft[0] = slot(0, 3, 2);
    assert.equal(draftIndexAtCell(draft, 3, 4), 0);
    assert.equal(draftIndexAtCell(draft, 5, 4), null);
  });

  it("fills a complete roster from an engine placement and starts the match", () => {
    const draft = draftFromBoard(randomFleetPlacement());
    assert.equal(draftComplete(draft), true);
    assert.equal(nextDraftIndex(draft), null);

    const game = gameFromDraft(createNewGame(), draft);
    assert.equal(game.phase, "playing");
    assert.equal(game.playerBoard.ships.length, FLEET_LENGTHS.length);
    assert.deepEqual(
      game.playerBoard.ships.map((ship) => ship.length),
      [...FLEET_LENGTHS],
    );
  });

  it("refuses to start with an incomplete roster", () => {
    const draft = emptyDraft();
    draft[0] = slot(0, 0, 0);
    assert.throws(() => gameFromDraft(createNewGame(), draft), /already placed/);
  });

  it("reveals only sunk opponent ships", () => {
    const board = randomFleetPlacement();
    const sunkBoard = {
      ships: board.ships.map((ship, index) =>
        index === 0 ? { ...ship, sunk: true } : ship,
      ),
    };
    const revealed = revealedOpponentShips(sunkBoard);
    assert.equal(revealed.length, 1);
    assert.equal(revealed[0].length, FLEET_LENGTHS[0]);
    assert.equal(revealed[0].damaged, true);
  });
});
