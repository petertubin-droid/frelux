import { describe, expect, it } from "vitest";
import {
  GOVERNMENT_ID_TYPES,
  normalizeGovernmentId,
  normalizeNin,
  validateIdentity,
} from "./identity-validation.ts";

describe("validateIdentity", () => {
  it("accepts a Nigerian account with an 11-digit NIN", () => {
    const r = validateIdentity({
      country_code: "ng",
      nin_number: "12345678901",
    });
    expect(r.ok).toBe(true);
    expect(r.normalized.nin_number).toBe("12345678901");
    expect(r.normalized.government_id_type).toBe("national_id");
  });

  it("normalises a NIN typed with spaces or dashes", () => {
    expect(normalizeNin("123 456-78901")).toBe("12345678901");
    expect(
      validateIdentity({ country_code: "NG", nin_number: "123 456 78901" }).ok,
    ).toBe(true);
  });

  it("rejects a NIN that is not exactly 11 digits", () => {
    for (const bad of ["123", "1234567890", "123456789012", "abcdefghijk"]) {
      const r = validateIdentity({ country_code: "NG", nin_number: bad });
      expect(r.ok, bad).toBe(false);
      expect(r.errors.nin_number).toBeTruthy();
    }
  });

  it("requires identity for a Nigerian account", () => {
    const r = validateIdentity({ country_code: "NG" });
    expect(r.ok).toBe(false);
    expect(r.errors.nin_number).toBeTruthy();
  });

  it("requires a government ID outside Nigeria and never keeps a NIN", () => {
    const r = validateIdentity({
      country_code: "US",
      nin_number: "12345678901",
      government_id_type: "drivers_license",
      government_id_number: "TX-DL-98213",
    });
    expect(r.ok).toBe(true);
    // A NIN belongs to a Nigerian account only.
    expect(r.normalized.nin_number).toBe("");
    expect(r.normalized.government_id_number).toBe("TX-DL-98213");
  });

  it("rejects a government ID type the UI does not offer", () => {
    const r = validateIdentity({
      country_code: "GB",
      government_id_type: "library_card",
      government_id_number: "AB12345",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.government_id_type).toBeTruthy();
    for (const type of GOVERNMENT_ID_TYPES) {
      expect(
        validateIdentity({
          country_code: "GB",
          government_id_type: type,
          government_id_number: "AB12345",
        }).ok,
      ).toBe(true);
    }
  });

  it("upper-cases and strips a pasted government ID number", () => {
    expect(normalizeGovernmentId(" tx-dl 98213 ")).toBe("TX-DL98213");
  });
});
