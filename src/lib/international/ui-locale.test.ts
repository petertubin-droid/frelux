import { describe, it, expect } from "vitest";
import { UI_LOCALES, uiLocaleFor } from "./market-context";

describe("interface locale per market", () => {
  it("renders the market language only where a translation exists", () => {
    expect(uiLocaleFor("de")).toBe("de");
    expect(uiLocaleFor("pt-BR")).toBe("pt");
    // No translation yet: these markets are served in English, and the
    // register now says so instead of implying Thai or Italian.
    expect(uiLocaleFor("th")).toBe("en");
    expect(uiLocaleFor("it")).toBe("en");
    expect(uiLocaleFor("ko")).toBe("en");
  });

  it("falls back to English for unknown or missing languages", () => {
    expect(uiLocaleFor("am")).toBe("en");
    expect(uiLocaleFor("")).toBe("en");
    expect(uiLocaleFor(null)).toBe("en");
  });

  it("lists only locales the app ships", () => {
    expect(UI_LOCALES).toContain("sw");
    expect(UI_LOCALES).not.toContain("th");
  });
});
