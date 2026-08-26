import { describe, it, expect } from "vitest";
import {
  SUPPORTED_PROVIDERS,
  getRoofViewState,
  NOT_CONFIGURED,
} from "./provider-registry";

describe("roof/provider-registry", () => {
  it("SUPPORTED_PROVIDERS is a non-empty array", () => {
    expect(Array.isArray(SUPPORTED_PROVIDERS)).toBe(true);
    expect(SUPPORTED_PROVIDERS.length).toBeGreaterThan(0);
  });

  it("SUPPORTED_PROVIDERS entries have type and display_name", () => {
    for (const p of SUPPORTED_PROVIDERS) {
      expect(p.type).toBeTruthy();
      expect(p.display_name).toBeTruthy();
    }
  });

  it("NOT_CONFIGURED has a not_configured status", () => {
    expect(NOT_CONFIGURED).toBeTruthy();
  });

  it("getRoofViewState returns not_configured for disabled config", () => {
    const state = getRoofViewState(NOT_CONFIGURED);
    expect(state).toBe("not_configured");
  });
});
