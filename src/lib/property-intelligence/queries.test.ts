/**
 * Property Intelligence — persistence mapping tests.
 * Pure row <-> profile mapping; NULL stays undefined, never guessed.
 */

import { describe, it, expect } from "vitest";
import { rowToProfile, profileToRowInput, type PropertyRow } from "./queries";
import type { PropertyProfile, PropertyType } from "./types";

function makeRow(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    id: "p-1",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-02T00:00:00Z",
    created_by: "user-1",
    name: "Ikeja duplex",
    address: "12 Example Road",
    country: "NG",
    region: "Lagos",
    city: "Ikeja",
    district: null,
    lat: 6.6,
    lng: 3.35,
    property_type: "duplex",
    building_type: null,
    number_of_buildings: 1,
    number_of_floors: 2,
    land_size: 500,
    land_unit: "m²",
    construction_status: "completed",
    construction_project_id: null,
    documents: [],
    provenance: null,
    ...overrides,
  };
}

describe("rowToProfile", () => {
  it("maps a complete row", () => {
    const p = rowToProfile(makeRow());
    expect(p.id).toBe("p-1");
    expect(p.location.country).toBe("NG");
    expect(p.location.coordinates).toEqual({ lat: 6.6, lng: 3.35 });
    expect(p.land).toEqual({ size: 500, unit: "m²", provenance: undefined });
    expect(p.constructionStatus).toBe("completed");
  });

  it("keeps NULLs undefined — never defaults", () => {
    const p = rowToProfile(
      makeRow({
        name: null,
        country: null,
        city: null,
        lat: null,
        lng: null,
        land_size: null,
        land_unit: null,
        property_type: null,
      }),
    );
    expect(p.name).toBeUndefined();
    expect(p.location.country).toBeUndefined();
    expect(p.location.coordinates).toBeUndefined();
    expect(p.land).toBeUndefined();
    expect(p.propertyType).toBeUndefined();
  });

  it("tolerates non-array documents without crashing", () => {
    const p = rowToProfile(makeRow({ documents: null }));
    expect(p.documents).toEqual([]);
  });
});

describe("profileToRowInput", () => {
  it("maps only provided fields to snake_case columns", () => {
    const input = profileToRowInput({
      name: "Test",
      location: { country: "ng", city: "Lagos" },
      land: { size: 300, unit: "m²" },
    });
    expect(input).toEqual({
      name: "Test",
      country: "NG", // normalized to ISO-2 uppercase
      city: "Lagos",
      land_size: 300,
      land_unit: "m²",
    });
  });

  it("clears fields sent as explicit empties (editor semantics)", () => {
    const input = profileToRowInput({
      location: { city: "" },
      propertyType: "" as PropertyType,
      numberOfFloors: 0,
      land: { size: 0, unit: "" },
    });
    expect(input).toEqual({
      city: null,
      property_type: null,
      number_of_floors: null,
      land_size: null,
      land_unit: null,
    });
  });

  it("omits fields that are absent (undefined) — no stale clears", () => {
    const input = profileToRowInput({ name: undefined, location: { country: "NG" } });
    expect(input).toEqual({ country: "NG" });
  });

  it("round-trips a full profile through both mappers", () => {
    const row = makeRow();
    const profile = rowToProfile(row);
    const input = profileToRowInput({
      name: profile.name,
      location: profile.location,
      propertyType: profile.propertyType,
      numberOfFloors: profile.numberOfFloors,
      land: profile.land,
      constructionStatus: profile.constructionStatus,
    });
    expect(input.name).toBe(row.name);
    expect(input.address).toBe(row.address);
    expect(input.country).toBe(row.country);
    expect(input.lat).toBeCloseTo(row.lat!, 8);
    expect(input.land_size).toBe(row.land_size);
    expect(input.property_type).toBe(row.property_type);
  });

  it("rejects invalid country length for the input mapper via schema (checked by DB)", () => {
    // The mapper uppercases and trims; the DB CHECK enforces 2-letter format.
    const input = profileToRowInput({ location: { country: " nG " } });
    expect(input.country).toBe("NG");
  });
});
