import { describe, it, expect } from "vitest";
import {
  boundsFor,
  distanceUnitFor,
  formatMoney,
  formatNumberFor,
  formatDistanceKm,
  haversineKm,
  isValidCoordinate,
  placeLabel,
  pointsFromJobs,
  pointsFromMaterials,
  pointsFromPros,
  sortByDistance,
  type MapPoint,
} from "@/lib/map/geo";

describe("map geo", () => {
  it("rejects coordinates that cannot be real", () => {
    expect(isValidCoordinate(6.52, 3.37)).toBe(true);
    expect(isValidCoordinate(-33.86, 151.2)).toBe(true);
    expect(isValidCoordinate(0, 0)).toBe(false); // null island
    expect(isValidCoordinate(91, 3)).toBe(false);
    expect(isValidCoordinate(6.5, 181)).toBe(false);
    expect(isValidCoordinate(null, 3)).toBe(false);
    expect(isValidCoordinate(6.5, undefined)).toBe(false);
    expect(isValidCoordinate(Number.NaN, 3)).toBe(false);
  });

  it("measures distance between two points", () => {
    // Lagos to Abuja is roughly 530 km
    const km = haversineKm(6.6054, 3.3545, 9.0765, 7.3986);
    expect(km).toBeGreaterThan(500);
    expect(km).toBeLessThan(560);
    expect(formatDistanceKm(0.4)).toBe("400 m away");
    expect(formatDistanceKm(4.23)).toBe("4.2 km away");
    expect(formatDistanceKm(42.7)).toBe("43 km away");
  });

  it("plots a professional at their listed base location", () => {
    const points = pointsFromPros([
      {
        id: "p1",
        business_name: "Ada Interiors",
        display_name: "Ada",
        slug: "ada-interiors",
        verification_status: "verified",
        rating_avg: 4.8,
        category: { name: "Tiling" },
        locations: [
          { location: { latitude: null, longitude: null } },
          {
            location: {
              latitude: 6.52,
              longitude: 3.37,
              city: "Lagos",
              state: "Lagos",
            },
          },
        ],
      },
      // No coordinates: must not appear
      {
        id: "p2",
        business_name: "Ghost Works",
        locations: [{ location: { latitude: 0, longitude: 0 } }],
      },
      // Suspended: must not appear
      {
        id: "p3",
        verification_status: "suspended",
        locations: [{ location: { latitude: 4.8, longitude: 7.0 } }],
      },
    ]);

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      id: "pro:p1",
      lat: 6.52,
      lon: 3.37,
      title: "Ada Interiors",
      meta: "Verified",
      href: "/pro-connect/ada-interiors",
      kind: "pro",
    });
    expect(points[0].subtitle).toContain("Tiling");
  });

  it("plots open jobs with bids and budget context", () => {
    const points = pointsFromJobs([
      {
        id: "j1",
        title: "Repaint 3 bedroom flat",
        project_type: "Painting",
        budget_max: 250000,
        currency: "NGN",
        bid_count: 4,
        location_city: "Ikeja",
        location_country: "Nigeria",
        latitude: 6.6,
        longitude: 3.35,
      },
      {
        id: "j2",
        title: "No location",
        latitude: null,
        longitude: null,
      },
      {
        id: "j3",
        title: "Budget only",
        budget_min: 90000,
        currency: "NGN",
        bid_count: 0,
        latitude: 9.07,
        longitude: 7.4,
      },
    ]);

    expect(points).toHaveLength(2);
    expect(points[0].meta).toBe("4 bids");
    expect(points[0].subtitle).toContain("Ikeja");
    expect(points[0].href).toBe("/marketplace/listing/j1");
    expect(points[1].meta).toContain("NGN");
  });

  it("plots material stock, preferring delivery when present", () => {
    const points = pointsFromMaterials([
      {
        id: "m1",
        title: "Portland cement 50kg",
        price: 9500,
        currency: "NGN",
        unit: "bag",
        delivery_available: true,
        location_city: "Yaba",
        latitude: 6.5,
        longitude: 3.38,
      },
      {
        id: "m2",
        title: "Emulsion paint 20L",
        price: 42000,
        currency: "NGN",
        delivery_available: false,
        latitude: 6.45,
        longitude: 3.4,
      },
    ]);

    expect(points).toHaveLength(2);
    expect(points[0].meta).toBe("Delivers");
    expect(points[1].meta).toContain("42,000");
    expect(points[1].href).toBe("/marketplace/product/m2");
  });

  it("sorts and bounds points around the viewer", () => {
    const points: MapPoint[] = [
      { id: "a", lat: 9.07, lon: 7.4, title: "Abuja", kind: "job" },
      { id: "b", lat: 6.6, lon: 3.35, title: "Lagos", kind: "job" },
      { id: "c", lat: 4.8, lon: 7.0, title: "Port Harcourt", kind: "job" },
    ];
    const sorted = sortByDistance(points, { lat: 6.6, lon: 3.35 });
    expect(sorted[0].id).toBe("b");

    const bounds = boundsFor(points);
    expect(bounds).toEqual({ west: 3.35, south: 4.8, east: 7.4, north: 9.07 });
    expect(boundsFor([])).toBeNull();
  });

  it("speaks the reader's units and number format", () => {
    expect(distanceUnitFor("en-US")).toBe("imperial");
    expect(distanceUnitFor("en-GB")).toBe("metric");
    expect(distanceUnitFor("fr-FR")).toBe("metric");
    expect(distanceUnitFor(undefined)).toBe("metric");
    expect(formatDistanceKm(16.09, "imperial")).toBe("10.0 mi away");
    expect(formatDistanceKm(16.09)).toBe("16 km away");
    expect(formatNumberFor(250000, "en-US")).toBe("250,000");
    expect(formatMoney("NGN", 250000)).toBe("NGN 250,000");
    expect(formatMoney("USD", 1200, "de-DE")).toBe("USD 1.200");
    expect(formatMoney(null, 40)).toBe("40");
  });

  it("labels a place from its parts", () => {
    expect(
      placeLabel({
        location_city: "Ikeja",
        location_state: "Lagos",
        location_country: "Nigeria",
      }),
    ).toBe("Ikeja, Lagos, Nigeria");
    expect(placeLabel({ location_city: "", location_country: "Ghana" })).toBe(
      "Ghana",
    );
  });
});
