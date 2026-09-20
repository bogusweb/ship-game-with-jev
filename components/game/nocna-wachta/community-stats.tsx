"use client";

import { useLocale } from "@/lib/i18n";

/**
 * Shared-waters block above the footer. The handoff numbers (3386 / 1849 /
 * 1537 / 42%) are demo data, and this build has no aggregate source, so every
 * counter and the recent-battles strip show an honest unavailable state
 * instead of invented live results.
 */
export function CommunityStats() {
  const { t } = useLocale();
  const metrics = [
    { key: "completed", label: t("community.completed"), className: "" },
    { key: "humanWins", label: t("community.humanWins"), className: "human-score" },
    { key: "jevWins", label: t("community.jevWins"), className: "jev-score" },
    { key: "accuracy", label: t("community.accuracy"), className: "" },
  ];

  return (
    <section className="community" aria-labelledby="community-title">
      <div className="community-heading">
        <span className="section-rule" />
        <div>
          <p className="eyebrow">{t("community.eyebrow")}</p>
          <h2 id="community-title">
            {t("community.title")}
            <span>.</span>
          </h2>
        </div>
        <span className="section-rule" />
      </div>
      <div className="community-metrics">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className={`metric-unavailable ${metric.className}`.trim()}
          >
            <strong aria-hidden="true">—</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
      <p className="community-context">
        <span className="community-note">
          <span className="dot" />
          {t("community.unavailable")}
        </span>
        <span>·</span>
        <span>{t("community.localOnly")}</span>
      </p>
      <details id="recent-battles" className="community-recent" open>
        <summary>
          {t("community.recent")}
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="m4 6 4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <div
          className="recent-scroll"
          role="list"
          aria-label={t("community.recentAria")}
        >
          <article className="recent-card recent-empty" role="listitem">
            {t("community.recentEmpty")}
          </article>
        </div>
      </details>
      <div className="community-performance">
        <span>
          <b aria-hidden="true">—</b> {t("community.jevDecisions")}
        </span>
        <span className="performance-separator" />
        <span>
          <b aria-hidden="true">—</b> {t("community.responseTime")}
        </span>
      </div>
    </section>
  );
}
