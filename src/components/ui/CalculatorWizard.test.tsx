import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalculatorWizard, type WizardStep } from "@/components/ui/CalculatorWizard";

const steps: WizardStep[] = [
  { title: "Step 1", content: <div>Content 1</div>, canProceed: true },
  { title: "Step 2", content: <div>Content 2</div>, canProceed: true },
  { title: "Step 3", content: <div>Content 3</div>, canProceed: true },
];

function renderWizard(overrides?: Record<string, unknown>) {
  const onComplete = vi.fn();
  const onBack = vi.fn();
  return {
    onComplete,
    onBack,
    ...render(
      <CalculatorWizard
        steps={steps}
        onComplete={onComplete}
        onBack={onBack}
        {...overrides}
      />,
    ),
  };
}

describe("CalculatorWizard", () => {
  it("renders first step content", () => {
    renderWizard();
    expect(screen.getByText("Content 1")).toBeTruthy();
  });

  it("renders progress dots for each step", () => {
    renderWizard();
    expect(screen.getByLabelText("Step 1")).toBeTruthy();
    expect(screen.getByLabelText("Step 2")).toBeTruthy();
    expect(screen.getByLabelText("Step 3")).toBeTruthy();
  });

  it("advances to next step on Next click", () => {
    renderWizard();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Content 2")).toBeTruthy();
  });

  it("calls onComplete on last step", () => {
    const { onComplete } = renderWizard();
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("See Results"));
    expect(onComplete).toHaveBeenCalled();
  });

  it("goes back to previous step on Back click", () => {
    renderWizard();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Content 2")).toBeTruthy();
    // On step 2, button says "Back"
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Content 1")).toBeTruthy();
  });

  it("calls onBack when on first step and Exit is clicked", () => {
    const { onBack } = renderWizard();
    // On step 1, button says "Exit" not "Back"
    fireEvent.click(screen.getByText("Exit"));
    expect(onBack).toHaveBeenCalled();
  });

  it("jumps to step when progress dot clicked", () => {
    renderWizard();
    fireEvent.click(screen.getByLabelText("Step 3"));
    expect(screen.getByText("Content 3")).toBeTruthy();
  });

  it("uses custom completeLabel", () => {
    renderWizard({ completeLabel: "Finish" });
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Finish")).toBeTruthy();
  });

  it("shows See Results on last step by default", () => {
    renderWizard();
    fireEvent.click(screen.getByLabelText("Step 3"));
    expect(screen.getByText("See Results")).toBeTruthy();
  });
});
