import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "@/components/layout/Footer";

function renderComponent() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe("Footer", () => {
  it("renders without crashing", () => {
    const { container } = renderComponent();
    expect(container.innerHTML).not.toBe("");
  });

  it("renders FRELUX brand text", () => {
    renderComponent();
    expect(screen.getAllByText(/FRELUX/i).length).toBeGreaterThan(0);
  });

  it("lists each destination only once (no duplicate links)", () => {
    const { container } = renderComponent();
    const hrefs = Array.from(container.querySelectorAll("nav a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs.length).toBeGreaterThan(20);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("keeps key links reachable after the compaction", () => {
    renderComponent();
    for (const name of [
      "Pricing",
      "Project Gallery",
      "Privacy Policy",
      "AI Photo Estimator",
      "Contact",
    ]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("uses compact vertical padding", () => {
    const { container } = renderComponent();
    const inner = container.querySelector("footer > div:last-child");
    expect(inner?.className).toContain("py-8");
    expect(inner?.className).not.toContain("py-16");
  });
});

describe("Footer theme + mobile compaction", () => {
  it("stacks the content above the brand backdrop (light-mode fix)", () => {
    const { container } = renderComponent();
    const inner = container.querySelector("footer > div:last-child");
    // relative positioning puts the content layer above the absolutely
    // positioned BrandBackdrop scrim that hid it in light mode.
    expect(inner?.className).toContain("relative");
  });

  it("shows all four link groups with no disclosure controls", () => {
    const { container } = renderComponent();
    // Owner report 2026-10-29: the dropdown footer looked unprofessional.
    expect(
      container.querySelectorAll("footer nav button[aria-expanded]").length,
    ).toBe(0);
    const titles = Array.from(
      container.querySelectorAll("footer nav h3"),
    ).map((h) => h.textContent);
    expect(titles).toEqual(["Calculators", "Explore", "Resources", "Legal"]);
  });

  it("renders every footer link without needing a tap", () => {
    const { container } = renderComponent();
    const lists = Array.from(
      container.querySelectorAll<HTMLUListElement>("footer nav ul"),
    );
    expect(lists.length).toBe(4);
    for (const list of lists) {
      expect(list.className).not.toContain("hidden");
      expect(within(list).getAllByRole("link").length).toBeGreaterThan(0);
    }
    const calculators = container.querySelector(
      "#footer-calculators",
    ) as HTMLUListElement;
    // Calculate (5) + Estimate (5) links in the merged group
    expect(within(calculators).getAllByRole("link").length).toBe(10);
  });

  it("keeps the ungrouped footer short on phones", () => {
    const { container } = renderComponent();
    const navs = Array.from(container.querySelectorAll("footer nav"));
    expect(navs.length).toBe(4);
    // Sections stack full width on phones so long groups can flow into two
    // columns, then join the desktop grid from md up.
    const grid = container.querySelector("footer nav")?.closest("div");
    expect(grid?.className).toContain("grid-cols-1");
    expect(grid?.className).toContain("md:grid-cols-3");
    expect(grid?.className).not.toContain("grid-cols-2");
    for (const nav of navs) {
      const list = nav.querySelector("ul") as HTMLUListElement;
      expect(list.className).not.toContain("hidden");
      // Long groups use two columns on phones; short ones stay single.
      const count = within(list).getAllByRole("link").length;
      expect(list.className).toContain(count > 4 ? "columns-2" : "columns-1");
    }
  });

  it("keeps compact mobile vertical padding", () => {
    const { container } = renderComponent();
    const inner = container.querySelector("footer > div:last-child");
    expect(inner?.className).toContain("py-5");
    expect(inner?.className).not.toContain("py-16");
  });
});
