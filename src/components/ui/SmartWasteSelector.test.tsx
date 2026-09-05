import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SmartWasteSelector } from "@/components/ui/SmartWasteSelector";

describe("SmartWasteSelector", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <SmartWasteSelector
        projectType="room"
        coats={2}
        onWasteChange={vi.fn()}
        currentWaste={10}
      />,
    );
    expect(container.innerHTML).not.toBe("");
  });

  it("shows waste percentage label", () => {
    render(
      <SmartWasteSelector
        projectType="room"
        coats={2}
        onWasteChange={vi.fn()}
        currentWaste={10}
      />,
    );
    expect(screen.getByText(/waste/i)).toBeTruthy();
  });
});
