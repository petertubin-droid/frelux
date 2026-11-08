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

  it("keeps the configured white cement price instead of grey cement", async () => {
    const mix = {
      systemType: "white_cement_paint",
      displayName: "White Cement + Screeding Paint",
      coverageAreaM2: 20,
      defaultCoats: 2,
      wastePercentage: 20,
      currency: "NGN",
      currencySymbol: "₦",
      paintName: "Screeding Paint",
      paintQuantity: 2,
      paintUnit: "bucket",
      paintPricePerUnit: 25000,
      cementName: "White Cement",
      cementQuantity: 1,
      cementUnit: "bag",
      cementPricePerUnit: 8000,
      roundingRule: "ceil",
    } as unknown as ScreedingSystemConfig;

    // The NG "concrete-mix" role is filled with ordinary grey Portland cement.
    resolveCityAwarePriceByRole.mockImplementation((role: unknown) =>
      role === "concrete-mix"
        ? {
            price: { price: 15500 },
            material: { name: "Cement", slug: "cement" },
          }
        : role === "interior-paint"
          ? {
              price: { price: 17000 },
              material: {
                name: "Interior Emulsion (20 L)",
                slug: "ng-interior-emulsion-20l",
              },
            }
          : null,
    );

    const out = await resolveScreedPrices(mix, "NG", "NG");
    expect(out.cementPricePerUnit).toBe(8000);
    expect(out.paintPricePerUnit).toBe(17000);
    // The dedicated screeding role is asked first, then interior emulsion.
    expect(resolveCityAwarePriceByRole).toHaveBeenCalledWith(
      "screeding-paint",
      "NG",
      undefined,
    );
  });

  it("prefers the market's own screeding paint over interior emulsion", async () => {
    resolveCityAwarePriceByRole.mockImplementation((role: unknown) => {
      if (role === "screeding-paint")
        return {
          price: { price: 4500 },
          material: {
            name: "Nigerian Screeding Paint (20 L bucket)",
            slug: "ng-screeding-paint-20l",
          },
        };
      if (role === "interior-paint")
        return {
          price: { price: 17000 },
          material: {
            name: "Interior Emulsion (20 L)",
            slug: "ng-interior-emulsion-20l",
          },
        };
      return null;
    });

    const out = await resolveScreedPrices(
      {
        systemType: "white_cement_paint",
        paintPricePerUnit: 25000,
        cementPricePerUnit: 8000,
        puttyPricePerUnit: null,
      } as unknown as ScreedingSystemConfig,
      "NG",
      "NG",
    );
    expect(out.paintPricePerUnit).toBe(4500);
  });

  it("uses a white cement book price when the book really holds white cement", async () => {
    resolveCityAwarePriceByRole.mockResolvedValue({
      price: { price: 13500 },
      material: { name: "White Cement (25 kg)", slug: "ng-white-cement-25kg" },
    });
    const out = await resolveScreedPrices(
      {
        systemType: "white_cement_paint",
        cementPricePerUnit: 8000,
        paintPricePerUnit: null,
        puttyPricePerUnit: null,
      } as unknown as ScreedingSystemConfig,
      "NG",
      "NG",
    );
    expect(out.cementPricePerUnit).toBe(13500);
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
