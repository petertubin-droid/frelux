import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import AdminSeo from "./AdminSeo";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AdminSeo />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminSeo Control Room", () => {
  it("renders page title and global meta inputs", async () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    expect(screen.getByText("Search Engine Optimization")).toBeDefined();
    expect(screen.getByText("Global Title Tag")).toBeDefined();
    expect(screen.getByText("Meta Description")).toBeDefined();
    expect(screen.getByText("Canonical Base URL")).toBeDefined();
  });

  it("switches tabs to Open Graph, Verification, and Robots", async () => {
    renderPage();

    // Switch to Social tab
    const socialTab = screen.getByText("Open Graph & Social Cards");
    fireEvent.click(socialTab);
    expect(
      screen.getByText("OG Image URL (1200x630 Recommended)"),
    ).toBeDefined();
    expect(screen.getByText("Official Twitter / X Handle")).toBeDefined();

    // Switch to Verification tab
    const verifyTab = screen.getByText("Search Engine Verification");
    fireEvent.click(verifyTab);
    expect(
      screen.getByText("Google Search Console Verification Token"),
    ).toBeDefined();
    expect(
      screen.getByText("Google Analytics 4 (GA4) Measurement ID"),
    ).toBeDefined();

    // Switch to Robots tab
    const robotsTab = screen.getByText("Robots & Sitemaps");
    fireEvent.click(robotsTab);
    expect(screen.getByText("Custom Robots.txt Directives")).toBeDefined();
    expect(screen.getByText("View Live Sitemap (/sitemap.xml)")).toBeDefined();
  });

  it("displays live Google SERP preview", async () => {
    renderPage();

    expect(
      screen.getByText("Live Google Desktop Snippet Preview"),
    ).toBeDefined();
    expect(screen.getByText("Frelux Global")).toBeDefined();
  });
});
