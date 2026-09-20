"use client";

import { useState } from "react";
import { chosenShotPercent, coordEquals } from "@/lib/game/journal";
import {
  newestFirst,
  type HistoryOutcome,
  type MatchHistoryItem,
} from "@/lib/game/match-history";
import { useLocale, type Translate } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MoveJournalProps = {
  history: MatchHistoryItem[];
  thinking?: boolean;
  error?: string | null;
  emptyMessage?: string;
};

function outcomeLabel(t: Translate, outcome: HistoryOutcome): string {
  if (outcome === "HIT") return t("outcome.HIT");
  if (outcome === "MISS") return t("outcome.MISS");
  return t("outcome.SUNK");
}

export function MoveJournal({
  history,
  thinking,
  error,
  emptyMessage,
}: MoveJournalProps) {
  const { t } = useLocale();
  const emptyCopy = emptyMessage ?? t("journal.empty");
  const ordered = newestFirst(history);
  const newestId = ordered[0]?.id;
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const selectedId =
    pinnedId &&
    pinnedId !== newestId &&
    ordered.some((item) => item.id === pinnedId)
      ? pinnedId
      : newestId;
  const selected =
    ordered.find((item) => item.id === selectedId) ?? ordered[0] ?? null;
  const latest = selected?.journal;
  const chosenPercent = latest
    ? (latest.chosenPercent ??
      chosenShotPercent(latest.chosen, latest.probabilities))
    : 0;

  const banner = error
    ? error
    : thinking
      ? t("journal.thinking")
      : t("journal.banner");

  return (
    <aside className="flex w-full min-w-0 flex-col gap-4 rounded-2xl bg-white/60 p-5 shadow-sm ring-1 ring-[#c8d4c0]/40">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#2c1810]">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-[#4a9d93]" />
          {t("journal.title")}
        </h2>
        <p className="grid min-h-10 text-sm text-[#5c4a3a]/70">
          <span
            className={cn(
              "col-start-1 row-start-1 line-clamp-2",
              error && "text-[#8b3a30]",
              thinking && !error && "text-[#5c4a3a]/80",
            )}
          >
            {banner}
          </span>
          <span className="invisible col-start-1 row-start-1" aria-hidden>
            {emptyCopy}
          </span>
        </p>
      </div>

      <div
        className="flex min-h-[5.25rem] items-center gap-2 overflow-x-auto py-1.5"
        role="list"
        aria-label={t("journal.ariaHistory")}
      >
        {ordered.length === 0 ? (
          <div role="listitem" className="flex min-h-[4.5rem] items-center">
            <p className="text-sm text-[#5c4a3a]/70">{emptyCopy}</p>
          </div>
        ) : (
          ordered.map((item) => {
            const isSelected = selected?.id === item.id;
            const yours = item.actor === "you";
            return (
              <div key={item.id} role="listitem" className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPinnedId(item.id === newestId ? null : item.id);
                    setExpanded(false);
                  }}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex min-h-[4.5rem] min-w-[7.5rem] flex-col gap-0.5 rounded-xl px-3 py-2 text-left ring-1 transition-colors",
                    yours
                      ? "bg-[#dc6b5e]/10 ring-[#dc6b5e]/25"
                      : "bg-[#4a9d93]/10 ring-[#4a9d93]/25",
                    isSelected &&
                      (yours
                        ? "ring-2 ring-[#dc6b5e]"
                        : "ring-2 ring-[#4a9d93]"),
                  )}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[#5c4a3a]/70">
                    {yours ? t("journal.you") : t("journal.jev")}
                  </span>
                  <span className="text-sm font-semibold text-[#2c1810]">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      item.outcome === "MISS"
                        ? "text-[#5c4a3a]/80"
                        : yours
                          ? "text-[#8b3a30]"
                          : "text-[#2d6b64]",
                    )}
                  >
                    {outcomeLabel(t, item.outcome)}
                  </span>
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="min-h-[10.5rem]">
        {selected && selected.actor === "you" && !thinking && (
          <p className="text-sm text-[#5c4a3a]/80">
            {t("journal.youFired", {
              label: selected.label,
              outcome: outcomeLabel(t, selected.outcome),
            })}
          </p>
        )}

        {latest && selected?.actor === "jev" && !thinking && (
          <div className="space-y-3">
            <p className="text-sm text-[#5c4a3a]/80">
              {t("journal.moveMeta", { move: latest.move, ms: latest.ms })}
              {latest.source === "fallback" ? t("journal.fallback") : ""}
              {selected.outcome ? ` · ${outcomeLabel(t, selected.outcome)}` : ""}
            </p>
            <p className="text-base font-medium text-[#2c1810]">
              <span className="text-[#4a9d93]">◎</span>{" "}
              {t("journal.chosenLine", { label: latest.label })}
            </p>
            <p className="text-sm text-[#5c4a3a]/70">
              {t("journal.preference", {
                percent: chosenPercent.toFixed(1),
                fromJev: latest.source === "jev" ? t("journal.fromJev") : "",
              })}
            </p>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[#5c4a3a]/60">
                {t("journal.preferencesHeading")}
              </p>
              {(expanded ? latest.probabilities : latest.probabilities.slice(0, 3)).map(
                (p) => {
                  const isChosen = coordEquals(p.cell, latest.chosen);
                  return (
                    <div key={`${p.cell.row}-${p.cell.col}`} className="space-y-1">
                      <div className="flex justify-between text-xs text-[#5c4a3a]/80">
                        <span className={isChosen ? "font-semibold text-[#2c1810]" : undefined}>
                          {p.label}
                          {isChosen ? t("journal.chosenMark") : ""}
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
                    ? t("journal.showFewer")
                    : t("journal.more", {
                        count: latest.probabilities.length - 3,
                      })}
                </button>
              )}
              <p className="text-xs text-[#5c4a3a]/60">
                {t("journal.favored", {
                  label: latest.label,
                  percent: chosenPercent.toFixed(1),
                })}
              </p>
              {latest.confidence != null && (
                <p className="text-xs text-[#5c4a3a]/50">
                  {t("journal.confidence", {
                    percent: (latest.confidence * 100).toFixed(0),
                    label: latest.label,
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <details className="text-sm text-[#5c4a3a]/70">
        <summary className="cursor-pointer text-[#4a9d93]">
          {t("journal.what")}
        </summary>
        <p className="mt-2">{t("journal.explainer")}</p>
      </details>
    </aside>
  );
}
