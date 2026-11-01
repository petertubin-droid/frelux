// =========================================================
// PRICE GATEWAY CONTRACT
//
// The gateway's job is to stop a number travelling without its
// meaning. These tests pin the four states, the provenance, and the
// two things the module must never do: invent a price, or return a
// tax percentage.
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const resolveCityAwarePriceByRole = vi.fn();

vi.mock("@/lib/price-index/calculator-prices", () => ({
  resolveCityAwarePriceByRole: (...args: unknown[]) =>
    resolveCityAwarePriceByRole(...args),
}));

const fetchActivePrice = vi.fn();

vi.mock("@/lib/estimation/queries", () => ({
  fetchActivePrice: (...args: unknown[]) => fetchActivePrice(...args),
}));

const {
  resolvePrice,
  resolveMaterialPrice,
  resolvePrices,
  allPriced,
  unpricedRoles,
} = await import("./price-gateway");

const ROLE = "blockwork" as never;

function priceRow(overrides: Record<string, unknown> = {}) {
  return {
    role: ROLE,
    resolved_market: "NG",
    basis: "market",
    city_slug: null,
    city_samples: null,
    price_note: null,
    indicative: true,
    material: { id: "m1", slug: "9-inch-block", name: "9 inch block" },
    price: {
      id: "p1",
      price: 950,
      currency: "NGN",
      market: "NG",
      effective_date: "2026-10-20",
      price_source: "retailer survey",
      scan_confidence: "high",
    },
    ...overrides,
  };
}

beforeEach(() => {
  resolveCityAwarePriceByRole.mockReset();
  fetchActivePrice.mockReset();
});

describe("resolvePrice", () => {
  it("reports local when the price comes from a market with verified coverage", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(priceRow());
    const result = await resolvePrice({ market: "NG", role: ROLE });
    expect(result.status).toBe("local");
    expect(result.sourcedMarket).toBe("NG");
    expect(result.unitPrice).toBe(950);
    expect(result.currency).toBe("NGN");
  });

  it("never invents a price when nothing is priced", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(null);
    const result = await resolvePrice({ market: "ZZ", role: ROLE });
    expect(result.status).toBe("not_priced");
    expect(result.unitPrice).toBeNull();
    expect(result.total).toBeNull();
    expect(result.currency).toBeNull();
    expect(result.message).toContain("Enter a price");
  });

  it("marks a borrowed price as inherited, never as local", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(priceRow());
    const result = await resolvePrice({ market: "ZZ", role: ROLE });
    expect(result.status).toBe("inherited");
    expect(result.sourcedMarket).toBe("NG");
    expect(result.warnings.join(" ")).toContain("inherited from NG");
    expect(result.message).toContain("no local price");
  });

  it("marks a local price unverified when the market has no verified book", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(
      priceRow({ resolved_market: "ZZ" }),
    );
    const result = await resolvePrice({ market: "ZZ", role: ROLE });
    expect(result.status).toBe("unverified");
    expect(result.warnings.join(" ")).toContain("no verified price book");
  });

  it("returns a line total only when a quantity is supplied", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(priceRow());
    const withQty = await resolvePrice({
      market: "NG",
      role: ROLE,
      quantity: 3,
    });
    expect(withQty.total).toBe(2850);
    const without = await resolvePrice({ market: "NG", role: ROLE });
    expect(without.total).toBeNull();
  });

  it("carries provenance on every resolved amount", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(priceRow());
    const result = await resolvePrice({ market: "NG", role: ROLE });
    expect(result.provenance).toMatchObject({
      priceId: "p1",
      materialSlug: "9-inch-block",
      materialName: "9 inch block",
      sourcedMarket: "NG",
      requestedMarket: "NG",
      effectiveDate: "2026-10-20",
      priceSource: "retailer survey",
      scanConfidence: "high",
    });
  });

  it("always reports tax as undetermined, priced or not", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(priceRow());
    const priced = await resolvePrice({ market: "NG", role: ROLE });
    expect(priced.taxStatus).toBe("tax_not_determined");

    resolveCityAwarePriceByRole.mockResolvedValue(null);
    const unpriced = await resolvePrice({ market: "NG", role: ROLE });
    expect(unpriced.taxStatus).toBe("tax_not_determined");
  });

  it("does not resolve anything without a market", async () => {
    const result = await resolvePrice({ market: "", role: ROLE });
    expect(result.status).toBe("not_priced");
    expect(resolveCityAwarePriceByRole).not.toHaveBeenCalled();
  });
});

describe("city precision", () => {
  it("passes the city through to the resolver", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(priceRow());
    await resolvePrice({ market: "NG", role: ROLE, citySlug: "lagos" });
    expect(resolveCityAwarePriceByRole).toHaveBeenCalledWith(
      ROLE,
      "NG",
      "lagos",
    );
  });

  it("reports city basis and sample size when listings won", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(
      priceRow({
        basis: "city",
        city_slug: "lagos",
        city_samples: 12,
        indicative: false,
      }),
    );
    const result = await resolvePrice({
      market: "NG",
      role: ROLE,
      citySlug: "lagos",
    });
    expect(result.provenance).toMatchObject({
      basis: "city",
      citySlug: "lagos",
      citySamples: 12,
      indicative: false,
    });
  });

  it("falls back to market basis with no city evidence", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(priceRow());
    const result = await resolvePrice({ market: "NG", role: ROLE });
    expect(result.provenance.basis).toBe("market");
    expect(result.provenance.indicative).toBe(true);
  });
});

describe("batch helpers", () => {
  it("preserves request order", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(priceRow());
    const results = await resolvePrices("NG", [ROLE, "concrete" as never]);
    expect(results.map((r) => r.role)).toEqual([ROLE, "concrete"]);
  });

  it("refuses to claim a complete set when a role is unpriced", async () => {
    resolveCityAwarePriceByRole
      .mockResolvedValueOnce(priceRow())
      .mockResolvedValueOnce(null);
    const results = await resolvePrices("NG", [ROLE, "concrete" as never]);
    expect(allPriced(results)).toBe(false);
    expect(unpricedRoles(results)).toEqual(["concrete"]);
  });

  it("treats an empty set as incomplete rather than complete", () => {
    expect(allPriced([])).toBe(false);
  });
});

describe("material axis", () => {
  const row = {
    id: "pr-1",
    price: 4200,
    currency: "USD",
    market: "US",
    effective_date: "2026-10-18",
    price_source: "supplier quote",
    scan_confidence: "medium",
  };

  it("prices a known material in its own market", async () => {
    fetchActivePrice.mockResolvedValue({ data: row, error: null });
    const result = await resolveMaterialPrice({
      market: "US",
      refId: "mat-1",
    });
    expect(result.status).toBe("local");
    expect(result.unitPrice).toBe(4200);
    expect(result.currency).toBe("USD");
    expect(result.provenance.priceId).toBe("pr-1");
    expect(result.provenance.effectiveDate).toBe("2026-10-18");
  });

  it("asks only for the requested market, never an ancestor", async () => {
    fetchActivePrice.mockResolvedValue({ data: null, error: null });
    await resolveMaterialPrice({ market: "ZZ", refId: "mat-1" });
    expect(fetchActivePrice).toHaveBeenCalledTimes(1);
    expect(fetchActivePrice).toHaveBeenCalledWith("material", "mat-1", "ZZ");
  });

  it("reports an unpriced material without inventing a number", async () => {
    fetchActivePrice.mockResolvedValue({ data: null, error: null });
    const result = await resolveMaterialPrice({ market: "US", refId: "mat-1" });
    expect(result.status).toBe("not_priced");
    expect(result.unitPrice).toBeNull();
    expect(result.message).toContain("Enter a price");
  });

  it("distinguishes a failed lookup from a missing price", async () => {
    fetchActivePrice.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const result = await resolveMaterialPrice({ market: "US", refId: "mat-1" });
    expect(result.status).toBe("not_priced");
    expect(result.message).toContain("could not be read");
  });

  it("multiplies only when a quantity is supplied", async () => {
    fetchActivePrice.mockResolvedValue({ data: row, error: null });
    const withQty = await resolveMaterialPrice({
      market: "US",
      refId: "mat-1",
      quantity: 2.5,
    });
    expect(withQty.total).toBe(10500);
    const without = await resolveMaterialPrice({
      market: "US",
      refId: "mat-1",
    });
    expect(without.total).toBeNull();
  });

  it("keeps tax undetermined on the material axis too", async () => {
    fetchActivePrice.mockResolvedValue({ data: row, error: null });
    const result = await resolveMaterialPrice({ market: "US", refId: "mat-1" });
    expect(result.taxStatus).toBe("tax_not_determined");
  });
});
