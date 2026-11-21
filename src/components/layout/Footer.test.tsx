import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "@/components/layout/Footer";

function renderComponent() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe("Footer content", () => {
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

  it("keeps key links reachable", () => {
    renderComponent();
    for (const name of [
      "Pricing",
      "Project Gallery",
      "Privacy Policy",
      "AI Photo Estimator",
      "Contact",
      "Engineering & Accuracy",
    ]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });
});

describe("Footer layout contract (flat reference-site pattern)", () => {
  it("uses one flat surface with a hairline rule, no decoration", () => {
    const { container } = renderComponent();
    const footer = container.querySelector("footer") as HTMLElement;
    // Owner report 2026-11-21: the rounded, image-backed, neon-edged footer
    // looked unprofessional on phones.
    expect(footer.className).toContain("border-t");
    expect(footer.className).toContain("bg-[#f8f9fa]");
    expect(footer.className).not.toContain("rounded-t-");
    expect(footer.className).not.toContain("neon-edge");
    expect(footer.className).not.toContain("overflow-hidden");
    // No decorative backdrop or gradient overlay is rendered.
    expect(container.querySelector("footer > div[aria-hidden]")).toBeNull();
    expect(container.innerHTML).not.toContain("gradient");
  });

  it("gives every link a 40px tap row on phones", () => {
    const { container } = renderComponent();
    const links = Array.from(
      container.querySelectorAll<HTMLAnchorElement>(
        'footer nav[aria-label="Footer links"] ul a',
      ),
    );
    expect(links.length).toBeGreaterThan(20);
    for (const link of links) {
      expect(link.className).toContain("min-h-10");
      expect(link.className).toContain("text-[13px]");
    }
  });

  it("shows two real link columns on phones and four from sm up", () => {
    const { container } = renderComponent();
    const nav = container.querySelector("footer nav") as HTMLElement;
    expect(nav.className).toContain("grid-cols-2");
    expect(nav.className).toContain("sm:grid-cols-4");
    // The old design flowed long groups into CSS columns of 10px text, which
    // is what made the phone footer unreadable.
    expect(nav.className).not.toContain("columns-");
  });

  it("shows every link group with no disclosure controls", () => {
    const { container } = renderComponent();
    expect(
      container.querySelectorAll("footer nav button[aria-expanded]").length,
    ).toBe(0);
    const titles = Array.from(container.querySelectorAll("footer nav h2")).map(
      (h) => h.textContent,
    );
    expect(titles).toEqual([
      "Calculators",
      "Explore",
      "Resources",
      "Legal",
      "Estimates by country",
    ]);
  });

  it("renders every footer list without hiding it", () => {
    const { container } = renderComponent();
    const lists = Array.from(
      container.querySelectorAll<HTMLUListElement>("footer nav ul"),
    );
    expect(lists.length).toBe(5);
    for (const list of lists) {
      expect(list.className).not.toContain("hidden");
      expect(within(list).getAllByRole("link").length).toBeGreaterThan(0);
    }
  });

  it("keeps the calculator group complete without a hardcoded count", () => {
    const { container } = renderComponent();
    const nav = container.querySelector("footer nav") as HTMLElement;
    const calculators = within(nav)
      .getAllByRole("link")
      .filter((link) =>
        [
          "/wallpaper-calculator",
          "/paint-calculator",
          "/tile-calculator",
        ].includes(link.getAttribute("href") ?? ""),
      );
    expect(calculators.length).toBe(3);
  });

  it("puts the active market and compliance line in one bottom bar", () => {
    const { container } = renderComponent();
    const bottom = container.querySelector("footer > div > div:last-child");
    expect(bottom?.textContent).toMatch(/All rights reserved/);
    expect(bottom?.textContent).toMatch(/Prices shown for/);
    // Legal links live in their own column only: rendering them twice made
    // "Privacy Policy" ambiguous for screen readers and for this test.
    const legalLinks = within(
      container.querySelector(
        'footer nav[aria-label="Footer links"]',
      ) as HTMLElement,
    ).getAllByRole("link", { name: "Cookie Policy" });
    expect(legalLinks.length).toBe(1);
  });

  it("uses generous, not cramped, vertical rhythm", () => {
    const { container } = renderComponent();
    const inner = container.querySelector("footer > div") as HTMLElement;
    expect(inner.className).toContain("py-10");
    expect(inner.className).toContain("sm:py-12");
    expect(inner.className).not.toContain("py-4");
  });
});
