import { describe, it, expect } from "vitest";
import {
  SUPPORTED_PROVIDERS,
  NOT_CONFIGURED,
  getRoofViewState,
  clearRoofViewConfigCache,
} from "@/lib/roof/provider-registry";

describe("SUPPORTED_PROVIDERS", () => {
  it("includes google_maps and mapbox", () => {
    const types = SUPPORTED_PROVIDERS.map((p) => p.type);
    expect(types).toContain("google_maps");
    expect(types).toContain("mapbox");
  });
  it("every provider has display_name and description", () => {
    SUPPORTED_PROVIDERS.forEach((p) => {
      expect(p.display_name).toBeTruthy();
      expect(p.description).toBeTruthy();
    });
  });
  it("every provider has settings_schema", () => {
    SUPPORTED_PROVIDERS.forEach((p) => {
      expect(p.settings_schema).toBeDefined();
      expect(Object.keys(p.settings_schema).length).toBeGreaterThan(0);
    });
  });
});

describe("NOT_CONFIGURED", () => {
  it("has enabled = false", () => expect(NOT_CONFIGURED.enabled).toBe(false));
  it("has api_key_configured = false", () =>
    expect(NOT_CONFIGURED.api_key_configured).toBe(false));
  it("has a display_name", () =>
    expect(NOT_CONFIGURED.display_name).toBeTruthy());
});

describe("getRoofViewState", () => {
  it("returns 'not_configured' when disabled", () => {
    expect(
      getRoofViewState({
        ...NOT_CONFIGURED,
        enabled: false,
        api_key_configured: true,
      }),
    ).toBe("not_configured");
  });
  it("returns 'not_configured' when api key not set", () => {
    expect(
      getRoofViewState({
        ...NOT_CONFIGURED,
        enabled: true,
        api_key_configured: false,
      }),
    ).toBe("not_configured");
  });
  it("returns 'configured' when enabled and key set", () => {
    expect(
      getRoofViewState({
        ...NOT_CONFIGURED,
        enabled: true,
        api_key_configured: true,
      }),
    ).toBe("configured");
  });
});

describe("clearRoofViewConfigCache", () => {
  it("does not throw", () => {
    expect(() => clearRoofViewConfigCache()).not.toThrow();
  });
});
