import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

type MockLegalPage = { title: string; content: string } | null;
const mockUseLegalPage = vi.fn(
  (_slug?: string): { page: MockLegalPage; loading: boolean } => ({
    page: null,
    loading: false,
  }),
);

vi.mock("@/lib/useLegalPage", () => ({
  useLegalPage: (slug?: string) => mockUseLegalPage(slug),
}));

import LegalLayout from "@/components/legal/LegalLayout";

const defaultProps = {
  slug: "privacy-policy",
  title: "Privacy Policy",
  sections: [
    { heading: "Data Collection", body: <p>We collect data.</p> },
    { heading: "Your Rights", body: <p>You have rights.</p> },
  ],
};

describe("LegalLayout", () => {
  it("renders without crashing", () => {
    render(<LegalLayout {...defaultProps} />);
  });

  it("renders loading state when loading", () => {
    mockUseLegalPage.mockReturnValue({ page: null, loading: true });
    render(<LegalLayout {...defaultProps} />);
  });

  it("renders published page content when page exists", () => {
    mockUseLegalPage.mockReturnValue({
      page: { title: "Custom Page Title", content: "Custom content here." },
      loading: false,
    });
    render(<LegalLayout {...defaultProps} />);
    // When published, should render the page content
  });

  it("renders fallback content when page is null and not loading", () => {
    mockUseLegalPage.mockReturnValue({ page: null, loading: false });
    render(<LegalLayout {...defaultProps} />);
    expect(screen.getByText("Privacy Policy")).toBeTruthy();
  });

  it("renders section headings", () => {
    mockUseLegalPage.mockReturnValue({ page: null, loading: false });
    render(<LegalLayout {...defaultProps} />);
    expect(
      screen.getAllByText("Data Collection").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Your Rights").length).toBeGreaterThanOrEqual(1);
  });

  it("renders section body content", () => {
    mockUseLegalPage.mockReturnValue({ page: null, loading: false });
    render(<LegalLayout {...defaultProps} />);
    expect(screen.getByText("We collect data.")).toBeTruthy();
    expect(screen.getByText("You have rights.")).toBeTruthy();
  });

  it("renders updated date when provided", () => {
    mockUseLegalPage.mockReturnValue({ page: null, loading: false });
    render(<LegalLayout {...defaultProps} updated="2024-01-15" />);
    expect(screen.getByText(/Last updated/i)).toBeTruthy();
  });

  it("renders intro when provided", () => {
    mockUseLegalPage.mockReturnValue({ page: null, loading: false });
    render(<LegalLayout {...defaultProps} intro="Intro paragraph text" />);
    expect(
      screen.getAllByText("Intro paragraph text").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders back link", () => {
    mockUseLegalPage.mockReturnValue({ page: null, loading: false });
    const { container } = render(<LegalLayout {...defaultProps} />);
    const backLink = container.querySelector('a[href="/"]');
    expect(backLink).toBeTruthy();
  });
});
