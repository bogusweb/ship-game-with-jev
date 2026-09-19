"use client";

export type TurnKind =
  | "placement"
  | "your-shot"
  | "jev-thinking"
  | "jev-shot"
  | "won"
  | "lost";

type TurnIndicatorProps = {
  kind: TurnKind;
};

const COPY: Record<TurnKind, { label: string; hint: string }> = {
  placement: { label: "Place your fleet", hint: "Ships go on the left board" },
  "your-shot": { label: "Your shot", hint: "Fire on Jev's waters" },
  "jev-thinking": { label: "Jev is thinking", hint: "Waiting on Jev's shot" },
  "jev-shot": { label: "Jev's shot", hint: "Jev is firing at your fleet" },
  won: { label: "You won", hint: "Jev's fleet is gone" },
  lost: { label: "Jev won", hint: "Your fleet is gone" },
};

export function TurnIndicator({ kind }: TurnIndicatorProps) {
  const copy = COPY[kind];
  const yours = kind === "your-shot" || kind === "placement";
  const jevs = kind === "jev-thinking" || kind === "jev-shot";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium text-white ${
            yours ? "bg-[#dc6b5e] ring-2 ring-[#dc6b5e] ring-offset-2 ring-offset-[#fefce4]" : "bg-[#dc6b5e]"
          }`}
        >
          You
        </span>
        <span className="text-[#5c4a3a]/60">vs.</span>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium text-white ${
            jevs ? "bg-[#4a9d93] ring-2 ring-[#4a9d93] ring-offset-2 ring-offset-[#fefce4]" : "bg-[#4a9d93]"
          }`}
        >
          Jev
        </span>
      </div>

      <div
        data-turn={kind}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
          yours
            ? "bg-[#dc6b5e] text-white"
            : jevs
              ? "bg-[#4a9d93] text-white"
              : "bg-[#e8ba3f] text-[#2c1810]"
        }`}
      >
        <span
          aria-hidden
          className={`h-2.5 w-2.5 rounded-full ${
            kind === "jev-thinking" ? "animate-pulse bg-white" : "bg-white/90"
          }`}
        />
        <span>{copy.label}</span>
        <span className="hidden font-normal opacity-80 sm:inline">· {copy.hint}</span>
      </div>
    </div>
  );
}

export function turnKindFromState(options: {
  phase: "placement" | "playing" | "won" | "lost";
  turn: "player" | "jev";
  isJevThinking: boolean;
}): TurnKind {
  if (options.phase === "placement") return "placement";
  if (options.phase === "won") return "won";
  if (options.phase === "lost") return "lost";
  if (options.isJevThinking) return "jev-thinking";
  if (options.turn === "jev") return "jev-shot";
  return "your-shot";
}
