import { describe, it, expect } from "vitest";
import {
  localeFromPathname,
  stripLocaleFromPathname,
  LANGUAGES,
  LOCALE_ROUTES,
} from "@/lib/i18n";

describe("worldwide locale URL helpers", () => {
  it("gives every registered language a locale route", () => {
    expect(LOCALE_ROUTES.map((l) => l.value)).toEqual(
      LANGUAGES.map((l) => l.value),
    );
  });

  it("detects locale prefixes", () => {
    expect(localeFromPathname("/es/pricing")).toBe("es");
    expect(localeFromPathname("/ar")).toBe("ar");
    expect(localeFromPathname("/zh/construction-tools/")).toBe("zh");
  });

  it("ignores non-locale two-letter prefixes", () => {
    expect(localeFromPathname("/ab/pricing")).toBeNull();
    expect(localeFromPathname("/admin/users")).toBeNull();
  });

  it("strips the locale prefix for routing", () => {
    expect(stripLocaleFromPathname("/es/pricing")).toBe("/pricing");
    expect(stripLocaleFromPathname("/fr")).toBe("/");
    expect(stripLocaleFromPathname("/pricing")).toBe("/pricing");
  });
});
