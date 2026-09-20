"use client";

import { FLEET_LENGTHS } from "@/lib/game/constants";

type FleetRemainingProps = {
  lengths: number[];
  accent: "player" | "jev";
};

function fleetChips(unsunk: number[]) {
  const remaining = [...unsunk];
  return FLEET_LENGTHS.map((length, index) => {
    const match = remaining.indexOf(length);
    if (match >= 0) {
      remaining.splice(match, 1);
      return { length, sunk: false, key: `${length}-${index}` };
    }
    return { length, sunk: true, key: `${length}-${index}` };
  });
}

export function FleetRemaining({ lengths, accent }: FleetRemainingProps) {
  const chip =
    accent === "player"
      ? "bg-[#dc6b5e]/15 text-[#8b3a30] ring-[#dc6b5e]/30"
      : "bg-[#4a9d93]/15 text-[#2d6b64] ring-[#4a9d93]/30";
  const chips = fleetChips(lengths);

  return (
    <div className="mt-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-[#5c4a3a]/55">
        Fleet
      </p>
      <div className="mt-1.5 h-7">
        <ul
          className="flex h-7 flex-nowrap items-center gap-1.5 overflow-x-auto"
          aria-label="Fleet ship lengths"
        >
          {chips.map((item) => (
            <li
              key={item.key}
              aria-label={
                item.sunk ? `Length ${item.length}, sunk` : `Length ${item.length}`
              }
              aria-disabled={item.sunk || undefined}
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ${
                item.sunk
                  ? "bg-[#5c4a3a]/8 text-[#5c4a3a]/40 ring-[#5c4a3a]/15 line-through decoration-[#5c4a3a]/45"
                  : chip
              }`}
            >
              {item.length}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
