import type { Orientation } from "@/lib/game";

export type ShipArtProps = {
  /** Zero-based column of the ship origin. */
  col: number;
  /** Zero-based row of the ship origin. */
  row: number;
  length: number;
  orientation: Orientation;
  /** Sunk ships use the damaged palette plus fire, per docs/ASSETS.md. */
  damaged?: boolean;
};

const CELL = 54;
const GRID_ORIGIN = 60;

/** Logical grid position, matching the prototype `P(u, v)` helper. */
function gridPoint(u: number, v: number): [number, number] {
  return [GRID_ORIGIN + u * CELL, GRID_ORIGIN + v * CELL];
}

const DARK = "#354d42";

/**
 * Nocna wachta ship sprite. Shapes are the Nocna wachta branch of `shipArt()`
 * in the handoff prototype, which docs/ASSETS.md names as the source of the
 * exported public/nocna-wachta/statek-*.svg files. Drawing it here keeps every
 * length and orientation mapped to authoritative board state.
 */
export function ShipArt({
  col,
  row,
  length,
  orientation,
  damaged = false,
}: ShipArtProps) {
  const vertical = orientation === "vertical";
  const L = length * CELL;
  const [originX, originY] = gridPoint(col, row);
  const hull = `M7 13 Q3 27 7 41 L${L - 28} 42 Q${L - 10} 41 ${L - 3} 27 Q${L - 10} 13 ${L - 28} 12 Z`;
  const deck = damaged ? "#997a59" : "#bac6ae";
  const roof = damaged ? "#b77554" : "#c9d29d";
  const plating = Math.max(5, L - 44);

  const superstructure = () => {
    if (length === 1) {
      return (
        <>
          <rect x="13" y="19" width="16" height="17" rx="3" fill="#728877" />
          <rect x="17" y="20" width="12" height="14" rx="2" fill={roof} />
          <path d="M30 21v12" stroke="#1f473c" strokeWidth="3" />
          <rect x="8" y="21" width="4" height="12" rx="1" fill={DARK} />
          <circle cx="38" cy="27" r="2" fill={DARK} />
        </>
      );
    }

    const c = L * 0.4;
    const cw = Math.min(42, L * 0.25);
    const gx = L - 33;

    return (
      <>
        <rect
          x={c - 5}
          y="17"
          width={cw + 8}
          height="24"
          rx="3"
          fill={DARK}
          opacity=".18"
        />
        <rect
          x={c - 7}
          y="17"
          width={cw + 8}
          height="21"
          rx="2"
          fill="#7f9380"
        />
        <rect x={c} y="18" width={cw} height="18" rx="2" fill={roof} />
        <path d={`M${c + cw - 2} 19v16`} stroke="#3a6350" strokeWidth="3" />
        <path d={`M${c + cw - 8} 20v14`} stroke="#e1e6c2" strokeWidth="1" />
        <rect x={c + 4} y="22" width="9" height="10" rx="1.5" fill="#526a55" />
        <path
          d={`M${c + 18} 22v10m-4-5h8`}
          stroke="#435d48"
          strokeWidth="1.4"
        />
        <circle cx={gx} cy="28.5" r="8" fill={DARK} opacity=".2" />
        <circle cx={gx} cy="27" r="7" fill="#8d9f83" />
        <rect x={gx} y="25" width="16" height="4" rx="1.5" fill="#a9b89d" />
        <circle cx={gx - 1} cy="27" r="4" fill="#c9d1b1" />
        {length > 2 ? (
          <>
            <rect x="12" y="19" width="25" height="17" rx="2" fill="#819780" />
            <circle
              cx="24.5"
              cy="27.5"
              r="7"
              fill="none"
              stroke="#d1dab5"
              strokeWidth="1"
            />
            <path
              d="M22 24v7m5-7v7m-5-3.5h5"
              stroke="#d1dab5"
              strokeWidth="1"
            />
            <rect x="43" y="20" width="10" height="14" rx="1" fill="#71896f" />
          </>
        ) : (
          <>
            <rect x="14" y="20" width="14" height="14" rx="2" fill="#7d957a" />
            <path
              d="M17 23h8m-8 4h8m-8 4h8"
              stroke="#acbca0"
              strokeWidth="1"
            />
          </>
        )}
        <path d={`M${c + cw / 2} 12v-5`} stroke={DARK} strokeWidth="1.5" />
        <circle cx={c + cw / 2} cy="7" r="1.6" fill={roof} />
      </>
    );
  };

  const fire = () => {
    const c = L * 0.65;
    return (
      <>
        <circle cx={c} cy="27" r="12" fill="#6c503b" opacity=".6" />
        <path
          d={`M${c - 5} 31q-9-9 0-21 1 10 6 6 10 8 0 16Z`}
          fill="#e99155"
        />
        <path d={`M${c - 1} 30q-5-6 1-12 6 9-1 12`} fill="#ffe0a2" />
        <circle cx={c - 6} cy="11" r="4" fill="#b6b3a0" opacity=".38" />
      </>
    );
  };

  return (
    <g
      transform={`translate(${originX + (vertical ? CELL : 0)},${originY})${vertical ? " rotate(90)" : ""}`}
      aria-hidden="true"
    >
      <g className="floating">
        <ellipse
          cx={L / 2}
          cy="27"
          rx={L / 2 + 5}
          ry="22"
          fill="#b7d6b1"
          opacity=".09"
        />
        <path
          d="M1 12q-6 14 0 29M-3 7q-10 20 0 40"
          fill="none"
          stroke="#8cae93"
          strokeWidth="1.3"
          opacity=".45"
        />
        <path
          d={hull}
          transform="translate(3,4)"
          fill="#071b15"
          opacity=".3"
        />
        <path d={hull} fill={DARK} stroke="#849681" strokeWidth="1" />
        <path
          d={`M10 16 Q6 27 10 38 L${L - 29} 39 Q${L - 15} 38 ${L - 8} 27 Q${L - 15} 16 ${L - 29} 15Z`}
          fill={deck}
        />
        <path
          d={`M13 18h${plating}M13 36h${plating}`}
          stroke="#8b9c84"
          strokeWidth="1"
        />
        {superstructure()}
        {damaged ? fire() : null}
      </g>
    </g>
  );
}

export { CELL as SHIP_CELL, gridPoint };
