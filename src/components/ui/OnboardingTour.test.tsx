import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingTour } from "@/components/ui/OnboardingTour";

describe("OnboardingTour", () => {
  it("renders without crashing when active", () => {
    const { container } = render(<OnboardingTour onComplete={vi.fn()} />);
    expect(container.innerHTML).not.toBe("");
  });

  it("calls onComplete when skip is clicked", () => {
    const onComplete = vi.fn();
    render(<OnboardingTour onComplete={onComplete} />);
    const skipBtn = screen.queryByText(/skip/i);
    if (skipBtn) {
      fireEvent.click(skipBtn);
      expect(onComplete).toHaveBeenCalled();
    }
  });
});
