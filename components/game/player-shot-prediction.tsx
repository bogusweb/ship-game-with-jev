"use client";

import { useLocale } from "@/lib/i18n";

export type PredictionStatus = "empty" | "loading" | "ready" | "error";

type PlayerShotPredictionProps = {
  status: PredictionStatus;
  label?: string;
  percent?: number;
  error?: string | null;
};

export function PlayerShotPrediction({
  status,
  label,
  percent,
  error,
}: PlayerShotPredictionProps) {
  const { t } = useLocale();
  const errorCopy = error || t("prediction.error");
  const percentCopy =
    percent != null
      ? t("prediction.percent", { value: percent.toFixed(1) })
      : "";
  const readyCopy =
    status === "ready" && label
      ? t("prediction.ready", { label, percent: percentCopy })
      : t("prediction.placeholder");

  return (
    <div className="w-full rounded-2xl bg-white/60 p-4 shadow-sm ring-1 ring-[#c8d4c0]/40">
      <p className="text-xs font-medium uppercase tracking-wide text-[#5c4a3a]/60">
        {t("prediction.title")}
      </p>
      <div className="mt-1 grid min-h-[2.75rem] text-sm">
        <p
          className={`col-start-1 row-start-1 text-[#5c4a3a]/70 ${
            status === "empty" ? "visible" : "invisible"
          }`}
          aria-hidden={status !== "empty"}
        >
          {t("prediction.empty")}
        </p>
        <p
          className={`col-start-1 row-start-1 text-[#5c4a3a]/80 ${
            status === "loading" ? "visible" : "invisible"
          }`}
          aria-hidden={status !== "loading"}
        >
          {t("prediction.loading")}
        </p>
        <p
          className={`col-start-1 row-start-1 line-clamp-2 text-[#8b3a30] ${
            status === "error" ? "visible" : "invisible"
          }`}
          aria-hidden={status !== "error"}
        >
          {errorCopy}
        </p>
        <p
          className={`col-start-1 row-start-1 text-[#2c1810] ${
            status === "ready" && label ? "visible" : "invisible"
          }`}
          aria-hidden={status !== "ready"}
        >
          {t("prediction.readyPrefix")}{" "}
          <span className="font-semibold text-[#4a9d93]">
            {label ?? "—"}
          </span>
          {percentCopy}
        </p>
        <span className="sr-only">
          {status === "empty"
            ? t("prediction.emptySr")
            : status === "loading"
              ? t("prediction.loadingSr")
              : status === "error"
                ? errorCopy
                : readyCopy}
        </span>
      </div>
    </div>
  );
}
