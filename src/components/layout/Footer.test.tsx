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

  it("lists each destination only once across every footer nav", () => {
    const { container } = renderComponent();
    const hrefs = Array.from(container.querySelectorAll("footer nav a")).map(
      (a) => a.getAttribute("href"),
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

describe("Footer layout contract (premium surface, phone-first)", () => {
  it("uses one deep surface with a single brand hairline", () => {
    const { container } = renderComponent();
    const footer = container.querySelector("footer") as HTMLElement;
    // Owner report 2026-11-21: the footer looked unprofessional on phones, so
    // it is a deep, quiet surface with exactly one decorative rule.
    expect(footer.className).toContain("bg-[#0B0B14]");
    expect(footer.className).not.toContain("rounded-t-");
    expect(footer.className).not.toContain("neon-edge");
    expect(footer.className).not.toContain("overflow-hidden");
    // The only decorative child is the 1px brand hairline.
    const decorative = container.querySelectorAll("footer > div[aria-hidden]");
    expect(decorative.length).toBe(1);
    expect(decorative[0].className).toContain("h-px");
    // No photographic backdrop behind the text.
    expect(container.innerHTML).not.toContain("entry-bg");
    expect(container.innerHTML).not.toContain("BrandBackdrop");
  });

  it("gives every column link a 40px tap row", () => {
    const { container } = renderComponent();
    const links = Array.from(
      container.querySelectorAll<HTMLAnchorElement>(
        'footer nav[aria-label="Footer links"] ul a',
      ),
    );
    expect(links.length).toBeGreaterThan(20);
    for (const link of links) {
      expect(link.className).toContain("min-h-10");
      expect(link.className).toContain("text-[13.5px]");
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
      "Company",
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

  it("keeps legal links in the bottom bar exactly once", () => {
    const { container } = renderComponent();
    // Legal moved out of the column grid: one place to look, no duplicate
    // "Privacy Policy" for screen readers or for this test.
    const legalNav = container.querySelector(
      'footer nav[aria-label="Legal"]',
    ) as HTMLElement;
    expect(legalNav).toBeTruthy();
    expect(
      within(legalNav).getAllByRole("link", { name: "Cookie Policy" }).length,
    ).toBe(1);
    const allCookieLinks = Array.from(
      container.querySelectorAll('footer a[href="/cookie-policy"]'),
    );
    expect(allCookieLinks.length).toBe(1);
  });

  it("puts the active market and compliance line in the bottom bar", () => {
    const { container } = renderComponent();
    const text = container.querySelector("footer")?.textContent ?? "";
    expect(text).toMatch(/All rights reserved/);
    expect(text).toMatch(/Prices shown for/);
    expect(text).toMatch(/AdChoices compliant/);
    expect(text).toMatch(/guidance only/);
  });

  it("uses generous, not cramped, vertical rhythm", () => {
    const { container } = renderComponent();
    const inner = container.querySelector(
      "footer > div:last-child",
    ) as HTMLElement;
    expect(inner.className).toContain("pt-12");
    expect(inner.className).toContain("sm:pt-16");
    expect(inner.className).not.toContain("py-4");
  });
});
