// =========================================================
// PROPERTY INTELLIGENCE, LOCATION RESOLUTION TESTS
//
// The no-substitution contract:
//   * a country WITH a profile → resolved, profile relayed
//   * a country WITHOUT a profile → unsupported, explicitly
//     stating no other region's data was substituted
//   * coordinates alone are NOT country detection — reverse
//     geocoding is not implemented, so → requires_confirmation
//   * nothing → requires_confirmation, never a guess
// =========================================================
import { describe, it, expect } from "vitest";
import { resolveRegionalContext } from "@/lib/property-intelligence/location";

describe("resolveRegionalContext", () => {
  it("country with an existing profile → resolved", () => {
    const profile = { currency: "NGN" };
    const r = resolveRegionalContext(
      { country: "ng", region: "Lagos", city: "Ikeja" },
      (cc) => (cc === "NG" ? profile : null),
    );
    expect(r.status).toBe("resolved");
    expect(r.countryCode).toBe("NG"); // normalized upper-case
    expect(r.profile).toBe(profile);
    expect(r.reason).toContain("matched an existing FRELUX regional profile");
  });

  it("country without a profile → unsupported, NO substitution ever", () => {
    const r = resolveRegionalContext({ country: "fr" }, () => null);
    expect(r.status).toBe("unsupported");
    expect(r.countryCode).toBe("FR");
    expect(r.reason).toContain("No other region's data was substituted");
  });

  it("no lookup supplied → country still resolves as unsupported", () => {
    const r = resolveRegionalContext({ country: "us" });
    expect(r.status).toBe("unsupported");
  });

  it("coordinates alone → requires_confirmation (no reverse geocoding, no guess)", () => {
    const r = resolveRegionalContext({ coordinates: { lat: 6.5, lng: 3.4 } });
    expect(r.status).toBe("requires_confirmation");
    expect(r.reason).toContain("reverse geocoding");
  });

  it("city/region without a country → requires_confirmation, never guessed", () => {
    const r = resolveRegionalContext({
      city: "Paris",
      region: "Île-de-France",
    });
    expect(r.status).toBe("requires_confirmation");
    expect(r.reason).toContain("does not guess the region");
    expect(r.reason).toContain("Paris");
  });

  it("no location at all → requires_confirmation with 'unknown' label", () => {
    const r = resolveRegionalContext({});
    expect(r.status).toBe("requires_confirmation");
    expect(r.reason).toContain("unknown");
  });
});
