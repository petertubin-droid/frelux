import { describe, expect, it } from "vitest";
import {
  lockState,
  selectVendorLock,
  vendorLockNotice,
  vendorLockReasonText,
  type VendorPriceLock,
} from "@/lib/pricing/vendor-lock";
import { resolveMaterialPrice } from "@/lib/pricing/material-price-source";

const NOW = "2026-11-19T12:00:00Z";

const lock = (over: Partial<VendorPriceLock> = {}): VendorPriceLock => ({
  id: "l1",
  market: "GB",
  materialSlug: "portland-cement",
  supplierName: "Travis Perkins",
  supplierRef: "Q-8891",
  lockedPrice: 6.25,
  currency: "GBP",
  unit: "25 kg bag",
  validFrom: "2026-11-01T00:00:00Z",
  validTo: "2026-12-01T00:00:00Z",
  source: "quote",
  ...over,
});

describe("lock state", () => {
  it("is active inside its window", () => {
    expect(lockState(lock(), NOW)).toBe("active");
  });

  it("is expired at the moment it ends", () => {
    expect(lockState(lock({ validTo: "2026-11-19T12:00:00Z" }), NOW)).toBe(
      "expired",
    );
  });

  it("is pending before it starts", () => {
    expect(
      lockState(
        lock({
          validFrom: "2026-12-01T00:00:00Z",
          validTo: "2027-01-01T00:00:00Z",
        }),
        NOW,
      ),
    ).toBe("pending");
  });

  it("is malformed when the dates are unusable or reversed", () => {
    expect(lockState(lock({ validTo: "not a date" }), NOW)).toBe("malformed");
    expect(
      lockState(
        lock({
          validFrom: "2026-12-02T00:00:00Z",
          validTo: "2026-12-01T00:00:00Z",
        }),
        NOW,
      ),
    ).toBe("malformed");
  });
});

describe("selecting a lock", () => {
  it("applies the lock for the right market, material and currency", () => {
    const { lock: chosen, reason } = selectVendorLock([lock()], {
      market: "gb",
      materialSlug: "portland-cement",
      currency: "GBP",
      at: NOW,
    });
    expect(reason).toBe("applied");
    expect(chosen?.supplierName).toBe("Travis Perkins");
  });

  it("never applies another market's lock", () => {
    const { lock: chosen, reason } = selectVendorLock(
      [lock({ market: "NG" })],
      {
        market: "GB",
        materialSlug: "portland-cement",
        at: NOW,
      },
    );
    expect(chosen).toBeNull();
    expect(reason).toBe("market_mismatch");
  });

  it("never applies a lock quoted in another currency", () => {
    const { lock: chosen, reason } = selectVendorLock(
      [lock({ currency: "USD" })],
      {
        market: "GB",
        materialSlug: "portland-cement",
        currency: "GBP",
        at: NOW,
      },
    );
    expect(chosen).toBeNull();
    expect(reason).toBe("currency_mismatch");
  });

  it("refuses an expired lock rather than quoting a withdrawn price", () => {
    const { lock: chosen, reason } = selectVendorLock(
      [
        lock({
          validFrom: "2026-10-01T00:00:00Z",
          validTo: "2026-11-01T00:00:00Z",
        }),
      ],
      { market: "GB", materialSlug: "portland-cement", at: NOW },
    );
    expect(chosen).toBeNull();
    expect(reason).toBe("expired");
  });

  it("prefers the supplier's newest effective quote", () => {
    const { lock: chosen } = selectVendorLock(
      [
        lock({
          id: "old",
          validFrom: "2026-11-01T00:00:00Z",
          lockedPrice: 6.4,
        }),
        lock({
          id: "new",
          validFrom: "2026-11-15T00:00:00Z",
          lockedPrice: 6.1,
        }),
      ],
      { market: "GB", materialSlug: "portland-cement", at: NOW },
    );
    expect(chosen?.id).toBe("new");
  });

  it("says when nothing is held for the material at all", () => {
    expect(
      selectVendorLock([lock()], {
        market: "GB",
        materialSlug: "sharp-sand",
        at: NOW,
      }).reason,
    ).toBe("material_mismatch");
  });
});

describe("quoting with a lock", () => {
  const base = {
    source: "frelux" as const,
    customValue: null,
    freluxValue: 6.9,
    freluxVerified: false,
    at: NOW,
  };

  it("quotes the locked price as firm while it is active", () => {
    const resolved = resolveMaterialPrice({ ...base, vendorLock: lock() });
    expect(resolved.value).toBe(6.25);
    expect(resolved.source).toBe("vendor-lock");
    expect(resolved.status).toBe("verified");
    expect(resolved.notice).toContain("held until 2026-12-01");
    expect(resolved.appliedLock?.supplierRef).toBe("Q-8891");
  });

  it("falls back to the indicative price and says the lock expired", () => {
    const resolved = resolveMaterialPrice({
      ...base,
      vendorLock: lock({ validTo: "2026-11-10T00:00:00Z" }),
    });
    expect(resolved.value).toBe(6.9);
    expect(resolved.source).toBe("frelux");
    expect(resolved.status).toBe("indicative");
    expect(resolved.notice).toMatch(/lock for this material has expired/);
    expect(resolved.vendorLockReason).toBe("expired");
  });

  it("leaves a typed price alone even when a lock exists", () => {
    const resolved = resolveMaterialPrice({
      ...base,
      source: "custom",
      customValue: 7.5,
      vendorLock: lock(),
    });
    expect(resolved.value).toBe(7.5);
    expect(resolved.source).toBe("custom");
  });

  it("still asks for a price when there is no lock and no FRELUX price", () => {
    const resolved = resolveMaterialPrice({
      ...base,
      freluxValue: null,
      vendorLock: null,
    });
    expect(resolved.needsCustomPrice).toBe(true);
    expect(resolved.value).toBeNull();
  });
});

describe("copy", () => {
  it("names the supplier, the reference and the expiry in the notice", () => {
    const text = vendorLockNotice(lock());
    expect(text).toContain("Travis Perkins");
    expect(text).toContain("Q-8891");
    expect(text).toContain("2026-12-01");
    expect(text).toContain("GBP 6.25");
  });

  it("explains every refusal in words a buyer can act on", () => {
    expect(vendorLockReasonText("expired")).toMatch(
      /Ask the supplier to re-confirm/,
    );
    expect(vendorLockReasonText("currency_mismatch")).toMatch(
      /another currency/,
    );
    expect(vendorLockReasonText("market_mismatch")).toMatch(/other markets/);
    expect(vendorLockReasonText("applied")).toBe("");
  });
});
