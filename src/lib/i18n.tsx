/* eslint-disable react-refresh/only-export-components */
/**
 * Translation System for FRELUX
 *
 * Worldwide language layer. Every registered language has:
 *  1. a locale URL prefix (/es/, /fr/, /de/, /pt/, /ru/,
 *     /id/, /sw/, /ar/, /hi/, /zh/ - plus /en/), routed by App's
 *     LocaleAwareRoutes. Since the 2026-10-23 i18n batch the server
 *     serves locale URLs with 200 (URL durable: shared links,
 *     bookmarks and refreshes keep the locale; netlify.toml) and an
 *     X-Robots-Tag: noindex header keeps them out of the index
 *     (public/_headers) — stronger than the previous canonical-only
 *     approach that produced Search Console's duplicate reports.
 *     Locale URLs are still NOT SEO pages: prerender emits one
 *     content-bearing page per route (English), locale URLs stay
 *     absent from the sitemap, and hreflang + sitemap entries return
 *     only once locale URLs carry genuinely translated content.
 *     /en/ stays a 301 to / (English is the default origin).
 *  2. real React-level chrome translations (nav labels and common
 *     actions) so locale URLs render translated chrome without the
 *     Google Translate widget. Keys are the English source strings;
 *     t() falls back to the key itself, so unstranslated strings keep
 *     rendering English instead of breaking.
 *
 * The Google Translate widget stays as a whole-page convenience for
 * logged-in visitors; locale URLs are the SEO surface.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { GoogleTranslateSync } from "@/components/ui/GoogleTranslate";
// Currency grouping follows the active language (i18n batch 2026-10-23).
import { setActiveCurrencyLocale } from "@/lib/international/currency-format";

export type Language =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ru"
  | "id"
  | "sw"
  | "ar"
  | "hi"
  | "zh"
  | "ja"
  | "nl";

export const LANGUAGES: {
  value: Language;
  label: string;
  nativeLabel: string;
  flag: string;
}[] = [
  { value: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { value: "es", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸" },
  { value: "fr", label: "French", nativeLabel: "Français", flag: "🇫🇷" },
  { value: "de", label: "German", nativeLabel: "Deutsch", flag: "🇩🇪" },
  { value: "pt", label: "Portuguese", nativeLabel: "Português", flag: "🇵🇹" },
  { value: "ru", label: "Russian", nativeLabel: "Русский", flag: "🇷🇺" },
  {
    value: "id",
    label: "Indonesian",
    nativeLabel: "Bahasa Indonesia",
    flag: "🇮🇩",
  },
  { value: "sw", label: "Swahili", nativeLabel: "Kiswahili", flag: "🇰🇪" },
  { value: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇸🇦" },
  { value: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳" },
  { value: "zh", label: "Chinese", nativeLabel: "中文", flag: "🇨🇳" },
  { value: "ja", label: "Japanese", nativeLabel: "日本語", flag: "🇯🇵" },
  { value: "nl", label: "Dutch", nativeLabel: "Nederlands", flag: "🇳🇱" },
];

/** URL path prefix per language - every language gets a locale URL. */
export const LOCALE_ROUTES: { value: Language; path: string }[] = LANGUAGES.map(
  (l) => ({ value: l.value, path: l.value }),
);

export function localeFromPathname(pathname: string): Language | null {
  const m = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  return m && LANGUAGES.some((l) => l.value === m[1])
    ? (m[1] as Language)
    : null;
}

/** "/es/pricing" -> "/pricing"; "/es" -> "/"; untouched otherwise. */
export function stripLocaleFromPathname(pathname: string): string {
  const loc = localeFromPathname(pathname);
  if (!loc) return pathname;
  const rest = pathname.slice(`/${loc}`.length);
  return rest === "" ? "/" : rest;
}

type TranslationKey = string;

// Chrome translations keyed by the English source string. Filling in
// more strings is pure data - no component changes needed. Exported for
// the i18n tests, which assert the hero keys exist in every locale.
/**
 * Runtime dictionary. English is the fallback for every key, so it is the only
 * dictionary that must exist before the first paint. The other twelve curated
 * dictionaries were ~80 KB of strings every visitor downloaded, including the
 * English readers who never render them; they now arrive with that language's
 * machine dictionary, which the entry point already waits for on a /es/ style
 * URL (main.tsx -> ensureLanguageLoaded).
 */
const EMPTY_DICTIONARY = {} as Record<TranslationKey, string>;

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {},
  es: EMPTY_DICTIONARY,
  fr: EMPTY_DICTIONARY,
  de: EMPTY_DICTIONARY,
  pt: EMPTY_DICTIONARY,
  ru: EMPTY_DICTIONARY,
  id: EMPTY_DICTIONARY,
  sw: EMPTY_DICTIONARY,
  ar: EMPTY_DICTIONARY,
  hi: EMPTY_DICTIONARY,
  zh: EMPTY_DICTIONARY,
  ja: EMPTY_DICTIONARY,
  nl: EMPTY_DICTIONARY,
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  /**
   * The language whose machine dictionary is currently merged in, or null while
   * it is still being fetched. Components rarely need this; it exists so the
   * provider's value changes when a dictionary lands and the tree re-renders.
   */
  loadedLanguage: Language | null;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  loadedLanguage: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

/**
 * Bulk translations live in per-language JSON files next to this module.
 * They cover the long tail of UI strings; the hand-authored dictionary above
 * always wins, so a curated string is never overwritten by the generated file.
 * A missing key falls back to English by returning the key itself.
 */
import approvedOverrides from "@/lib/i18n/overrides.json";

/**
 * Machine translation dictionaries are loaded on demand.
 *
 * Each locale file is 200-300 kB of JSON. Importing all twelve up front put
 * roughly 2.5 MB of dictionary into the app bundle for every visitor, in every
 * language, whether or not they used one. They are fetched per language now:
 * an English visitor downloads none of them, and a Spanish visitor downloads
 * only Spanish.
 */
const GENERATED_LOADERS: Partial<
  Record<Language, () => Promise<{ default: Record<string, string> }>>
> = {
  es: () => import("@/lib/i18n/locales/es.json"),
  fr: () => import("@/lib/i18n/locales/fr.json"),
  de: () => import("@/lib/i18n/locales/de.json"),
  pt: () => import("@/lib/i18n/locales/pt.json"),
  ar: () => import("@/lib/i18n/locales/ar.json"),
  hi: () => import("@/lib/i18n/locales/hi.json"),
  zh: () => import("@/lib/i18n/locales/zh.json"),
  ja: () => import("@/lib/i18n/locales/ja.json"),
  ru: () => import("@/lib/i18n/locales/ru.json"),
  id: () => import("@/lib/i18n/locales/id.json"),
  sw: () => import("@/lib/i18n/locales/sw.json"),
  nl: () => import("@/lib/i18n/locales/nl.json"),
};

/** Curated strings per language, fetched alongside the machine dictionary. */
const CURATED_LOADERS: Partial<
  Record<Language, () => Promise<{ default: Record<string, string> }>>
> = {
  es: () => import("@/lib/i18n/curated/es.json"),
  fr: () => import("@/lib/i18n/curated/fr.json"),
  de: () => import("@/lib/i18n/curated/de.json"),
  pt: () => import("@/lib/i18n/curated/pt.json"),
  ru: () => import("@/lib/i18n/curated/ru.json"),
  id: () => import("@/lib/i18n/curated/id.json"),
  sw: () => import("@/lib/i18n/curated/sw.json"),
  ar: () => import("@/lib/i18n/curated/ar.json"),
  hi: () => import("@/lib/i18n/curated/hi.json"),
  zh: () => import("@/lib/i18n/curated/zh.json"),
  ja: () => import("@/lib/i18n/curated/ja.json"),
  nl: () => import("@/lib/i18n/curated/nl.json"),
};

const OVERRIDES = approvedOverrides as unknown as Record<
  string,
  Record<string, string>
>;

/** Languages whose machine dictionary has been merged in. English needs none. */
const mergedLanguages = new Set<Language>(["en"]);
const pendingLoads = new Map<Language, Promise<void>>();

function mergeLanguage(
  language: Language,
  generated: Record<string, string>,
  curated: Record<string, string>,
): void {
  translations[language] = {
    ...generated,
    ...curated,
    // Human-approved fixes for ambiguous words win over every machine string.
    ...(OVERRIDES[language] ?? {}),
  } as Record<TranslationKey, string>;
  mergedLanguages.add(language);
}

/** True once the language can render its full dictionary. */
export function isLanguageLoaded(language: Language): boolean {
  return mergedLanguages.has(language);
}

/**
 * Loads a language's machine dictionary and merges it with the curated
 * strings. Safe to call repeatedly; concurrent callers share one request. A
 * failed chunk is not fatal: the curated strings still render and the visitor
 * simply sees English where a machine string would have been.
 */
export function ensureLanguageLoaded(language: Language): Promise<void> {
  if (mergedLanguages.has(language)) return Promise.resolve();
  const pending = pendingLoads.get(language);
  if (pending) return pending;

  const loadGenerated = GENERATED_LOADERS[language];
  const loadCurated = CURATED_LOADERS[language];
  if (!loadGenerated && !loadCurated) {
    mergeLanguage(language, {}, {});
    return Promise.resolve();
  }

  // Both dictionaries arrive together: the generated one carries the bulk, the
  // curated one wins where a human wrote a better sentence.
  const promise = Promise.all([
    loadGenerated
      ? loadGenerated()
          .then((mod) => (mod.default ?? {}) as Record<string, string>)
          .catch(() => ({}))
      : Promise.resolve({}),
    loadCurated
      ? loadCurated()
          .then((mod) => (mod.default ?? {}) as Record<string, string>)
          .catch(() => ({}))
      : Promise.resolve({}),
  ])
    .then(([generated, curated]) => mergeLanguage(language, generated, curated))
    .finally(() => {
      pendingLoads.delete(language);
    });
  pendingLoads.set(language, promise);
  return promise;
}

/**
 * Module-level translation for text that lives outside a component that can
 * hold the hook (deeply nested render helpers, large single-file pages).
 *
 * It reads the language the provider last activated, so it stays in sync
 * without threading t() through every layer. Use the hook in ordinary
 * components; reach for tx() only where a hook cannot be added safely.
 */
let activeLanguage: Language = "en";

export function setActiveLanguage(language: Language) {
  activeLanguage = language;
}

export function tx(key: string, language: Language = activeLanguage): string {
  const dictionary = translations[language] as
    Record<string, string> | undefined;
  if (!dictionary) return translations.en[key as TranslationKey] ?? key;
  return dictionary[key] ?? translations.en[key as TranslationKey] ?? key;
}

/**
 * The language this visit should start in: a /es/ style URL prefix first, then
 * a remembered preference, then English. Shared with the entry point so the
 * dictionary can be fetched before the first paint.
 */
export function detectInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  // A URL locale prefix wins over a stored preference, so crawlable
  // /es/ etc. entry points always render in their own language.
  const urlLocale = localeFromPathname(window.location.pathname);
  if (urlLocale) return urlLocale;
  const stored = localStorage.getItem("frelux_lang");
  // A stored value that is no longer a registered language (e.g. a
  // removed one) falls back to English rather than breaking the app.
  return LANGUAGES.some((l) => l.value === stored)
    ? (stored as Language)
    : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    detectInitialLanguage,
  );
  // Bumped once a language's dictionary arrives, so the tree re-renders with it.
  const [loadedLanguage, setLoadedLanguage] = useState<Language | null>(() =>
    isLanguageLoaded(detectInitialLanguage()) ? detectInitialLanguage() : null,
  );

  useEffect(() => {
    let cancelled = false;
    if (isLanguageLoaded(language)) {
      setLoadedLanguage(language);
    } else {
      void ensureLanguageLoaded(language).then(() => {
        if (!cancelled) setLoadedLanguage(language);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    setActiveLanguage(language);
    localStorage.setItem("frelux_lang", language);
    document.documentElement.setAttribute("lang", language);
    document.documentElement.setAttribute(
      "dir",
      language === "ar" ? "rtl" : "ltr",
    );
    // Currency presentation follows the active language: the Intl
    // language tag ("fr") resolves grouping/decimal separators for
    // every formatByCode/formatWithSymbol call without an explicit
    // locale option (i18n batch 2026-10-23).
    setActiveCurrencyLocale(language === "en" ? null : language);
  }, [language]);

  setActiveLanguage(language);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    // An explicit switcher choice suppresses the location-aware
    // language suggestion permanently (consent hygiene).
    try {
      localStorage.setItem("frelux_lang_chosen", "1");
    } catch {
      // storage unavailable — LocalePrompt stays inert on its own paths
    }
  }

  function t(key: string): string {
    const dict = translations[language];
    if (!dict) return key;
    return dict[key] ?? translations.en[key] ?? key;
  }

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, loadedLanguage }}
    >
      <GoogleTranslateSync language={language} />
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
