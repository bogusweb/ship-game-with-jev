"use client";

import { cellLabel } from "@/lib/game/coords";
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
};

const visualStyles: Record<CellVisual, string> = {
  empty: "bg-[#f8f6ee] border-[#c8d4c0]/60 hover:bg-[#f0ede0]",
  ship: "bg-[#dc6b5e]/85 border-[#dc6b5e]",
  preview: "bg-[#dc6b5e]/35 border-[#dc6b5e]/70",
  invalid: "bg-[#dc6b5e]/15 border-[#dc6b5e]/30",
  unknown: "bg-[#f8f6ee] border-[#c8d4c0]/60 hover:bg-[#e8f0e4]",
  miss: "bg-[#d4cfc0] border-[#b8b0a0]",
  hit: "bg-[#4a9d93] border-[#3d8a80]",
  halo: "bg-[#e8e4d8] border-[#d0ccc0]",
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
}: BoardCellProps) {
  const isShot = visual === "miss" || visual === "hit" || visual === "halo";
  const size = compact ? "h-6 w-6 sm:h-7 sm:w-7" : "h-7 w-7 sm:h-8 sm:w-8";

  return (
    <button
      type="button"
      aria-label={`${cellLabel(row, col)} ${visual}`}
      disabled={disabled || (!onClick && !isShot)}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "relative rounded-md border text-[10px] transition-colors",
        size,
        visualStyles[visual],
        onClick && !disabled && "cursor-pointer",
        disabled && "cursor-not-allowed opacity-70",
      )}
    >
      {visual === "miss" && (
        <span className="absolute inset-0 flex items-center justify-center text-[#8a8070]">
          ·
        </span>
      )}
      {visual === "hit" && (
        <span className="absolute inset-0 flex items-center justify-center text-white">
          ✕
        </span>
      )}
      {showShips && visual === "ship" && (
        <span className="absolute inset-0 rounded-md bg-[#dc6b5e]/90" />
      )}
      {!compact && (
        <span className="absolute right-0.5 bottom-0 text-[8px] text-[#8a8070]/50">
          {col + 1}
        </span>
      )}
    </button>
  );
}
