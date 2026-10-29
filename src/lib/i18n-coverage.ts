import { LANGUAGES, translations, type Language } from "@/lib/i18n";
import generatedEs from "@/lib/i18n/locales/es.json";
import generatedFr from "@/lib/i18n/locales/fr.json";
import generatedDe from "@/lib/i18n/locales/de.json";
import generatedPt from "@/lib/i18n/locales/pt.json";
import generatedAr from "@/lib/i18n/locales/ar.json";
import generatedHi from "@/lib/i18n/locales/hi.json";
import generatedZh from "@/lib/i18n/locales/zh.json";
import generatedJa from "@/lib/i18n/locales/ja.json";
import generatedRu from "@/lib/i18n/locales/ru.json";
import generatedId from "@/lib/i18n/locales/id.json";
import generatedSw from "@/lib/i18n/locales/sw.json";
import generatedNl from "@/lib/i18n/locales/nl.json";
import approvedOverrides from "@/lib/i18n/overrides.json";

/**
 * The strings every locale must translate before its pages are eligible to be
 * indexed: the navigation and footer labels a visitor meets on every page.
 * If half of them are still English, the locale URL is a near-duplicate of the
 * English page and must not enter the sitemap.
 *
 * Keep this list in sync with src/config/site.ts (nav workspaces) and
 * src/components/layout/Footer.tsx (footer groups).
 */
export const CORE_CATALOG: readonly string[] = [
  "Home",
  "Construction Tools",
  "Colors & Design",
  "Color Library",
  "Compare Colors",
  "Smart Color Assistant",
  "AI Color Preview",
  "Services",
  "Marketplace",
  "Pro Connect",
  "Developer API",
  "Pricing",
  "Projects",
  "My Projects",
  "Project Workspace",
  "Estimate Analytics",
  "Templates",
  "Brand Studio",
  "Learn",
  "Learn Hub",
  "User Guide",
  "About FRELUX",
  "Contact",
  "Feedback",
  "Calculators",
  "Explore",
  "Resources",
  "Legal",
  "Painting Calculator",
  "Screeding Calculator",
  "POP Ceiling Calculator",
  "Tile Calculator",
  "Finishing Calculator",
  "Build-to-Roof Estimator",
  "AI Photo Estimator",
  "Smart Calculator",
  "Structural Calculator",
  "Foundation Calculator",
  "Case Studies",
  "Project Gallery",
  "Material Prices",
  "Glossary",
  "Free Templates",
  "Partners",
  "Privacy Policy",
  "Terms of Service",
  "Cookie Policy",
  "Disclaimer",
  "AI Disclaimer",
  "Sign In",
] as const;

const GENERATED_DICTIONARIES: Record<string, Record<string, string>> = {
  es: generatedEs,
  fr: generatedFr,
  de: generatedDe,
  pt: generatedPt,
  ar: generatedAr,
  hi: generatedHi,
  zh: generatedZh,
  ja: generatedJa,
  ru: generatedRu,
  id: generatedId,
  sw: generatedSw,
  nl: generatedNl,
};

/**
 * Every interface string the app routes through t("..."). Built from the
 * generated dictionaries so a string that exists in one locale must exist in
 * all of them, and the count can never drift silently.
 */
export const UI_CATALOG: readonly string[] = Array.from(
  new Set([
    ...CORE_CATALOG,
    ...Object.values(GENERATED_DICTIONARIES).flatMap((dictionary) =>
      Object.keys(dictionary),
    ),
    ...Object.values(
      approvedOverrides as unknown as Record<string, Record<string, string>>,
    )
      .filter((value) => typeof value === "object")
      .flatMap((value) => Object.keys(value)),
  ]),
).sort();

export interface LocaleCoverage {
  language: Language;
  /** Catalog keys with a real translation (English counts as translated). */
  translated: number;
  total: number;
  /** 0-100, rounded down so 99.6% never reads as complete. */
  percent: number;
  missing: string[];
}

export function coverageFor(language: Language): LocaleCoverage {
  const total = UI_CATALOG.length;
  if (language === "en") {
    return { language, translated: total, total, percent: 100, missing: [] };
  }
  const dictionary = (translations[language] ?? {}) as Record<string, string>;
  const missing = UI_CATALOG.filter((key) => {
    const value = dictionary[key];
    return !value || value.trim().length === 0;
  });
  const translated = total - missing.length;
  return {
    language,
    translated,
    total,
    percent: Math.floor((translated / total) * 100),
    missing,
  };
}

/** Every locale, worst coverage first. Used by the coverage report script. */
export function coverageReport(): LocaleCoverage[] {
  return LANGUAGES.map((l) => coverageFor(l.value)).sort(
    (a, b) => a.percent - b.percent || a.language.localeCompare(b.language),
  );
}

/**
 * Locales whose interface is fully translated. A locale outside this list
 * still renders (with English falling back in), but its URLs stay out of the
 * index so search engines never see a half-translated duplicate.
 */
export const CHROME_COMPLETE_LOCALES: Language[] = LANGUAGES.map(
  (l) => l.value,
).filter((language) => coverageFor(language).percent === 100);

/** True only for a locale that is both translated and safe to index. */
export function isChromeComplete(language: Language): boolean {
  return CHROME_COMPLETE_LOCALES.includes(language);
}

export { GENERATED_DICTIONARIES, approvedOverrides };
