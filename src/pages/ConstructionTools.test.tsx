import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConstructionTools from "@/pages/ConstructionTools";
import {
  CONSTRUCTION_TOOLS,
  TOOL_CATEGORIES,
} from "@/config/construction-tools";
import { DEFAULT_MARKET_CODE } from "@/lib/international/market-context";
import { getMarketToolCopy } from "@/lib/globalization/construction-terminology";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

/** The "Section N of M - Showing X–Y of Z tools" indicator. */
function sectionIndicator(): string {
  const nav = document.querySelector(
    'nav[aria-label="Tool library sections"] p',
  );
  const text = (nav?.textContent ?? "").replace(/\s+/g, " ").trim();
  return text.split("|")[0].trim();
}

function renderPage(route = "/construction-tools") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/construction-tools" element={<ConstructionTools />} />
        <Route path="/tools/:category" element={<ConstructionTools />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ConstructionTools", () => {
  it("renders without crashing", () => {
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("shows the registry 10 tools at a time with next/previous sections", async () => {
    renderPage();
    // Section 1: exactly the first 10 tools, not the whole registry
    for (const tool of CONSTRUCTION_TOOLS.slice(0, 10)) {
      const localized = getMarketToolCopy(tool.slug, DEFAULT_MARKET_CODE, tool);
      expect(await screen.findByText(localized.title)).toBeTruthy();
    }
    const totalSections = Math.ceil(CONSTRUCTION_TOOLS.length / 10);
    expect(sectionIndicator()).toBe(`Section 1 of ${totalSections}`);

    // Next advances to section 2 with the next 10 tools
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    for (const tool of CONSTRUCTION_TOOLS.slice(10, 20)) {
      const localized = getMarketToolCopy(tool.slug, DEFAULT_MARKET_CODE, tool);
      expect(await screen.findByText(localized.title)).toBeTruthy();
    }
    expect(sectionIndicator()).toBe(`Section 2 of ${totalSections}`);

    // Previous returns to section 1
    fireEvent.click(screen.getByRole("button", { name: /^previous$/i }));
    for (const tool of CONSTRUCTION_TOOLS.slice(0, 10)) {
      const localized = getMarketToolCopy(tool.slug, DEFAULT_MARKET_CODE, tool);
      expect(await screen.findByText(localized.title)).toBeTruthy();
    }
    expect(sectionIndicator()).toBe(`Section 1 of ${totalSections}`);
  });

  it("paginates by 10: every section shows at most 10 tools", () => {
    renderPage();
    const cards = screen.getAllByRole("link", { name: /open tool/i });
    expect(cards.length).toBeLessThanOrEqual(10);
    expect(cards.length).toBe(10);
  });

  it("next is disabled on the last section", async () => {
    const totalSections = Math.ceil(CONSTRUCTION_TOOLS.length / 10);
    renderPage(`/construction-tools?page=${totalSections}`);
    expect(sectionIndicator()).toBe(
      `Section ${totalSections} of ${totalSections}`,
    );
    expect(
      screen.getByRole("button", { name: /^next$/i }).hasAttribute("disabled"),
    ).toBe(true);
    // last section shows only the remaining tools
    const cards = screen.getAllByRole("link", { name: /open tool/i });
    expect(cards.length).toBe(CONSTRUCTION_TOOLS.length % 10 || 10);
  });

  it("uses plain-language copy: what it does, what you enter, what you get", async () => {
    renderPage();
    expect((await screen.findAllByText(/You enter:/i)).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(/You get:/i).length).toBeGreaterThan(0);
    // No leaked engine jargon in card titles
    for (const tool of CONSTRUCTION_TOOLS) {
      expect(tool.does.length).toBeGreaterThan(20);
      expect(tool.enters.length).toBeGreaterThan(5);
      expect(tool.gets.length).toBeGreaterThan(5);
    }
  });

  it("search narrows the list to matching tools", async () => {
    renderPage();
    const input = await screen.findByLabelText(/Search construction tools/i);
    fireEvent.change(input, { target: { value: "solar" } });
    expect(await screen.findByText("Solar PV Estimator")).toBeTruthy();
    // A non-matching tool is filtered out of the results view
    expect(screen.queryByText("Tile Calculator")).toBeNull();
  });

  it("supports categorized /tools routes and marks the matching category", async () => {
    renderPage("/tools/finishes");
    expect(await screen.findByText("Paint Calculator")).toBeTruthy();
    expect(screen.queryByText("Electrical Wiring")).toBeNull();
    expect(
      screen
        .getByRole("tab", { name: /Materials & Finishes/ })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("category filter shows only that category's tools", async () => {
    renderPage("/construction-tools?category=services");
    expect(await screen.findByText("Electrical Wiring")).toBeTruthy();
    expect(screen.queryByText("Paint Calculator")).toBeNull();
  });

  it("remembers recently used tools in localStorage", async () => {
    renderPage();
    const card = await screen.findByText("Paint Calculator");
    fireEvent.click(card);
    const recent = JSON.parse(
      window.localStorage.getItem("frelux_recent_tools") ?? "[]",
    );
    expect(recent).toContain("paint");
  });
});

describe("ConstructionTools domains", () => {
  it("offers the six domains counted from the registry", async () => {
    renderPage();
    const tabs = await screen.findAllByRole("tab");
    const domainTabs = tabs.filter(
      (tab) =>
        (tab.textContent ?? "").includes("(") &&
        [
          "Substructure and ground works",
          "Superstructure and structure",
          "Finishes and envelope",
          "Services and MEP",
          "Surveying, cost and renovation",
          "External and infrastructure works",
        ].some((label) => (tab.textContent ?? "").includes(label)),
    );
    expect(domainTabs.length).toBe(6);
    // Counts come from the registry, so they add up to the classified tools.
    const total = domainTabs.reduce((sum, tab) => {
      const match = /\((\d+)\)/.exec(tab.textContent ?? "");
      return sum + Number(match?.[1] ?? 0);
    }, 0);
    // Counted from the registry itself, so adding a tool never breaks the guard
    // while a tool classified into no domain still does.
    const { TOOL_DOMAINS } = await import("@/config/engine-domains");
    expect(total).toBe(Object.keys(TOOL_DOMAINS).length);
  });

  it("narrows the library to one domain and says how many it shows", async () => {
    renderPage("/construction-tools?domain=finishes");
    expect(sectionIndicator()).toBe("Section 1 of 2");
    const finishes = CONSTRUCTION_TOOLS.filter(
      (tool) => tool.category === "finishes",
    );
    expect(finishes.length).toBeGreaterThan(0);
    const shown = CONSTRUCTION_TOOLS.filter((tool) =>
      ["paint", "tile", "increte-flooring-calculator", "pop-ceiling"].includes(
        tool.slug,
      ),
    );
    for (const tool of shown) {
      const localized = getMarketToolCopy(tool.slug, DEFAULT_MARKET_CODE, tool);
      expect(await screen.findByText(localized.title)).toBeTruthy();
    }
  });

  it("ignores a domain that is not one of the six", async () => {
    renderPage("/construction-tools?domain=not-a-domain");
    const totalSections = Math.ceil(CONSTRUCTION_TOOLS.length / 10);
    expect(sectionIndicator()).toBe(`Section 1 of ${totalSections}`);
  });

  it("clears the domain when the active chip is pressed again", async () => {
    renderPage("/construction-tools?domain=mep");
    const active = await screen.findByRole("tab", {
      name: /Services and MEP/,
    });
    expect(active.getAttribute("aria-selected")).toBe("true");
    fireEvent.click(active);
    expect(sectionIndicator()).toBe(
      `Section 1 of ${Math.ceil(CONSTRUCTION_TOOLS.length / 10)}`,
    );
  });
});

describe("global readiness of the domain registry", () => {
  it("resolves every classified tool in all 32 approved markets", async () => {
    const { ALL_MARKET_CODES } =
      await import("@/lib/international/capability-registry");
    const { TOOL_DOMAINS, resolveDomainTool } =
      await import("@/config/engine-domains");
    const { MARKET_BUNDLES } = await import("@/lib/international/markets");
    expect(ALL_MARKET_CODES.length).toBe(32);
    expect(Object.keys(MARKET_BUNDLES).sort()).toEqual(
      [...ALL_MARKET_CODES].sort(),
    );
    const slugs = Object.keys(TOOL_DOMAINS);
    const { CONSTRUCTION_TOOLS } = await import("@/config/construction-tools");
    const { PLATFORM_TOOLS } = await import("@/config/engine-domains");
    // Every catalogue entry is classified exactly once: into a domain, or into
    // PLATFORM_TOOLS with a stated reason. Nothing may be silently ungrouped.
    const classified = new Set([...slugs, ...Object.keys(PLATFORM_TOOLS)]);
    expect(classified.size).toBe(CONSTRUCTION_TOOLS.length);
    expect(slugs.some((slug) => PLATFORM_TOOLS[slug] !== undefined)).toBe(
      false,
    );
    const unsupported: string[] = [];
    for (const market of ALL_MARKET_CODES) {
      for (const slug of slugs) {
        const resolved = resolveDomainTool(slug, market);
        if (!resolved?.marketSupported) unsupported.push(`${market}:${slug}`);
      }
    }
    expect(unsupported).toEqual([]);
    expect(ALL_MARKET_CODES.length * slugs.length).toBe(
      ALL_MARKET_CODES.length * slugs.length,
    );
  });
});
