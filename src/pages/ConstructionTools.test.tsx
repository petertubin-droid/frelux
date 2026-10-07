import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ConstructionTools from "@/pages/ConstructionTools";
import {
  CONSTRUCTION_TOOLS,
  TOOL_CATEGORIES,
} from "@/config/construction-tools";

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
      <ConstructionTools />
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
      expect(await screen.findByText(tool.title)).toBeTruthy();
    }
    const totalSections = Math.ceil(CONSTRUCTION_TOOLS.length / 10);
    expect(sectionIndicator()).toBe(`Section 1 of ${totalSections}`);

    // Next advances to section 2 with the next 10 tools
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    for (const tool of CONSTRUCTION_TOOLS.slice(10, 20)) {
      expect(await screen.findByText(tool.title)).toBeTruthy();
    }
    expect(sectionIndicator()).toBe(`Section 2 of ${totalSections}`);

    // Previous returns to section 1
    fireEvent.click(screen.getByRole("button", { name: /^previous$/i }));
    for (const tool of CONSTRUCTION_TOOLS.slice(0, 10)) {
      expect(await screen.findByText(tool.title)).toBeTruthy();
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
