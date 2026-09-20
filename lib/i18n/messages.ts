export const LOCALES = ["en", "pl"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

const en = {
  "meta.title": "Ship Game with Jev",
  "attack.fireOnClick": "Fire on click",
  "cell.fireHint": " — fire",
} as const;

export type MessageKey = keyof typeof en;

const pl: Record<MessageKey, string> = {
  "meta.title": "Gra w statki z Jevem",
  "attack.fireOnClick": "Strzał po kliknięciu",
  "cell.fireHint": " — strzał",
};

export const messages: Record<Locale, Record<MessageKey, string>> = {
  en,
  pl,
};
