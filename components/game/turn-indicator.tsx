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

const TURN_KINDS = Object.keys(COPY) as TurnKind[];

export function TurnIndicator({ kind }: TurnIndicatorProps) {
  const copy = COPY[kind];
  const yours = kind === "your-shot" || kind === "placement";
  const jevs = kind === "jev-thinking" || kind === "jev-shot";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex min-h-10 items-center"
    >
      <div
        data-turn={kind}
        className={`inline-grid grid-cols-[auto_1fr] items-center gap-x-2 rounded-full px-4 py-2 text-sm font-semibold ${
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
        <span className="grid">
          {TURN_KINDS.map((turn) => {
            const item = COPY[turn];
            const active = turn === kind;
            return (
              <span
                key={turn}
                className={active ? "visible" : "invisible"}
                style={{ gridArea: "1 / 1" }}
                aria-hidden={!active}
              >
                {item.label}
                <span className="hidden font-normal opacity-80 sm:inline">
                  {" "}
                  · {item.hint}
                </span>
              </span>
            );
          })}
        </span>
        <span className="sr-only">
          {copy.label}. {copy.hint}
        </span>
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
