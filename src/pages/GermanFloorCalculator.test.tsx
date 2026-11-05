import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

import GermanFloorCalculator from "@/pages/GermanFloorCalculator";

const norm = (value?: string | null) => (value ?? "").replace(/\u00a0/g, " ");

/** Finds rendered text that may be split across nodes or use hard spaces. */
const hasText = (needle: string) =>
  screen.getAllByText((_, node) => norm(node?.textContent).includes(needle))
    .length > 0;

const renderPage = () =>
  render(
    <MemoryRouter>
      <GermanFloorCalculator />
    </MemoryRouter>,
  );

describe("GermanFloorCalculator page", () => {
  it("opens with one page heading and the floor inputs", () => {
    renderPage();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(norm(headings[0].textContent)).toContain("German Floor");
    expect(screen.getByText("Floor size")).toBeDefined();
    expect(screen.getByText("Slab thickness")).toBeDefined();
    expect(screen.getByText("Concrete mix")).toBeDefined();
  });

  it("returns cement, sand, granite, fill and membrane quantities", () => {
    renderPage();
    expect(screen.getByText("What to buy")).toBeDefined();
    expect(hasText("bags of cement")).toBe(true);
    expect(hasText("of sharp sand")).toBe(true);
    expect(hasText("Granite") || hasText("granite")).toBe(true);
    expect(hasText("Hardcore") || hasText("hardcore")).toBe(true);
  });

  it("states the layer assumptions it used", () => {
    renderPage();
    expect(screen.getByText("How this was worked out")).toBeDefined();
    expect(hasText("Quantities only. Prices, tax and labour")).toBe(true);
  });

  it("answers the questions people search for", () => {
    renderPage();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /What is a German floor/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /How many bags of cement for a German floor/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /How thick should a German floor slab be/i,
      }),
    ).toBeDefined();
  });
});
