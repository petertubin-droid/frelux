import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * The directory had three problems visible on the live page: a homepage pitch
 * bolted onto the top, a wall of 34 trade chips built from category rows
 * (including rows that mean the same trade), and a map of an empty market above
 * a zero-result list. These assertions are the ones that would have caught them.
 */

const CATEGORIES = [
  { id: "c1", name: "Painters", slug: "painters" },
  { id: "c2", name: "Tilers", slug: "tilers" },
  { id: "c3", name: "Welders & Metal Fabricators", slug: "welders-metal" },
  { id: "c4", name: "Welders and Metal Fabricators", slug: "welders-and-metal" },
  { id: "c5", name: "Plumbers", slug: "plumbers" },
  { id: "c6", name: "Electricians", slug: "electricians" },
  { id: "c7", name: "Carpenters", slug: "carpenters" },
  { id: "c8", name: "Roofers & Roofing Contractors", slug: "roofers" },
  { id: "c9", name: "Masons & Blockwork Artisans", slug: "masons" },
  { id: "c10", name: "Landscapers & Gardeners", slug: "landscapers" },
  { id: "c11", name: "Landscape & Garden Specialists", slug: "landscapers-2" },
];

const searchProfessionals = vi.fn();

vi.mock("@/lib/pro-connect", () => ({
  fetchCategories: vi.fn(async () => CATEGORIES),
  fetchServices: vi.fn(async () => []),
  fetchLocations: vi.fn(async () => []),
  getProProfileServices: vi.fn(async () => []),
  searchProfessionals: (...args: unknown[]) => searchProfessionals(...args),
}));
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
vi.mock("@/components/map/MapPanel", () => ({
  MapPanel: () => <div data-testid="map-panel" />,
}));

beforeEach(() => {
  searchProfessionals.mockReset();
  searchProfessionals.mockResolvedValue({
    profiles: [],
    total: 0,
    hasMore: false,
  });
});

async function renderPage() {
  const Comp = (await import("@/pages/pro-connect/ProConnectDirectory"))
    .default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("ProConnectDirectory trade chips", () => {
  it("does not carry the homepage pitch", async () => {
    await renderPage();
    expect(
      screen.queryByText(/complete construction planning toolkit/i),
    ).toBeNull();
    expect(screen.queryByText(/start calculating/i)).toBeNull();
  });

  it("renders one chip per trade, not one per category row", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Painters")).toBeTruthy());
    // Both welder rows collapse to one chip...
    expect(screen.getAllByText(/^Welders/i)).toHaveLength(1);
    // ...so the disclosure counts trades, not rows.
    expect(screen.getByRole("button", { name: /all 10 trades/i })).toBeTruthy();
  });

  it("keeps each trade chip a real link, so the trade stays crawlable", async () => {
    await renderPage();
    const chip = await screen.findByRole("link", { name: "Painters" });
    expect(chip.getAttribute("href")).toBe("/pro-connect/?category=painters");
  });

  it("shows a short list first and the rest on request", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Painters")).toBeTruthy());
    // Eight visible; the two remaining trades are behind the disclosure.
    expect(screen.queryByText("Landscapers & Gardeners")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /all 10 trades/i }));
    await waitFor(() =>
      expect(screen.getByText("Landscapers & Gardeners")).toBeTruthy(),
    );
    expect(
      screen.getByRole("button", { name: /show fewer trades/i }),
    ).toBeTruthy();
  });

  it("narrows to the trade a search names, and filters the query by it", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Painters")).toBeTruthy());
    fireEvent.change(
      screen.getByLabelText(/search by name, business, bio/i),
      { target: { value: "painters" } },
    );
    await waitFor(() =>
      expect(screen.getByText(/trades matching/i)).toBeTruthy(),
    );
    // Everything else is gone; the matched trade remains as the one chip.
    expect(screen.queryByText("Plumbers")).toBeNull();
    expect(screen.getByText("Painters")).toBeTruthy();
    // The search carries the trade ids, so a trade search finds that trade.
    await waitFor(() => {
      const calls = searchProfessionals.mock.calls;
      const last = calls[calls.length - 1]?.[0];
      expect(last?.categoryIds).toEqual(["c1"]);
    });
  });

  it("searching a person's name does not invent a trade filter", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Painters")).toBeTruthy());
    fireEvent.change(
      screen.getByLabelText(/search by name, business, bio/i),
      { target: { value: "Chinedu" } },
    );
    await waitFor(() => {
      const calls = searchProfessionals.mock.calls;
      const last = calls[calls.length - 1]?.[0];
      expect(last?.categoryIds).toBeUndefined();
      expect(last?.searchQuery).toBe("Chinedu");
    });
  });
});

describe("ProConnectDirectory empty state", () => {
  it("withholds the map when nobody is listed, and offers the way in", async () => {
    await renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no professionals listed here yet/i)).toBeTruthy(),
    );
    expect(screen.queryByTestId("map-panel")).toBeNull();
    expect(
      screen.getByRole("link", { name: /list your business/i }),
    ).toBeTruthy();
    // The old copy was internal protocol jargon, not something a visitor reads.
    expect(screen.queryByText(/liquidity & seeding protocol/i)).toBeNull();
  });

  it("shows the map once there is something on it", async () => {
    searchProfessionals.mockResolvedValue({
      profiles: [
        {
          id: "p1",
          display_name: "Ada Obi",
          business_name: "Ada Painters",
          category_id: "c1",
          is_listed: true,
          verification_status: "verified",
          rating_avg: 5,
          rating_count: 3,
          availability: "available",
          years_experience: 8,
          slug: "ada-obi",
          country: "NG",
        },
      ],
      total: 1,
      hasMore: false,
    });
    await renderPage();
    await waitFor(() => expect(screen.getByTestId("map-panel")).toBeTruthy());
  });
});
