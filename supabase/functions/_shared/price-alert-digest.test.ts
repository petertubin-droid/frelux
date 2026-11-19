import { describe, expect, it } from "vitest";
import {
  buildAlertDigest,
  formatMoney,
  marketAlertRows,
  splitByThreshold,
  verificationNote,
  type MarketPriceRow,
} from "@studio-shared/price-alert-digest";

const row = (over: Partial<MarketPriceRow> = {}): MarketPriceRow => ({
  market: "GB",
  material_slug: "portland-cement",
  product_name: "Portland cement 25 kg",
  unit: "bag",
  currency: "GBP",
  current_price: 6.4,
  previous_price: 6.0,
  price_change_percent: 6.7,
  verification_status: "verified",
  supplier_name: "Travis Perkins",
  last_verified_at: "2026-11-17T09:00:00Z",
  ...over,
});

describe("market scoping", () => {
  it("keeps only the recipient's market", () => {
    const { prices } = marketAlertRows(
      [row(), row({ market: "NG", currency: "NGN", current_price: 9000 })],
      "gb",
    );
    expect(prices).toHaveLength(1);
    expect(prices[0].currency).toBe("GBP");
  });

  it("leaves out an unpriced material and counts it instead of showing zero", () => {
    const { prices, unusable } = marketAlertRows(
      [
        row(),
        row({ material_slug: "sharp-sand", current_price: null }),
        row({ material_slug: "gravel", current_price: 0 }),
      ],
      "GB",
    );
    expect(prices).toHaveLength(1);
    expect(unusable).toBe(2);
  });

  it("prefers the two prices over a recorded percentage that disagrees", () => {
    const { prices } = marketAlertRows(
      [row({ price_change_percent: 99 })],
      "GB",
    );
    expect(prices[0].changePct).toBeCloseTo(6.7, 1);
  });

  it("reports no change when it cannot be known, not zero", () => {
    const { prices } = marketAlertRows(
      [row({ previous_price: null, price_change_percent: null })],
      "GB",
    );
    expect(prices[0].changePct).toBeNull();
  });

  it("falls back to a recorded percentage when there is no previous price", () => {
    const { prices } = marketAlertRows(
      [row({ previous_price: null, price_change_percent: -4.2 })],
      "GB",
    );
    expect(prices[0].changePct).toBeCloseTo(-4.2, 1);
  });

  it("orders by the size of the move, biggest first", () => {
    const { prices } = marketAlertRows(
      [
        row({ material_slug: "a", current_price: 10, previous_price: 9.8 }),
        row({ material_slug: "b", current_price: 20, previous_price: 10 }),
      ],
      "GB",
    );
    expect(prices[0].slug).toBe("b");
  });
});

describe("threshold", () => {
  const prices = marketAlertRows(
    [
      row({ material_slug: "big", current_price: 12, previous_price: 10 }),
      row({ material_slug: "small", current_price: 10.1, previous_price: 10 }),
      row({ material_slug: "flat", current_price: 10, previous_price: 10 }),
    ],
    "GB",
  ).prices;

  it("reports only moves at or above the threshold the visitor set", () => {
    const { moved, steady } = splitByThreshold(prices, 5);
    expect(moved.map((p) => p.slug)).toEqual(["big"]);
    expect(steady.map((p) => p.slug).sort()).toEqual(["flat", "small"]);
  });

  it("treats a zero threshold as 'tell me about anything that moved'", () => {
    const { moved } = splitByThreshold(prices, 0);
    expect(moved.map((p) => p.slug).sort()).toEqual(["big", "small"]);
  });

  it("does not call an unknown change steady", () => {
    const unknown = marketAlertRows(
      [row({ previous_price: null, price_change_percent: null })],
      "GB",
    ).prices;
    const { moved, steady } = splitByThreshold(unknown, 0);
    expect(moved).toHaveLength(0);
    expect(steady).toHaveLength(0);
  });
});

describe("money", () => {
  it("writes a price in its own currency", () => {
    expect(formatMoney(6.4, "GBP")).toContain("6.40");
    expect(formatMoney(9000, "NGN")).toMatch(/9,000|₦/);
  });

  it("uses the ISO code rather than another market's symbol when the code is unknown", () => {
    const out = formatMoney(1200, "XYZ");
    expect(out).toContain("XYZ");
    expect(out).not.toContain("₦");
    expect(out).not.toContain("$");
  });

  it("writes the amount alone when no currency was recorded", () => {
    expect(formatMoney(1200, null)).toBe("1,200");
  });
});

describe("verification note", () => {
  it("names what the price is backed by", () => {
    const base = marketAlertRows([row()], "GB").prices[0];
    expect(verificationNote(base)).toBe("verified 2026-11-17");
    expect(verificationNote({ ...base, verification: "stale" })).toMatch(
      /confirm before you buy/,
    );
    expect(verificationNote({ ...base, verification: "unverified" })).toMatch(
      /unverified/,
    );
    expect(verificationNote({ ...base, verification: null })).toBe(
      "source not recorded",
    );
  });
});

describe("the email", () => {
  const prices = marketAlertRows(
    [
      row({ material_slug: "big", current_price: 12, previous_price: 10 }),
      row({ material_slug: "small", current_price: 10.1, previous_price: 10 }),
    ],
    "GB",
  ).prices;

  it("leads with the moves that crossed the threshold", () => {
    const email = buildAlertDigest({
      market: "GB",
      marketName: "United Kingdom",
      prices,
      thresholdPct: 5,
    });
    expect(email.hasMoves).toBe(true);
    expect(email.subject).toContain("United Kingdom");
    expect(email.subject).toContain("1 material");
    expect(email.html).toContain("Portland cement 25 kg");
    expect(email.html).toContain("Travis Perkins");
    expect(email.html).toContain("20.0%");
  });

  it("says nothing crossed the threshold instead of sending an empty table", () => {
    const email = buildAlertDigest({
      market: "GB",
      marketName: "United Kingdom",
      prices,
      thresholdPct: 50,
    });
    expect(email.hasMoves).toBe(false);
    expect(email.subject).toMatch(/nothing moved 50%/);
    expect(email.html).toMatch(
      /No tracked material in United Kingdom moved 50%/,
    );
  });

  it("is honest when the market has no prices at all", () => {
    const email = buildAlertDigest({
      market: "BR",
      marketName: "Brazil",
      prices: [],
      thresholdPct: 5,
    });
    expect(email.html).toMatch(/No tracked prices for Brazil yet/);
    expect(email.html).not.toMatch(/<ul/);
  });

  it("counts what it left out rather than hiding it", () => {
    const email = buildAlertDigest({
      market: "GB",
      marketName: "United Kingdom",
      prices,
      thresholdPct: 5,
      unusable: 3,
    });
    expect(email.html).toMatch(/3 materials are not priced in your market yet/);
  });

  it("tells an instant-frequency visitor this is the weekly summary", () => {
    const email = buildAlertDigest({
      market: "GB",
      prices,
      thresholdPct: 5,
      cadence: "instant",
    });
    expect(email.html).toMatch(/You asked for instant alerts/);
  });

  it("points at the settings that change it", () => {
    const email = buildAlertDigest({ market: "GB", prices, thresholdPct: 5 });
    expect(email.html).toContain("/intelligence/");
  });

  it("escapes a product name that carries markup", () => {
    const email = buildAlertDigest({
      market: "GB",
      prices: marketAlertRows(
        [row({ product_name: "<script>alert(1)</script>" })],
        "GB",
      ).prices,
      thresholdPct: 5,
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});
