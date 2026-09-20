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
  /** True while Jev is choosing a shot — do not swap the card layout. */
  busy?: boolean;
};

export function JevCard({
  statusText,
  predictionStatus,
  predictionLabel,
  predictionPercent,
  predictionError,
  busy = false,
}: JevCardProps) {
  const { t } = useLocale();
  const showLabel =
    Boolean(predictionLabel) && !predictionError && predictionStatus !== "error";
  const caption = predictionError
    ? predictionError
    : t("jev.predictsYourTarget");
  const percentTitle =
    showLabel && predictionPercent != null
      ? t("prediction.percent", { value: predictionPercent.toFixed(1) }).trim()
      : undefined;

  return (
    <section
      className="jev-card"
      aria-label="Jev"
      aria-busy={busy || predictionStatus === "loading" || undefined}
    >
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
        <span className="predict-caption">{caption}</span>
        {showLabel ? (
          <strong className="predict-value" title={percentTitle}>
            {predictionLabel}
          </strong>
        ) : (
          <span className="predict-value predict-pending">
            {t("jev.predictPending")}
          </span>
        )}
      </div>
    </section>
  );
}
