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

describe("print fallback for unshaped scripts", () => {
  it("builds a summary view with the same figures and no line schedule", async () => {
    const { boqSummaryPrintHtml } = await import("./print");
    const { compileBoq } = await import("./compile");
    const { createEmptyDocument } = await import("./types");
    const base = createEmptyDocument({
      currency: "SAR",
      marketCode: "SA",
      standard: "Commercial",
      templateSlug: "sa-commercial",
      preparedBy: "QS Team",
    });
    const studio = {
      ...base,
      title: "أعمال الخرسانة",
      reference: "SA-001",
      sections: [
        {
          id: "s1",
          code: "05",
          title: "أعمال الخرسانة",
          notes: "",
          items: [
            {
              id: "i1",
              item_number: "05.01",
              description: "خرسانة مسلحة",
              specificationRef: "",
              unit: "m3",
              quantity: 10,
              material_rate: 300,
              labour_rate: 100,
              plant_rate: 0,
            },
          ],
        },
      ],
    } as never;
    const compiled = compileBoq(studio);
    const html = boqSummaryPrintHtml(compiled.standard, compiled.document);
    expect(html).toContain("أعمال الخرسانة");
    expect(html).toContain("Net payable");
    expect(html).not.toContain("05.01");
    expect(html).toContain("window.print()");
  });
});
