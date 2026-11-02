/**
 * Licensed imagery connector + license tracking tests —
 * FRELUX engine-1A GIS milestone 4 (2026-10-15).
 *
 * Pins the honesty rules: unknown providers refused, satellite
 * providers require a license record, drone records require
 * name/license/capture date/template, expired licenses refused,
 * attribution and disclosure produced from the provider record.
 */

import { describe, expect, it } from "vitest";
import {
  IMAGERY_PROVIDERS,
  checkImageryLicense,
  imageryRecordDisclosure,
  imageryTileUrl,
  resolveImageryProvider,
} from "./imagery";

const NOW = new Date("2026-10-15T12:00:00Z");

const DRONE_OK = {
  name: "Site flyover",
  license_name: "Contractor survey license",
  captured_on: "2026-09-30",
  tile_url_template: "https://host/tiles/{z}/{x}/{y}.png",
  license_expires_on: null,
};

describe("resolveImageryProvider", () => {
  it("resolves every registered provider", () => {
    for (const p of IMAGERY_PROVIDERS) {
      expect(resolveImageryProvider(p.id).id).toBe(p.id);
    }
  });

  it("refuses unknown provider ids — never falls back to OSM", () => {
    expect(() => resolveImageryProvider("google-maps")).toThrow(
      /Unknown imagery provider "google-maps"/,
    );
    expect(() => resolveImageryProvider("")).toThrow(/Unknown imagery provider/);
  });

  it("every registry provider carries license + attribution + disclosure", () => {
    for (const p of IMAGERY_PROVIDERS) {
      expect(p.licenseName.length).toBeGreaterThan(0);
      expect(p.licenseUrl).toMatch(/^https:\/\//);
      expect(p.attribution.length).toBeGreaterThan(0);
      expect(p.disclosure.length).toBeGreaterThan(0);
      expect(p.tileUrlTemplate).toMatch(/\{z\}.*\{x\}.*\{y\}|\{z\}.*\{y\}.*\{x\}/);
      expect(p.maxZoom).toBeGreaterThanOrEqual(10);
    }
  });

  it("satellite providers are license-gated; OSM basemap is not", () => {
    expect(resolveImageryProvider("esri-world-imagery").requiresLicenseRecord).toBe(true);
    expect(resolveImageryProvider("osm-standard").requiresLicenseRecord).toBe(false);
  });
});

describe("imageryTileUrl", () => {
  it("builds Esri URLs in the {z}/{y}/{x} order the service requires", () => {
    expect(imageryTileUrl("esri-world-imagery", 5, 3, 7)).toBe(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/7/3",
    );
  });

  it("builds OSM URLs in {z}/{x}/{y} order", () => {
    expect(imageryTileUrl("osm-standard", 5, 3, 7)).toBe(
      "https://tile.openstreetmap.org/5/3/7.png",
    );
  });

  it("refuses out-of-grid tiles and zooms beyond the provider max", () => {
    expect(() => imageryTileUrl("osm-standard", 2, 5, 0)).toThrow(/outside the tile grid/);
    expect(() => imageryTileUrl("esri-world-imagery", 20, 0, 0)).toThrow(
      /integer in \[0, 19\]/,
    );
  });

  it("refuses unknown providers at URL-build time too", () => {
    expect(() => imageryTileUrl("made-up", 5, 3, 7)).toThrow(/Unknown imagery provider/);
  });
});

describe("checkImageryLicense", () => {
  it("OSM basemap is usable without any record", () => {
    expect(checkImageryLicense("osm-standard", null, NOW)).toEqual({ usable: true });
  });

  it("satellite imagery is refused without a registered license record", () => {
    const r = checkImageryLicense("esri-world-imagery", null, NOW);
    expect(r.usable).toBe(false);
    expect(r.reason).toMatch(/no registered imagery\/license record/i);
  });

  it("satellite imagery with a live license record is usable", () => {
    const r = checkImageryLicense("esri-world-imagery", {
      name: "Esri World Imagery",
      license_name: "Esri World Imagery usage terms",
      captured_on: null,
      tile_url_template: null,
      license_expires_on: "2027-01-01",
    }, NOW);
    expect(r.usable).toBe(true);
  });

  it("expired licenses are refused with the expiry date", () => {
    const r = checkImageryLicense("esri-world-imagery", {
      name: "Esri World Imagery",
      license_name: "Esri World Imagery usage terms",
      captured_on: null,
      tile_url_template: null,
      license_expires_on: "2026-01-01",
    }, NOW);
    expect(r.usable).toBe(false);
    expect(r.reason).toMatch(/expired on 2026-01-01/);
  });

  it("malformed expiry dates are refused", () => {
    const r = checkImageryLicense("custom", { ...DRONE_OK, license_expires_on: "soon" }, NOW);
    expect(r.usable).toBe(false);
    expect(r.reason).toMatch(/not a valid date/);
  });

  it("custom/drone imagery refuses missing name, license, capture date, template", () => {
    expect(checkImageryLicense("custom", null, NOW).reason).toMatch(/name/i);
    expect(
      checkImageryLicense("custom", { ...DRONE_OK, name: "  " }, NOW).reason,
    ).toMatch(/name/i);
    expect(
      checkImageryLicense("custom", { ...DRONE_OK, license_name: "" }, NOW).reason,
    ).toMatch(/license it is used under/i);
    expect(
      checkImageryLicense("custom", { ...DRONE_OK, captured_on: "" }, NOW).reason,
    ).toMatch(/capture date/i);
    expect(
      checkImageryLicense("custom", { ...DRONE_OK, tile_url_template: "https://host/no-vars.png" }, NOW)
        .reason,
    ).toMatch(/\{z\}/);
  });

  it("a complete drone record passes", () => {
    expect(checkImageryLicense("custom", DRONE_OK, NOW).usable).toBe(true);
  });
});

describe("imageryRecordDisclosure", () => {
  it("includes capture date, coverage, license and URL — never invented", () => {
    const d = imageryRecordDisclosure({
      id: "i1",
      project_id: "p1",
      user_id: null,
      provider_id: "custom",
      name: "Flyover",
      license_name: "Survey license",
      license_url: "https://example.com/license",
      attribution: "© Contractor",
      captured_on: "2026-09-30",
      coverage_note: "Full site, 2cm/px",
      tile_url_template: null,
      license_expires_on: null,
      notes: null,
      created_at: "2026-10-01",
    });
    expect(d).toContain("Captured 2026-09-30");
    expect(d).toContain("Coverage: Full site, 2cm/px");
    expect(d).toContain("License: Survey license");
    expect(d).toContain("https://example.com/license");
  });

  it("omits absent fields rather than writing null/undefined", () => {
    const d = imageryRecordDisclosure({
      id: "i1",
      project_id: "p1",
      user_id: null,
      provider_id: "osm-standard",
      name: "OSM",
      license_name: "ODbL",
      license_url: null,
      attribution: null,
      captured_on: null,
      coverage_note: null,
      tile_url_template: null,
      license_expires_on: null,
      notes: null,
      created_at: "2026-10-01",
    });
    expect(d).not.toContain("null");
    expect(d).not.toContain("undefined");
  });
});
