export const FICTION_LANGUAGE_CODES = [
  "en",
  "es",
  "de",
  "fr",
  "it",
  "pt",
  "ja",
  "ko",
  "zh",
  "ar",
  "ru",
] as const

export type FictionLanguageCode = (typeof FICTION_LANGUAGE_CODES)[number]

export const FICTION_LANGUAGE_LABELS: Record<FictionLanguageCode, string> = {
  en: "English",
  es: "Spanish",
  de: "German",
  fr: "French",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  ru: "Russian",
}
