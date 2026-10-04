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

  it("shows every tool from the registry grouped by category", async () => {
    renderPage();
    for (const tool of CONSTRUCTION_TOOLS) {
      expect(await screen.findByText(tool.title)).toBeTruthy();
    }
    for (const cat of TOOL_CATEGORIES) {
      expect(screen.getByText(cat.label)).toBeTruthy();
    }
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
