import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/roof/provider-registry", () => ({
  getRoofViewConfig: vi.fn(async () => ({
    provider_type: "google_maps",
    enabled: false,
    api_key_configured: false,
    display_name: "No Provider Configured",
  })),
  getRoofViewState: vi.fn(
    (config: { enabled: boolean; api_key_configured: boolean }) =>
      config.enabled && config.api_key_configured
        ? "configured"
        : "not_configured",
  ),
  fetchRoofViewImagery: vi.fn(async () => ({
    available: false,
    provider_error: false,
    image_url: null,
    metadata: {},
  })),
  clearRoofViewConfigCache: vi.fn(),
}));

import { useRoofView } from "@/lib/roof/use-roof-view";

describe("useRoofView", () => {
  it("returns initial state with loadingConfig=true", () => {
    const { result } = renderHook(() => useRoofView());
    expect(result.current.loadingConfig).toBe(true);
    expect(result.current.config).toBeNull();
    expect(result.current.state).toBe("not_configured");
  });

  it("loads config on mount", async () => {
    const { result } = renderHook(() => useRoofView());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.loadingConfig).toBe(false);
    expect(result.current.config).not.toBeNull();
    expect(result.current.state).toBe("not_configured");
  });

  it("resetImagery clears imagery state", async () => {
    const { result } = renderHook(() => useRoofView());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    act(() => result.current.resetImagery());
    expect(result.current.imagery).toBeNull();
    expect(result.current.loadingImagery).toBe(false);
  });

  it("refreshConfig reloads config", async () => {
    const { result } = renderHook(() => useRoofView());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await act(async () => result.current.refreshConfig());
    expect(result.current.loadingConfig).toBe(false);
    expect(result.current.config).not.toBeNull();
  });

  it("fetchImagery sets loadingImagery then clears it", async () => {
    const { result } = renderHook(() => useRoofView());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await act(async () => {
      await result.current.fetchImagery({ lat: 6.5, lng: 3.4, zoom: 20 });
    });
    expect(result.current.loadingImagery).toBe(false);
    expect(result.current.imagery).not.toBeNull();
  });

  it("returns all expected properties", () => {
    const { result } = renderHook(() => useRoofView());
    expect(result.current).toHaveProperty("state");
    expect(result.current).toHaveProperty("config");
    expect(result.current).toHaveProperty("imagery");
    expect(result.current).toHaveProperty("loadingConfig");
    expect(result.current).toHaveProperty("loadingImagery");
    expect(result.current).toHaveProperty("fetchImagery");
    expect(result.current).toHaveProperty("resetImagery");
    expect(result.current).toHaveProperty("refreshConfig");
  });
});
