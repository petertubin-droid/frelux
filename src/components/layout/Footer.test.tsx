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

  it("groups the link columns into exactly four collapsible groups", () => {
    const { container } = renderComponent();
    const columns = Array.from(
      container.querySelectorAll("footer nav button[aria-expanded]"),
    );
    expect(columns.map((b) => b.textContent)).toEqual([
      "Calculators",
      "Explore",
      "Resources",
      "Legal",
    ]);
  });

  it("collapses link lists on mobile until a group is opened", () => {
    const { container } = renderComponent();
    const lists = Array.from(
      container.querySelectorAll<HTMLUListElement>("footer nav ul"),
    );
    expect(lists.length).toBe(4);
    // All start collapsed (hidden, with md:block to force open on desktop)
    for (const list of lists) {
      expect(list.className).toContain("hidden");
      expect(list.className).toContain("md:block");
    }

    // Clicking the Calculators header reveals its links
    fireEvent.click(screen.getByRole("button", { name: /calculators/i }));
    const calculatorsList = container.querySelector(
      "#footer-calculators",
    ) as HTMLUListElement;
    expect(calculatorsList.className).toContain("block");
    expect(calculatorsList.className).not.toContain("hidden");
    const opened = within(calculatorsList).getAllByRole("link");
    // Calculate (5) + Estimate (5) links in the merged group
    expect(opened.length).toBe(10);

    // The other groups stay collapsed
    const legalList = container.querySelector(
      "#footer-legal",
    ) as HTMLUListElement;
    expect(legalList.className).toContain("hidden");
  });

  it("keeps compact mobile vertical padding", () => {
    const { container } = renderComponent();
    const inner = container.querySelector("footer > div:last-child");
    expect(inner?.className).toContain("py-6");
    expect(inner?.className).not.toContain("py-16");
  });
});
