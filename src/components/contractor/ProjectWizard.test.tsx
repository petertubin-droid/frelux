import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WizardStep } from "@/components/contractor/ProjectWizard";

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

describe("WizardStep", () => {
  it("renders title", () => {
    render(
      <WizardStep
        step={0}
        title="Project Type"
        subtitle="Choose your project type"
      >
        <div>Content</div>
      </WizardStep>,
    );
    expect(screen.getByText("Project Type")).toBeTruthy();
    expect(screen.getByText("Choose your project type")).toBeTruthy();
  });

  it("renders without subtitle", () => {
    render(
      <WizardStep step={0} title="Step 1">
        <div>Content</div>
      </WizardStep>,
    );
    expect(screen.getByText("Step 1")).toBeTruthy();
  });

  it("renders step indicators for all 4 steps", () => {
    render(
      <WizardStep step={0} title="Test">
        <div />
      </WizardStep>,
    );
    // 4 step numbers
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("marks current step with aria-current", () => {
    render(
      <WizardStep step={1} title="Test">
        <div />
      </WizardStep>,
    );
    const currentStep = document.querySelector('[aria-current="step"]');
    expect(currentStep).toBeTruthy();
    expect(currentStep?.textContent).toBe("2");
  });

  it("renders children", () => {
    render(
      <WizardStep step={0} title="Test">
        <div data-testid="child">Child Content</div>
      </WizardStep>,
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("shows check mark for completed steps", () => {
    const { container } = render(
      <WizardStep step={2} title="Test">
        <div />
      </WizardStep>,
    );
    // Steps 0 and 1 are completed (step=2), so they should have check icons
    const svgIcons = container.querySelectorAll("svg");
    expect(svgIcons.length).toBeGreaterThan(0);
  });
});
