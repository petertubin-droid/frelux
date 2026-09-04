import { describe, it, expect } from "vitest";
import type { RoofViewProviderType, RoofViewState } from "@/lib/roof/types";

describe("roof types", () => {
  it("RoofViewProviderType includes expected providers", () => {
    const providers: RoofViewProviderType[] = [
      "google_maps",
      "mapbox",
      "nearmap",
      "custom",
    ];
    expect(providers).toContain("google_maps");
    expect(providers).toContain("mapbox");
  });

  it("RoofViewState is a valid union type", () => {
    const states: RoofViewState[] = [
      "not_configured",
      "configured",
      "fetching",
      "available",
      "error",
      "provider_error",
    ];
    expect(states).toHaveLength(6);
  });
});
