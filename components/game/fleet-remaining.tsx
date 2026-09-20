"use client";

type FleetRemainingProps = {
  lengths: number[];
  accent: "player" | "jev";
};

export function FleetRemaining({ lengths, accent }: FleetRemainingProps) {
  const chip =
    accent === "player"
      ? "bg-[#dc6b5e]/15 text-[#8b3a30] ring-[#dc6b5e]/30"
      : "bg-[#4a9d93]/15 text-[#2d6b64] ring-[#4a9d93]/30";

  return (
    <div className="mt-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-[#5c4a3a]/55">
        Remaining unsunk
      </p>
      <div className="mt-1.5 h-7">
        {lengths.length === 0 ? (
          <p className="flex h-7 items-center text-sm text-[#5c4a3a]/70">
            None remaining
          </p>
        ) : (
          <ul
            className="flex h-7 flex-nowrap items-center gap-1.5 overflow-x-auto"
            aria-label="Remaining unsunk ship lengths"
          >
            {lengths.map((length, index) => (
              <li
                key={`${length}-${index}`}
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ${chip}`}
              >
                {length}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
