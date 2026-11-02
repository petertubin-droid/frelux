import { describe, expect, it } from "vitest";
import {
  FAQ_SPOTLIGHT_PLACEMENTS,
  getSpotlightPlacement,
  pickSpotlights,
  resolveSpotlight,
} from "@/config/faq-spotlights";
import { getToolFaqGroup, TOOL_FAQS } from "@/config/tool-faqs";

describe("FAQ spotlight placements", () => {
  it("advertises only tools the registry actually publishes", () => {
    for (const placement of FAQ_SPOTLIGHT_PLACEMENTS) {
      for (const ad of placement.ads) {
        expect(
          getToolFaqGroup(ad.slug),
          `${placement.id} advertises unknown slug ${ad.slug}`,
        ).toBeDefined();
      }
    }
  });

  it("previews real questions and drops nothing silently", () => {
    for (const placement of FAQ_SPOTLIGHT_PLACEMENTS) {
      for (const ad of placement.ads) {
        const group = getToolFaqGroup(ad.slug);
        const resolved = resolveSpotlight(ad);
        expect(
          resolved,
          `${placement.id}/${ad.slug} failed to resolve`,
        ).not.toBeNull();
        expect(resolved!.questions).toHaveLength(ad.questionIndexes.length);
        for (const index of ad.questionIndexes) {
          expect(
            group!.questions[index],
            `${ad.slug} has no question ${index}`,
          ).toBeDefined();
        }
      }
    }
  });

  it("never advertises the same tool twice on one surface", () => {
    for (const placement of FAQ_SPOTLIGHT_PLACEMENTS) {
      const slugs = placement.ads.map((ad) => ad.slug);
      expect(new Set(slugs).size, `${placement.id} repeats a tool`).toBe(
        slugs.length,
      );
    }
  });

  it("covers the structural tools the article pages need", () => {
    const article = getSpotlightPlacement("learn-article");
    const slugs = article!.ads.map((ad) => ad.slug);
    expect(slugs).toContain("foundation-calculator");
    const structure = TOOL_FAQS.filter((g) => g.category === "structure").map(
      (g) => g.slug,
    );
    const advertised = new Set(
      FAQ_SPOTLIGHT_PLACEMENTS.flatMap((p) => p.ads.map((ad) => ad.slug)),
    );
    const unadvertised = structure.filter((slug) => !advertised.has(slug));
    expect(unadvertised).toEqual([]);
  });

  it("rotates deterministically and spreads across the catalogue", () => {
    const first = pickSpotlights("learn-article", "blockwork-basics");
    const again = pickSpotlights("learn-article", "blockwork-basics");
    expect(first).toEqual(again);
    expect(first).toHaveLength(1);

    const seeds = ["a", "b", "c", "d", "e", "f"];
    const picked = new Set(
      seeds.map((seed) => pickSpotlights("learn-article", seed)[0].slug),
    );
    expect(picked.size).toBeGreaterThan(1);
  });

  it("returns nothing for an unknown placement or a zero count", () => {
    expect(pickSpotlights("learn-article", "x", 0)).toEqual([]);
    expect(pickSpotlights("nope" as never, "x")).toEqual([]);
  });

  it("refuses to render a half filled card", () => {
    expect(
      resolveSpotlight({ slug: "does-not-exist", questionIndexes: [0] }),
    ).toBeNull();
    expect(
      resolveSpotlight({
        slug: "foundation-calculator",
        questionIndexes: [99],
      }),
    ).toBeNull();
  });
});
