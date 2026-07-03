import { getEnv } from "@/lib/env";

export const DEFAULT_LOCALE = getEnv("DEFAULT_LOCALE", "en");

export const SUPPORTED_LOCALES = (
  getEnv("SUPPORTED_LOCALES", "en,id,vi,th")
)
  .split(",")
  .map((locale) => locale.trim())
  .filter(Boolean);

export const localeLabels: Record<string, string> = {
  en: "English",
  id: "Indonesia",
  vi: "Tieng Viet",
  th: "Thai",
  "ms-MY": "Malay",
  "tl-PH": "Tagalog",
  "zh-Hans": "Chinese"
};

export function normalizeLocale(locale?: string) {
  if (locale && SUPPORTED_LOCALES.includes(locale)) {
    return locale;
  }

  return DEFAULT_LOCALE;
}

export function getLocaleAlternates(pathForLocale: (locale: string) => string) {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, pathForLocale(locale)])
  );
}
