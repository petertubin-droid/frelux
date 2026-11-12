import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  LAUNCH_TERRITORIES,
  getTerritoryLiquidity,
  submitConciergeRequest,
  nominateArtisanForEscrow,
  listSavedConciergeRequests,
  listSavedArtisanNominations,
} from "./liquidity-seeding-protocol";

// The submissions are server rows now, not browser rows. The fake below echoes
// whatever is inserted, so the assertions prove the payload that would reach
// marketplace_concierge_requests / marketplace_artisan_nominations.
const inserted: Array<{ table: string; payload: Record<string, unknown> }> = [];
let readRows: Record<string, unknown>[] = [];

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } } }),
    },
    from: (table: string) => ({
      insert: (payload: Record<string, unknown>) => {
        inserted.push({ table, payload });
        return {
          select: () => ({
            single: async () => ({
              data: {
                id: `row-${inserted.length}`,
                created_at: "2026-11-12T09:00:00.000Z",
                ...payload,
              },
              error: null,
            }),
          }),
        };
      },
      select: () => ({
        order: () => ({
          limit: async () => ({ data: readRows, error: null }),
        }),
      }),
    }),
  },
}));

describe("Marketplace Liquidity & Strategic Seeding Protocol", () => {
  beforeEach(() => {
    inserted.length = 0;
    readRows = [];
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  it("provides designated seed launch territories with tiers and partner affiliations", () => {
    expect(LAUNCH_TERRITORIES.length).toBeGreaterThan(5);
    const lagos = LAUNCH_TERRITORIES.find((t) => t.id === "ng-lagos")!;
    expect(lagos.tier).toBe("tier_1_active");
    expect(lagos.densityScore).toBeGreaterThanOrEqual(90);

    const abuja = LAUNCH_TERRITORIES.find((t) => t.id === "ng-abuja")!;
    expect(abuja.tier).toBe("tier_2_seeded");
    expect(abuja.dispatchGuaranteedHours).toBe(4);
  });

  it("resolves territory liquidity accurately from search queries", () => {
    expect(getTerritoryLiquidity("Lagos").id).toBe("ng-lagos");
    expect(getTerritoryLiquidity("Nairobi").id).toBe("ke-nairobi");

    const remote = getTerritoryLiquidity("Remote Mountain Village");
    expect(remote.tier).toBe("tier_3_emerging");
    expect(remote.territoryName).toContain("Remote Mountain Village");
  });

  it("persists concierge sourcing requests to the database, not the browser", async () => {
    const req = await submitConciergeRequest({
      clientName: "Sarah Jenkins",
      clientEmail: "sarah@globaldev.com",
      territoryName: "Kumasi Metropolitan",
      tradeNeeded: "Structural Steel & Rebar",
      projectBudgetEstimate: "$45,000 USD",
      escrowRequired: true,
    });

    expect(req.id).toMatch(/^cnc_/);
    expect(req.status).toBe("received");

    expect(inserted).toHaveLength(1);
    expect(inserted[0].table).toBe("marketplace_concierge_requests");
    expect(inserted[0].payload.client_name).toBe("Sarah Jenkins");
    expect(inserted[0].payload.territory_name).toBe("Kumasi Metropolitan");
    expect(inserted[0].payload.created_by).toBe("user-1");

    // No browser storage is involved any more: a request must survive the tab.
    expect(localStorage.length).toBe(0);
  });

  it("persists artisan nominations for vetting, not to the browser", async () => {
    const nom = await nominateArtisanForEscrow({
      clientEmail: "diaspora.investor@gmail.com",
      artisanName: "Emmanuel Adeyemi",
      artisanPhone: "+234 803 123 4567",
      artisanTrade: "Master Mason / Bricklayer",
      locationCity: "Ibadan, Oyo State",
      escrowContractRef: "ESCROW-2026-901",
    });

    expect(nom.id).toMatch(/^nom_/);
    expect(nom.verificationStatus).toBe("pending_kyc");

    expect(inserted).toHaveLength(1);
    expect(inserted[0].table).toBe("marketplace_artisan_nominations");
    expect(inserted[0].payload.artisan_name).toBe("Emmanuel Adeyemi");
    expect(inserted[0].payload.escrow_contract_ref).toBe("ESCROW-2026-901");
    expect(localStorage.length).toBe(0);
  });

  it("reads the saved queue back from the database", async () => {
    readRows = [
      {
        local_ref: "cnc_1",
        client_name: "Sarah Jenkins",
        client_email: "sarah@globaldev.com",
        territory_name: "Kumasi Metropolitan",
        trade_needed: "Structural Steel & Rebar",
        project_budget_estimate: "$45,000 USD",
        escrow_required: true,
        status: "received",
        created_at: "2026-11-12T09:00:00.000Z",
      },
    ];

    const list = await listSavedConciergeRequests();
    expect(list).toHaveLength(1);
    expect(list[0].clientName).toBe("Sarah Jenkins");
    expect(list[0].escrowRequired).toBe(true);

    readRows = [];
    expect(await listSavedArtisanNominations()).toEqual([]);
  });
});
