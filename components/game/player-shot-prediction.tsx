"use client";

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
  const errorCopy = error || "Could not predict your next shot.";
  const readyCopy =
    status === "ready" && label
      ? `Jev expects ${label}${percent != null ? ` · ${percent.toFixed(1)}%` : ""}`
      : "Jev expects — · 00.0%";

  return (
    <div className="w-full rounded-2xl bg-white/60 p-4 shadow-sm ring-1 ring-[#c8d4c0]/40">
      <p className="text-xs font-medium uppercase tracking-wide text-[#5c4a3a]/60">
        Next shot
      </p>
      <div className="mt-1 grid min-h-[2.75rem] text-sm">
        <p
          className={`col-start-1 row-start-1 text-[#5c4a3a]/70 ${
            status === "empty" ? "visible" : "invisible"
          }`}
          aria-hidden={status !== "empty"}
        >
          Jev expects … nothing yet. Fire a shot and Jev will guess where you
          aim next.
        </p>
        <p
          className={`col-start-1 row-start-1 text-[#5c4a3a]/80 ${
            status === "loading" ? "visible" : "invisible"
          }`}
          aria-hidden={status !== "loading"}
        >
          Jev is predicting your next shot…
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
          Jev expects{" "}
          <span className="font-semibold text-[#4a9d93]">
            {label ?? "—"}
          </span>
          {percent != null ? ` · ${percent.toFixed(1)}%` : ""}
        </p>
        <span className="sr-only">
          {status === "empty"
            ? "Jev expects nothing yet."
            : status === "loading"
              ? "Jev is predicting your next shot."
              : status === "error"
                ? errorCopy
                : readyCopy}
        </span>
      </div>
    </div>
  );
}
