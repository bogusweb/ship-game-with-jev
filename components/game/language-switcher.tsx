"use client";

import { LOCALES, useLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="radiogroup"
      aria-label={t("language.label")}
      className="inline-flex shrink-0 rounded-full bg-white/70 p-0.5 ring-1 ring-[#c8d4c0]/60"
    >
      {LOCALES.map((code) => {
        const selected = locale === code;
        const label = code === "en" ? t("language.en") : t("language.pl");
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            onClick={() => setLocale(code as Locale)}
            className={cn(
              "min-h-8 min-w-10 rounded-full px-3 text-xs font-semibold tracking-wide transition-colors",
              selected
                ? "bg-[#2c1810] text-[#fefce4]"
                : "text-[#5c4a3a]/70 hover:text-[#2c1810]",
            )}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
