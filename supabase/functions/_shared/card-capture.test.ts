import { describe, expect, it } from "vitest";
import {
  extractCardToken,
  parseExpiry,
  cardExpiresSoon,
} from "./card-capture.ts";

const TOKEN = "flw-t1nf-93da56b24f8ee332304cd2eea40a1fc4-m03k";

function payload(
  over: Record<string, unknown> = {},
  cardOver: Record<string, unknown> = {},
) {
  return {
    status: "success",
    data: {
      status: "successful",
      card: {
        token: TOKEN,
        card_type: "VISA",
        last_4digits: "0345",
        expiry: "09/32",
        ...cardOver,
      },
      ...over,
    },
  };
}

describe("capturing a card token", () => {
  it("reads the token and display details from a successful verification", () => {
    expect(extractCardToken(payload())).toEqual({
      token: TOKEN,
      brand: "VISA",
      last4: "0345",
      expMonth: 9,
      expYear: 2032,
    });
  });

  it("refuses a token from a payment that did not succeed", () => {
    expect(extractCardToken(payload({ status: "failed" }))).toBeNull();
  });

  it("refuses anything that is not shaped like a provider token", () => {
    for (const token of ["", "1234", "flw-t1nf-short", null]) {
      expect(extractCardToken(payload({}, { token }))).toBeNull();
    }
  });

  it("keeps the token even when display details are missing", () => {
    const r = extractCardToken(
      payload({}, { last_4digits: "12", expiry: "nonsense" }),
    );
    expect(r).toMatchObject({ token: TOKEN, last4: null, expMonth: null });
  });

  it("handles a payload with no card at all", () => {
    expect(extractCardToken({ data: { status: "successful" } })).toBeNull();
    expect(extractCardToken(null)).toBeNull();
  });
});

describe("expiry parsing", () => {
  it("reads two digit and four digit years", () => {
    expect(parseExpiry("09/32")).toEqual({ month: 9, year: 2032 });
    expect(parseExpiry("12/2030")).toEqual({ month: 12, year: 2030 });
  });

  it("refuses impossible months", () => {
    expect(parseExpiry("13/32")).toBeNull();
    expect(parseExpiry("00/32")).toBeNull();
    expect(parseExpiry("soon")).toBeNull();
  });

  it("warns before the card expires, not after a charge fails", () => {
    const now = new Date("2026-10-31T00:00:00Z");
    // November 2026 ends on 1 December, which is 31 days away.
    expect(cardExpiresSoon(11, 2026, now)).toBe(true);
    // December 2026 runs to 1 January 2027, outside the warning window.
    expect(cardExpiresSoon(12, 2026, now)).toBe(false);
    expect(cardExpiresSoon(6, 2027, now)).toBe(false);
    expect(cardExpiresSoon(null, null, now)).toBe(false);
  });
});
