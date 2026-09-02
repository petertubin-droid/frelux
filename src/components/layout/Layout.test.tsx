import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  Outlet: () => <div data-testid="outlet">Page Content</div>,
  useLocation: () => ({ pathname: "/" }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, isAdmin: false, isPaid: false }),
}));

vi.mock("@/lib/branding", () => ({
  useBranding: () => ({ branding: null }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("@/lib/analytics", () => ({
  whatsappUrl: vi.fn(() => "https://wa.me/1234567890"),
  track: vi.fn(),
}));

vi.mock("@/lib/cookie-consent", () => ({
  withdrawConsent: vi.fn(),
}));

vi.mock("@/components/ads/AdSlot", () => ({
  default: () => null,
}));

import WhatsAppFab from "@/components/layout/WhatsAppFab";
import Footer from "@/components/layout/Footer";

describe("WhatsAppFab", () => {
  it("renders without crashing", () => {
    render(<WhatsAppFab />);
  });
});

describe("Footer", () => {
  it("renders footer content", () => {
    render(<Footer />);
  });

  it("renders navigation links", () => {
    const { container } = render(<Footer />);
    const links = container.querySelectorAll("a[href]");
    expect(links.length).toBeGreaterThan(0);
  });

  it("renders calculator links", () => {
    render(<Footer />);
    expect(screen.getByText("Painting Calculator")).toBeTruthy();
    expect(screen.getByText("Screeding Calculator")).toBeTruthy();
  });
});
