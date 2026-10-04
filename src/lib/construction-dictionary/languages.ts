// =========================================================
// FRELUX AI MULTILINGUAL CONSTRUCTION DICTIONARY
// LANGUAGE REGISTRY
//
// Languages are DATA, not architecture. Adding a language
// means adding a registry entry (here and, at runtime, a row
// in frelux_archie_languages); no core code changes.
//
// The registry mirrors the DB seed in migration
// 20260910140000_construction_dictionary.sql and extends the
// existing Phase 9 language registry with pt/ar/hi/zh. Nigerian
// languages were removed when the site went international;
// adding a language back (or forward) is still registry-only.
// =========================================================

export interface LanguageDefinition {
  /** BCP-47-ish code used across FRELUX (matches spec) */
  code: string;
  label: string;
  native_label: string;
  common_regions: readonly string[];
  /** script hints used by the deterministic language detector */
  script?: "latin" | "arabic" | "devanagari" | "cyrillic" | "cjk";
}

export const DICTIONARY_LANGUAGES: readonly LanguageDefinition[] = [
  {
    code: "en",
    label: "English",
    native_label: "English",
    common_regions: ["NG", "GB", "US"],
    script: "latin",
  },
  {
    code: "es",
    label: "Spanish",
    native_label: "Español",
    common_regions: ["ES", "MX"],
    script: "latin",
  },
  {
    code: "fr",
    label: "French",
    native_label: "Français",
    common_regions: ["FR"],
    script: "latin",
  },
  {
    code: "de",
    label: "German",
    native_label: "Deutsch",
    common_regions: ["DE", "AT", "CH"],
    script: "latin",
  },
  {
    code: "pt",
    label: "Portuguese",
    native_label: "Português",
    common_regions: ["PT", "BR"],
    script: "latin",
  },
  {
    code: "ru",
    label: "Russian",
    native_label: "Русский",
    common_regions: ["RU"],
    script: "cyrillic",
  },
  {
    code: "id",
    label: "Indonesian",
    native_label: "Bahasa Indonesia",
    common_regions: ["ID"],
    script: "latin",
  },
  {
    code: "sw",
    label: "Swahili",
    native_label: "Kiswahili",
    common_regions: ["KE", "TZ"],
    script: "latin",
  },
  {
    code: "ar",
    label: "Arabic",
    native_label: "العربية",
    common_regions: ["SA", "EG"],
    script: "arabic",
  },
  {
    code: "hi",
    label: "Hindi",
    native_label: "हिन्दी",
    common_regions: ["IN"],
    script: "devanagari",
  },
  {
    code: "zh",
    label: "Chinese",
    native_label: "中文",
    common_regions: ["CN"],
    script: "cjk",
  },
];

/** All registered language codes. */
export const LANGUAGE_CODES: readonly string[] = DICTIONARY_LANGUAGES.map(
  (l) => l.code,
);

/** Default language when nothing else resolves. */
export const DEFAULT_LANGUAGE = "en";

/** Look up a language definition by code. */
export function getLanguage(code: string): LanguageDefinition | undefined {
  return DICTIONARY_LANGUAGES.find((l) => l.code === code);
}

export function isValidLanguage(code: string): boolean {
  return LANGUAGE_CODES.includes(code);
}
