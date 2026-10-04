import { describe, it, expect } from "vitest";

describe("WeatherLocationSelect", () => {
  it("imports and exports a usable API", async () => {
    const mod = await import("@/components/ui/WeatherLocationSelect");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
    expect(Object.values(mod).some((x) => typeof x === "function")).toBe(true);
  });
});
