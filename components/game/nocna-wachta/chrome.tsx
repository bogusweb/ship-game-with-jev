"use client";

import { LOCALES, useLocale, type Locale } from "@/lib/i18n";
import { Icon } from "./icons";

export function LanguageSwitch() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div className="language-switch" role="group" aria-label={t("language.label")}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          aria-label={code === "en" ? t("language.en") : t("language.pl")}
          onClick={() => setLocale(code as Locale)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function TopBar({
  onNewGame,
  onRules,
}: {
  onNewGame: () => void;
  onRules: () => void;
}) {
  const { t } = useLocale();
  return (
    <header className="topbar">
      <div className="wordmark">
        <Icon name="logo" />
        <span>
          {t("chrome.wordmark")}
          <span className="word-dot">.</span>
        </span>
      </div>
      <nav className="top-nav" aria-label={t("meta.title")}>
        <span className="status-online row">
          <span className="dot" /> {t("chrome.jevLlm")}
        </span>
        <LanguageSwitch />
        <button
          type="button"
          className="text-btn"
          onClick={onNewGame}
          aria-label={t("action.newGame")}
        >
          <Icon name="reset" />
          {t("action.newGame")}
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={onRules}
          aria-label={t("action.rules")}
        >
          <Icon name="help" />
        </button>
      </nav>
    </header>
  );
}

export type TurnPillKind = "placement" | "your-turn" | "jev-thinking" | "complete";

export function TurnPill({ kind, move }: { kind: TurnPillKind; move: number }) {
  const { t } = useLocale();
  const label =
    kind === "complete"
      ? t("turn.pill.complete")
      : kind === "jev-thinking"
        ? t("turn.pill.jevThinking")
        : kind === "placement"
          ? t("turn.pill.placement")
          : t("turn.pill.yourTurn");

  return (
    <div className="turn-pill" role="status" aria-live="polite">
      <span className="dot" />
      <strong>{label}</strong>
      <span className="turn-divider" />
      <span className="turn-number mono">
        {t("turn.pill.number", {
          move: String(move).padStart(2, "0"),
        })}
      </span>
    </div>
  );
}

export function FleetStrip({
  lengths,
  sunkLengths,
}: {
  lengths: readonly number[];
  sunkLengths: readonly number[];
}) {
  const { t } = useLocale();
  const remaining = [...sunkLengths];
  const glyphs = lengths.map((length, index) => {
    const sunkIndex = remaining.indexOf(length);
    const sunk = sunkIndex >= 0;
    if (sunk) remaining.splice(sunkIndex, 1);
    return { length, sunk, key: `${length}-${index}` };
  });
  const afloat = glyphs.filter((glyph) => !glyph.sunk).length;

  return (
    <div
      className="fleet-strip"
      aria-label={t("sidebar.fleetAfloat", { afloat })}
    >
      {glyphs.map((glyph) => (
        <span
          key={glyph.key}
          className={glyph.sunk ? "fleet-glyph sunk" : "fleet-glyph"}
          title={
            glyph.sunk
              ? t("fleet.lengthSunk", { length: glyph.length })
              : t("fleet.length", { length: glyph.length })
          }
        >
          {Array.from({ length: glyph.length }, (_, i) => (
            <i key={i} />
          ))}
        </span>
      ))}
      <span className="fleet-count">
        <b>{afloat}</b> / {lengths.length}
      </span>
    </div>
  );
}

export function Legend() {
  const { t } = useLocale();
  return (
    <div className="legend">
      <span>
        <i />
        {t("legend.miss")}
      </span>
      <span className="hit">
        <i />
        {t("legend.hit")}
      </span>
      <span className="selected">
        <i />
        {t("legend.target")}
      </span>
    </div>
  );
}

export function ShipDots({ length }: { length: number }) {
  return (
    <span className="ship-dots" aria-hidden="true">
      {Array.from({ length }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

export function PageFooter() {
  const { t } = useLocale();
  return (
    <footer className="page-footer">
      <span>
        {t("footer.tagline")} <b>{t("footer.jevBy")} TypeSafe.</b>
      </span>
      <a
        href="https://typesafe.ai"
        target="_blank"
        rel="noopener noreferrer"
      >
        typesafe.ai
      </a>
    </footer>
  );
}
