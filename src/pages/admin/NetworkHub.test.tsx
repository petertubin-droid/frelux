import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

type Row = Record<string, unknown>;

const providersData: Row[] = [
  {
    id: "prov-adsense",
    name: "Google AdSense",
    slug: "google_adsense",
    provider_type: "display",
    is_active: true,
    priority: 1,
    credentials: { publisher_id: "ca-pub-3404100134534192" },
    settings: { auto_ads: true, lazy_load: true },
    is_system: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "prov-monetag",
    name: "Monetag",
    slug: "monetag",
    provider_type: "mixed",
    is_active: false,
    priority: 2,
    credentials: { zone_id: "1234567" },
    settings: {},
    is_system: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "prov-adsterra",
    name: "Adsterra",
    slug: "adsterra",
    provider_type: "display",
    is_active: true,
    priority: 3,
    credentials: {
      direct_link_url:
        "https://www.profitableratecpmnetwork.com/hpzkujs07w?key=abc",
    },
    settings: {},
    is_system: true,
    created_at: "",
    updated_at: "",
  },
];

const placementsData: Row[] = [
  {
    id: "pl-home-top",
    placement_key: "home_top",
    placement_name: "Home Top",
    placement_type: "banner",
    page_target: "home",
    is_active: true,
    provider_ids: ["prov-adsense"],
    ad_unit_ids: { "prov-adsense": "1234567890" },
    display_rules: {
      mobile: true,
      desktop: true,
      refresh_seconds: 0,
      min_height: 100,
    },
    created_at: "",
    updated_at: "",
  },
  {
    id: "pl-home-native",
    placement_key: "home_native",
    placement_name: "Home Native",
    placement_type: "native",
    page_target: "home",
    is_active: true,
    provider_ids: [],
    ad_unit_ids: {},
    display_rules: {
      mobile: true,
      desktop: true,
      refresh_seconds: 0,
      min_height: 100,
    },
    created_at: "",
    updated_at: "",
  },
  {
    id: "pl-home-sidebar",
    placement_key: "home_sidebar",
    placement_name: "Home Sidebar",
    placement_type: "banner",
    page_target: "sidebar",
    is_active: false,
    provider_ids: [],
    ad_unit_ids: {},
    display_rules: {
      mobile: true,
      desktop: true,
      refresh_seconds: 0,
      min_height: 100,
    },
    created_at: "",
    updated_at: "",
  },
];

// ── Chainable supabase mock (same pattern as AdminAds.test.tsx) ──
const upsertCalls: { table: string; payload: Row | Row[] }[] = [];
const updateCalls: { table: string; payload: Row }[] = [];

function tableData(table: string): Row[] {
  if (table === "ad_providers") return providersData;
  if (table === "ad_placements") return placementsData;
  return [];
}

function buildChain(table: string) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.in = vi.fn(() => Promise.resolve({ data: providersData, error: null }));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: tableData(table), error: null }).then(resolve);
  chain.update = vi.fn((payload: Row) => {
    updateCalls.push({ table, payload });
    const tail = {
      eq: vi.fn().mockResolvedValue({ error: null }),
      neq: vi.fn().mockResolvedValue({ error: null }),
    };
    return tail;
  });
  chain.upsert = vi.fn((payload: Row | Row[]) => {
    upsertCalls.push({ table, payload });
    return Promise.resolve({ error: null });
  });
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
  upsertCalls.length = 0;
  updateCalls.length = 0;
});

async function renderHub() {
  const Comp = (await import("@/pages/admin/NetworkHub")).default;
  return render(
    <MemoryRouter>
      <Comp />
    </MemoryRouter>,
  );
}

describe("NetworkHub (Heartsyncx ads settings port)", () => {
  it("renders the hub bar with live network status and AdSense fields from the DB", async () => {
    await renderHub();
    expect(await screen.findByText("Google AdSense")).toBeDefined();
    expect(screen.getByText("Monetag")).toBeDefined();
    expect(screen.getByText("Adsterra")).toBeDefined();
    expect(screen.getByText("Placement Slots")).toBeDefined();
    // Publisher id loaded from the provider row
    expect(
      (
        screen.getByPlaceholderText(
          "ca-pub-XXXXXXXXXXXXXXXX",
        ) as HTMLInputElement
      ).value,
    ).toBe("ca-pub-3404100134534192");
  });

  it("shows the Monetag tab with the zone id and derived tag preview", async () => {
    const user = userEvent.setup();
    await renderHub();
    await screen.findByText("Placement Slots");
    await user.click(screen.getAllByText("Monetag")[0]);
    const zoneInput = await screen.findByPlaceholderText("e.g. 1234567");
    expect((zoneInput as HTMLInputElement).value).toBe("1234567");
    expect(screen.getByText(/tag\.min\.js/)).toBeDefined();
  });

  it("shows the Adsterra tab with the Direct Link loaded from the DB", async () => {
    const user = userEvent.setup();
    await renderHub();
    await screen.findByText("Placement Slots");
    await user.click(screen.getAllByText("Adsterra")[0]);
    await screen.findByText("Direct Link / Smartlink URL");
    expect(
      (
        screen.getByPlaceholderText(
          "https://example.com/...",
        ) as HTMLInputElement
      ).value,
    ).toContain("profitableratecpmnetwork.com");
  });

  it("master sync upserts the three provider rows with merged credentials", async () => {
    const user = userEvent.setup();
    await renderHub();
    await screen.findByText("Placement Slots");

    // Edit the publisher id to prove the save carries the edit
    const pub = screen.getByPlaceholderText(
      "ca-pub-XXXXXXXXXXXXXXXX",
    ) as HTMLInputElement;
    await user.clear(pub);
    await user.type(pub, "ca-pub-9999999999999999");
    await user.click(screen.getByRole("button", { name: /Save & Sync/i }));

    await waitFor(() => {
      expect(upsertCalls.length).toBeGreaterThan(0);
    });
    const upsert = upsertCalls[0];
    expect(upsert.table).toBe("ad_providers");
    const rows = upsert.payload as Row[];
    expect(rows.map((r) => r.slug).sort()).toEqual([
      "adsterra",
      "google_adsense",
      "monetag",
    ]);
    const adsense = rows.find((r) => r.slug === "google_adsense")!;
    expect(adsense.is_active).toBe(true);
    expect((adsense.credentials as Row).publisher_id).toBe(
      "ca-pub-9999999999999999",
    );
    // Monetag carries the zone + all zone credential fields
    const monetag = rows.find((r) => r.slug === "monetag")!;
    expect((monetag.credentials as Row).zone_id).toBe("1234567");
    // Adsterra keeps the direct link (merge, never clobber)
    const adsterra = rows.find((r) => r.slug === "adsterra")!;
    expect((adsterra.credentials as Row).direct_link_url).toContain(
      "profitableratecpmnetwork.com",
    );
  });

  it("sync writes per-slot unit ids and toggles onto the mapped placements", async () => {
    const user = userEvent.setup();
    await renderHub();
    await screen.findByText("Placement Slots");

    // The first per-slot AdSense unit field is the header slot (home_top)
    const unit = screen.getAllByPlaceholderText("10-digit unit id")[0];
    await user.clear(unit);
    await user.type(unit, "9876543210");
    await user.click(screen.getByRole("button", { name: /Save & Sync/i }));

    await waitFor(() => {
      const plUpdates = updateCalls.filter((c) => c.table === "ad_placements");
      expect(plUpdates.length).toBeGreaterThan(0);
    });
    const unitsOf = (c: { table: string; payload: Row } | undefined) =>
      (c?.payload.ad_unit_ids ?? {}) as Record<string, string>;
    const homeTop = updateCalls.find(
      (c) => unitsOf(c)["prov-adsense"] !== undefined,
    );
    expect(homeTop).toBeDefined();
    expect(unitsOf(homeTop)["prov-adsense"]).toBe("9876543210");
    // home_sidebar was inactive in the DB; the hub keeps DB state unless changed
    const sidebar = updateCalls.find(
      (c) =>
        unitsOf(c)["prov-adsense"] === undefined &&
        c.payload.is_active === false,
    );
    expect(sidebar).toBeDefined();
  });

  it("placement toggles reflect and edit DB is_active state", async () => {
    const user = userEvent.setup();
    await renderHub();
    await screen.findByText("Placement Slots");
    await user.click(screen.getAllByText("Placement Slots")[0]);
    // home_sidebar is inactive in the DB → its toggle renders unchecked
    const sidebarRow = screen.getAllByText("home_sidebar")[0].closest("label");
    expect(sidebarRow).not.toBeNull();
    expect(
      (sidebarRow!.querySelector("input") as HTMLInputElement).checked,
    ).toBe(false);
  });
});

describe("monetagTagPreview", () => {
  it("derives the display tag from a zone id", async () => {
    const { monetagTagPreview } = await import("@/pages/admin/NetworkHub");
    expect(monetagTagPreview("1234567")).toBe(
      '<script src="https://quge5.com/88/tag.min.js" data-zone="1234567" async data-cfasync="false"></script>',
    );
    expect(monetagTagPreview("")).toBe("");
  });
});
