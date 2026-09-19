import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOARD_SIZE, FLEET_LENGTHS } from "./constants";
import {
  allFleetPlaced,
  createEmptyBoard,
  listValidPlacements,
  placeShip,
  randomFleetPlacement,
  validatePlacement,
} from "./placement";
import {
  allShipsSunk,
  createOpponentView,
  fireAt,
  legalMoves,
} from "./shooting";
import type { ShipPlacement } from "./types";

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

describe("shooting", () => {
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
