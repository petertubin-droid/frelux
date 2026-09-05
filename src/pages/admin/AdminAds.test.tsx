import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

// --- Table-aware, chainable Supabase mock ---------------------------
// Supports from(table).select().order().order() chains (thenable) and
// update/delete/insert builders, so every admin flow can be tested.
type Row = Record<string, unknown>;

const providersData: Row[] = [
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
];

const placementsData: Row[] = [
  {
    id: "pl-1",
    placement_key: "home_top",
    placement_name: "Home Top",
    placement_type: "banner",
    page_target: "home",
    is_active: true,
    provider_ids: ["prov-monetag"],
    ad_unit_ids: {},
    display_rules: { mobile: true, desktop: true, min_height: 100, refresh_seconds: 0 },
    sort_order: 20,
    created_at: "",
    updated_at: "",
  },
  {
    id: "pl-2",
    placement_key: "home_native",
    placement_name: "Home Native",
    placement_type: "native",
    page_target: "home",
    is_active: true,
    provider_ids: ["prov-monetag"],
    ad_unit_ids: {},
    display_rules: { mobile: true, desktop: true, min_height: 100, refresh_seconds: 0 },
    sort_order: 30,
    created_at: "",
    updated_at: "",
  },
  {
    id: "pl-3",
    placement_key: "home_mid",
    placement_name: "Home Mid",
    placement_type: "banner",
    page_target: "home",
    is_active: true,
    provider_ids: ["prov-monetag"],
    ad_unit_ids: {},
    display_rules: { mobile: true, desktop: true, min_height: 100, refresh_seconds: 0 },
    sort_order: 40,
    created_at: "",
    updated_at: "",
  },
];

function tableData(table: string): Row[] {
  if (table === "ad_providers") return providersData;
  if (table === "ad_placements") return placementsData;
  return [];
}

// Every update() call is tracked so tests can assert payloads.
const updateCalls: { table: string; payload: Row }[] = [];
const eqResults = vi.fn().mockResolvedValue({ error: null });

function buildChain(table: string) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: tableData(table), error: null });
  chain.update = vi.fn((payload: Row) => {
    updateCalls.push({ table, payload });
    return { eq: eqResults };
  });
  chain.delete = vi.fn(() => ({ eq: eqResults }));
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.upsert = vi.fn().mockResolvedValue({ error: null });
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => buildChain(table)),
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
      expect(
        updateCalls.some(
          (call) =>
            call.table === "ad_providers" &&
            JSON.stringify(call.payload).includes("display_ads_enabled"),
        ),
      ).toBe(true);
    });
    // Provider itself must NOT be disabled
    expect(
      updateCalls.some(
        (call) =>
          call.table === "ad_providers" &&
          (call.payload as Record<string, unknown>).is_active === false,
      ),
    ).toBe(false);
  });

  it("lists placements in sort_order and swaps sort_order on reorder", async () => {
    const user = userEvent.setup();
    await renderPage();

    // Switch to the Placements tab
    await user.click(await screen.findByText("Placements"));
    await screen.findByText("Home Top");

    // Ordered by sort_order: Home Top (20) before Home Native (30)
    const cards = screen.getAllByText(/^Home /);
    expect(cards[0].textContent).toBe("Home Top");
    expect(cards[1].textContent).toBe("Home Native");

    // Move "Home Native" up — should swap sort_order with "Home Top"
    updateCalls.length = 0;
    const nativeCard = screen
      .getByText("Home Native")
      .closest("div.card") as HTMLElement;
    const upBtn = within(nativeCard).getByTitle("Move up");
    await user.click(upBtn);

    await waitFor(() => {
      const placementUpdates = updateCalls.filter(
        (call) => call.table === "ad_placements",
      );
      expect(placementUpdates).toHaveLength(2);
      expect(placementUpdates.map((u) => u.payload.sort_order).sort()).toEqual(
        [20, 30],
      );
    });
  });

  it("shows the visual Page Map with slot chips and markdown copy", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByText("Placements"));
    await screen.findByText("Home Top");

    // Open the Page Map
    await user.click(await screen.findByText("Page Map"));

    expect(
      await screen.findByText("Ad Slot Page Map — where every slot sits"),
    ).toBeDefined();
    // Wireframe shows a registered slot chip and its status
    expect(await screen.findByText("home_top")).toBeDefined();
    expect(screen.getAllByText(/on · home/).length).toBeGreaterThan(0);

    // Copy markdown writes the site map to the clipboard
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    await user.click(screen.getByText("Copy markdown"));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const md = writeText.mock.calls[0][0] as string;
    expect(md).toContain("# FRELUX Ad Slot Map");
    expect(md).toContain("## Homepage");
    expect(md).toContain("**home_top** (banner) — ✅ on — Monetag");
  });
});
