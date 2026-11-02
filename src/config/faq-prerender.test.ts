/**
 * Guards the prerendered FAQ surfaces.
 *
 * The article pages are the site's answer layer, and most AI crawlers and a
 * number of search crawlers do not execute JavaScript. What they read is the
 * static HTML written by scripts/generate-faq-prerender.ts and injected by
 * scripts/prerender.mjs, so this suite holds that payload to the registries it
 * is generated from. A page that stops matching its own schema, or a slug that
 * never makes it into the prerender list, fails here rather than silently
 * dropping out of the index.
 */
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { ALL_FAQ_ARTICLES } from "@/config/faq-articles";
import { mergedQuestions } from "@/config/faq-longform";
import { TOOL_FAQS } from "@/config/tool-faqs";
import { navWorkspaces } from "@/config/site";

const { faqPrerenderRoutes } =
  (await import("../../scripts/generated/faq-prerender.mjs")) as any as {
    faqPrerenderRoutes: {
      path: string;
      title: string;
      description: string;
      content: string;
      structuredData: Record<string, unknown>[];
    }[];
  };

const articleRoutes = faqPrerenderRoutes.filter((r) => r.path !== "/faq");
const groups = TOOL_FAQS.filter((group) => ALL_FAQ_ARTICLES[group.slug]);

function faqPage(route: (typeof faqPrerenderRoutes)[number]) {
  return route.structuredData.find((sd) => sd["@type"] === "FAQPage") as
    | { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }
    | undefined;
}

describe("prerendered FAQ surfaces", () => {
  it("covers every FAQ group plus the hub", () => {
    expect(faqPrerenderRoutes.some((r) => r.path === "/faq")).toBe(true);
    expect(articleRoutes).toHaveLength(groups.length);
    for (const group of groups) {
      expect(
        articleRoutes.some((r) => r.path === `/faq/${group.slug}`),
        group.slug,
      ).toBe(true);
    }
  });

  it("marks up every question with the answer the page displays", () => {
    for (const route of articleRoutes) {
      const slug = route.path.replace("/faq/", "");
      const group = groups.find((g) => g.slug === slug)!;
      const expected = mergedQuestions(slug, group.questions);
      const schema = faqPage(route);
      expect(schema, slug).toBeTruthy();
      expect(schema!.mainEntity, slug).toHaveLength(expected.length);
      schema!.mainEntity.forEach((entry, index) => {
        expect(entry.name).toBe(expected[index].q);
        expect(entry.acceptedAnswer.text).toBe(expected[index].a);
      });
    }
  });

  it("writes real article text into the static HTML", () => {
    for (const route of articleRoutes) {
      const slug = route.path.replace("/faq/", "");
      const group = groups.find((g) => g.slug === slug)!;
      expect(route.content, slug).toContain(`<h1>${group.name}</h1>`);
      expect(route.content, slug).toContain("What it calculates");
      expect(route.content, slug).toContain("What it leaves out");
      expect(route.content, slug).toContain(
        mergedQuestions(slug, group.questions)[0].a.slice(0, 40),
      );
      const words = route.content.replace(/<[^>]+>/g, " ").split(/\s+/).length;
      expect(words, slug).toBeGreaterThan(600);
    }
  });

  it("links every article from the hub", () => {
    const hub = faqPrerenderRoutes.find((r) => r.path === "/faq")!;
    for (const route of articleRoutes) {
      expect(hub.content).toContain(`href="${route.path}/"`);
    }
  });

  it("keeps the FAQ entry in the hamburger menu", () => {
    const learn = navWorkspaces.find(
      (workspace) => workspace.label === "Learn",
    );
    expect(learn?.children?.some((child) => child.path === "/faq")).toBe(true);
  });

  it("tells every crawler the FAQ is open, including AI crawlers", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    expect(robots).toContain("Allow: /faq");
    expect(robots).toContain("Allow: /faq/");
    for (const agent of [
      "GPTBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "ClaudeBot",
      "PerplexityBot",
      "Google-Extended",
      "CCBot",
      "Applebot",
      "Amazonbot",
    ]) {
      expect(robots, agent).toContain(`User-agent: ${agent}`);
    }
    expect(robots).not.toMatch(/Disallow: \/faq/);
    expect(robots).not.toMatch(/Crawl-delay/);
  });

  it("advertises the FAQ to answer engines through llms.txt", () => {
    const llms = readFileSync("public/llms.txt", "utf8");
    expect(llms).toContain("https://freluxtools.com/faq/");
    expect(llms).toContain("robots.txt");
  });
});
