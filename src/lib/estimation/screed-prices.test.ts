import { describe, it, expect, vi, beforeEach } from "vitest";

const resolveCityAwarePriceByRole = vi.fn();
vi.mock("@/lib/price-index/calculator-prices", () => ({
  resolveCityAwarePriceByRole: (...args: unknown[]) =>
    resolveCityAwarePriceByRole(...args),
}));

import { resolveScreedPrices } from "@/lib/estimation/screed-prices";
import type { ScreedingSystemConfig } from "@/types";

function book(price: number | null) {
  return price == null ? null : { price: { price } };
}

const puttyConfig = {
  systemType: "putty",
  displayName: "Putty",
  coverageAreaM2: 25,
  defaultCoats: 2,
  wastePercentage: 10,
  currency: "NGN",
  currencySymbol: "₦",
  puttyName: "Putty",
  puttyQuantity: 1,
  puttyUnit: "bucket",
  puttyPricePerUnit: 11000,
  roundingRule: "ceil",
} as unknown as ScreedingSystemConfig;

describe("resolveScreedPrices", () => {
  beforeEach(() => resolveCityAwarePriceByRole.mockReset());

  it("lets the admin price book override a seeded config literal", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(book(13500));
    const out = await resolveScreedPrices(puttyConfig, "NG", "NG", "lagos");
    expect(out.puttyPricePerUnit).toBe(13500);
    expect(resolveCityAwarePriceByRole).toHaveBeenCalledWith(
      "joint-filler",
      "NG",
      "lagos",
    );
  });

  it("falls back to the config literal when the book has no figure", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(null);
    const out = await resolveScreedPrices(puttyConfig, "NG", "NG");
    expect(out.puttyPricePerUnit).toBe(11000);
  });

  it("reports unpriced when neither the book nor the config has a price", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(null);
    const out = await resolveScreedPrices(
      { ...puttyConfig, puttyPricePerUnit: null } as ScreedingSystemConfig,
      "NG",
      "NG",
    );
    expect(out.puttyPricePerUnit).toBeNull();
  });

  it("ignores a non-positive book figure", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(book(0));
    const out = await resolveScreedPrices(puttyConfig, "NG", "NG");
    expect(out.puttyPricePerUnit).toBe(11000);
  });

  it("clears NG prices when a foreign market borrows the NG config", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue(book(13500));
    const out = await resolveScreedPrices(puttyConfig, "NG", "GH");
    expect(out.puttyPricePerUnit).toBeNull();
    expect(resolveCityAwarePriceByRole).not.toHaveBeenCalled();
  });
});
