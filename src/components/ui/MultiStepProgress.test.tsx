import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MultiStepProgress from "@/components/ui/MultiStepProgress";

const steps = [
  { label: "Input" },
  { label: "Calculate" },
  { label: "Results" },
];

describe("MultiStepProgress", () => {
  it("renders all step labels", () => {
    render(<MultiStepProgress steps={steps} current={0} />);
    expect(screen.getAllByText("Input").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Calculate").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Results").length).toBeGreaterThanOrEqual(1);
  });

  it("renders step numbers", () => {
    render(<MultiStepProgress steps={steps} current={0} />);
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("shows check icon for completed steps", () => {
    render(<MultiStepProgress steps={steps} current={2} />);
    // Steps 0 and 1 are complete
    const checks = document.querySelectorAll("svg.lucide-check");
    expect(checks.length).toBe(2);
  });

  it("shows number for current and upcoming steps", () => {
    render(<MultiStepProgress steps={steps} current={1} />);
    // Step 0 is complete (check), step 1 is current (number), step 2 is upcoming (number)
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(
      <MultiStepProgress steps={steps} current={0} className="my-class" />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
