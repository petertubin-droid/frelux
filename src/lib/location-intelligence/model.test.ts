import { describe, it, expect } from "vitest";
import {
  emptyLocation,
  fromGeolocationPosition,
  sanitizeLocationRecord,
  validateFreluxLocation,
  normalizeCountryCode,
  hasValidCoordinates,
  formatLocationLabel,
  formatCoordinates,
  formatAccuracy,
  isValidLatitude,
  isValidLongitude,
} from "./model";
import type { FreluxLocation } from "./model";

const goodLocation = (over: Partial<FreluxLocation> = {}): FreluxLocation => ({
  ...emptyLocation("gps"),
  latitude: 6.5244,
  longitude: 3.3792,
  accuracy_m: 35,
  ...over,
});

describe("normalizeCountryCode", () => {
  it("uppercases valid ISO alpha-2 codes", () => {
    expect(normalizeCountryCode("ng")).toBe("NG");
    expect(normalizeCountryCode(" ng ")).toBe("NG");
  });
  it("rejects invalid codes", () => {
    expect(normalizeCountryCode("nga")).toBeNull();
    expect(normalizeCountryCode("")).toBeNull();
    expect(normalizeCountryCode(null)).toBeNull();
    expect(normalizeCountryCode("N")).toBeNull();
  });
});

describe("coordinate validation", () => {
  it("accepts valid ranges", () => {
    expect(isValidLatitude(6.5)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLongitude(3.37)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
  });
  it("rejects out-of-range and non-numbers", () => {
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLongitude(-181)).toBe(false);
    expect(isValidLatitude("6.5" as unknown)).toBe(false);
    expect(isValidLongitude(NaN)).toBe(false);
  });
  it("requires BOTH coordinates for hasValidCoordinates", () => {
    expect(hasValidCoordinates(goodLocation())).toBe(true);
    expect(hasValidCoordinates(goodLocation({ longitude: null }))).toBe(false);
  });
});

describe("validateFreluxLocation", () => {
  it("accepts a coordinates record", () => {
    const r = validateFreluxLocation(goodLocation());
    expect(r.valid).toBe(true);
  });
  it("accepts a country-only record (region-level location)", () => {
    const r = validateFreluxLocation(
      goodLocation({ latitude: null, longitude: null, country_code: "NG" }),
    );
    expect(r.valid).toBe(true);
  });
  it("rejects a record with no coordinates and no country", () => {
    const r = validateFreluxLocation(
      goodLocation({ latitude: null, longitude: null }),
    );
    expect(r.valid).toBe(false);
    expect(r.issues).toContain("needs_country_or_coordinates");
  });
  it("rejects half a coordinate pair", () => {
    const r = validateFreluxLocation(goodLocation({ longitude: null }));
    expect(r.valid).toBe(false);
    expect(r.issues).toContain("invalid_coordinates");
  });
  it("rejects out-of-range coordinates", () => {
    expect(
      validateFreluxLocation(goodLocation({ latitude: 999 })).issues,
    ).toContain("invalid_coordinates");
  });
  it("rejects null records", () => {
    expect(validateFreluxLocation(null).issues).toEqual(["no_data"]);
  });
});

describe("fromGeolocationPosition", () => {
  it("maps a browser position into a canonical GPS record", () => {
    const pos = {
      coords: { latitude: 6.5, longitude: 3.38, accuracy: 22 },
      timestamp: Date.now(),
    } as GeolocationPosition;
    const loc = fromGeolocationPosition(pos);
    expect(loc.source).toBe("gps");
    expect(loc.verification).toBe("unverified");
    expect(loc.latitude).toBe(6.5);
    expect(loc.longitude).toBe(3.38);
    expect(loc.accuracy_m).toBe(22);
    expect(loc.formatted_address).toBeNull(); // nothing fabricated
    expect(loc.country_code).toBeNull(); // coordinates never imply a country
  });
});

describe("sanitizeLocationRecord", () => {
  it("strips unknown fields and normalizes the shape", () => {
    const raw = {
      latitude: 6.5,
      longitude: 3.38,
      country_code: "ng",
      city: "Lagos",
      verification: "provider_verified",
      source: "search",
      captured_at: "2026-09-07T08:00:00Z",
      malicious: "field",
    };
    const loc = sanitizeLocationRecord(raw);
    expect(loc.country_code).toBe("NG");
    expect(loc.verification).toBe("provider_verified");
    expect((loc as Record<string, unknown>).malicious).toBeUndefined();
  });
  it("falls back to safe defaults for malformed input", () => {
    const loc = sanitizeLocationRecord({ latitude: "abc", source: "weird" });
    expect(loc.latitude).toBeNull();
    expect(loc.source).toBe("manual");
    expect(loc.verification).toBe("unverified");
  });
});

describe("display formatting", () => {
  it("uses only fields that exist — never fabricates", () => {
    expect(formatLocationLabel(null)).toBe("Location not set");
    expect(formatLocationLabel(goodLocation())).toContain("6.5244"); // coords only
    expect(
      formatLocationLabel(goodLocation({ city: "Lagos", region: "Lagos State" })),
    ).toBe("Lagos, Lagos State");
    expect(
      formatLocationLabel(
        goodLocation({ latitude: null, longitude: null, country: "Ghana" }),
      ),
    ).toBe("Ghana");
  });
  it("formats coordinates and accuracy honestly", () => {
    expect(formatCoordinates(goodLocation())).toBe("6.52440, 3.37920");
    expect(formatCoordinates(goodLocation({ latitude: null }))).toBeNull();
    expect(formatAccuracy(goodLocation({ accuracy_m: 35 }))).toBe("± 35 m");
    expect(formatAccuracy(goodLocation({ accuracy_m: null }))).toBeNull();
  });
});
