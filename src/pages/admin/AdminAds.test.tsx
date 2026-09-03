import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

const updateMock = vi.fn().mockReturnThis();
const eqMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "prov-monetag",
            name: "Monetag",
            slug: "monetag",
            provider_type: "display",
            is_active: true,
            priority: 1,
            credentials: { zone_id: "1234567" },
            settings: {},
            is_system: true,
            created_at: "",
            updated_at: "",
          },
          {
            id: "prov-adgate",
            name: "AdGate Media",
            slug: "adgate",
            provider_type: "rewarded",
            is_active: true,
            priority: 2,
            credentials: {},
            settings: {},
            is_system: true,
            created_at: "",
            updated_at: "",
          },
        ],
        error: null,
      }),
      update: updateMock,
      eq: eqMock,
    })),
  },
}));

vi.mock("@/lib/ad-config", () => ({
  clearAdConfigCache: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/admin/AdminAds")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminAds", () => {
  it("shows the Display ads toggle for display providers only", async () => {
    await renderPage();
    expect(await screen.findByText("Monetag")).toBeDefined();
    expect(await screen.findByText("AdGate Media")).toBeDefined();
    // Exactly one Display ads toggle — for Monetag. Rewarded providers
    // (AdGate) are excluded because their flows are never gated by it.
    expect(screen.getAllByText("Display ads")).toHaveLength(1);
    expect(screen.getByText("Visual ads served on placements")).toBeDefined();
  });

  it("turns display ads off via the settings toggle without disabling the provider", async () => {
    const user = userEvent.setup();
    await renderPage();

    await screen.findByText("Monetag");

    // Find the Display ads toggle inside its row (the row also holds its label)
    const displayRow = screen
      .getByText("Display ads")
      .closest("div.rounded-md");
    expect(displayRow).not.toBeNull();
    const toggle = displayRow!.querySelector("button") as HTMLElement;
    expect(toggle).not.toBeNull();

    await user.click(toggle);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({
        settings: { display_ads_enabled: false },
      });
    });
    // Provider itself must NOT be disabled
    expect(updateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false }),
    );
  });
});
