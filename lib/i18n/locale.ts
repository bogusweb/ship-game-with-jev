import {
  DEFAULT_LOCALE,
  LOCALES,
  messages,
  type Locale,
  type MessageKey,
} from "./messages";

export const LOCALE_STORAGE_KEY = "ship-game-locale";

export type MessageVars = Record<string, string | number>;

export type Translate = (key: MessageKey, vars?: MessageVars) => string;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function interpolate(template: string, vars?: MessageVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value == null ? match : String(value);
  });
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: MessageVars,
): string {
  const table = messages[locale] ?? messages[DEFAULT_LOCALE];
  return interpolate(table[key] ?? messages[DEFAULT_LOCALE][key], vars);
}

export function isPolishLanguageTag(tag: string): boolean {
  const lower = tag.toLowerCase();
  return lower === "pl" || lower.startsWith("pl-");
}

export function detectBrowserLocale(nav: {
  language?: string;
  languages?: readonly string[];
}): Locale {
  const primary = nav.language || nav.languages?.[0] || "";
  return isPolishLanguageTag(primary) ? "pl" : DEFAULT_LOCALE;
}

export function resolveLocale(
  stored: string | null | undefined,
  nav: { language?: string; languages?: readonly string[] },
): Locale {
  if (isLocale(stored)) return stored;
  return detectBrowserLocale(nav);
}

export function shipName(t: Translate, length: number | null | undefined): string {
  if (length === 4) return t("ship.4");
  if (length === 3) return t("ship.3");
  if (length === 2) return t("ship.2");
  if (length === 1) return t("ship.1");
  return t("ship.fallback");
}

const ENGINE_ERRORS: Record<string, MessageKey> = {
  "Ship is out of bounds": "error.outOfBounds",
  "Ships cannot touch, including diagonally": "error.shipsTouch",
  "Not in placement phase": "error.notPlacement",
  "All ships already placed": "error.allPlaced",
  "Not player's turn to shoot": "error.notPlayerTurn",
  "Not Jev's turn to shoot": "error.notJevTurn",
  "Cell is not a legal move": "error.illegalShot",
  "No legal moves for Jev": "error.noJevMoves",
  "Too many requests. Try again in a moment.": "error.tooManyRequests",
  "Could not start a play session. Refresh and try again.": "error.session",
  "Jev could not choose a shot": "error.jevChoose",
  "Invalid request": "error.invalidRequest",
  Forbidden: "error.forbidden",
  "Jev is unavailable": "error.unavailable",
  "Could not predict your next shot.": "prediction.error",
};

export function translateEngineError(t: Translate, message: string): string {
  const key = ENGINE_ERRORS[message];
  if (key) return t(key);

  const api = message.match(/^Jev API failed \((\d+)\)$/);
  if (api) return t("error.jevApi", { status: api[1] });

  const placement = message.match(/^No valid placement for ship length (\d+)$/);
  if (placement) return t("error.noPlacement", { length: placement[1] });

  return message;
}
