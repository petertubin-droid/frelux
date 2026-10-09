import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AiToolsSection from "@/components/home/AiToolsSection";

vi.mock("@/hooks/useScrollReveal", () => ({
  useScrollReveal: vi.fn(() => ({
    ref: { current: null },
    isVisible: true,
  })),
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <AiToolsSection />
    </MemoryRouter>,
  );
}

describe("AiToolsSection", () => {
  it("renders section eyebrow and heading", () => {
    renderComponent();
    expect(screen.getByText("AI powered tools")).toBeTruthy();
    expect(screen.getByText("Snap it. Describe it. Get numbers.")).toBeTruthy();
  });

  it("renders all 4 tool cards", () => {
    renderComponent();
    expect(screen.getByText("Photo Counter")).toBeTruthy();
    expect(screen.getByText("Smart Calculator")).toBeTruthy();
    expect(screen.getByText("BOQ Generator")).toBeTruthy();
    expect(screen.getByText("AI Color Assistant")).toBeTruthy();
  });

  it("links every tool to its trailing-slash route", () => {
    const { container } = renderComponent();
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/count-vision/");
    expect(hrefs).toContain("/smart-calculator/");
    expect(hrefs).toContain("/boq-generator/");
    expect(hrefs).toContain("/ai-color-assistant/");
    expect(hrefs.every((h) => h && h.endsWith("/"))).toBe(true);
  });

  it("uses a descriptive section label for accessibility", () => {
    renderComponent();
    expect(screen.getByLabelText("AI powered tools")).toBeTruthy();
  });
});
