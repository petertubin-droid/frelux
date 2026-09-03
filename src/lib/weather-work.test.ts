import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkWeather } from "@/lib/weather-work";

describe("useWorkWeather", () => {
  it("returns initial loading state", () => {
    const { result } = renderHook(() => useWorkWeather("painting"));
    expect(result.current.loading).toBe(true);
    expect(result.current.city).toBe("Lagos");
  });

  it("returns a workRating after loading", async () => {
    const { result } = renderHook(() => useWorkWeather("painting"));
    // Wait for the effect to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(result.current.loading).toBe(false);
    expect(["good", "fair", "poor"]).toContain(result.current.workRating);
  });

  it("returns a non-empty workNote after loading", async () => {
    const { result } = renderHook(() => useWorkWeather("screeding"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(result.current.workNote).toBeTruthy();
  });

  it("returns days array after loading", async () => {
    const { result } = renderHook(() => useWorkWeather("tiling"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(result.current.days.length).toBeGreaterThan(0);
  });

  it("canWorkToday is boolean after loading", async () => {
    const { result } = renderHook(() => useWorkWeather("general"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(typeof result.current.canWorkToday).toBe("boolean");
  });

  it("sets canWorkToday false when rating is poor", async () => {
    const { result } = renderHook(() => useWorkWeather("tyrolene"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    if (result.current.workRating === "poor") {
      expect(result.current.canWorkToday).toBe(false);
    } else {
      expect(result.current.canWorkToday).toBe(true);
    }
  });

  it("returns today as first day or null", async () => {
    const { result } = renderHook(() => useWorkWeather("finishing"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(
      result.current.today === null || typeof result.current.today === "object",
    ).toBe(true);
  });
});
