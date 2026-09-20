"use client";

import { BorderBeam } from "border-beam";
import { BOARD_SIZE } from "@/lib/game/constants";
import { BoardCell, type CellVisual } from "./board-cell";
import { FleetRemaining } from "./fleet-remaining";

type GameBoardProps = {
  title: string;
  subtitle?: string;
  getCellVisual: (row: number, col: number) => CellVisual;
  onCellClick?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number) => void;
  onCellLeave?: () => void;
  canClick?: (row: number, col: number) => boolean;
  showShips?: boolean;
  compact?: boolean;
  remainingLengths: number[];
  remainingAccent: "player" | "jev";
  /** When set, wrap this board with border-beam; beam plays only while true. Never pass on the player board. */
  isJevThinking?: boolean;
};

export function GameBoard({
  title,
  subtitle,
  getCellVisual,
  onCellClick,
  onCellHover,
  onCellLeave,
  canClick,
  showShips,
  compact,
  remainingLengths,
  remainingAccent,
  isJevThinking,
}: GameBoardProps) {
  const cols = "ABCDEFGHIJ".split("");

  const boardPanel = (
    <div
      className="w-full rounded-2xl bg-[#d4e4d0]/40 p-3 shadow-sm"
      onMouseLeave={onCellLeave}
    >
      <div className="mb-1 grid grid-cols-[1.75rem_repeat(10,minmax(0,1fr))] gap-0.5 text-center text-[10px] text-[#5c4a3a]/60 sm:text-xs">
        <span />
        {cols.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: BOARD_SIZE }, (_, row) => (
          <div
            key={row}
            className="grid grid-cols-[1.75rem_repeat(10,minmax(0,1fr))] items-stretch gap-0.5"
          >
            <span className="flex items-center justify-center text-center text-[10px] text-[#5c4a3a]/60 sm:text-xs">
              {row + 1}
            </span>
            {Array.from({ length: BOARD_SIZE }, (_, col) => {
              const visual = getCellVisual(row, col);
              const clickable = canClick?.(row, col) ?? !!onCellClick;
              return (
                <BoardCell
                  key={`${row}-${col}`}
                  row={row}
                  col={col}
                  visual={visual}
                  showShips={showShips}
                  compact={compact}
                  disabled={!clickable}
                  onClick={
                    clickable && onCellClick
                      ? () => onCellClick(row, col)
                      : undefined
                  }
                  onMouseEnter={
                    onCellHover ? () => onCellHover(row, col) : undefined
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-[#2c1810]">{title}</h2>
        {subtitle && (
          <p className="text-sm text-[#5c4a3a]/70">{subtitle}</p>
        )}
        <FleetRemaining lengths={remainingLengths} accent={remainingAccent} />
      </div>
      {isJevThinking === undefined ? (
        boardPanel
      ) : (
        <BorderBeam
          size="pulse-inner"
          colorVariant="ocean"
          strength={0.5}
          theme="auto"
          active={isJevThinking}
        >
          {boardPanel}
        </BorderBeam>
      )}
    </div>
  );
}
