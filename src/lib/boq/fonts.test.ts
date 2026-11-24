import { describe, expect, it } from "vitest";
import {
  UnrenderableScriptError,
  hasUnrenderableScript,
  needsUnicodeFont,
} from "./fonts";

describe("BOQ font coverage", () => {
  it("leaves plain Latin alone, so the core font is still used", () => {
    expect(needsUnicodeFont("Reinforced concrete in foundation")).toBe(false);
    expect(hasUnrenderableScript("Reinforced concrete in foundation")).toBe(
      false,
    );
  });

  it("asks for the Unicode font for Cyrillic and Greek, which it can draw", () => {
    expect(needsUnicodeFont("Бетонные работы")).toBe(true);
    expect(needsUnicodeFont("Σκυρόδεμα")).toBe(true);
    expect(hasUnrenderableScript("Бетонные работы")).toBe(false);
  });

  it("refuses scripts that need shaping rather than printing wrong words", () => {
    for (const text of ["أعمال الخرسانة", "कंक्रीट का काम", "コンクリート工事"]) {
      expect(hasUnrenderableScript(text)).toBe(true);
    }
  });

  it("explains the refusal and names the way out", () => {
    const error = new UnrenderableScriptError();
    expect(error.name).toBe("UnrenderableScriptError");
    expect(error.message).toMatch(/Print/);
  });
});
