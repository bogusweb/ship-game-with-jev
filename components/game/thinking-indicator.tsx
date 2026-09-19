"use client";

import { ThinkingOrb } from "thinking-orbs";

type ThinkingIndicatorProps = {
  visible: boolean;
};

export function ThinkingIndicator({ visible }: ThinkingIndicatorProps) {
  if (!visible) return null;

  return (
    <div
      className="inline-flex items-center gap-3 rounded-full px-4 py-2"
      style={{
        background: "rgba(29,29,29,0.08)",
        boxShadow: "inset 0 0 0 1px rgba(44,47,54,0.12)",
      }}
    >
      <span className="[&_canvas]:!size-8">
        <ThinkingOrb state="searching" size={20} theme="light" aria-label="Jev is thinking" />
      </span>
      <span className="text-sm text-[#5c4a3a]/80">Jev is thinking…</span>
    </div>
  );
}
