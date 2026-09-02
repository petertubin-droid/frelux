import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccessibilityToggle } from "@/components/ui/AccessibilityToggle";

vi.mock("@/lib/accessibility", () => ({
  useAccessibility: vi.fn(() => ({
    highContrast: false,
    toggleHighContrast: vi.fn(),
    largeText: false,
    toggleLargeText: vi.fn(),
    reducedMotion: false,
    toggleReducedMotion: vi.fn(),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AccessibilityToggle", () => {
  it("renders the accessibility button", () => {
    render(<AccessibilityToggle />);
    const btn = screen.getByRole("button");
    expect(btn).toBeTruthy();
  });

  it("renders inline variant without crashing", () => {
    const { container } = render(<AccessibilityToggle inline />);
    expect(container.innerHTML).not.toBe("");
  });

  it("renders compact variant without crashing", () => {
    const { container } = render(<AccessibilityToggle compact />);
    expect(container.innerHTML).not.toBe("");
  });
});
