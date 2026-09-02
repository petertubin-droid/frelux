import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PWASection from "@/components/home/PWASection";

vi.mock("@/hooks/useScrollReveal", () => ({
  useScrollReveal: vi.fn(() => ({
    ref: { current: null },
    isVisible: true,
  })),
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <PWASection />
    </MemoryRouter>,
  );
}

describe("PWASection", () => {
  it("renders heading with 'right in your pocket'", () => {
    renderComponent();
    expect(screen.getByText(/right in your pocket/)).toBeTruthy();
  });

  it("renders PWA badge", () => {
    renderComponent();
    expect(screen.getByText("Mobile-first & PWA")).toBeTruthy();
  });

  it("renders feature labels", () => {
    renderComponent();
    expect(screen.getByText("Installable as a PWA")).toBeTruthy();
    expect(screen.getByText("Works offline")).toBeTruthy();
  });

  it("renders description text", () => {
    renderComponent();
    expect(
      screen.getByText(/Access every FRELUX calculator/),
    ).toBeTruthy();
  });
});
