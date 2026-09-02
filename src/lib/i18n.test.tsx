import { describe, it, expect, beforeEach } from "vitest";
import { LANGUAGES, type Language } from "@/lib/i18n";

describe("LANGUAGES", () => {
  it("has at least 5 languages", () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(5);
  });

  it("includes English as first language", () => {
    expect(LANGUAGES[0].value).toBe("en");
    expect(LANGUAGES[0].label).toBe("English");
  });

  it("includes Yoruba, Hausa, Igbo, Pidgin", () => {
    const values = LANGUAGES.map((l) => l.value);
    expect(values).toContain("yo");
    expect(values).toContain("ha");
    expect(values).toContain("ig");
    expect(values).toContain("pidgin");
  });

  it("every language has value, label, nativeLabel, and flag", () => {
    LANGUAGES.forEach((l) => {
      expect(l.value).toBeTruthy();
      expect(l.label).toBeTruthy();
      expect(l.nativeLabel).toBeTruthy();
      expect(l.flag).toBeTruthy();
    });
  });

  it("all language values are unique", () => {
    const values = LANGUAGES.map((l) => l.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("includes Nigerian Pidgin with nativeLabel Naija", () => {
    const pidgin = LANGUAGES.find((l) => l.value === "pidgin");
    expect(pidgin?.nativeLabel).toBe("Naija");
  });
});
