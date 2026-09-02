import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

function renderCrumbs(items: { label: string; path?: string }[]) {
  return render(
    <MemoryRouter>
      <Breadcrumbs items={items} />
    </MemoryRouter>,
  );
}

describe("Breadcrumbs", () => {
  it("renders nav with aria-label", () => {
    renderCrumbs([{ label: "Page" }]);
    expect(screen.getByLabelText("Breadcrumb")).toBeTruthy();
  });

  it("always renders a home link", () => {
    renderCrumbs([{ label: "Page" }]);
    expect(screen.getByLabelText("Home")).toBeTruthy();
  });

  it("renders items with labels", () => {
    renderCrumbs([{ label: "Calculators" }, { label: "Paint" }]);
    expect(screen.getByText("Calculators")).toBeTruthy();
    expect(screen.getByText("Paint")).toBeTruthy();
  });

  it("renders last item with aria-current page", () => {
    renderCrumbs([{ label: "A" }, { label: "B" }]);
    const lastItem = screen.getByText("B");
    expect(lastItem.getAttribute("aria-current")).toBe("page");
  });

  it("renders non-last items with paths as links", () => {
    renderCrumbs([{ label: "A", path: "/a" }, { label: "B" }]);
    const link = screen.getByText("A").closest("a");
    expect(link?.getAttribute("href")).toBe("/a");
  });

  it("renders last item as span (not link)", () => {
    renderCrumbs([
      { label: "A", path: "/a" },
      { label: "B", path: "/b" },
    ]);
    const lastItem = screen.getByText("B");
    expect(lastItem.tagName).toBe("SPAN");
    expect(lastItem.closest("a")).toBeNull();
  });

  it("renders separator chevrons between items", () => {
    const { container } = renderCrumbs([
      { label: "A" },
      { label: "B" },
      { label: "C" },
    ]);
    const chevrons = container.querySelectorAll("svg.lucide-chevron-right");
    expect(chevrons.length).toBe(3); // 1 for home + 2 for items
  });
});
