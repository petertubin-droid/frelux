import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
