"use client";

import { cellLabel } from "@/lib/game/coords";
import {
  lastShotAriaSuffix,
  type LastShotBy,
} from "@/lib/game/last-shot";
import { cn } from "@/lib/utils";

export type CellVisual =
  | "empty"
  | "ship"
  | "preview"
  | "invalid"
  | "unknown"
  | "miss"
  | "hit"
  | "halo";

type BoardCellProps = {
  row: number;
  col: number;
  visual: CellVisual;
  showShips?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  compact?: boolean;
  lastShotBy?: LastShotBy | null;
};

const visualStyles: Record<CellVisual, string> = {
  empty:
    "bg-cell-empty border-cell-empty-border hover:bg-cell-empty-hover",
  ship: "bg-cell-ship border-cell-ship-border",
  preview: "bg-cell-ship/40 border-cell-ship/80",
  invalid: "bg-cell-ship/18 border-cell-ship/40",
  unknown:
    "bg-cell-empty border-cell-empty-border hover:bg-cell-unknown-hover",
  miss: "bg-cell-miss border-cell-miss-border",
  hit: "bg-cell-hit border-cell-hit-border",
  halo: "bg-cell-halo border-cell-halo-border",
};

const lastShotRing: Record<LastShotBy, string> = {
  player:
    "shadow-[inset_0_0_0_2px_var(--last-player-ring),inset_0_0_0_4px_color-mix(in_srgb,var(--last-player)_78%,transparent)]",
  jev: "shadow-[inset_0_0_0_2px_var(--last-jev-ring),inset_0_0_0_4px_color-mix(in_srgb,var(--last-jev)_78%,transparent)]",
};

export function BoardCell({
  row,
  col,
  visual,
  showShips = false,
  disabled,
  onClick,
  onMouseEnter,
  compact,
  lastShotBy,
}: BoardCellProps) {
  const isShot = visual === "miss" || visual === "hit" || visual === "halo";
  const size = compact
    ? "aspect-square h-auto w-full min-h-5 max-w-[2.55rem]"
    : "aspect-square h-auto w-full min-h-6 max-w-[2.55rem] sm:min-h-7";

  return (
    <button
      type="button"
      aria-label={`${cellLabel(row, col)} ${visual}${lastShotAriaSuffix(lastShotBy)}`}
      aria-current={lastShotBy ? "true" : undefined}
      disabled={disabled || (!onClick && !isShot)}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "relative min-w-0 rounded-md border text-[10px] transition-colors",
        size,
        visualStyles[visual],
        lastShotBy ? lastShotRing[lastShotBy] : null,
        onClick && !disabled && "cursor-pointer",
        disabled && "cursor-not-allowed",
      )}
    >
      {visual === "miss" && (
        <span className="absolute inset-0 flex items-center justify-center text-cell-miss-mark">
          ·
        </span>
      )}
      {visual === "hit" && (
        <span className="absolute inset-0 flex items-center justify-center text-white">
          ✕
        </span>
      )}
      {showShips && visual === "ship" && (
        <span className="absolute inset-0 rounded-md bg-cell-ship" />
      )}
      {lastShotBy && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0.5 left-0.5 z-[1] h-1.5 w-1.5 rounded-full",
            lastShotBy === "player" ? "bg-last-player" : "bg-last-jev",
          )}
        />
      )}
      {!compact && (
        <span className="absolute right-0.5 bottom-0 text-[8px] text-ink-muted/45">
          {col + 1}
        </span>
      )}
    </button>
  );
}
