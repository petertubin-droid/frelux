import { describe, expect, it } from "vitest";
import {
  IOT_CONNECTOR_DISCLOSURE,
  IOT_PROVIDER_REGISTRY,
  resolveProviderDisclosure,
} from "./iot-providers";
import { DEVICE_TYPES } from "./device-client";

describe("IOT_PROVIDER_REGISTRY integrity (engine #7 M3)", () => {
  it("every entry carries a source URL and verification date", () => {
    expect(IOT_PROVIDER_REGISTRY.length).toBeGreaterThanOrEqual(7);
    for (const p of IOT_PROVIDER_REGISTRY) {
      expect(p.sourceUrl).toMatch(/^https:\/\//);
      expect(p.verifiedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it("every entry maps to a real FRELUX device type", () => {
    for (const p of IOT_PROVIDER_REGISTRY) {
      expect(DEVICE_TYPES).toContain(p.deviceType);
    }
  });

  it("declares NOT-CONNECTED for every provider — no invented live integration", () => {
    for (const p of IOT_PROVIDER_REGISTRY) {
      expect(p.connection).toBe("not-connected");
    }
  });

  it("makes no data-ownership claims — defers to the provider's terms", () => {
    for (const p of IOT_PROVIDER_REGISTRY) {
      // capabilities and coverage come from the provider's own pages;
      // they must not assert who owns the data
      expect(p.capabilities).not.toMatch(/you own|your data belongs/i);
      expect(p.coverage).not.toMatch(/global coverage guaranteed/i);
    }
  });

  it("covers the device families the registry serves", () => {
    const types = new Set(IOT_PROVIDER_REGISTRY.map((p) => p.deviceType));
    expect(types).toContain("concrete_maturity_sensor");
    expect(types).toContain("vibration_monitor");
    expect(types).toContain("weather_station");
    expect(types).toContain("gps_tracker");
  });
});

describe("resolveProviderDisclosure (engine #7 M3)", () => {
  it("matches case-insensitively and cites the verified source", () => {
    const r = resolveProviderDisclosure("Giatec SmartRock sensor");
    expect(r.provider?.id).toBe("giatec-smartrock");
    expect(r.disclosure).toMatch(/ASTM C1074/);
    expect(r.disclosure).toMatch(/giatecscientific\.com/);
    expect(r.disclosure).toMatch(/no authorized API connection/i);
  });

  it("matches partial provider names like Micromate", () => {
    const r = resolveProviderDisclosure("instantel micromate unit 2");
    expect(r.provider?.id).toBe("instantel-micromate");
  });

  it("never invents facts for unknown providers", () => {
    const r = resolveProviderDisclosure("Acme Sensor Co");
    expect(r.provider).toBeNull();
    expect(r.disclosure).toMatch(/not in FRELUX's verified catalog/);
    expect(r.disclosure).not.toMatch(/ASTM/);
  });

  it("treats empty provider text as no-provider, not a guess", () => {
    const r1 = resolveProviderDisclosure("");
    const r2 = resolveProviderDisclosure(null);
    for (const r of [r1, r2]) {
      expect(r.provider).toBeNull();
      expect(r.disclosure).toMatch(/No provider recorded/);
    }
  });

  it("always appends the honest connector disclosure on matches", () => {
    const r = resolveProviderDisclosure("Geotab GO9");
    expect(r.disclosure).toContain(IOT_CONNECTOR_DISCLOSURE);
  });
});
