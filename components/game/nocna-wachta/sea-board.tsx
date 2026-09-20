"use client";

import { useId, type KeyboardEvent } from "react";
import { BOARD_SIZE } from "@/lib/game/constants";
import { cellLabel } from "@/lib/game/coords";
import type { Coord, Orientation, ShotCellState } from "@/lib/game";
import { ShipArt, gridPoint } from "./ship-art";

export type BoardShip = {
  key: string;
  row: number;
  col: number;
  length: number;
  orientation: Orientation;
  damaged?: boolean;
};

export type SeaBoardProps = {
  ariaLabel: string;
  /** Shot overlay for every cell. */
  cellState?: (row: number, col: number) => ShotCellState;
  ships?: BoardShip[];
  /** Cell currently armed for the shot console. */
  selected?: Coord | null;
  /** Jev's predicted player target, shown only when the scan toggle is on. */
  predicted?: Coord | null;
  /** Placement preview: highlight plus ghost ship. */
  ghost?: {
    row: number;
    col: number;
    length: number;
    orientation: Orientation;
    valid: boolean;
  } | null;
  /** Outline around one of the player's own ships on the fleet screen. */
  focusRange?: {
    row: number;
    col: number;
    length: number;
    orientation: Orientation;
  } | null;
  onCellActivate?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number) => void;
  onCellLeave?: () => void;
  /** Whether a given cell accepts pointer/keyboard input. */
  isCellEnabled?: (row: number, col: number) => boolean;
  /** Suffix appended to each cell's accessible name. */
  cellHint?: (row: number, col: number, state: ShotCellState) => string;
  className?: string;
};

const COLUMNS = "ABCDEFGHIJ".split("");

function Marker({ row, col, kind }: { row: number; col: number; kind: "hit" | "miss" | "halo" }) {
  const [x, y] = gridPoint(col + 0.5, row + 0.5);
  if (kind === "hit") {
    return (
      <g pointerEvents="none">
        <circle
          cx={x}
          cy={y}
          r="9"
          fill="#372f23"
          stroke="#e79163"
          strokeWidth="1.4"
        />
        <path
          d={`m${x - 3} ${y - 3} 6 6m0-6-6 6`}
          stroke="#e37e52"
          strokeWidth="1.7"
        />
      </g>
    );
  }
  return (
    <g pointerEvents="none" opacity={kind === "halo" ? 0.4 : 1}>
      <circle cx={x} cy={y} r="7" fill="none" stroke="#75a696" opacity=".6" />
      <circle cx={x} cy={y} r="2.8" fill="#acd1b9" />
    </g>
  );
}

/**
 * Flat top-down 10 × 10 sea. Water, swell, grid, coordinates, ships and
 * markers are ported from `board()` in the handoff prototype; every layer is
 * driven by the real game state.
 */
export function SeaBoard({
  ariaLabel,
  cellState,
  ships = [],
  selected,
  predicted,
  ghost,
  focusRange,
  onCellActivate,
  onCellHover,
  onCellLeave,
  isCellEnabled,
  cellHint,
  className,
}: SeaBoardProps) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `sea-${uid}`;
  const clipId = `sea-clip-${uid}`;
  const interactive = !!onCellActivate;

  const swell = Array.from({ length: 7 }, (_, i) => 65 + i * 97);
  const waves = Array.from({ length: 44 }, (_, i) => {
    const wx = ((i * 2.13 + 0.4) % 9.6) as number;
    const wy = ((i * 3.73 + 0.3) % 9.6) as number;
    return gridPoint(wx, wy);
  });

  const handleKey = (
    event: KeyboardEvent<SVGRectElement>,
    row: number,
    col: number,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onCellActivate?.(row, col);
  };

  return (
    <svg
      className={className ? `board-art ${className}` : "board-art"}
      viewBox="0 0 660 655"
      role="group"
      aria-label={ariaLabel}
      onMouseLeave={onCellLeave}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#285b50" />
          <stop offset="1" stopColor="#173d37" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="60" y="60" width="540" height="540" rx="8" />
        </clipPath>
      </defs>

      <rect
        x="53"
        y="53"
        width="554"
        height="554"
        rx="13"
        fill="#203d32"
      />
      <rect
        x="60"
        y="60"
        width="540"
        height="540"
        rx="8"
        fill={`url(#${gradientId})`}
      />

      <g clipPath={`url(#${clipId})`} aria-hidden="true">
        {swell.map((yy) => (
          <path
            key={`swell-${yy}`}
            d={`M40 ${yy}q90-55 180-10t180-5 250-10`}
            fill="none"
            stroke="#9bbc94"
            opacity=".035"
            strokeWidth="30"
          />
        ))}
        {Array.from({ length: BOARD_SIZE - 1 }, (_, idx) => {
          const i = idx + 1;
          const [vx1, vy1] = gridPoint(i, 0);
          const [vx2, vy2] = gridPoint(i, BOARD_SIZE);
          const [hx1, hy1] = gridPoint(0, i);
          const [hx2, hy2] = gridPoint(BOARD_SIZE, i);
          return (
            <g key={`grid-${i}`}>
              <path
                d={`M${vx1},${vy1}L${vx2},${vy2}`}
                fill="none"
                stroke="#b4d4b9"
                opacity=".14"
                strokeWidth=".8"
              />
              <path
                d={`M${hx1},${hy1}L${hx2},${hy2}`}
                fill="none"
                stroke="#b4d4b9"
                opacity=".14"
                strokeWidth=".8"
              />
            </g>
          );
        })}
        {waves.map(([wx, wy], i) => (
          <path
            key={`wave-${i}`}
            className="wave"
            d={`M${wx - 6} ${wy}q4-3 8 0t8 0`}
            fill="none"
            stroke="#8db9a1"
            strokeWidth="1"
            strokeLinecap="round"
          />
        ))}
      </g>

      <g aria-hidden="true">
        {COLUMNS.map((letter, i) => {
          const [lx, ly] = gridPoint(i + 0.5, -0.37);
          return (
            <text
              key={`col-${letter}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              fill="#90b49b"
              fontSize="12"
              fontFamily="var(--font-space-grotesk), sans-serif"
            >
              {letter}
            </text>
          );
        })}
        {Array.from({ length: BOARD_SIZE }, (_, i) => {
          const [nx, ny] = gridPoint(-0.38, i + 0.56);
          return (
            <text
              key={`row-${i}`}
              x={nx}
              y={ny}
              textAnchor="middle"
              fill="#90b49b"
              fontSize="12"
              fontFamily="var(--font-space-grotesk), sans-serif"
            >
              {i + 1}
            </text>
          );
        })}
      </g>

      {predicted ? (
        <rect
          aria-hidden="true"
          x={gridPoint(predicted.col, predicted.row)[0] + 4}
          y={gridPoint(predicted.col, predicted.row)[1] + 4}
          width="46"
          height="46"
          rx="5"
          fill="#c6ed83"
          fillOpacity=".18"
          stroke="#c6ed83"
          strokeDasharray="3 4"
        />
      ) : null}

      {interactive
        ? Array.from({ length: BOARD_SIZE }, (_, row) =>
            Array.from({ length: BOARD_SIZE }, (_, col) => {
              const state = cellState?.(row, col) ?? "unknown";
              const enabled = isCellEnabled?.(row, col) ?? true;
              const [cx, cy] = gridPoint(col, row);
              const hint = cellHint?.(row, col, state) ?? "";
              return (
                <rect
                  key={`cell-${row}-${col}`}
                  className={enabled ? "cell" : "cell fired"}
                  x={cx}
                  y={cy}
                  width="54"
                  height="54"
                  role="button"
                  tabIndex={enabled ? 0 : -1}
                  aria-label={`${cellLabel(row, col)}${hint}`}
                  aria-disabled={!enabled}
                  onClick={enabled ? () => onCellActivate?.(row, col) : undefined}
                  onKeyDown={
                    enabled ? (event) => handleKey(event, row, col) : undefined
                  }
                  onMouseEnter={
                    onCellHover ? () => onCellHover(row, col) : undefined
                  }
                  onFocus={onCellHover ? () => onCellHover(row, col) : undefined}
                />
              );
            }),
          )
        : null}

      {ships.map((ship) => (
        <ShipArt
          key={ship.key}
          row={ship.row}
          col={ship.col}
          length={ship.length}
          orientation={ship.orientation}
          damaged={ship.damaged}
        />
      ))}

      {cellState
        ? Array.from({ length: BOARD_SIZE }, (_, row) =>
            Array.from({ length: BOARD_SIZE }, (_, col) => {
              const state = cellState(row, col);
              if (state === "unknown") return null;
              return (
                <Marker
                  key={`mark-${row}-${col}`}
                  row={row}
                  col={col}
                  kind={state}
                />
              );
            }),
          )
        : null}

      {selected ? (
        <g className="target-rings" pointerEvents="none" aria-hidden="true">
          {(() => {
            const [tx, ty] = gridPoint(selected.col + 0.5, selected.row + 0.5);
            return (
              <>
                <rect
                  x={tx - 25}
                  y={ty - 25}
                  width="50"
                  height="50"
                  rx="4"
                  fill="#d5f995"
                  fillOpacity=".18"
                  stroke="#d5f995"
                  strokeWidth="1.5"
                />
                <circle
                  cx={tx}
                  cy={ty}
                  r="13"
                  fill="none"
                  stroke="#d5f995"
                  strokeWidth="1.4"
                />
                <path
                  d={`M${tx} ${ty - 20}v12m0 16v12m-20-20h12m16 0h12`}
                  stroke="#d5f995"
                  strokeWidth="1.4"
                />
                <circle cx={tx} cy={ty} r="2" fill="#d5f995" />
              </>
            );
          })()}
        </g>
      ) : null}

      {ghost ? (
        <g pointerEvents="none" aria-hidden="true" clipPath={`url(#${clipId})`}>
          {(() => {
            const [gx, gy] = gridPoint(ghost.col, ghost.row);
            const color = ghost.valid ? "#c8ed83" : "#ef997a";
            const vertical = ghost.orientation === "vertical";
            return (
              <>
                <rect
                  x={gx + 2}
                  y={gy + 2}
                  width={(vertical ? 1 : ghost.length) * 54 - 4}
                  height={(vertical ? ghost.length : 1) * 54 - 4}
                  rx="4"
                  fill={color}
                  fillOpacity=".22"
                  stroke={color}
                  strokeWidth="2"
                />
                <g opacity=".6">
                  <ShipArt
                    row={ghost.row}
                    col={ghost.col}
                    length={ghost.length}
                    orientation={ghost.orientation}
                  />
                </g>
              </>
            );
          })()}
        </g>
      ) : null}

      {focusRange ? (
        <rect
          className="fleet-focus"
          aria-hidden="true"
          x={gridPoint(focusRange.col, focusRange.row)[0] + 1}
          y={gridPoint(focusRange.col, focusRange.row)[1] + 1}
          width={
            (focusRange.orientation === "vertical" ? 1 : focusRange.length) *
              54 -
            2
          }
          height={
            (focusRange.orientation === "vertical" ? focusRange.length : 1) *
              54 -
            2
          }
          rx="5"
          fill="none"
          stroke="#c8ed83"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
      ) : null}
    </svg>
  );
}
