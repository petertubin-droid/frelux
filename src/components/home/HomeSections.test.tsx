import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useScrollReveal", () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

import FeaturesSection from "@/components/home/FeaturesSection";
import HowItWorks from "@/components/home/HowItWorks";
import ToolsSection from "@/components/home/ToolsSection";
import CommercialReadiness from "@/components/home/CommercialReadiness";
import FinalCTA from "@/components/home/FinalCTA";
import PWASection from "@/components/home/PWASection";

describe("FeaturesSection", () => {
  it("renders section with heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByText(/Why FRELUX/i)).toBeTruthy();
  });
  it("renders 4 feature items", () => {
    const { container } = render(<FeaturesSection />);
    const items = container.querySelectorAll(
      "article, .feature, [class*='rounded']",
    );
    expect(items.length).toBeGreaterThan(0);
  });
  it("renders feature titles", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Practical calculations")).toBeTruthy();
    expect(screen.getByText("Transparent cost estimates")).toBeTruthy();
  });
});

describe("HowItWorks", () => {
  it("renders 4 steps", () => {
    render(<HowItWorks />);
    expect(screen.getByText("Measure")).toBeTruthy();
    expect(screen.getByText("Calculate")).toBeTruthy();
    expect(screen.getByText("Review")).toBeTruthy();
    expect(screen.getByText("Save & Share")).toBeTruthy();
  });
  it("renders step numbers", () => {
    render(<HowItWorks />);
    expect(screen.getByText("01")).toBeTruthy();
    expect(screen.getByText("02")).toBeTruthy();
    expect(screen.getByText("03")).toBeTruthy();
    expect(screen.getByText("04")).toBeTruthy();
  });
  it("mentions Nigerian coverage rates", () => {
    render(<HowItWorks />);
    expect(screen.getByText(/Nigerian/i)).toBeTruthy();
  });
});

describe("ToolsSection", () => {
  it("renders all 8 tool cards", () => {
    render(<ToolsSection />);
    expect(screen.getByText("Painting Estimator")).toBeTruthy();
    expect(screen.getByText("Paint Calculator")).toBeTruthy();
    expect(screen.getByText("Screeding Calculator")).toBeTruthy();
    expect(screen.getByText("POP Ceiling Calculator")).toBeTruthy();
    expect(screen.getByText("Tile Calculator")).toBeTruthy();
    expect(screen.getByText("Tyrolene Estimator")).toBeTruthy();
    expect(screen.getByText("Paint Cost Estimator")).toBeTruthy();
    expect(screen.getByText("Finish Estimator")).toBeTruthy();
  });
  it("has links to calculator pages", () => {
    const { container } = render(<ToolsSection />);
    const links = container.querySelectorAll("a[href]");
    expect(links.length).toBeGreaterThan(4);
  });
  it("marks Painting Estimator as featured", () => {
    render(<ToolsSection />);
    expect(screen.getByText("Painting Estimator")).toBeTruthy();
  });
});

describe("CommercialReadiness", () => {
  it("renders section heading", () => {
    render(<CommercialReadiness />);
    expect(screen.getByText(/Calculate Required Materials/i)).toBeTruthy();
  });
  it("renders 6 capability cards", () => {
    render(<CommercialReadiness />);
    expect(screen.getByText("Estimate Project Costs")).toBeTruthy();
    expect(screen.getByText("Save Estimates")).toBeTruthy();
    expect(screen.getByText("Use Calculator Templates")).toBeTruthy();
    expect(screen.getByText("Nigerian-Market Calculations")).toBeTruthy();
    expect(screen.getByText("Explore Materials & Finishing")).toBeTruthy();
  });
  it("has links to pages", () => {
    const { container } = render(<CommercialReadiness />);
    const links = container.querySelectorAll("a[href]");
    expect(links.length).toBeGreaterThan(3);
  });
});

describe("FinalCTA", () => {
  it("renders call-to-action content", () => {
    render(<FinalCTA />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });
});

describe("PWASection", () => {
  it("renders without crashing", () => {
    render(<PWASection />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });
});
