import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOARD_SIZE, FLEET_LENGTHS } from "./constants";
import {
  allFleetPlaced,
  createEmptyBoard,
  listValidPlacements,
  placeShip,
  randomFleetPlacement,
  shipAtCell,
  validatePlacement,
} from "./placement";
import {
  allShipsSunk,
  createOpponentView,
  fireAt,
  legalMoves,
  unsunkShipLengths,
} from "./shooting";
import type { ShipPlacement } from "./types";
import {
  autoPlacePlayerFleet,
  createNewGame,
  createPlayerAttackView,
  jevShoot,
  playerShoot,
} from "./session";

describe("placement", () => {
  it("accepts a valid horizontal ship", () => {
    const board = createEmptyBoard();
    const placement: ShipPlacement = {
      id: "a",
      length: 4,
      orientation: "horizontal",
      origin: { row: 0, col: 0 },
    };
    assert.equal(validatePlacement(board, placement), null);
    const next = placeShip(board, placement);
    assert.equal(next.ships.length, 1);
    assert.equal(next.ships[0].cells.length, 4);
  });

  it("rejects out-of-bounds placement", () => {
    const board = createEmptyBoard();
    const placement: ShipPlacement = {
      id: "a",
      length: 4,
      orientation: "horizontal",
      origin: { row: 0, col: 8 },
    };
    assert.match(validatePlacement(board, placement)!, /out of bounds/i);
  });

  it("rejects diagonal touching ships", () => {
    let board = createEmptyBoard();
    board = placeShip(board, {
      id: "a",
      length: 2,
      orientation: "horizontal",
      origin: { row: 0, col: 0 },
    });

    const touching: ShipPlacement = {
      id: "b",
      length: 2,
      orientation: "vertical",
      origin: { row: 1, col: 1 },
    };
    assert.match(validatePlacement(board, touching)!, /cannot touch/i);
  });

  it("rejects orthogonal adjacent ships", () => {
    let board = createEmptyBoard();
    board = placeShip(board, {
      id: "a",
      length: 2,
      orientation: "horizontal",
      origin: { row: 0, col: 0 },
    });

    const adjacent: ShipPlacement = {
      id: "b",
      length: 2,
      orientation: "horizontal",
      origin: { row: 0, col: 2 },
    };
    assert.match(validatePlacement(board, adjacent)!, /cannot touch/i);
  });

  it("places full fleet randomly", () => {
    const board = randomFleetPlacement();
    assert.equal(board.ships.length, FLEET_LENGTHS.length);
    assert.ok(allFleetPlaced(board));
  });

  it("lists valid placements for remaining ship", () => {
    const board = createEmptyBoard();
    const options = listValidPlacements(board, 4);
    assert.ok(options.length > 0);
    for (const option of options) {
      assert.equal(validatePlacement(board, option), null);
    }
  });
});

function boardWithSingleShip() {
  let board = createEmptyBoard();
  board = placeShip(board, {
    id: "ship-1",
    length: 2,
    orientation: "horizontal",
    origin: { row: 5, col: 5 },
  });
  return board;
}

describe("shooting", () => {

  it("records a miss", () => {
    const board = boardWithSingleShip();
    const view = createOpponentView();
    const { view: next, result } = fireAt(board, view, 0, 0);
    assert.equal(result.outcome, "miss");
    assert.equal(next.cells[0][0], "miss");
  });

  it("records a hit then sunk and marks halo", () => {
    const board = boardWithSingleShip();
    let view = createOpponentView();

    const first = fireAt(board, view, 5, 5);
    assert.equal(first.result.outcome, "hit");
    view = first.view;

    const second = fireAt(first.board, view, 5, 6);
    assert.equal(second.result.outcome, "sunk");
    assert.equal(second.view.cells[5][5], "hit");
    assert.equal(second.view.cells[5][6], "hit");
    assert.equal(second.view.cells[4][5], "halo");
    assert.equal(second.view.cells[6][6], "halo");
  });

  it("excludes halo cells from legalMoves", () => {
    const board = boardWithSingleShip();
    let view = createOpponentView();
    const first = fireAt(board, view, 5, 5);
    const second = fireAt(first.board, first.view, 5, 6);
    view = second.view;

    const moves = legalMoves(view);
    assert.ok(!moves.some((m) => m.row === 4 && m.col === 5));
    assert.ok(!moves.some((m) => m.row === 6 && m.col === 6));
    assert.ok(moves.some((m) => m.row === 0 && m.col === 0));
  });

  it("detects all ships sunk", () => {
    const board = boardWithSingleShip();
    let view = createOpponentView();
    const first = fireAt(board, view, 5, 5);
    const second = fireAt(first.board, first.view, 5, 6);
    assert.ok(allShipsSunk(second.board));
  });

  it("starts with full board legal moves", () => {
    const view = createOpponentView();
    assert.equal(legalMoves(view).length, BOARD_SIZE * BOARD_SIZE);
  });
});

describe("unsunkShipLengths", () => {
  it("is empty on an empty board and after every ship is sunk", () => {
    const empty = createEmptyBoard();
    assert.deepEqual(unsunkShipLengths(empty), []);

    const board = boardWithSingleShip();
    assert.deepEqual(unsunkShipLengths(board), [2]);

    const first = fireAt(board, createOpponentView(), 5, 5);
    assert.deepEqual(unsunkShipLengths(first.board), [2]);

    const second = fireAt(first.board, first.view, 5, 6);
    assert.equal(second.result.outcome, "sunk");
    assert.deepEqual(unsunkShipLengths(second.board), []);
  });

  it("drops only the sunk length and keeps the rest of a real fleet", () => {
    const state = autoPlacePlayerFleet(createNewGame());
    const start = unsunkShipLengths(state.jevBoard);
    assert.deepEqual(start, [...FLEET_LENGTHS].sort((a, b) => b - a));

    const ship = state.jevBoard.ships[0]!;
    let board = state.jevBoard;
    let view = state.opponentView;
    let last = fireAt(board, view, ship.cells[0]!.row, ship.cells[0]!.col);
    for (const cell of ship.cells.slice(1)) {
      last = fireAt(last.board, last.view, cell.row, cell.col);
      board = last.board;
      view = last.view;
    }
    assert.equal(last.result.outcome, "sunk");

    const remaining = unsunkShipLengths(last.board);
    const expected: number[] = [...start];
    const sunkIndex = expected.indexOf(ship.length);
    assert.ok(sunkIndex >= 0);
    expected.splice(sunkIndex, 1);
    assert.deepEqual(remaining, expected);
  });
});

describe("session turns", () => {
  it("player miss hands the turn to Jev; Jev HIT/SUNK keeps Jev's turn", () => {
    let { state } = { state: autoPlacePlayerFleet(createNewGame()) };
    const miss = (() => {
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (!shipAtCell(state.jevBoard, row, col)) return { row, col };
        }
      }
      throw new Error("expected a miss cell on Jev's fleet");
    })();
    const playerMiss = playerShoot(state, miss.row, miss.col);
    assert.equal(playerMiss.result.outcome, "miss");
    assert.equal(playerMiss.state.turn, "jev");
    assert.deepEqual(playerMiss.state.lastPlayerShot, miss);
    assert.equal(playerMiss.state.lastJevShot, null);
    state = playerMiss.state;

    const view = createPlayerAttackView();
    const hitCell = state.playerBoard.ships[0]!.cells[0]!;
    const jevHit = jevShoot(state, hitCell.row, hitCell.col, view);
    assert.ok(jevHit.result.outcome === "hit" || jevHit.result.outcome === "sunk");
    assert.deepEqual(jevHit.state.lastJevShot, hitCell);
    assert.deepEqual(jevHit.state.lastPlayerShot, miss);
    if (jevHit.state.phase === "playing") {
      assert.equal(jevHit.state.turn, "jev");
    }

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
    assert.equal(jevMiss.result.outcome, "miss");
    assert.equal(jevMiss.state.turn, "player");
    assert.deepEqual(jevMiss.state.lastJevShot, missOnPlayer);
    assert.deepEqual(jevMiss.state.lastPlayerShot, miss);
  });

  it("rejects Jev shots when no legal moves remain", () => {
    const state = autoPlacePlayerFleet(createNewGame());
    const view = createOpponentView();
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        view.cells[row][col] = "miss";
      }
    }
    assert.equal(legalMoves(view).length, 0);
    assert.throws(
      () => jevShoot({ ...state, turn: "jev", phase: "playing" }, 0, 0, view),
      /not a legal move/i,
    );
  });
});
