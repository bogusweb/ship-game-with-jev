"use client";

import { useLocale } from "@/lib/i18n";

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

const TURN_KINDS: TurnKind[] = [
  "placement",
  "your-shot",
  "jev-thinking",
  "jev-shot",
  "won",
  "lost",
];

function copyFor(
  t: ReturnType<typeof useLocale>["t"],
  kind: TurnKind,
): { label: string; hint: string } {
  switch (kind) {
    case "placement":
      return {
        label: t("turn.placement.label"),
        hint: t("turn.placement.hint"),
      };
    case "your-shot":
      return { label: t("turn.yourShot.label"), hint: t("turn.yourShot.hint") };
    case "jev-thinking":
      return {
        label: t("turn.jevThinking.label"),
        hint: t("turn.jevThinking.hint"),
      };
    case "jev-shot":
      return { label: t("turn.jevShot.label"), hint: t("turn.jevShot.hint") };
    case "won":
      return { label: t("turn.won.label"), hint: t("turn.won.hint") };
    case "lost":
      return { label: t("turn.lost.label"), hint: t("turn.lost.hint") };
  }
}

export function TurnIndicator({ kind }: TurnIndicatorProps) {
  const { t } = useLocale();
  const copy = copyFor(t, kind);
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
            const item = copyFor(t, turn);
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
