import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { messages, type MessageKey } from "./messages";
import {
  detectBrowserLocale,
  interpolate,
  resolveLocale,
  shipName,
  translate,
  translateEngineError,
} from "./locale";

describe("i18n dictionaries", () => {
  it("keeps the same keys in English and Polish", () => {
    const enKeys = Object.keys(messages.en).sort();
    const plKeys = Object.keys(messages.pl).sort();
    assert.deepEqual(plKeys, enKeys);
  });

  it("fills interpolation slots", () => {
    assert.equal(interpolate("Hello {name}", { name: "Paweł" }), "Hello Paweł");
    assert.equal(interpolate("plain"), "plain");
  });

  it("translates ship names without touching the rules engine", () => {
    const tEn = (key: MessageKey) => translate("en", key);
    const tPl = (key: MessageKey) => translate("pl", key);
    assert.equal(shipName(tEn, 4), "Cruiser");
    assert.equal(shipName(tPl, 4), "krążownik");
    assert.equal(shipName(tPl, 99), "okręt");
  });

  it("maps engine and API errors to player-facing copy", () => {
    const t = (key: MessageKey, vars?: Record<string, string | number>) =>
      translate("pl", key, vars);
    assert.equal(
      translateEngineError(t, "Ships cannot touch, including diagonally"),
      "Okręty nie mogą się stykać, także po skosie",
    );
    assert.equal(
      translateEngineError(t, "Jev API failed (500)"),
      "API Jeva nie zadziałało (500)",
    );
    assert.equal(translateEngineError(t, "mystery"), "mystery");
  });
});

describe("locale detection", () => {
  it("defaults to English unless the browser language is Polish", () => {
    assert.equal(detectBrowserLocale({ language: "en-US" }), "en");
    assert.equal(detectBrowserLocale({ language: "de-DE" }), "en");
    assert.equal(detectBrowserLocale({ language: "pl" }), "pl");
    assert.equal(detectBrowserLocale({ language: "pl-PL" }), "pl");
    assert.equal(detectBrowserLocale({ languages: ["pl-PL", "en"] }), "pl");
    assert.equal(detectBrowserLocale({}), "en");
  });

  it("prefers a stored choice over navigator", () => {
    assert.equal(resolveLocale("en", { language: "pl-PL" }), "en");
    assert.equal(resolveLocale("pl", { language: "en-US" }), "pl");
    assert.equal(resolveLocale(null, { language: "pl" }), "pl");
    assert.equal(resolveLocale("fr", { language: "en" }), "en");
  });
});
