import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLastShotCell,
  lastShotAriaSuffix,
} from "./last-shot";
import {
  autoPlacePlayerFleet,
  createNewGame,
  createPlayerAttackView,
  jevShoot,
  playerShoot,
} from "./session";
import { shipAtCell } from "./placement";
import { BOARD_SIZE } from "./constants";

describe("isLastShotCell", () => {
  it("is false when there is no last shot", () => {
    assert.equal(isLastShotCell(0, 0, null), false);
    assert.equal(isLastShotCell(0, 0, undefined), false);
  });

  it("matches only the recorded coordinate", () => {
    const last = { row: 4, col: 7 };
    assert.equal(isLastShotCell(4, 7, last), true);
    assert.equal(isLastShotCell(4, 6, last), false);
    assert.equal(isLastShotCell(3, 7, last), false);
  });
});

describe("lastShotAriaSuffix", () => {
  it("names the shooter in English without changing other copy", () => {
    assert.equal(lastShotAriaSuffix("player"), ", last shot by you");
    assert.equal(lastShotAriaSuffix("jev"), ", last shot by Jev");
    assert.equal(lastShotAriaSuffix(null), "");
    assert.equal(lastShotAriaSuffix(undefined), "");
  });
});

describe("session last shots", () => {
  it("starts with no last shots and records each side independently", () => {
    const fresh = createNewGame();
    assert.equal(fresh.lastPlayerShot, null);
    assert.equal(fresh.lastJevShot, null);

    let state = autoPlacePlayerFleet(fresh);
    assert.equal(state.lastPlayerShot, null);
    assert.equal(state.lastJevShot, null);

    const missJev = (() => {
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (!shipAtCell(state.jevBoard, row, col)) return { row, col };
        }
      }
      throw new Error("expected a miss cell on Jev's fleet");
    })();

    const playerMiss = playerShoot(state, missJev.row, missJev.col);
    assert.deepEqual(playerMiss.state.lastPlayerShot, missJev);
    assert.equal(playerMiss.state.lastJevShot, null);
    state = playerMiss.state;

    const view = createPlayerAttackView();
    const jevCell = state.playerBoard.ships[0]!.cells[0]!;
    const jevHit = jevShoot(state, jevCell.row, jevCell.col, view);
    assert.deepEqual(jevHit.state.lastJevShot, jevCell);
    assert.deepEqual(jevHit.state.lastPlayerShot, missJev);

    const anotherMiss = (() => {
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (
            !shipAtCell(state.jevBoard, row, col) &&
            !(row === missJev.row && col === missJev.col)
          ) {
            return { row, col };
          }
        }
      }
      throw new Error("expected a second miss cell on Jev's fleet");
    })();

    if (jevHit.state.turn !== "player") {
      const missOnPlayer = (() => {
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (
              !shipAtCell(jevHit.state.playerBoard, row, col) &&
              jevHit.playerView.cells[row][col] === "unknown"
            ) {
              return { row, col };
            }
          }
        }
        throw new Error("expected a miss cell on the player fleet");
      })();
      const jevMiss = jevShoot(
        jevHit.state,
        missOnPlayer.row,
        missOnPlayer.col,
        jevHit.playerView,
      );
      assert.deepEqual(jevMiss.state.lastJevShot, missOnPlayer);
      assert.deepEqual(jevMiss.state.lastPlayerShot, missJev);
      state = jevMiss.state;
    } else {
      state = jevHit.state;
    }

    const secondPlayer = playerShoot(state, anotherMiss.row, anotherMiss.col);
    assert.deepEqual(secondPlayer.state.lastPlayerShot, anotherMiss);
    assert.ok(secondPlayer.state.lastJevShot);
    assert.ok(
      !(
        secondPlayer.state.lastJevShot!.row === anotherMiss.row &&
        secondPlayer.state.lastJevShot!.col === anotherMiss.col
      ),
    );
  });
});
