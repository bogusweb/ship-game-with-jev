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
import type { JournalEntry } from "@/lib/game/journal";
import { toJournalEntry, type JevShotRequest } from "@/lib/jev/shot";
import { shipAtCell } from "@/lib/game/placement";
import type { CellVisual } from "./board-cell";
import { GameBoard } from "./game-board";
import { MoveJournal } from "./move-journal";
import { TurnIndicator, turnKindFromState } from "./turn-indicator";

async function fetchJevShot(request: JevShotRequest) {
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
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [isJevThinking, setIsJevThinking] = useState(false);
  const [jevError, setJevError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Place your fleet on the left board.");

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

  const runJevTurn = useCallback(
    async (state: GameState, view: OpponentView) => {
      setIsJevThinking(true);
      setJevError(null);

      let currentState = state;
      let currentView = view;

      try {
        while (
          currentState.phase === "playing" &&
          currentState.turn === "jev"
        ) {
          const moves = legalMoves(currentView);
          if (moves.length === 0) throw new Error("No legal moves for Jev");

          const jevResponse = await fetchJevShot({
            move: currentState.moveCount + 1,
            legalMoves: moves,
            playerView: currentView,
          });
          const chosen = jevResponse.chosen;
          const entry = toJournalEntry(currentState.moveCount + 1, jevResponse);
          setJournal((prev) => [...prev, entry]);

          const outcome = jevShoot(
            currentState,
            chosen.row,
            chosen.col,
            currentView,
          );
          currentState = outcome.state;
          currentView = outcome.playerView;
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
      } finally {
        setIsJevThinking(false);
      }
    },
    [],
  );

  const handleFire = (row: number, col: number) => {
    if (game.phase !== "playing" || game.turn !== "player" || isJevThinking) return;
    try {
      const { state, result } = playerShoot(game, row, col);
      setGame(state);

      if (result.outcome === "sunk") {
        setStatus(`Sunk! Jev's ${SHIP_NAMES[result.shipLength ?? 2] ?? "ship"} is gone.`);
      } else if (result.outcome === "hit") {
        setStatus("Hit! Fire again.");
      } else {
        setStatus("Miss. Jev is thinking…");
      }

      if (state.phase === "won") {
        setStatus("You sank Jev's fleet. Victory!");
        return;
      }

      if (state.turn === "jev") {
        void runJevTurn(state, playerView);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Invalid shot");
    }
  };

  const handleNewGame = () => {
    setGame(createNewGame());
    setPlayerView(createPlayerAttackView());
    setJournal([]);
    setJevError(null);
    setIsJevThinking(false);
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
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
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

        <p className="text-sm text-[#5c4a3a]/80">{status}</p>

        {game.phase === "placement" && (
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() =>
                setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"))
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
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-8 md:grid-cols-2">
            <div
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
                onCellClick={
                  game.phase === "placement" ? handlePlaceClick : undefined
                }
                onCellHover={(row, col) => setHoverCell({ row, col })}
                onCellLeave={() => setHoverCell(null)}
                canClick={() => game.phase === "placement"}
              />
              {game.phase === "placement" && hoverCell && (
                <p className="mt-2 text-xs text-[#5c4a3a]/60">
                  Preview at {cellLabel(hoverCell.row, hoverCell.col)}
                </p>
              )}
            </div>

            <GameBoard
              title="Jev's waters"
              subtitle={
                game.phase === "playing" && !gameOver
                  ? "Pick a square to fire"
                  : game.phase === "placement"
                    ? "Locked until your fleet is placed"
                    : undefined
              }
              getCellVisual={jevBoardVisual}
              remainingLengths={jevRemaining}
              remainingAccent="jev"
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

          <MoveJournal
            entries={journal}
            thinking={isJevThinking}
            error={jevError}
          />
        </div>

        {(gameOver || game.phase === "playing") && (
          <div className="flex justify-center">
            <Button
              size="lg"
              className="bg-[#e8ba3f] text-[#2c1810] hover:bg-[#d9ab30]"
              onClick={handleNewGame}
            >
              {gameOver ? "Another round" : "Restart game"}
            </Button>
          </div>
        )}

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
