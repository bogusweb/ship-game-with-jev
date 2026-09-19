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
  validatePlacement,
} from "@/lib/game";
import type { GameState, OpponentView, Orientation, ShotCellState } from "@/lib/game";
import { buildMockJournalEntry, type JournalEntry } from "@/lib/game/journal";
import { shipAtCell } from "@/lib/game/placement";
import type { CellVisual } from "./board-cell";
import { GameBoard } from "./game-board";
import { MoveJournal } from "./move-journal";
import { ThinkingIndicator } from "./thinking-indicator";

function mockJevPick(moves: { row: number; col: number }[]) {
  const pick = moves[Math.floor(Math.random() * moves.length)];
  return pick;
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
  const [jevThinking, setJevThinking] = useState(false);
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
      setJevThinking(true);
      setJevError(null);
      const start = performance.now();

      try {
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
        const moves = legalMoves(view);
        if (moves.length === 0) throw new Error("No legal moves for Jev");

        const chosen = mockJevPick(moves);
        const ms = Math.round(performance.now() - start);
        const entry = buildMockJournalEntry(state.moveCount + 1, chosen, moves, ms);
        setJournal((prev) => [...prev, entry]);

        const outcome = jevShoot(state, chosen.row, chosen.col, view);
        setGame(outcome.state);
        setPlayerView(outcome.playerView);

        if (outcome.result.outcome === "sunk") {
          setStatus(`Jev sunk your ${SHIP_NAMES[outcome.result.shipLength ?? 2] ?? "ship"}!`);
        } else if (outcome.result.outcome === "hit") {
          setStatus("Jev hit one of your ships!");
        } else {
          setStatus("Jev missed. Your turn.");
        }

        if (outcome.state.phase === "lost") {
          setStatus("Jev sank your fleet. Better luck next round!");
        }
      } catch (e) {
        setJevError(e instanceof Error ? e.message : "Jev could not choose a shot");
      } finally {
        setJevThinking(false);
      }
    },
    [],
  );

  const handleFire = (row: number, col: number) => {
    if (game.phase !== "playing" || game.turn !== "player" || jevThinking) return;
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

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#dc6b5e] px-3 py-1 text-sm font-medium text-white">
            You
          </span>
          <span className="text-[#5c4a3a]/60">vs.</span>
          <span className="rounded-full bg-[#4a9d93] px-3 py-1 text-sm font-medium text-white">
            Jev
          </span>
          <ThinkingIndicator visible={jevThinking} />
        </div>

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
                showShips={game.phase === "placement" || game.phase === "lost"}
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
              onCellClick={handleFire}
              canClick={(row, col) =>
                game.phase === "playing" &&
                game.turn === "player" &&
                !jevThinking &&
                game.opponentView.cells[row][col] === "unknown"
              }
            />
          </div>

          <MoveJournal
            entries={journal}
            thinking={jevThinking}
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
