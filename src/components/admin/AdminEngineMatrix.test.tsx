/**
 * AdminEngineMatrix conformance (admin coverage pass, 2026-11-23).
 *
 * This component is how an admin decides which engines are live in which
 * market, so the tests use the real inventory rather than fixtures: the counts
 * must agree with FULL_ENGINE_INVENTORY, or the screen is lying about coverage.
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AdminEngineMatrix from "@/components/admin/AdminEngineMatrix";
import { FULL_ENGINE_INVENTORY } from "@/lib/international/engine-inventory";

const bodyRows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("tbody tr")).filter(
    (r) => !r.textContent?.includes("No engines match"),
  );

describe("AdminEngineMatrix inventory", () => {
  it("lists every engine in the inventory", () => {
    const { container } = render(<AdminEngineMatrix />);
    expect(bodyRows(container)).toHaveLength(FULL_ENGINE_INVENTORY.length);
  });

  it("shows the total in the category option so the admin can sanity-check it", () => {
    render(<AdminEngineMatrix />);
    expect(
      screen.getByRole("option", {
        name: `All categories (${FULL_ENGINE_INVENTORY.length})`,
      }),
    ).toBeTruthy();
  });
});

describe("AdminEngineMatrix filtering", () => {
  it("narrows by search term", async () => {
    const { container } = render(<AdminEngineMatrix />);
    const before = bodyRows(container).length;

    await userEvent.type(screen.getByLabelText("Search engines"), "tile");

    const after = bodyRows(container).length;
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
    expect(container.textContent).toContain("Tile");
  });

  it("says so when nothing matches instead of leaving a blank table", async () => {
    render(<AdminEngineMatrix />);
    await userEvent.type(
      screen.getByLabelText("Search engines"),
      "zzzz-no-such-engine",
    );
    expect(screen.getByText(/No engines match/i)).toBeTruthy();
  });

  it("narrows by category", async () => {
    const { container } = render(<AdminEngineMatrix />);
    const before = bodyRows(container).length;

    const category = FULL_ENGINE_INVENTORY[0].category;
    await userEvent.selectOptions(
      screen.getByLabelText("Filter by category"),
      category,
    );

    const after = bodyRows(container).length;
    expect(after).toBeLessThan(before);
    const expected = FULL_ENGINE_INVENTORY.filter(
      (e) => e.category === category,
    ).length;
    expect(after).toBe(expected);
  });
});

describe("AdminEngineMatrix market view", () => {
  it("switches the status column from the matrix to a single market", async () => {
    const { container } = render(<AdminEngineMatrix />);
    expect(container.textContent).toContain("20-market status matrix");

    const marketSelect = screen.getByLabelText("Filter by market");
    const options = within(marketSelect).getAllByRole("option");
    // Options are "ALL" plus the 20 markets.
    expect(options).toHaveLength(21);

    await userEvent.selectOptions(marketSelect, "NG");
    expect(container.textContent).toContain("NG status");
    expect(container.textContent).not.toContain("20-market status matrix");
  });
});
