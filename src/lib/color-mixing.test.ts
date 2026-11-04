import { describe, it, expect } from "vitest";
import {
  PIGMENTS,
  colourDescription,
  colourFaq,
  colourFaqJsonLd,
  colourProfile,
  colourSeo,
  hexToRgb,
  mixRecipe,
  recipeCaveat,
  recipeSentence,
} from "../../scripts/lib/color-mixing.mjs";

describe("colour mixing", () => {
  it("builds white from the white base alone", () => {
    const recipe = mixRecipe("#FFFFFF")!;
    expect(recipe.components).toHaveLength(1);
    expect(recipe.components[0].name).toBe("Titanium white base");
    expect(recipe.components[0].millilitresPerLitre).toBe(1000);
    expect(recipe.deltaE).toBeLessThanOrEqual(1);
  });

  it("always prints a build that adds up to one litre", () => {
    for (const hex of ["#D27176", "#3C296F", "#7B442B", "#86D664", "#FF7518"]) {
      const recipe = mixRecipe(hex);
      const sum = recipe!.components.reduce(
        (s, c) => s + c.millilitresPerLitre,
        0,
      );
      expect(sum).toBe(1000);
      for (const component of recipe!.components) {
        expect(PIGMENTS.some((p) => p.name === component.name)).toBe(true);
        expect(component.millilitresPerLitre).toBeGreaterThan(0);
      }
    }
  });

  it("keeps a build to a practical number of tinters", () => {
    for (const hex of ["#D27176", "#3C296F", "#7B442B", "#3B7A45", "#123B72"]) {
      expect(mixRecipe(hex)!.components.length).toBeLessThanOrEqual(3);
    }
  });

  it("lands close on a shade a white base can reach", () => {
    const recipe = mixRecipe("#D27176")!;
    expect(recipe.deltaE).toBeLessThanOrEqual(4);
    expect(recipe.reachable).toBe(true);
    expect(recipe.closeness).toBe("close");
  });

  it("says a shade is out of reach rather than pretending it matches", () => {
    const recipe = mixRecipe("#FF7518")!;
    expect(recipe.reachable).toBe(false);
    expect(recipeCaveat(recipe)).toMatch(/ready mixed/i);
  });

  it("refuses a value that is not a colour", () => {
    expect(mixRecipe("not-a-colour")!).toBeNull();
    expect(mixRecipe("")!).toBeNull();
    expect(hexToRgb("#D2717")).toBeNull();
    expect(hexToRgb("#D27")).toMatchObject([0xdd, 0x22, 0x77]);
  });

  it("writes a sentence a buyer can follow", () => {
    const sentence = recipeSentence("Soft Pink", mixRecipe("#D27176")!);
    expect(sentence).toMatch(/one litre/i);
    expect(sentence).toMatch(/ml/);
    expect(sentence).not.toMatch(/1 parts/);
  });

  it("describes the shade from its own values", () => {
    const description = colourDescription("Whisper Blue", "#3C296F");
    expect(description).toMatch(/Whisper Blue/);
    expect(description).toMatch(/light reflectance/i);
    expect(description.length).toBeGreaterThan(120);
  });

  it("answers four questions per colour, with real numbers in them", () => {
    const faq = colourFaq("Yarn Beige", "#D1CCBB");
    expect(faq).toHaveLength(4);
    for (const entry of faq) {
      expect(entry.question.length).toBeGreaterThan(10);
      expect(entry.answer.length).toBeGreaterThan(60);
    }
    expect(faq[0].answer).toMatch(/ml/);
  });

  it("publishes FAQ structured data that matches the answers", () => {
    const faq = colourFaq("Yarn Beige", "#D1CCBB");
    const jsonLd = colourFaqJsonLd(faq)!;
    expect(jsonLd["@type"]).toBe("FAQPage");
    expect(jsonLd.mainEntity).toHaveLength(4);
    expect(jsonLd.mainEntity[0].acceptedAnswer.text).toBe(faq[0].answer);
  });

  it("writes a title and description that name the colour and its mix", () => {
    const seo = colourSeo("Soft Pink", "#D27176");
    expect(seo.title).toContain("Soft Pink");
    expect(seo.title).toContain("#D27176");
    expect(seo.title.length).toBeLessThanOrEqual(70);
    expect(seo.description).toMatch(/tinter/i);
    expect(seo.description.length).toBeLessThanOrEqual(160);
  });

  it("profiles lightness, family and warmth from the hex", () => {
    const white = colourProfile("#FFFFFF")!;
    const ink = colourProfile("#111111")!;
    expect(white.toneWord).toBe("light");
    expect(white.lrv).toBe(100);
    expect(ink.toneWord).toBe("deep");
    expect(colourProfile("#D27176")!.family).toMatch(/red/);
  });

  it("avoids em dashes in everything it writes", () => {
    const text = [
      colourDescription("Soft Pink", "#D27176"),
      colourSeo("Soft Pink", "#D27176").description,
      ...colourFaq("Soft Pink", "#D27176").map((f) => f.answer),
      recipeCaveat(mixRecipe("#D27176")!),
    ].join(" ");
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });
});
