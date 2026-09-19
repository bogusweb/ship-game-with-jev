"use client";

import { useState } from "react";
import type { JournalEntry } from "@/lib/game/journal";
import { chosenShotPercent, coordEquals } from "@/lib/game/journal";

type MoveJournalProps = {
  entries: JournalEntry[];
  thinking?: boolean;
  error?: string | null;
  emptyMessage?: string;
};

export function MoveJournal({
  entries,
  thinking,
  error,
  emptyMessage = "Place your fleet to begin. Jev will share shot preferences here.",
}: MoveJournalProps) {
  const [expanded, setExpanded] = useState(false);
  const latest = entries[entries.length - 1];
  const chosenPercent = latest
    ? (latest.chosenPercent ??
      chosenShotPercent(latest.chosen, latest.probabilities))
    : 0;

  return (
    <aside className="flex flex-col gap-4 rounded-2xl bg-white/60 p-5 shadow-sm ring-1 ring-[#c8d4c0]/40">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#2c1810]">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-[#4a9d93]" />
          Jev&apos;s move journal
        </h2>
        <p className="text-sm text-[#5c4a3a]/70">A peek at the probabilities.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-[#dc6b5e]/10 px-3 py-2 text-sm text-[#8b3a30]">
          {error}
        </div>
      )}

      {thinking && (
        <div className="rounded-lg bg-[#f0ede0] px-3 py-4 text-sm text-[#5c4a3a]/80">
          Jev is weighing the ocean…
        </div>
      )}

      {!thinking && !error && entries.length === 0 && (
        <p className="text-sm text-[#5c4a3a]/70">{emptyMessage}</p>
      )}

      {latest && !thinking && (
        <div className="space-y-3">
          <p className="text-sm text-[#5c4a3a]/80">
            Move {latest.move} · {latest.ms} ms
            {latest.source === "fallback" ? " · heuristic fallback" : ""}
          </p>
          <p className="text-base font-medium text-[#2c1810]">
            <span className="text-[#4a9d93]">◎</span> {latest.label} it is.
          </p>
          <p className="text-sm text-[#5c4a3a]/70">
            {chosenPercent.toFixed(1)}% shot preference
            {latest.source === "jev" ? " from Jev" : ""}.
          </p>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[#5c4a3a]/60">
              Jev&apos;s shot preferences
            </p>
            {(expanded ? latest.probabilities : latest.probabilities.slice(0, 3)).map(
              (p) => {
                const isChosen = coordEquals(p.cell, latest.chosen);
                return (
                  <div key={`${p.cell.row}-${p.cell.col}`} className="space-y-1">
                    <div className="flex justify-between text-xs text-[#5c4a3a]/80">
                      <span className={isChosen ? "font-semibold text-[#2c1810]" : undefined}>
                        {p.label}
                        {isChosen ? " · chosen" : ""}
                      </span>
                      <span className={isChosen ? "font-semibold text-[#2c1810]" : undefined}>
                        {p.percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#e8e4d8]">
                      <div
                        className="h-full rounded-full bg-[#4a9d93]"
                        style={{ width: `${Math.min(100, p.percent)}%` }}
                      />
                    </div>
                  </div>
                );
              },
            )}
            {latest.probabilities.length > 3 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-[#4a9d93] hover:underline"
              >
                {expanded
                  ? "▲ Show fewer"
                  : `▼ ${latest.probabilities.length - 3} more possibilities`}
              </button>
            )}
            <p className="text-xs text-[#5c4a3a]/60">
              Jev favored {latest.label} · {chosenPercent.toFixed(1)}%
            </p>
            {latest.confidence != null && (
              <p className="text-xs text-[#5c4a3a]/50">
                Model confidence {(latest.confidence * 100).toFixed(0)}% — how
                peaked the distribution is, not {latest.label}&apos;s cell
                probability.
              </p>
            )}
          </div>
        </div>
      )}

      <details className="text-sm text-[#5c4a3a]/70">
        <summary className="cursor-pointer text-[#4a9d93]">
          What am I looking at?
        </summary>
        <p className="mt-2">
          Jev scores each remaining legal cell as a shot preference. This is a
          decision log, not written thoughts. Percentages show where Jev prefers
          to fire, not the chance of hitting a ship or winning the match. If a
          model-confidence figure appears, that is how peaked the distribution
          is — not the percentage on the chosen cell&apos;s bar.
        </p>
      </details>
    </aside>
  );
}
