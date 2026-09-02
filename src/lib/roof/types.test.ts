import { describe, it, expect } from "vitest";
import type { RoofViewProviderType, RoofViewState } from "@/lib/roof/types";

describe("roof types", () => {
  it("RoofViewProviderType includes expected providers", () => {
    const providers: RoofViewProviderType[] = ["google", "mapbox"];
    expect(providers).toContain("google");
    expect(providers).toContain("mapbox");
  });

  it("RoofViewState is a valid union type", () => {
    const states: RoofViewState[] = ["idle", "loading", "ready", "error"];
    expect(states).toHaveLength(4);
  });
});
