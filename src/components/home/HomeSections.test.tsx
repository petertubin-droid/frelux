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
  it("mentions market-localized coverage rates", () => {
    render(<HowItWorks />);
    expect(screen.getByText(/market-localized coverage rates/i)).toBeTruthy();
  });
});

describe("ToolsSection", () => {
  it("renders every tool category from the registry", () => {
    render(<ToolsSection />);
    expect(screen.getByText("Materials & Finishes")).toBeTruthy();
    expect(screen.getByText("Building Structure")).toBeTruthy();
    expect(screen.getByText("Building Services")).toBeTruthy();
    expect(screen.getByText("Building Components")).toBeTruthy();
    expect(screen.getByText("Project & Cost")).toBeTruthy();
    expect(screen.getByText("AI Assistants")).toBeTruthy();
    expect(screen.getByText("Pro & Field")).toBeTruthy();
  });
  it("shows a tool count per category", () => {
    render(<ToolsSection />);
    expect(screen.getAllByText(/\d+ tools/).length).toBeGreaterThanOrEqual(7);
  });
  it("links to top tools and the full library", () => {
    const { container } = render(<ToolsSection />);
    const links = container.querySelectorAll("a[href]");
    expect(links.length).toBeGreaterThan(4);
    const libraryLink = screen.getByText("Explore all tools").closest("a");
    expect(libraryLink?.getAttribute("href")).toBe("/construction-tools");
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
    expect(screen.getByText("Market-Localized Pricing")).toBeTruthy();
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
