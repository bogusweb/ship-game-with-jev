"use client";

import { useState } from "react";
import { chosenShotPercent, coordEquals } from "@/lib/game/journal";
import {
  newestFirst,
  type HistoryOutcome,
  type MatchHistoryItem,
} from "@/lib/game/match-history";
import { useLocale, type Translate } from "@/lib/i18n";

type OperationsLogProps = {
  history: MatchHistoryItem[];
  thinking?: boolean;
  error?: string | null;
  /** Short live line shown next to the log title. */
  toast: string;
};

function outcomeLabel(t: Translate, outcome: HistoryOutcome): string {
  if (outcome === "HIT") return t("outcome.HIT");
  if (outcome === "MISS") return t("outcome.MISS");
  return t("outcome.SUNK");
}

/**
 * Nocna wachta operations log. Chips mirror the mockup; selecting a Jev chip
 * keeps the existing shot-preference breakdown, including the wording that a
 * cell percentage is not a hit probability.
 */
export function OperationsLog({
  history,
  thinking,
  error,
  toast,
}: OperationsLogProps) {
  const { t } = useLocale();
  const ordered = newestFirst(history);
  const newestId = ordered[0]?.id;
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const selectedId =
    pinnedId && pinnedId !== newestId && ordered.some((i) => i.id === pinnedId)
      ? pinnedId
      : newestId;
  const selected = ordered.find((i) => i.id === selectedId) ?? ordered[0] ?? null;
  const journal = selected?.journal;
  const chosenPercent = journal
    ? (journal.chosenPercent ??
      chosenShotPercent(journal.chosen, journal.probabilities))
    : 0;

  const banner = error ?? (thinking ? t("journal.thinking") : toast);

  return (
    <section className="activity" aria-label={t("log.title")}>
      <div className="activity-header">
        <span className="activity-title">{t("log.title")}</span>
        <span className="toast" role="status">
          {banner}
        </span>
      </div>

      <div className="log-list" role="list" aria-label={t("journal.ariaHistory")}>
        {ordered.length === 0 ? (
          <div role="listitem" className="log-chip">
            <span>{t("journal.empty")}</span>
          </div>
        ) : (
          ordered.slice(0, 3).map((item) => (
            <div key={item.id} role="listitem" className="contents">
              <button
                type="button"
                className="log-chip"
                aria-pressed={selected?.id === item.id}
                onClick={() => {
                  setPinnedId(item.id === newestId ? null : item.id);
                  setExpanded(false);
                }}
              >
                <span>
                  {item.actor === "you" ? t("journal.you") : t("journal.jev")}{" "}
                  <b>{item.label}</b>
                </span>
                <span className={item.outcome === "MISS" ? undefined : "result-hit"}>
                  {item.outcome === "MISS" ? "○" : "●"}{" "}
                  {outcomeLabel(t, item.outcome)}
                </span>
              </button>
            </div>
          ))
        )}
      </div>

      {selected && !thinking ? (
        <div className="journal-detail">
          {selected.actor === "you" ? (
            <p className="journal-meta">
              {t("journal.youFired", {
                label: selected.label,
                outcome: outcomeLabel(t, selected.outcome),
              })}
            </p>
          ) : journal ? (
            <>
              <p className="journal-meta">
                {t("journal.moveMeta", { move: journal.move, ms: journal.ms })}
                {journal.source === "fallback" ? t("journal.fallback") : ""}
                {selected.outcome
                  ? ` · ${outcomeLabel(t, selected.outcome)}`
                  : ""}
              </p>
              <p className="journal-chosen">
                <span>◎</span>{" "}
                {t("journal.chosenLine", { label: journal.label })}
              </p>
              <p className="journal-pref">
                {t("journal.preference", {
                  percent: chosenPercent.toFixed(1),
                  fromJev: journal.source === "jev" ? t("journal.fromJev") : "",
                })}
              </p>

              <h3>{t("journal.preferencesHeading")}</h3>
              {(expanded
                ? journal.probabilities
                : journal.probabilities.slice(0, 3)
              ).map((p) => {
                const isChosen = coordEquals(p.cell, journal.chosen);
                return (
                  <div
                    key={`${p.cell.row}-${p.cell.col}`}
                    className="journal-bar-row"
                  >
                    <div className="journal-bar-head">
                      <span className={isChosen ? "chosen" : undefined}>
                        {p.label}
                        {isChosen ? t("journal.chosenMark") : ""}
                      </span>
                      <span className={isChosen ? "chosen" : undefined}>
                        {p.percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="journal-bar">
                      <i style={{ width: `${Math.min(100, p.percent)}%` }} />
                    </div>
                  </div>
                );
              })}
              {journal.probabilities.length > 3 ? (
                <button
                  type="button"
                  className="journal-more"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded
                    ? t("journal.showFewer")
                    : t("journal.more", {
                        count: journal.probabilities.length - 3,
                      })}
                </button>
              ) : null}
              <p className="journal-footnote">
                {t("journal.favored", {
                  label: journal.label,
                  percent: chosenPercent.toFixed(1),
                })}
              </p>
              {journal.confidence != null ? (
                <p className="journal-footnote">
                  {t("journal.confidence", {
                    percent: (journal.confidence * 100).toFixed(0),
                    label: journal.label,
                  })}
                </p>
              ) : null}
            </>
          ) : null}

          <details className="journal-explainer">
            <summary>{t("journal.what")}</summary>
            <p>{t("journal.explainer")}</p>
          </details>
        </div>
      ) : null}
    </section>
  );
}
