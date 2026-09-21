export const LOCALES = ["en", "pl"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

const en = {
  "meta.title": "Ship Game with Jev",
  "attack.fireOnClick": "Fire on click",
  "cell.fireHint": " — fire",
  "cell.targetHint": " — choose target",
  "cell.alreadyFired": " — already fired",
  "setup.autoDeploy": "Auto-deploy fleet",
  "setup.clear": "Clear",
} as const;

export type MessageKey = keyof typeof en;

const pl: Record<MessageKey, string> = {
  "meta.title": "Gra w statki z Jevem",
  "attack.fireOnClick": "Strzał po kliknięciu",
  "cell.fireHint": " — strzał",
  "cell.targetHint": " — wybierz cel",
  "cell.alreadyFired": " — już ostrzelane",
  "setup.autoDeploy": "Rozstaw automatycznie",
  "setup.clear": "Wyczyść",
};

export const messages: Record<Locale, Record<MessageKey, string>> = {
  en,
  pl,
};
