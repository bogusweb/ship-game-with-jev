"use client";

import { useLocale } from "@/lib/i18n";

/**
 * Shared-waters block above the footer. The handoff numbers (3386 / 1849 /
 * 1537 / 42%) are demo data, and this build has no aggregate source, so every
 * counter shows an honest unavailable state instead of invented live results.
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
    </section>
  );
}
