import {
  allFleetPlaced,
  createEmptyBoard,
  nextShipLength,
  placeShip,
  randomFleetPlacement,
} from "./placement";
import {
  allShipsSunk,
  createOpponentView,
  fireAt,
} from "./shooting";
import type {
  GamePhase,
  GameState,
  OpponentView,
  Orientation,
  PlayerBoard,
  ShotResult,
  ShipPlacement,
} from "./types";

export function createNewGame(): GameState {
  return {
    phase: "placement",
    playerBoard: createEmptyBoard(),
    opponentView: createOpponentView(),
    jevBoard: randomFleetPlacement(),
    turn: "player",
    moveCount: 0,
  };
}

export function placePlayerShip(
  state: GameState,
  origin: { row: number; col: number },
  orientation: Orientation,
): GameState {
  if (state.phase !== "placement") {
    throw new Error("Not in placement phase");
  }

  const length = nextShipLength(state.playerBoard);
  if (!length) {
    throw new Error("All ships already placed");
  }

  const placement: ShipPlacement = {
    id: `player-${state.playerBoard.ships.length}`,
    length,
    orientation,
    origin,
  };

  const playerBoard = placeShip(state.playerBoard, placement);
  const phase: GamePhase = allFleetPlaced(playerBoard) ? "playing" : "placement";

  return {
    ...state,
    playerBoard,
    phase,
    turn: "player",
  };
}

export function autoPlacePlayerFleet(state: GameState): GameState {
  return {
    ...state,
    playerBoard: randomFleetPlacement(),
    phase: "playing",
    turn: "player",
  };
}

export type PlayerShotOutcome = {
  state: GameState;
  result: ShotResult;
};

export function playerShoot(
  state: GameState,
  row: number,
  col: number,
): PlayerShotOutcome {
  if (state.phase !== "playing" || state.turn !== "player") {
    throw new Error("Not player's turn to shoot");
  }

  const { board, view, result } = fireAt(
    state.jevBoard,
    state.opponentView,
    row,
    col,
  );

  let phase: GamePhase = "playing";
  if (allShipsSunk(board)) {
    phase = "won";
  }

  const next: GameState = {
    ...state,
    jevBoard: board,
    opponentView: view,
    phase,
    turn: allShipsSunk(board) ? "player" : "jev",
    moveCount: state.moveCount + 1,
  };

  return { state: next, result };
}

export type JevShotOutcome = {
  state: GameState;
  result: ShotResult;
  playerView: OpponentView;
};

export function jevShoot(
  state: GameState,
  row: number,
  col: number,
  playerView: OpponentView,
): JevShotOutcome {
  if (state.phase !== "playing" || state.turn !== "jev") {
    throw new Error("Not Jev's turn to shoot");
  }

  const { board, view, result } = fireAt(
    state.playerBoard,
    playerView,
    row,
    col,
  );

  let phase: GamePhase = "playing";
  if (allShipsSunk(board)) {
    phase = "lost";
  }

  const next: GameState = {
    ...state,
    playerBoard: board,
    phase,
    turn: allShipsSunk(board) ? "jev" : "player",
    moveCount: state.moveCount + 1,
  };

  return { state: next, result, playerView: view };
}

export function createPlayerAttackView(): OpponentView {
  return createOpponentView();
}

export function getPlayerShipGrid(board: PlayerBoard): ("ship" | "empty")[][] {
  const grid = Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => "empty" as "ship" | "empty"),
  );
  for (const ship of board.ships) {
    for (const cell of ship.cells) {
      grid[cell.row][cell.col] = "ship";
    }
  }
  return grid;
}
