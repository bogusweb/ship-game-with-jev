use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BOARD_SIZE,
  FLEET_LENGTHS,
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
} from "@/lib/jev/client";
import { shipAtCell } from "@/lib/game/placement";
import {
  shipName,
  translateEngineError,
  useLocale,
  type Translate,
} from "@/lib/i18n";
import type { CellVisual } from "./board-cell";
import { GameBoard } from "./game-board";
import { LanguageSwitcher } from "./language-switcher";
import { MoveJournal } from "./move-journal";
import {
  PlayerShotPrediction,
  type PredictionStatus,
} from "./player-shot-prediction";
import { TurnIndicator, turnKindFromState } from "./turn-indicator";

type StatusState =
  | { code: "placeFleet" }
  | { code: "placing"; length: number; placed: number; total: number }
  | { code: "placingClick"; length: number }
  | { code: "fleetReady" }
  | { code: "autoPlaced" }
  | { code: "hitAgain" }
  | { code: "missJevThinking" }
  | { code: "sunkJevShip"; length: number }
  | { code: "jevSunkYourShip"; length: number }
  | { code: "jevHitAgain" }
  | { code: "jevMissed" }
  | { code: "won" }
  | { code: "lost" }
  | { code: "engine"; message: string }
  | { code: "invalidPlacement" }
  | { code: "invalidShot" };

function formatStatus(t: Translate, status: StatusState): string {
  switch (status.code) {
    case "placeFleet":
      return t("status.placeFleet");
    case "placing":
      return t("status.placing", {
        ship: shipName(t, status.length),
        length: status.length,
        placed: status.placed,
        total: status.total,
      });
    case "placingClick":
      return t("status.placingClick", {
        ship: shipName(t, status.length),
        length: status.length,
      });
    case "fleetReady":
      return t("status.fleetReady");
    case "autoPlaced":
      return t("status.autoPlaced");
    case "hitAgain":
      return t("status.hitAgain");
    case "missJevThinking":
      return t("status.missJevThinking");
    case "sunkJevShip":
      return t("status.sunkJevShip", { ship: shipName(t, status.length) });
    case "jevSunkYourShip":
      return t("status.jevSunkYourShip", { ship: shipName(t, status.length) });
    case "jevHitAgain":
      return t("status.jevHitAgain");
    case "jevMissed":
      return t("status.jevMissed");
    case "won":
      return t("status.won");
    case "lost":
      return t("status.lost");
    case "engine":
      return translateEngineError(t, status.message);
    case "invalidPlacement":
      return t("status.invalidPlacement");
    case "invalidShot":
      return t("status.invalidShot");
  }
}

let sessionGate: Promise<void> | null = null;

function ensurePlaySession() {
  if (!sessionGate) {
    sessionGate = fetch("/api/jev/session", { credentials: "same-origin" })
      .then(() => undefined)
      .catch(() => undefined);
  }
  return sessionGate;
}

async function postJev(request: JevShotRequest) {
  await ensurePlaySession();
  const res = await fetch("/api/jev/shot", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error("Too many requests. Try again in a moment.");
    }
    if (res.status === 403) {
      sessionGate = null;
      throw new Error("Could not start a play session. Refresh and try again.");
    }
    throw new Error(
      typeof data.error === "string" ? data.error : `Jev API failed (${res.status})`,
    );
  }
  return res.json();
}

export function GameShell() {
  const { t } = useLocale();
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
  const [status, setStatus] = useState<StatusState>({ code: "placeFleet" });
  const [matchShots, setMatchShots] = useState<PlayerShotRecord[]>([]);
  const [recentShots, setRecentShots] = useState<PlayerShotRecord[]>([]);
  const [predictionStatus, setPredictionStatus] =
    useState<PredictionStatus>("empty");
  const [predictionLabel, setPredictionLabel] = useState<string | undefined>();
  const [predictionPercent, setPredictionPercent] = useState<number | undefined>();
  const [predictionFailed, setPredictionFailed] = useState(false);

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
        setStatus({ code: "fleetReady" });
      } else {
        const len = nextShipLength(next.playerBoard);
        setStatus({ code: "placingClick", length: len ?? 2 });
      }
    } catch (e) {
      setStatus(
        e instanceof Error
          ? { code: "engine", message: e.message }
          : { code: "invalidPlacement" },
      );
    }
  };

  const handleAutoPlace = () => {
    const next = autoPlacePlayerFleet(game);
    setGame(next);
    setStatus({ code: "autoPlaced" });
  };

  const applyPrediction = useCallback((result: {
    prediction?: { label: string; chosenPercent: number } | null;
    predictionError?: string | null;
  }) => {
    if (result.prediction) {
      setPredictionStatus("ready");
      setPredictionLabel(result.prediction.label);
      setPredictionPercent(result.prediction.chosenPercent);
      setPredictionFailed(false);
      return;
    }
    setPredictionStatus("error");
    setPredictionFailed(true);
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
            setStatus({
              code: "jevSunkYourShip",
              length: outcome.result.shipLength ?? 2,
            });
          } else if (outcome.result.outcome === "hit") {
            setStatus({ code: "jevHitAgain" });
          } else {
            setStatus({ code: "jevMissed" });
          }

          if (currentState.phase === "lost") {
            setStatus({ code: "lost" });
            break;
          }
        }
      } catch (e) {
        setJevError(
          e instanceof Error ? e.message : "Jev could not choose a shot",
        );
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
      setPredictionFailed(false);

      if (result.outcome === "sunk") {
        setStatus({ code: "sunkJevShip", length: result.shipLength ?? 2 });
      } else if (result.outcome === "hit") {
        setStatus({ code: "hitAgain" });
      } else {
        setStatus({ code: "missJevThinking" });
      }

      if (state.phase === "won") {
        setStatus({ code: "won" });
        void runPredictionOnly(history, playerTargets, playerView);
        return;
      }

      if (state.turn === "jev") {
        void runJevTurn(state, playerView, history, playerTargets);
      } else {
        void runPredictionOnly(history, playerTargets, playerView);
      }
    } catch (e) {
      setStatus(
        e instanceof Error
          ? { code: "engine", message: e.message }
          : { code: "invalidShot" },
      );
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
    setPredictionFailed(false);
    setStatus({ code: "placeFleet" });
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
    void ensurePlaySession();
  }, []);

  useEffect(() => {
    const stored = loadStoredPlayerShotHistory();
    const recent = archiveMatchShots(stored.thisMatch, stored.recent);
    setRecentShots(recent);
    saveStoredPlayerShotHistory([], recent);
  }, []);

  useEffect(() => {
    if (game.phase === "placement" && currentShipLength) {
      setStatus({
        code: "placing",
        length: currentShipLength,
        placed: placedCount,
        total: FLEET_LENGTHS.length,
      });
    }
  }, [game.phase, currentShipLength, placedCount]);

  const gameOver = game.phase === "won" || game.phase === "lost";
  const turnKind = turnKindFromState({
    phase: game.phase,
    turn: game.turn,
    isJevThinking,
  });
  const playerRemaining =
    game.phase === "placement"
      ? [...FLEET_LENGTHS]
      : unsunkShipLengths(game.playerBoard);
  const jevRemaining = unsunkShipLengths(game.jevBoard);

  return (
    <div className="min-h-full bg-[#fefce4] px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-8">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-left">
            <h1 className="text-3xl font-bold tracking-tight text-[#2c1810] sm:text-4xl">
              <span className="text-[#dc6b5e]">ship</span>{" "}
              <span>game</span>{" "}
              <span className="text-[#4a9d93]">with jev</span>
            </h1>
            <p className="mt-1 text-sm text-[#5c4a3a]/80">
              {t("chrome.tagline")}
            </p>
          </div>
          <LanguageSwitcher />
        </header>

        <TurnIndicator kind={turnKind} />

        <p className="min-h-10 text-sm text-[#5c4a3a]/80">
          {formatStatus(t, status)}
        </p>

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
                {t("action.rotate", {
                  orientation: t(
                    orientation === "horizontal"
                      ? "orientation.horizontal"
                      : "orientation.vertical",
                  ),
                })}
              </Button>
              <Button
                className="bg-[#e8ba3f] text-[#2c1810] hover:bg-[#d9ab30]"
                onClick={handleAutoPlace}
              >
                {t("action.autoPlace")}
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
                title={t("board.yourFleet")}
                subtitle={
                  game.phase === "placement"
                    ? t("board.yourFleet.place")
                    : t("board.yourFleet.playing")
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
                  ? t("status.previewAt", {
                      label: cellLabel(hoverCell.row, hoverCell.col),
                    })
                  : "\u00a0"}
              </p>
            </div>

            <GameBoard
              title={t("board.jevWaters")}
              subtitle={
                game.phase === "placement"
                  ? t("board.jevWaters.locked")
                  : game.phase === "playing" && !gameOver
                    ? t("board.jevWaters.fire")
                    : t("board.jevWaters.over")
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
              error={predictionFailed ? t("prediction.error") : null}
            />
            <MoveJournal
              history={history}
              thinking={isJevThinking}
              error={jevError ? translateEngineError(t, jevError) : null}
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
              {gameOver ? t("action.anotherRound") : t("action.restart")}
            </Button>
          ) : null}
        </div>

        <footer className="text-center text-xs text-[#5c4a3a]/50">
          {t("footer.jevBy")}{" "}
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
