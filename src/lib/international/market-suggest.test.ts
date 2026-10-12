import { describe, expect, it } from "vitest";
import {
  DETECTABLE_MARKETS,
  detectMarketFromLocale,
  detectMarketFromTimezone,
  isDetectableMarket,
  localesToMarket,
  marketForSignals,
  timezoneToMarket,
} from "./market-suggest";

const BUILTIN_MARKET_CODES = [
  "NG", "US", "GB", "CA", "AU", "DE", "IN", "GH", "KE", "ZA",
];

describe("timezoneToMarket", () => {
  it("maps the reference and imperial home timezones", () => {
    expect(timezoneToMarket("Africa/Lagos")).toBe("NG");
    expect(timezoneToMarket("America/New_York")).toBe("US");
    expect(timezoneToMarket("America/Los_Angeles")).toBe("US");
    expect(timezoneToMarket("Europe/London")).toBe("GB");
    expect(timezoneToMarket("Australia/Sydney")).toBe("AU");
  });

  it("returns null for an unmapped timezone - never a guess", () => {
    expect(timezoneToMarket("Europe/Paris")).toBeNull();
    expect(timezoneToMarket("Europe/Zurich")).toBeNull();
  });

  it("handles null and empty input", () => {
    expect(timezoneToMarket(null)).toBeNull();
    expect(timezoneToMarket("")).toBeNull();
  });
});

describe("localesToMarket", () => {
  it("maps browser language regions to their markets", () => {
    expect(localesToMarket(["en-US"])).toBe("US");
    expect(localesToMarket(["en-GB"])).toBe("GB");
    expect(localesToMarket(["en", "de-DE"])).toBe("DE");
    expect(localesToMarket(["hi-IN"])).toBe("IN");
  });

  it("returns null for unmapped or malformed locales", () => {
    expect(localesToMarket(["en"])).toBeNull();
    expect(localesToMarket(["xx-YY"])).toBeNull();
    expect(localesToMarket([])).toBeNull();
    expect(localesToMarket([null])).toBeNull();
  });
});

describe("marketForSignals", () => {
  it("timezone (location) wins over language (locale) — the Chicago case", () => {
    expect(
      marketForSignals({
        timezone: "America/Chicago",
        browserLanguages: ["en-GB", "en"],
      }),
    ).toBe("US");
  });

  it("falls back to the browser language when the timezone is unmapped", () => {
    expect(
      marketForSignals({
        timezone: "Europe/Paris",
        browserLanguages: ["fr-CA", "en"],
      }),
    ).toBe("CA");
  });

  it("returns null when both signals are unmapped - Nigeria default stays", () => {
    expect(
      marketForSignals({ timezone: "Europe/Paris", browserLanguages: ["fr-FR"] }),
    ).toBeNull();
  });
});

describe("detection only ever returns supported markets", () => {
  it("every detectable market is a built-in market profile", () => {
    for (const code of DETECTABLE_MARKETS) {
      expect(BUILTIN_MARKET_CODES).toContain(code);
    }
  });

  it("ambient detection returns a supported market or null", () => {
    const code = detectMarketFromTimezone() ?? detectMarketFromLocale();
    if (code === null) return;
    expect(isDetectableMarket(code)).toBe(true);
    expect(BUILTIN_MARKET_CODES).toContain(code);
  });
});
