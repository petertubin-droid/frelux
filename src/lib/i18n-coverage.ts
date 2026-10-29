import { LANGUAGES, translations, type Language } from "@/lib/i18n";

/**
 * The strings every locale must translate before its pages are eligible to be
 * indexed. These are the navigation and footer labels a visitor sees on every
 * single page: if half of them are still English, the locale URL is a
 * near-duplicate of the English page and must not enter the sitemap.
 *
 * Keep this list in sync with src/config/site.ts (nav workspaces) and
 * src/components/layout/Footer.tsx (footer groups).
 */
export const CORE_CATALOG: readonly string[] = [
  // Navigation workspaces
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
  // Footer groups
  "Calculators",
  "Explore",
  "Resources",
  "Legal",
  // Footer calculators
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
  // Footer resources
  "Case Studies",
  "Project Gallery",
  "Material Prices",
  "Glossary",
  "Free Templates",
  "Partners",
  // Legal
  "Privacy Policy",
  "Terms of Service",
  "Cookie Policy",
  "Disclaimer",
  "AI Disclaimer",
  "Sign In",
] as const;

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
  const total = CORE_CATALOG.length;
  if (language === "en") {
    return { language, translated: total, total, percent: 100, missing: [] };
  }
  const dictionary = translations[language] ?? {};
  const missing = CORE_CATALOG.filter((key) => {
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
