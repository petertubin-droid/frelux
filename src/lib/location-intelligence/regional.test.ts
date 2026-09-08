import { describe, it, expect } from "vitest";
import { resolveRegionalContext } from "./regional";
import type { RegionalProfileLookup, RegionalDataSourceRow } from "./regional";
import { emptyLocation } from "./model";
import type { FreluxLocation } from "./model";

const NG_PROFILE: RegionalDataSourceRow = {
  country_code: "NG",
  country_name: "Nigeria",
  currency_code: "NGN",
  currency_symbol: "₦",
  default_measurement_system: "mixed",
  default_length_unit: "meters",
  default_area_unit: "sqm",
  local_terminology: { cement_bag: "50kg bag" },
  profile_version: "1.0.0",
  status: "active",
};

const lookup = (rows: Partial<Record<string, RegionalDataSourceRow>>): RegionalProfileLookup =>
  async (code) => rows[code] ?? null;

const loc = (over: Partial<FreluxLocation> = {}): FreluxLocation => ({
  ...emptyLocation("gps"),
  latitude: 6.5,
  longitude: 3.4,
  ...over,
});

describe("resolveRegionalContext", () => {
  it("resolves an active profile with currency + measurement context", async () => {
    const ctx = await resolveRegionalContext(
      loc({ country_code: "NG", country: "Nigeria" }),
      lookup({ NG: NG_PROFILE }),
    );
    expect(ctx.status).toBe("available");
    expect(ctx.country_code).toBe("NG");
    expect(ctx.currency_code).toBe("NGN");
    expect(ctx.currency_symbol).toBe("₦");
    expect(ctx.measurement_system).toBe("mixed");
    expect(ctx.local_terminology?.cement_bag).toBe("50kg bag");
    expect(ctx.reason).toContain("Nigeria");
  });

  it("reports 'Regional data unavailable' for countries with no profile, and substitutes nothing", async () => {
    const ctx = await resolveRegionalContext(
      loc({ country_code: "FR", country: "France" }),
      lookup({ NG: NG_PROFILE }),
    );
    expect(ctx.status).toBe("unavailable");
    expect(ctx.currency_code).toBeUndefined(); // no substituted currency
    expect(ctx.reason).toContain("Regional data unavailable");
    expect(ctx.reason).toContain("no other region");
  });

  it("treats a coming_soon profile as unavailable (honest region gating)", async () => {
    const ctx = await resolveRegionalContext(
      loc({ country_code: "KE", country: "Kenya" }),
      lookup({
        KE: { ...NG_PROFILE, country_code: "KE", country_name: "Kenya", status: "coming_soon" },
      }),
    );
    expect(ctx.status).toBe("unavailable");
  });

  it("never infers a country from coordinates alone", async () => {
    const ctx = await resolveRegionalContext(loc(), lookup({ NG: NG_PROFILE }));
    expect(ctx.status).toBe("needs_confirmation");
    expect(ctx.reason).toContain("country could not be verified");
  });

  it("needs confirmation when only free-text country hints exist but no code", async () => {
    const ctx = await resolveRegionalContext(
      loc({ latitude: null, longitude: null, country: "Nigeria", country_code: null }),
      lookup({ NG: NG_PROFILE }),
    );
    expect(ctx.status).toBe("needs_confirmation");
  });

  it("handles null locations", async () => {
    const ctx = await resolveRegionalContext(null, lookup({ NG: NG_PROFILE }));
    expect(ctx.status).toBe("needs_confirmation");
  });

  it("normalizes lowercase country codes", async () => {
    const ctx = await resolveRegionalContext(
      loc({ country_code: "ng" }),
      lookup({ NG: NG_PROFILE }),
    );
    expect(ctx.status).toBe("available");
  });
});
