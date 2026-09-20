"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BOARD_SIZE,
  FLEET_LENGTHS,
  SHIP_NAMES,
  autoPlacePlayerFleet,
  cellLabel,
  createNewGame,
  createPlayerAttackView,
  getShipCells,
  jevShoot,
  legalMoves,
  nextShipLength,
  placePlayerShip,
  playerShoot,
  unsunkShipLengths,
  validatePlacement,
} from "@/lib/game";
import type { GameState, OpponentView, Orientation, ShotCellState } from "@/lib/game";
import {
  makeJevHistoryItem,
  makeYouHistoryItem,
  type MatchHistoryItem,
} from "@/lib/game/match-history";
import {
  archiveMatchShots,
  loadStoredPlayerShotHistory,
  makePlayerShotRecord,
  saveStoredPlayerShotHistory,
  type PlayerShotRecord,
} from "@/lib/game/player-shot-history";
import {
  toJournalEntry,
  type JevShotRequest,
  type JevShotResponse,
  type PlayerNextShotResponse,
} from "@/lib/jev/shot";
import { shipAtCell } from "@/lib/game/placement";
import type { CellVisual } from "./board-cell";
import { GameBoard } from "./game-board";
import { MoveJournal } from "./move-journal";
import {
  PlayerShotPrediction,
  type PredictionStatus,
} from "./player-shot-prediction";
import { TurnIndicator, turnKindFromState } from "./turn-indicator";

async function postJev(request: JevShotRequest) {
  const res = await fetch("/api/jev/shot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Jev API failed (${res.status})`);
  }
  return res.json();
}

export function GameShell() {
  const [game, setGame] = useState<GameState>(() => createNewGame());
  const [playerView, setPlayerView] = useState<OpponentView>(() =>
    createPlayerAttackView(),
  );
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(
    null,
  );
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [isJevThinking, setIsJevThinking] = useState(false);
  const [jevError, setJevError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Place your fleet on the left board.");
  const [matchShots, setMatchShots] = useState<PlayerShotRecord[]>([]);
  const [recentShots, setRecentShots] = useState<PlayerShotRecord[]>([]);
  const [predictionStatus, setPredictionStatus] =
    useState<PredictionStatus>("empty");
  const [predictionLabel, setPredictionLabel] = useState<string | undefined>();
  const [predictionPercent, setPredictionPercent] = useState<number | undefined>();
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const currentShipLength = nextShipLength(game.playerBoard);
  const placedCount = game.playerBoard.ships.length;

  const previewCells = useMemo(() => {
    if (!hoverCell || !currentShipLength || game.phase !== "placement") {
      return new Map<string, "preview" | "invalid">();
    }
    const cells = getShipCells(hoverCell, currentShipLength, orientation);
    const map = new Map<string, "preview" | "invalid">();
    const error = validatePlacement(game.playerBoard, {
      id: "preview",
      length: currentShipLength,
      orientation,
      origin: hoverCell,
    });
    for (const c of cells) {
      if (c.row < 0 || c.row >= BOARD_SIZE || c.col < 0 || c.col >= BOARD_SIZE) {
        map.set(`${c.row},${c.col}`, "invalid");
      } else {
        map.set(`${c.row},${c.col}`, error ? "invalid" : "preview");
      }
    }
    return map;
  }, [hoverCell, currentShipLength, orientation, game.playerBoard, game.phase]);

  const playerBoardVisual = useCallback(
    (row: number, col: number): CellVisual => {
      const key = `${row},${col}`;
      const preview = previewCells.get(key);
      if (preview) return preview;

      const shot = playerView.cells[row][col];
      if (shot === "hit") return "hit";
      if (shot === "miss") return "miss";
      if (shot === "halo") return "halo";

      if (shipAtCell(game.playerBoard, row, col)) return "ship";
      return "empty";
    },
    [game.playerBoard, playerView, previewCells],
  );

  const jevBoardVisual = useCallback(
    (row: number, col: number): CellVisual => {
      const shot = game.opponentView.cells[row][col] as ShotCellState;
      if (shot === "hit") return "hit";
      if (shot === "miss") return "miss";
      if (shot === "halo") return "halo";
      return "unknown";
    },
    [game.opponentView],
  );

  const handlePlaceClick = (row: number, col: number) => {
    if (game.phase !== "placement" || !currentShipLength) return;
    try {
      const next = placePlayerShip(game, { row, col }, orientation);
      setGame(next);
      if (next.phase === "playing") {
        setStatus("Fleet ready! Fire at Jev's waters on the right.");
      } else {
        const len = nextShipLength(next.playerBoard);
        setStatus(
          `Placing ${SHIP_NAMES[len ?? 2] ?? "ship"} (length ${len}). Click to place, R to rotate.`,
        );
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Invalid placement");
    }
  };

  const handleAutoPlace = () => {
    const next = autoPlacePlayerFleet(game);
    setGame(next);
    setStatus("Fleet auto-placed. Fire at Jev's waters on the right.");
  };

  const applyPrediction = useCallback((result: {
    prediction?: { label: string; chosenPercent: number } | null;
    predictionError?: string | null;
  }) => {
    if (result.prediction) {
      setPredictionStatus("ready");
      setPredictionLabel(result.prediction.label);
      setPredictionPercent(result.prediction.chosenPercent);
      setPredictionError(null);
      return;
    }
    setPredictionStatus("error");
    setPredictionError(
      result.predictionError || "Could not predict your next shot.",
    );
  }, []);

  const runJevTurn = useCallback(
    async (
      state: GameState,
      view: OpponentView,
      history: { thisMatch: PlayerShotRecord[]; recent: PlayerShotRecord[] },
      playerLegalTargets: { row: number; col: number }[],
    ) => {
      setIsJevThinking(true);
      setJevError(null);

      let currentState = state;
      let currentView = view;
      let askedPrediction = false;

      try {
        while (
          currentState.phase === "playing" &&
          currentState.turn === "jev"
        ) {
          const moves = legalMoves(currentView);
          if (moves.length === 0) throw new Error("No legal moves for Jev");

          const jevResponse = (await postJev({
            move: currentState.moveCount + 1,
            legalMoves: moves,
            playerView: currentView,
            playerShotHistory: history,
            playerLegalTargets: askedPrediction
              ? undefined
              : playerLegalTargets,
          })) as JevShotResponse;
          if (!askedPrediction) {
            askedPrediction = true;
            if (playerLegalTargets.length > 0) {
              applyPrediction(jevResponse);
            }
          }
          const chosen = jevResponse.chosen;
          const entry = toJournalEntry(currentState.moveCount + 1, jevResponse);

          const outcome = jevShoot(
            currentState,
            chosen.row,
            chosen.col,
            currentView,
          );
          currentState = outcome.state;
          currentView = outcome.playerView;
          setHistory((prev) => [
            ...prev,
            makeJevHistoryItem({
              journal: entry,
              outcome: outcome.result.outcome,
            }),
          ]);
          setGame(currentState);
          setPlayerView(currentView);

          if (outcome.result.outcome === "sunk") {
            setStatus(
              `Jev sunk your ${SHIP_NAMES[outcome.result.shipLength ?? 2] ?? "ship"}!`,
            );
          } else if (outcome.result.outcome === "hit") {
            setStatus("Jev hit — firing again…");
          } else {
            setStatus("Jev missed. Your turn.");
          }

          if (currentState.phase === "lost") {
            setStatus("Jev sank your fleet. Better luck next round!");
            break;
          }
        }
      } catch (e) {
        setJevError(e instanceof Error ? e.message : "Jev could not choose a shot");
        if (!askedPrediction) {
          applyPrediction({
            prediction: null,
            predictionError: "Could not predict your next shot.",
          });
        }
      } finally {
        setIsJevThinking(false);
      }
    },
    [applyPrediction],
  );

  const runPredictionOnly = useCallback(
    async (
      history: { thisMatch: PlayerShotRecord[]; recent: PlayerShotRecord[] },
      playerLegalTargets: { row: number; col: number }[],
      view: OpponentView,
    ) => {
      if (playerLegalTargets.length === 0) {
        setPredictionStatus("empty");
        return;
      }
      try {
        const response = (await postJev({
          move: 0,
          legalMoves: [],
          playerView: view,
          playerShotHistory: history,
          playerLegalTargets,
        })) as PlayerNextShotResponse;
        applyPrediction(response);
      } catch {
        applyPrediction({
          prediction: null,
          predictionError: "Could not predict your next shot.",
        });
      }
    },
    [applyPrediction],
  );

  const handleFire = (row: number, col: number) => {
    if (game.phase !== "playing" || game.turn !== "player" || isJevThinking) return;
    try {
      const { state, result } = playerShoot(game, row, col);
      setGame(state);

      const nextMatchShots = [
        ...matchShots,
        makePlayerShotRecord({ row, col }, result.outcome),
      ];
      setMatchShots(nextMatchShots);
      setHistory((prev) => [
        ...prev,
        makeYouHistoryItem({
          index: prev.length,
          label: cellLabel(row, col),
          outcome: result.outcome,
        }),
      ]);
      saveStoredPlayerShotHistory(nextMatchShots, recentShots);
      const history = { thisMatch: nextMatchShots, recent: recentShots };
      const playerTargets = legalMoves(state.opponentView);
      setPredictionStatus("loading");
      setPredictionError(null);

      if (result.outcome === "sunk") {
        setStatus(`Sunk! Jev's ${SHIP_NAMES[result.shipLength ?? 2] ?? "ship"} is gone.`);
      } else if (result.outcome === "hit") {
        setStatus("Hit! Fire again.");
      } else {
        setStatus("Miss. Jev is thinking…");
      }

      if (state.phase === "won") {
        setStatus("You sank Jev's fleet. Victory!");
        void runPredictionOnly(history, playerTargets, playerView);
        return;
      }

      if (state.turn === "jev") {
        void runJevTurn(state, playerView, history, playerTargets);
      } else {
        void runPredictionOnly(history, playerTargets, playerView);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Invalid shot");
    }
  };

  const handleNewGame = () => {
    const nextRecent = archiveMatchShots(matchShots, recentShots);
    setRecentShots(nextRecent);
    setMatchShots([]);
    saveStoredPlayerShotHistory([], nextRecent);
    setGame(createNewGame());
    setPlayerView(createPlayerAttackView());
    setHistory([]);
    setJevError(null);
    setIsJevThinking(false);
    setPredictionStatus("empty");
    setPredictionLabel(undefined);
    setPredictionPercent(undefined);
    setPredictionError(null);
    setStatus("Place your fleet on the left board.");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const stored = loadStoredPlayerShotHistory();
    const recent = archiveMatchShots(stored.thisMatch, stored.recent);
    setRecentShots(recent);
    saveStoredPlayerShotHistory([], recent);
  }, []);

  useEffect(() => {
    if (game.phase === "placement" && currentShipLength) {
      setStatus(
        `Placing ${SHIP_NAMES[currentShipLength] ?? "ship"} (length ${currentShipLength}). ${placedCount}/${FLEET_LENGTHS.length} placed. Press R to rotate.`,
      );
    }
  }, [game.phase, currentShipLength, placedCount]);

  const gameOver = game.phase === "won" || game.phase === "lost";
  const turnKind = turnKindFromState({
    phase: game.phase,
    turn: game.turn,
    isJevThinking,
  });
  const playerRemaining = unsunkShipLengths(game.playerBoard);
  const jevRemaining = unsunkShipLengths(game.jevBoard);

  return (
    <div className="min-h-full bg-[#fefce4] px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-8">
        <header className="text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-[#2c1810] sm:text-4xl">
            <span className="text-[#dc6b5e]">ship</span>{" "}
            <span>game</span>{" "}
            <span className="text-[#4a9d93]">with jev</span>
          </h1>
          <p className="mt-1 text-sm text-[#5c4a3a]/80">
            A little game of human vs. instinct.
          </p>
        </header>

        <TurnIndicator kind={turnKind} />

        <p className="min-h-10 text-sm text-[#5c4a3a]/80">{status}</p>

        <div className="flex min-h-8 flex-wrap gap-3">
          {game.phase === "placement" ? (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  setOrientation((o) =>
                    o === "horizontal" ? "vertical" : "horizontal",
                  )
                }
              >
                Rotate ({orientation})
              </Button>
              <Button
                className="bg-[#e8ba3f] text-[#2c1810] hover:bg-[#d9ab30]"
                onClick={handleAutoPlace}
              >
                Auto-place fleet
              </Button>
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-8">
          <div className="grid w-full min-w-0 gap-8 md:grid-cols-2">
            <div
              className="min-w-0"
              onMouseLeave={() => setHoverCell(null)}
            >
              <GameBoard
                title="Your fleet"
                subtitle={
                  game.phase === "placement"
                    ? "Place ships — no touching, even diagonally"
                    : "Jev fires here"
                }
                getCellVisual={playerBoardVisual}
                showShips
                remainingLengths={playerRemaining}
                remainingAccent="player"
                lastShot={game.lastJevShot}
                lastShotBy="jev"
                onCellClick={
                  game.phase === "placement" ? handlePlaceClick : undefined
                }
                onCellHover={(row, col) => setHoverCell({ row, col })}
                onCellLeave={() => setHoverCell(null)}
                canClick={() => game.phase === "placement"}
              />
              <p className="mt-2 min-h-4 text-xs text-[#5c4a3a]/60">
                {game.phase === "placement" && hoverCell
                  ? `Preview at ${cellLabel(hoverCell.row, hoverCell.col)}`
                  : "\u00a0"}
              </p>
            </div>

            <GameBoard
              title="Jev's waters"
              subtitle={
                game.phase === "placement"
                  ? "Locked until your fleet is placed"
                  : game.phase === "playing" && !gameOver
                    ? "Pick a square to fire"
                    : "Match over"
              }
              getCellVisual={jevBoardVisual}
              remainingLengths={jevRemaining}
              remainingAccent="jev"
              lastShot={game.lastPlayerShot}
              lastShotBy="player"
              isJevThinking={isJevThinking}
              onCellClick={handleFire}
              canClick={(row, col) =>
                game.phase === "playing" &&
                game.turn === "player" &&
                !isJevThinking &&
                game.opponentView.cells[row][col] === "unknown"
              }
            />
          </div>

          <div className="flex w-full min-w-0 flex-col gap-4">
            <PlayerShotPrediction
              status={predictionStatus}
              label={predictionLabel}
              percent={predictionPercent}
              error={predictionError}
            />
            <MoveJournal
              history={history}
              thinking={isJevThinking}
              error={jevError}
            />
          </div>
        </div>

        <div className="flex min-h-9 justify-center">
          {gameOver || game.phase === "playing" ? (
            <Button
              size="lg"
              className="bg-[#e8ba3f] text-[#2c1810] hover:bg-[#d9ab30]"
              onClick={handleNewGame}
            >
              {gameOver ? "Another round" : "Restart game"}
            </Button>
          ) : null}
        </div>

        <footer className="text-center text-xs text-[#5c4a3a]/50">
          Jev by{" "}
          <a
            href="https://typesafe.ai"
            className="text-[#4a9d93] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            TypeSafe
          </a>
        </footer>
      </div>
    </div>
  );
}
