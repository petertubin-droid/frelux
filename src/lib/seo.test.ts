import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSeo, type SeoMeta } from "@/lib/seo";

// Helper to render the hook with a given meta object
function renderSeoHook(meta: SeoMeta | null) {
  return renderHook(({ m }) => useSeo(m), {
    initialProps: { m: meta },
  });
}

beforeEach(() => {
  document.head.innerHTML = "";
  document.title = "";
});

describe("useSeo", () => {
  it("sets document title with FRELUX suffix when not already included", () => {
    renderSeoHook({
      title: "Paint Calculator",
      description: "Calculate paint needed",
    });
    expect(document.title).toBe("Paint Calculator: FRELUX PROJECT CALC");
  });

  it("does not duplicate FRELUX in title when already present", () => {
    renderSeoHook({
      title: "FRELUX Project Calculator",
      description: "Calculate paint needed",
    });
    expect(document.title).toBe("FRELUX Project Calculator");
  });

  it("sets meta description tag", () => {
    renderSeoHook({
      title: "Test",
      description: "My test description",
    });
    const desc = document.head.querySelector('meta[name="description"]');
    expect(desc).toBeTruthy();
    expect(desc?.getAttribute("content")).toBe("My test description");
  });

  it("sets Open Graph tags", () => {
    renderSeoHook({
      title: "Test Page",
      description: "OG test",
      ogType: "article",
      ogImage: "https://example.com/image.png",
    });
    expect(
      document.head
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content"),
    ).toBe("Test Page: FRELUX PROJECT CALC");
    expect(
      document.head
        .querySelector('meta[property="og:type"]')
        ?.getAttribute("content"),
    ).toBe("article");
    expect(
      document.head
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content"),
    ).toBe("https://example.com/image.png");
  });

  it("sets canonical link", () => {
    renderSeoHook({
      title: "Test",
      description: "Test",
      canonicalPath: "/paint-calculator",
    });
    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical).toBeTruthy();
    expect(canonical?.getAttribute("href")).toContain("/paint-calculator");
  });

  it("sets noindex robots tag when noIndex is true", () => {
    renderSeoHook({
      title: "Private",
      description: "No index",
      noIndex: true,
    });
    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute("content")).toContain("noindex");
    expect(robots?.getAttribute("content")).toContain("nofollow");
  });

  it("sets index,follow robots tag by default", () => {
    renderSeoHook({
      title: "Public",
      description: "Index me",
    });
    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute("content")).toContain("index");
    expect(robots?.getAttribute("content")).toContain("follow");
  });

  it("sets keywords meta when provided", () => {
    renderSeoHook({
      title: "Test",
      description: "Test",
      keywords: "paint, calculator, nigeria",
    });
    const kw = document.head.querySelector('meta[name="keywords"]');
    expect(kw?.getAttribute("content")).toBe("paint, calculator, nigeria");
  });

  it("sets structured data script when provided", () => {
    const sd = { "@type": "WebPage", name: "Test" };
    renderSeoHook({
      title: "Test",
      description: "Test",
      structuredData: sd,
    });
    const script = document.head.querySelector("#page-structured-data");
    expect(script).toBeTruthy();
    expect(script?.getAttribute("type")).toBe("application/ld+json");
    expect(JSON.parse(script?.textContent ?? "{}")).toEqual(sd);
  });

  it("sets structured data array when provided", () => {
    const sdArray = [
      { "@type": "BreadcrumbList", itemListElement: [] },
      { "@type": "FAQPage", mainEntity: [] },
    ];
    renderSeoHook({
      title: "Test",
      description: "Test",
      structuredDataArray: sdArray,
    });
    const script0 = document.head.querySelector("#page-structured-data-0");
    const script1 = document.head.querySelector("#page-structured-data-1");
    expect(script0).toBeTruthy();
    expect(script1).toBeTruthy();
    expect(JSON.parse(script0?.textContent ?? "{}")).toEqual(sdArray[0]);
    expect(JSON.parse(script1?.textContent ?? "{}")).toEqual(sdArray[1]);
  });

  it("does nothing when meta is null", () => {
    renderSeoHook(null);
    expect(document.title).toBe("");
    expect(document.head.querySelector('meta[name="description"]')).toBeNull();
  });

  it("updates title when meta changes on re-render", () => {
    const { rerender } = renderSeoHook({
      title: "First",
      description: "First",
    });
    expect(document.title).toBe("First: FRELUX PROJECT CALC");

    rerender({ m: { title: "Second", description: "Second" } });
    expect(document.title).toBe("Second: FRELUX PROJECT CALC");
  });
});
