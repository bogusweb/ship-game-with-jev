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
  return (
    <div className="w-full rounded-2xl bg-white/60 p-4 shadow-sm ring-1 ring-[#c8d4c0]/40">
      <p className="text-xs font-medium uppercase tracking-wide text-[#5c4a3a]/60">
        Next shot
      </p>
      {status === "empty" && (
        <p className="mt-1 text-sm text-[#5c4a3a]/70">
          Jev expects … nothing yet. Fire a shot and Jev will guess where you
          aim next.
        </p>
      )}
      {status === "loading" && (
        <p className="mt-1 text-sm text-[#5c4a3a]/80">
          Jev is predicting your next shot…
        </p>
      )}
      {status === "error" && (
        <p className="mt-1 text-sm text-[#8b3a30]">
          {error || "Could not predict your next shot."}
        </p>
      )}
      {status === "ready" && label && (
        <p className="mt-1 text-sm text-[#2c1810]">
          Jev expects{" "}
          <span className="font-semibold text-[#4a9d93]">{label}</span>
          {percent != null ? ` · ${percent.toFixed(1)}%` : ""}
        </p>
      )}
    </div>
  );
}
