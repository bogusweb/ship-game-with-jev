"use client";

import { cellLabel } from "@/lib/game/coords";
import { type LastShotBy } from "@/lib/game/last-shot";
import { useLocale } from "@/lib/i18n";
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
  empty: "bg-[#f8f6ee] border-[#c8d4c0]/60 hover:bg-[#f0ede0]",
  ship: "bg-[#dc6b5e]/85 border-[#dc6b5e]",
  preview: "bg-[#dc6b5e]/35 border-[#dc6b5e]/70",
  invalid: "bg-[#dc6b5e]/15 border-[#dc6b5e]/30",
  unknown: "bg-[#f8f6ee] border-[#c8d4c0]/60 hover:bg-[#e8f0e4]",
  miss: "bg-[#d4cfc0] border-[#b8b0a0]",
  hit: "bg-[#4a9d93] border-[#3d8a80]",
  halo: "bg-[#e8e4d8] border-[#d0ccc0]",
};

const lastShotRing: Record<LastShotBy, string> = {
  player:
    "shadow-[inset_0_0_0_2px_#c9a227,inset_0_0_0_4px_rgba(232,186,63,0.55)]",
  jev: "shadow-[inset_0_0_0_2px_#b24a40,inset_0_0_0_4px_rgba(220,107,94,0.55)]",
};

const visualKeys: Record<CellVisual, `cell.visual.${CellVisual}`> = {
  empty: "cell.visual.empty",
  ship: "cell.visual.ship",
  preview: "cell.visual.preview",
  invalid: "cell.visual.invalid",
  unknown: "cell.visual.unknown",
  miss: "cell.visual.miss",
  hit: "cell.visual.hit",
  halo: "cell.visual.halo",
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
  const { t } = useLocale();
  const isShot = visual === "miss" || visual === "hit" || visual === "halo";
  const size = compact
    ? "aspect-square h-auto w-full min-h-5 max-w-[2.55rem]"
    : "aspect-square h-auto w-full min-h-6 max-w-[2.55rem] sm:min-h-7";
  const lastShotSuffix =
    lastShotBy === "player"
      ? t("cell.lastShotYou")
      : lastShotBy === "jev"
        ? t("cell.lastShotJev")
        : "";

  return (
    <button
      type="button"
      aria-label={`${cellLabel(row, col)} ${t(visualKeys[visual])}${lastShotSuffix}`}
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
      {lastShotBy && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0.5 left-0.5 z-[1] h-1.5 w-1.5 rounded-full",
            lastShotBy === "player" ? "bg-[#e8ba3f]" : "bg-[#dc6b5e]",
          )}
        />
      )}
      {!compact && (
        <span className="absolute right-0.5 bottom-0 text-[8px] text-[#8a8070]/50">
          {col + 1}
        </span>
      )}
    </button>
  );
}
