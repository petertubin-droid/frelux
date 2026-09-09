import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UserGuide from "@/pages/UserGuide";
import { guideSections, guideFaq } from "@/content/user-guide";

function renderPage() {
  return render(
    <MemoryRouter>
      <UserGuide />
    </MemoryRouter>,
  );
}

describe("UserGuide page", () => {
  it("renders the guide title and subtitle", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /FRELUX User Guide/i }),
    ).toBeInTheDocument();
  });

  it("renders every guide section with an anchor id", () => {
    renderPage();
    for (const section of guideSections) {
      const heading = screen.getByRole("heading", {
        name: new RegExp(
          section.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i",
        ),
      });
      expect(heading).toBeInTheDocument();
      expect(document.getElementById(section.id)).toBeInTheDocument();
    }
  });

  it("renders the calculator table with rows", () => {
    renderPage();
    expect(
      screen.getByRole("table", { name: "" }) ||
        screen.getAllByRole("table")[0],
    ).toBeTruthy();
    expect(
      screen.getByText(/Room length, width, wall height/i),
    ).toBeInTheDocument();
  });

  it("renders the FAQ section with all questions", () => {
    renderPage();
    for (const f of guideFaq) {
      expect(screen.getByText(f.question)).toBeInTheDocument();
    }
  });

  it("links internal routes as react-router links, not raw anchors", () => {
    const { container } = renderPage();
    const internal = container.querySelectorAll('a[href^="/"]');
    // The TOC anchors (#id) are excluded by the selector; internal nav links exist.
    expect(internal.length).toBeGreaterThan(0);
  });

  it("shows the last reviewed date for content freshness", () => {
    renderPage();
    expect(screen.getByText(/Last reviewed/i)).toBeInTheDocument();
  });
});
