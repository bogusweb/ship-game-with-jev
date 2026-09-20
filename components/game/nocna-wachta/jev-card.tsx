"use client";

import { useLocale } from "@/lib/i18n";
import { Icon } from "./icons";

export type PredictionStatus = "empty" | "loading" | "ready" | "error";

export type JevCardProps = {
  /** Real engine/status line. The mockup quotes are sample copy, not model output. */
  statusText: string;
  predictionStatus: PredictionStatus;
  predictionLabel?: string;
  predictionPercent?: number;
  predictionError?: string | null;
};

export function JevCard({
  statusText,
  predictionStatus,
  predictionLabel,
  predictionPercent,
  predictionError,
}: JevCardProps) {
  const { t } = useLocale();
  const ready = predictionStatus === "ready" && predictionLabel;

  const caption = predictionError
    ? predictionError
    : predictionStatus === "loading"
      ? t("prediction.loading")
      : t("jev.predictsYourTarget");

  return (
    <section className="jev-card" aria-label="Jev">
      <div className="row">
        <div className="jev-avatar">
          <Icon name="jev" />
        </div>
        <div>
          <div className="jev-name">Jev</div>
          <div className="jev-sub">{t("jev.role")}</div>
        </div>
        <span className="spacer" />
        <span className="dot" style={{ color: "var(--sj-accent)" }} />
      </div>
      <p className="quote" role="status" aria-live="polite">
        {statusText}
      </p>
      <div className="predict-line">
        <Icon name="spark" />
        <span>
          {caption}
          {ready && predictionPercent != null ? (
            <span className="block">
              {t("prediction.percent", {
                value: predictionPercent.toFixed(1),
              }).replace(/^\s*·\s*/, "")}
            </span>
          ) : null}
        </span>
        {ready ? (
          <strong>{predictionLabel}</strong>
        ) : (
          <span className="predict-pending">{t("jev.predictPending")}</span>
        )}
      </div>
    </section>
  );
}
