/**
 * The shell's contract: a catalogued page presents its own catalogue entry and
 * its own question set, and never another tool's.
 */
import { readFileSync, readdirSync } from "fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import ToolShell from "@/components/tools/ToolShell";
import { relatedToolsFor } from "@/lib/tools/related-tools";
import { CONSTRUCTION_TOOLS, findToolByRoute } from "@/config/construction-tools";
import { getToolFaqGroupByRoute } from "@/config/tool-faqs";

const renderAt = (path: string, ui = <p>calculator body</p>) =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

describe("tool shell", () => {
  it("renders the catalogue title and description for the address served", () => {
    const tool = findToolByRoute("/concrete-takeoff-calculator");
    expect(tool?.title).toBe("Concrete Slab Takeoff");
    renderAt(
      "/concrete-takeoff-calculator",
      <ToolShell>calculator body</ToolShell>,
    );
    expect(
      screen.getByRole("heading", { name: "Concrete Slab Takeoff" }),
    ).toBeTruthy();
    expect(screen.getByText(tool!.does)).toBeTruthy();
    expect(screen.getByText("calculator body")).toBeTruthy();
  });

  it("resolves the tool's own questions and not a neighbour's", () => {
    const own = getToolFaqGroupByRoute("/concrete-takeoff-calculator");
    const blinds = getToolFaqGroupByRoute("/window-blind-calculator");
    expect(own?.slug).toBe("concrete-takeoff-calculator");
    expect(blinds?.slug).toBe("window-blinds");
    // The page this shell replaced rendered the blind set above its own.
    expect(own?.slug).not.toBe(blinds?.slug);
    expect(own!.questions.length).toBeGreaterThan(0);
  });

  it("offers neighbours in the same category first and never the tool itself", () => {
    const tool = findToolByRoute("/concrete-takeoff-calculator")!;
    const links = relatedToolsFor(tool, 3);
    expect(links).toHaveLength(3);
    expect(links.map((l) => l.path)).not.toContain(tool.to);
    const sameCategory = tool.category;
    for (const link of links) {
      const neighbour = findToolByRoute(link.path);
      expect(neighbour?.category).toBe(sameCategory);
    }
  });

  it("serves a locale-prefixed address from the same catalogue entry", () => {
    renderAt("/fr/concrete-takeoff-calculator", <ToolShell>body</ToolShell>);
    expect(
      screen.getByRole("heading", { name: "Concrete Slab Takeoff" }),
    ).toBeTruthy();
  });

  it("renders no tool chrome for an address outside the catalogue", () => {
    renderAt("/not-a-catalogued-tool", <ToolShell>plain body</ToolShell>);
    expect(screen.getByText("plain body")).toBeTruthy();
    expect(screen.queryByText("Construction Tools")).toBeNull();
  });

  it("pins every migrated page to the address App.tsx serves it at", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    const mods = new Map<string, string>();
    for (const m of app.matchAll(
      /const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*"([^"]+)"\s*\)/g,
    )) {
      mods.set(m[1], m[2].replace("@/", "src/"));
    }
    const servedAt = new Map<string, Set<string>>();
    for (const chunk of app.split('path="').slice(1)) {
      const quote = chunk.indexOf('"');
      if (quote === -1) continue;
      const route = chunk.slice(0, quote);
      const head = chunk.slice(0, 1600);
      for (const m of head.matchAll(/<([A-Z]\w+)/g)) {
        const mod = mods.get(m[1]);
        if (!mod) continue;
        if (!servedAt.has(mod)) servedAt.set(mod, new Set());
        servedAt.get(mod)!.add(route);
      }
    }

    const migrated = readdirSync("src/pages")
      .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
      .map((f) => `src/pages/${f}`)
      .filter((file) => readFileSync(file, "utf8").includes("ToolShell"));

    expect(migrated.length).toBeGreaterThan(0);
    for (const file of migrated) {
      const src = readFileSync(file, "utf8");
      const declared = src.match(/<ToolShell[\s\S]{0,400}?route="([^"]+)"/);
      expect(declared, `${file} must state its catalogue route`).toBeTruthy();
      const route = declared![1];
      expect(findToolByRoute(route), `${route} must be catalogued`).toBeDefined();
      const served = servedAt.get(file.replace(/\.tsx$/, ""));
      expect(served, `${file} must be routed in App.tsx`).toBeTruthy();
      expect([...served!], `${file} served at a different address`).toContain(
        route,
      );
    }
  });

  it("puts the catalogue search copy on the document", () => {
    const tool = findToolByRoute("/margin-calculator")!;
    expect(tool.seoTitle).toBe("Profit Margin Calculator: FRELUX");
    renderAt("/margin-calculator", <ToolShell route="/margin-calculator">x</ToolShell>);
    expect(document.title).toBe(tool.seoTitle);
    const description = document.head.querySelector(
      'meta[name="description"]',
    );
    expect(description?.getAttribute("content")).toBe(tool.seoDescription);
    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute("href")).toContain("/margin-calculator");
  });

  it("emits one breadcrumb trail that matches the visible crumbs", () => {
    renderAt("/margin-calculator", <ToolShell route="/margin-calculator">x</ToolShell>);
    const scripts = document.head.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    const trails = [...scripts]
      .map((el) => {
        try {
          return JSON.parse(el.textContent || "{}");
        } catch {
          return {};
        }
      })
      .filter((data) => data["@type"] === "BreadcrumbList");
    expect(trails).toHaveLength(1);
    const names = trails[0].itemListElement.map(
      (item: { name: string }) => item.name,
    );
    expect(names).toEqual([
      "Home",
      "Construction Tools",
      "Project & Cost",
      "Profit Margin Calculator",
    ]);
    // The page itself is text in the crumbs, not a link back to itself.
    const nav = screen.getByRole("navigation", { hidden: true });
    expect(nav.textContent).toContain("Profit Margin Calculator");
  });

  it("covers every catalogued route with an entry lookup that round trips", () => {
    for (const tool of CONSTRUCTION_TOOLS) {
      expect(findToolByRoute(tool.to)?.slug, tool.to).toBe(tool.slug);
      expect(findToolByRoute(`${tool.to}/`)?.slug, tool.to).toBe(tool.slug);
    }
  });
});
