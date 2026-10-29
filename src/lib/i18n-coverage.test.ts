import { describe, expect, it } from "vitest";
import {
  CORE_CATALOG,
  CHROME_COMPLETE_LOCALES,
  coverageFor,
  coverageReport,
  isChromeComplete,
} from "@/lib/i18n-coverage";
import { LANGUAGES, translations } from "@/lib/i18n";
import { INDEXABLE_LOCALES } from "@/lib/translation-index";

const TRACKED_LOCALES = ["es", "fr", "de", "pt", "ar"] as const;

describe("core catalog coverage", () => {
  it("ships a fully translated interface for the tracked market languages", () => {
    for (const language of TRACKED_LOCALES) {
      const coverage = coverageFor(language);
      expect(coverage.total).toBe(CORE_CATALOG.length);
      expect(coverage.missing).toEqual([]);
      expect(coverage.percent).toBe(100);
      expect(isChromeComplete(language)).toBe(true);
    }
  });

  it("counts English as complete without needing a dictionary", () => {
    const coverage = coverageFor("en");
    expect(coverage.percent).toBe(100);
    expect(coverage.missing).toEqual([]);
  });

  it("reports a real gap for a locale that is only partly translated", () => {
    const partial = coverageReport().find(
      (c) =>
        !TRACKED_LOCALES.includes(
          c.language as (typeof TRACKED_LOCALES)[number],
        ) && c.language !== "en",
    );
    // The remaining declared languages still carry the older 51-key dictionary,
    // so they must not be reported as complete.
    expect(partial).toBeDefined();
    expect(partial!.percent).toBeLessThan(100);
    expect(partial!.missing.length).toBeGreaterThan(0);
    expect(isChromeComplete(partial!.language)).toBe(false);
  });

  it("orders the report worst-first so gaps surface", () => {
    const report = coverageReport();
    for (let i = 1; i < report.length; i += 1) {
      expect(report[i].percent).toBeGreaterThanOrEqual(report[i - 1].percent);
    }
    expect(report).toHaveLength(LANGUAGES.length);
  });
});

describe("indexing gate", () => {
  it("never indexes a locale whose interface is not fully translated", () => {
    for (const locale of INDEXABLE_LOCALES) {
      expect(isChromeComplete(locale)).toBe(true);
    }
  });

  it("keeps every tracked locale indexable", () => {
    for (const locale of TRACKED_LOCALES) {
      expect(CHROME_COMPLETE_LOCALES).toContain(locale);
    }
  });

  it("has a real value for every catalog key in a complete locale", () => {
    // Cognates ("Legal", "Pro Connect") legitimately match the English string,
    // so this asserts a non-empty value exists rather than guessing at quality.
    for (const language of TRACKED_LOCALES) {
      for (const key of CORE_CATALOG) {
        const value = translations[language][key];
        expect(value, `${language} is missing "${key}"`).toBeTruthy();
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
