import { describe, expect, it } from "vitest";
import {
  contractFigures,
  describeStatus,
  formatMinor,
  type EscrowContractRow,
} from "./escrow-client";

const contract = (
  over: Partial<EscrowContractRow> = {},
): EscrowContractRow => ({
  id: "c1",
  reference_code: "ESC-1",
  title: "Two bedroom finishing",
  currency: "NGN",
  total_minor: 5_000_000_00,
  held_minor: 5_000_000_00,
  released_minor: 0,
  refunded_minor: 0,
  fee_minor: 0,
  fee_basis_points: 700,
  status: "funds_held",
  seller_name: "Ade Builders",
  created_date: "2026-11-12T00:00:00Z",
  ...over,
});

describe("escrow client presentation", () => {
  it("formats kobo as naira with grouping", () => {
    expect(formatMinor(5_000_000_00)).toBe("₦5,000,000.00");
    expect(formatMinor(123_45)).toBe("₦123.45");
    expect(formatMinor(0)).toBe("₦0.00");
  });

  it("reports everything held while nothing is released", () => {
    const figures = contractFigures(contract());
    expect(figures.inEscrowMinor).toBe(5_000_000_00);
    expect(figures.sellerNetMinor).toBe(0);
    expect(figures.progressPercent).toBe(0);
  });

  it("nets the 7 percent fee out of released value only", () => {
    // 2,000,000 released, 7 percent fee is 140,000, seller nets 1,860,000.
    const figures = contractFigures(
      contract({
        released_minor: 2_000_000_00,
        fee_minor: 140_000_00,
        status: "partially_released",
      }),
    );
    expect(figures.sellerNetMinor).toBe(1_860_000_00);
    expect(figures.inEscrowMinor).toBe(3_000_000_00);
    expect(figures.progressPercent).toBe(40);
  });

  it("never reports a negative balance or over 100 percent progress", () => {
    const figures = contractFigures(
      contract({
        held_minor: 1_000_00,
        released_minor: 2_000_00,
        refunded_minor: 0,
        fee_minor: 3_000_00,
      }),
    );
    expect(figures.inEscrowMinor).toBe(0);
    expect(figures.sellerNetMinor).toBe(0);
    expect(figures.progressPercent).toBeLessThanOrEqual(100);
  });

  it("describes each state in plain words", () => {
    expect(describeStatus("pending_payment").detail).toContain(
      "Nothing has been collected",
    );
    expect(describeStatus("funds_held").label).toBe("Funds held in escrow");
    expect(describeStatus("refunded").label).toBe("Refunded");
  });
});
