"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  FLEET_LENGTHS,
  autoPlacePlayerFleet,
  cellLabel,
  createNewGame,
  createPlayerAttackView,
  draftComplete,
  draftFromBoard,
  draftIndexAtCell,
  draftPlacementError,
  draftShips,
  emptyDraft,
  gameFromDraft,
  jevShoot,
  legalMoves,
  nextDraftIndex,
  ownBoardShips,
  playerShoot,
  revealedOpponentShips,
  unsunkShipLengths,
} from "@/lib/game";
import type {
  Coord,
  DraftShip,
  GameState,
  OpponentView,
  Orientation,
} from "@/lib/game";
import {
  makeJevHistoryItem,
  makeYouHistoryItem,
  type MatchHistoryItem,
} from "@/lib/game/match-history";
import {
  loadFireOnClick,
  saveFireOnClick,
} from "@/lib/game/fire-on-click";
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
import { shipName, translateEngineError, useLocale, type Translate } from "@/lib/i18n";
import { AttackConsole } from "./nocna-wachta/attack-console";
import {
  FleetStrip,
  Legend,
  PageFooter,
  TopBar,
  TurnPill,
  type TurnPillKind,
} from "./nocna-wachta/chrome";
import { FleetScreen } from "./nocna-wachta/fleet-screen";
import { Icon } from "./nocna-wachta/icons";
import { JevCard, type PredictionStatus } from "./nocna-wachta/jev-card";
import { OperationsLog } from "./nocna-wachta/operations-log";
import { ResultScreen } from "./nocna-wachta/result-screen";
import { RulesDialog } from "./nocna-wachta/rules-dialog";
import { SeaBoard } from "./nocna-wachta/sea-board";
import { SetupScreen } from "./nocna-wachta/setup-screen";

type StatusState =
  | { code: "placeFleet" }
  | { code: "setupPlaced" }
  | { code: "setupMove" }
  | { code: "setupAutoPlaced" }
  | { code: "setupReady" }
  | { code: "fleetReady" }
  | { code: "targetSelected"; label: string }
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

function formatJevQuote(t: Translate, status: StatusState): string {
  switch (status.code) {
    case "hitAgain":
    case "sunkJevShip":
      return t("jev.quote.playerHit");
    case "missJevThinking":
      return t("jev.quote.playerMiss");
    case "jevHitAgain":
      return t("jev.quote.jevHit");
    case "jevSunkYourShip":
      return t("jev.quote.jevSunk");
    case "jevMissed":
      return t("jev.quote.jevMiss");
    case "won":
      return t("jev.quote.won");
    case "lost":
      return t("jev.quote.lost");
    default:
      return t("jev.quote.ready");
  }
}

function formatStatus(t: Translate, status: StatusState): string {
  switch (status.code) {
    case "placeFleet":
      return t("setup.statusHint");
    case "setupPlaced":
      return t("setup.statusPlaced");
    case "setupMove":
      return t("setup.statusMove");
    case "setupAutoPlaced":
      return t("setup.statusAutoPlaced");
    case "setupReady":
      return t("setup.statusReady");
    case "fleetReady":
      return t("status.fleetReady");
    case "targetSelected":
      return t("status.targetLocked", { label: status.label });
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

type Screen = "game" | "fleet";

export function GameShell() {
  const { t } = useLocale();
  const [game, setGame] = useState<GameState>(() => createNewGame());
  const [playerView, setPlayerView] = useState<OpponentView>(() =>
    createPlayerAttackView(),
  );
  const [screen, setScreen] = useState<Screen>("game");
  const [focusShip, setFocusShip] = useState(0);

  const [draft, setDraft] = useState<(DraftShip | null)[]>(() => emptyDraft());
  const [activeSlot, setActiveSlot] = useState<number | null>(0);
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [hoverCell, setHoverCell] = useState<Coord | null>(null);

  const [selected, setSelected] = useState<Coord | null>(null);
  const [fireOnClick, setFireOnClick] = useState(() =>
    typeof window !== "undefined" ? loadFireOnClick() : true,
  );
  const [scan, setScan] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

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
  const [predictionCell, setPredictionCell] = useState<Coord | null>(null);
  const [predictionFailed, setPredictionFailed] = useState(false);

  const gameOver = game.phase === "won" || game.phase === "lost";
  const statusText = formatStatus(t, status);
  const jevQuote = formatJevQuote(t, status);

  const activeLength = activeSlot != null ? FLEET_LENGTHS[activeSlot] : null;
  const placementError = useMemo(() => {
    if (!hoverCell || activeSlot == null || activeLength == null) return null;
    return draftPlacementError(draft, {
      index: activeSlot,
      length: activeLength,
      origin: hoverCell,
      orientation,
    });
  }, [draft, hoverCell, activeSlot, activeLength, orientation]);

  /* Placement ------------------------------------------------------------- */

  const handlePlace = (row: number, col: number) => {
    const occupied = draftIndexAtCell(draft, row, col);
    if (occupied != null) {
      const ship = draft[occupied];
      setDraft((prev) => prev.map((e, i) => (i === occupied ? null : e)));
      setActiveSlot(occupied);
      if (ship) setOrientation(ship.orientation);
      setStatus({ code: "setupMove" });
      return;
    }
    if (activeSlot == null || activeLength == null) return;

    const candidate: DraftShip = {
      index: activeSlot,
      length: activeLength,
      origin: { row, col },
      orientation,
    };
    const error = draftPlacementError(draft, candidate);
    if (error) {
      setStatus({ code: "engine", message: error });
      return;
    }

    const next = draft.map((entry, i) => (i === activeSlot ? candidate : entry));
    setDraft(next);
    const following = nextDraftIndex(next);
    setActiveSlot(following);
    setHoverCell(null);
    setStatus(following == null ? { code: "setupReady" } : { code: "setupPlaced" });
  };

  const handleAutoDeploy = () => {
    const board = autoPlacePlayerFleet(createNewGame()).playerBoard;
    setDraft(draftFromBoard(board));
    setActiveSlot(null);
    setHoverCell(null);
    setStatus({ code: "setupAutoPlaced" });
  };

  const handleClearDraft = () => {
    setDraft(emptyDraft());
    setActiveSlot(0);
    setHoverCell(null);
    setStatus({ code: "placeFleet" });
  };

  const handleStartBattle = () => {
    if (!draftComplete(draft)) return;
    try {
      setGame((prev) => gameFromDraft(prev, draft));
      setStatus({ code: "fleetReady" });
      setSelected(null);
    } catch (e) {
      setStatus(
        e instanceof Error
          ? { code: "engine", message: e.message }
          : { code: "invalidPlacement" },
      );
    }
  };

  /* Jev turn -------------------------------------------------------------- */

  const applyPrediction = useCallback(
    (result: {
      prediction?: {
        label: string;
        chosenPercent: number;
        chosen?: Coord;
      } | null;
    }) => {
      if (result.prediction) {
        setPredictionStatus("ready");
        setPredictionLabel(result.prediction.label);
        setPredictionPercent(result.prediction.chosenPercent);
        setPredictionCell(result.prediction.chosen ?? null);
        setPredictionFailed(false);
        return;
      }
      setPredictionStatus("error");
      setPredictionCell(null);
      setPredictionFailed(true);
    },
    [],
  );

  const runJevTurn = useCallback(
    async (
      state: GameState,
      view: OpponentView,
      shotHistory: { thisMatch: PlayerShotRecord[]; recent: PlayerShotRecord[] },
      playerLegalTargets: Coord[],
    ) => {
      setIsJevThinking(true);
      setJevError(null);

      let currentState = state;
      let currentView = view;
      let askedPrediction = false;

      try {
        while (currentState.phase === "playing" && currentState.turn === "jev") {
          const moves = legalMoves(currentView);
          if (moves.length === 0) throw new Error("No legal moves for Jev");

          const jevResponse = (await postJev({
            move: currentState.moveCount + 1,
            legalMoves: moves,
            playerView: currentView,
            playerShotHistory: shotHistory,
            playerLegalTargets: askedPrediction ? undefined : playerLegalTargets,
          })) as JevShotResponse;

          if (!askedPrediction) {
            askedPrediction = true;
            if (playerLegalTargets.length > 0) applyPrediction(jevResponse);
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
        setJevError(e instanceof Error ? e.message : "Jev could not choose a shot");
        if (!askedPrediction) {
          applyPrediction({ prediction: null });
        }
      } finally {
        setIsJevThinking(false);
      }
    },
    [applyPrediction],
  );

  const runPredictionOnly = useCallback(
    async (
      shotHistory: { thisMatch: PlayerShotRecord[]; recent: PlayerShotRecord[] },
      playerLegalTargets: Coord[],
      view: OpponentView,
    ) => {
      if (playerLegalTargets.length === 0) {
        setPredictionStatus("empty");
        setPredictionCell(null);
        return;
      }
      try {
        const response = (await postJev({
          move: 0,
          legalMoves: [],
          playerView: view,
          playerShotHistory: shotHistory,
          playerLegalTargets,
        })) as PlayerNextShotResponse;
        applyPrediction(response);
      } catch {
        applyPrediction({ prediction: null });
      }
    },
    [applyPrediction],
  );

  /* Firing ---------------------------------------------------------------- */

  const canSelect = (row: number, col: number) =>
    game.phase === "playing" &&
    game.turn === "player" &&
    !isJevThinking &&
    game.opponentView.cells[row][col] === "unknown";

  const fireAt = (row: number, col: number) => {
    if (!canSelect(row, col)) return;
    setSelected(null);

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

      const shotHistory = { thisMatch: nextMatchShots, recent: recentShots };
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
        void runPredictionOnly(shotHistory, playerTargets, playerView);
        return;
      }

      if (state.turn === "jev") {
        void runJevTurn(state, playerView, shotHistory, playerTargets);
      } else {
        void runPredictionOnly(shotHistory, playerTargets, playerView);
      }
    } catch (e) {
      setStatus(
        e instanceof Error
          ? { code: "engine", message: e.message }
          : { code: "invalidShot" },
      );
    }
  };

  const handleSelect = (row: number, col: number) => {
    if (!canSelect(row, col)) return;
    if (fireOnClick) {
      fireAt(row, col);
      return;
    }
    setSelected({ row, col });
    setStatus({ code: "targetSelected", label: cellLabel(row, col) });
  };

  const handleCellConfirm = (row: number, col: number) => {
    if (!canSelect(row, col)) return;
    if (fireOnClick) {
      fireAt(row, col);
      return;
    }
    if (selected?.row === row && selected.col === col) {
      fireAt(row, col);
      return;
    }
    setSelected({ row, col });
    setStatus({ code: "targetSelected", label: cellLabel(row, col) });
  };

  const handleFireOnClickChange = (value: boolean) => {
    setFireOnClick(value);
    saveFireOnClick(value);
    setSelected(null);
  };

  const lockedTarget = fireOnClick ? null : selected;

  const handleFire = () => {
    if (!selected) return;
    fireAt(selected.row, selected.col);
  };

  const handleNewGame = () => {
    const nextRecent = archiveMatchShots(matchShots, recentShots);
    setRecentShots(nextRecent);
    setMatchShots([]);
    saveStoredPlayerShotHistory([], nextRecent);
    setGame(createNewGame());
    setPlayerView(createPlayerAttackView());
    setDraft(emptyDraft());
    setActiveSlot(0);
    setOrientation("horizontal");
    setHoverCell(null);
    setSelected(null);
    setScan(false);
    setScreen("game");
    setFocusShip(0);
    setHistory([]);
    setJevError(null);
    setIsJevThinking(false);
    setPredictionStatus("empty");
    setPredictionLabel(undefined);
    setPredictionPercent(undefined);
    setPredictionCell(null);
    setPredictionFailed(false);
    setStatus({ code: "placeFleet" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (game.phase !== "placement") return;
      const target = e.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable]")) return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game.phase]);

  const previousPhase = useRef(game.phase);
  useLayoutEffect(() => {
    const from = previousPhase.current;
    previousPhase.current = game.phase;
    if (from === "placement" && game.phase === "playing") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [game.phase]);

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
    if (game.turn !== "player" || isJevThinking) {
      setSelected(null);
    }
  }, [game.turn, isJevThinking]);

  /* Derived view data ----------------------------------------------------- */

  const jevSunkLengths = game.opponentView.sunkShipLengths;
  const playerSunkLengths = game.playerBoard.ships
    .filter((ship) => ship.sunk)
    .map((ship) => ship.length);
  const playerAfloat =
    game.phase === "placement"
      ? draftShips(draft).length
      : unsunkShipLengths(game.playerBoard).length;

  const turnKind: TurnPillKind = gameOver
    ? "complete"
    : game.phase === "placement"
      ? "placement"
      : isJevThinking
        ? "jev-thinking"
        : "your-turn";

  const playerHits = matchShots.filter((shot) => shot.outcome !== "MISS").length;

  const battle = (
    <div className="workspace">
      <aside className="sidebar">
        <section className="mission">
          <div className="mission-eyebrow">
            <span className="dot" /> {t("mission.eyebrow")}
          </div>
          <h1>
            {t("mission.titleLine1")}
            <br />
            {t("mission.titleLine2")}
          </h1>
          <p>
            {t("mission.bodyLine1")}
            <br />
            {t("mission.bodyLine2")}
          </p>
        </section>

        <JevCard
          quote={jevQuote}
          predictionStatus={predictionStatus}
          predictionLabel={predictionLabel}
          predictionPercent={predictionPercent}
          predictionError={predictionFailed ? t("prediction.error") : null}
          busy={isJevThinking}
        />

        <section className="mini-fleet">
          <div className="mini-fleet-header">
            <h2>{t("board.yourFleet")}</h2>
            <span>{t("sidebar.fleetAfloat", { afloat: playerAfloat })}</span>
            <button
              type="button"
              className="text-btn"
              aria-label={t("action.fleetOverview")}
              onClick={() => setScreen("fleet")}
            >
              <Icon name="arrow" />
            </button>
          </div>
          <SeaBoard
            ariaLabel={t("board.yourFleet")}
            cellState={(row, col) => playerView.cells[row][col]}
            ships={ownBoardShips(game.playerBoard)}
          />
          <FleetStrip
            lengths={FLEET_LENGTHS}
            sunkLengths={playerSunkLengths}
          />
        </section>

        <div className="sidebar-bottom">
          <Icon name="shield" />
          <span>
            {t("sidebar.hiddenLine1")}
            <br />
            {t("sidebar.hiddenLine2")}
          </span>
        </div>
      </aside>

      <section className="battle-main">
        <header className="battle-heading">
          <div>
            <h2>{t("battle.title")}</h2>
            <p>{t("battle.subtitle")}</p>
          </div>
          <TurnPill kind={turnKind} move={Math.max(1, game.moveCount)} />
        </header>

        <div
          className="theater"
          onPointerDown={(event) => {
            if (fireOnClick) {
              const active = document.activeElement;
              if (
                active instanceof Element &&
                active.closest(".battle-main .board-art .cell")
              ) {
                (active as HTMLElement).blur();
              }
            }
          }}
        >
          <div className="theater-top">
            <span className="sector">{t("battle.sector")}</span>
            <label className="scan-toggle">
              <input
                type="checkbox"
                checked={scan}
                onChange={(e) => setScan(e.target.checked)}
              />
              {t("battle.scanToggle")}
            </label>
          </div>
          <SeaBoard
            ariaLabel={t("board.jevWaters")}
            cellState={(row, col) => game.opponentView.cells[row][col]}
            ships={revealedOpponentShips(game.jevBoard)}
            selected={lockedTarget}
            predicted={scan ? predictionCell : null}
            keyboardLockMode={!fireOnClick}
            onCellActivate={handleSelect}
            onCellConfirm={handleCellConfirm}
            isCellEnabled={canSelect}
            cellHint={(row, col, state) =>
              state === "unknown"
                ? t(fireOnClick ? "cell.fireHint" : "cell.targetHint")
                : t("cell.alreadyFired")
            }
          />
          <div className="theater-bottom">
            <FleetStrip
              lengths={FLEET_LENGTHS}
              sunkLengths={jevSunkLengths}
              showCount={false}
              aria-label={t("battle.sunkCount", { sunk: jevSunkLengths.length })}
            />
            <span className="small-label">
              {t("battle.sunkCount", { sunk: jevSunkLengths.length })}
            </span>
            <Legend />
          </div>
        </div>

        <AttackConsole
          selected={lockedTarget}
          phase={game.phase}
          jevThinking={isJevThinking}
          fireOnClick={fireOnClick}
          onFireOnClickChange={handleFireOnClickChange}
          onFire={handleFire}
        />

        <OperationsLog
          history={history}
          thinking={isJevThinking}
          error={jevError ? translateEngineError(t, jevError) : null}
          toast={statusText}
        />
      </section>
    </div>
  );

  let body: React.ReactNode;
  if (screen === "fleet") {
    body = (
      <FleetScreen
        board={game.playerBoard}
        view={playerView}
        focusIndex={focusShip}
        onFocus={setFocusShip}
        onBack={() => setScreen("game")}
        backLabel={
          gameOver ? t("fleetPage.backToResult") : t("fleetPage.backToBattle")
        }
      />
    );
  } else if (gameOver) {
    body = (
      <ResultScreen
        won={game.phase === "won"}
        shots={matchShots.length}
        hits={playerHits}
        playerBoard={game.playerBoard}
        playerView={playerView}
        jevSunkCount={jevSunkLengths.length}
        quote={jevQuote}
        onNewGame={handleNewGame}
        onFleetReport={() => setScreen("fleet")}
      />
    );
  } else if (game.phase === "placement") {
    body = (
      <SetupScreen
        draft={draft}
        activeIndex={activeSlot}
        orientation={orientation}
        hover={hoverCell}
        status={statusText}
        placementError={placementError}
        onSelectSlot={(index) => {
          const existing = draft[index];
          if (existing) {
            setOrientation(existing.orientation);
            setDraft((prev) => prev.map((e, i) => (i === index ? null : e)));
          }
          setActiveSlot(index);
          setHoverCell(null);
        }}
        onRotate={() =>
          setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"))
        }
        onAutoDeploy={handleAutoDeploy}
        onClear={handleClearDraft}
        onPlace={handlePlace}
        onHover={(row, col) => setHoverCell({ row, col })}
        onHoverLeave={() => setHoverCell(null)}
        onStart={handleStartBattle}
      />
    );
  } else {
    body = battle;
  }

  const pageClass =
    screen === "fleet"
      ? "night fleet-page"
      : gameOver
        ? "night result-page"
        : game.phase === "placement"
          ? "night setup-page"
          : "night";

  return (
    <main className={pageClass}>
      <TopBar onNewGame={handleNewGame} onRules={() => setRulesOpen(true)} />
      {body}
      <PageFooter />
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}
