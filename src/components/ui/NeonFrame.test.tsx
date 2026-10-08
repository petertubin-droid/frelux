import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NeonFrame from "@/components/ui/NeonFrame";

describe("NeonFrame", () => {
  it("renders a decorative viewport frame", () => {
    const { container } = render(<NeonFrame />);
    const frame = container.querySelector(".neon-frame");
    expect(frame).toBeInTheDocument();
    expect(frame).toHaveAttribute("aria-hidden", "true");
  });

  it("does not intercept pointer events", () => {
    const { container } = render(<NeonFrame />);
    expect(container.querySelector(".neon-frame")).toHaveClass(
      "pointer-events-none",
    );
  });
});
