import { describe, it, expect, vi } from "vitest";
import {
  saveContractorProjectLocation,
  saveUserProjectLocation,
  locationFromProjectRow,
  locationFromPropertyRow,
  propertyFieldsFromLocation,
} from "./persistence";
import { emptyLocation } from "./model";
import type { FreluxLocation } from "./model";

// Mock the supabase client used by persistence
const updateChain = {
  eq: vi.fn().mockResolvedValue({ error: null }),
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({ update: vi.fn(() => updateChain) })),
  },
  isSupabaseConfigured: true,
}));

const goodLocation: FreluxLocation = {
  ...emptyLocation("gps"),
  latitude: 6.5,
  longitude: 3.4,
  country_code: "NG",
};

describe("project location persistence", () => {
  it("saves a valid location to contractor_projects", async () => {
    const res = await saveContractorProjectLocation("proj-1", goodLocation);
    expect(res.ok).toBe(true);
  });

  it("saves a valid location to user_projects (calculator projects)", async () => {
    const res = await saveUserProjectLocation("proj-2", goodLocation);
    expect(res.ok).toBe(true);
  });

  it("rejects invalid locations instead of persisting garbage", async () => {
    const res = await saveContractorProjectLocation("proj-1", {
      ...goodLocation,
      latitude: null,
      longitude: null,
      country_code: null,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("invalid location");
  });

  it("clears (sets null) without validation errors", async () => {
    const res = await saveContractorProjectLocation("proj-1", null);
    expect(res.ok).toBe(true);
  });
});

describe("locationFromProjectRow", () => {
  it("reads a saved canonical record back from a project row", () => {
    const row = { location: { ...goodLocation, captured_at: new Date().toISOString() } };
    const loc = locationFromProjectRow(row);
    expect(loc?.source).toBe("gps");
    expect(loc?.country_code).toBe("NG");
  });

  it("returns null for missing/invalid stored location (project reload safety)", () => {
    expect(locationFromProjectRow({})).toBeNull();
    expect(locationFromProjectRow({ location: null })).toBeNull();
    expect(locationFromProjectRow({ location: "junk" })).toBeNull();
  });
});

describe("property bridge", () => {
  it("converts a properties row into a canonical record without inventing data", () => {
    const loc = locationFromPropertyRow({
      address: "12 Ring Rd",
      country: "NG",
      region: "Oyo",
      city: "Ibadan",
      lat: 7.38,
      lng: 3.9,
    });
    expect(loc.latitude).toBe(7.38);
    expect(loc.country_code).toBe("NG");
    expect(loc.verification).toBe("user_confirmed");
    expect(loc.postcode).toBeNull();
  });

  it("round-trips a canonical location through the properties column shape", () => {
    const fields = propertyFieldsFromLocation(goodLocation);
    expect(fields.lat).toBe(6.5);
    expect(fields.country).toBe("NG");
    const back = locationFromPropertyRow(fields);
    expect(back.country_code).toBe("NG");
    expect(back.latitude).toBe(6.5);
  });

  it("handles a null canonical location", () => {
    expect(propertyFieldsFromLocation(null)).toEqual({});
  });
});
