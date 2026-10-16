import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/lib/supabase-lazy", () => ({
  isSupabaseConfigured: false,
  getSupabase: vi.fn(),
}));

const params = new URLSearchParams();

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [params, vi.fn()],
}));

import { useTemplateLoader } from "@/lib/useTemplateLoader";
import { FALLBACK_TEMPLATES } from "@/lib/template-data";

const PAINT_ID = FALLBACK_TEMPLATES.find(
  (t) => t.calculator_type === "paint",
)!.id;

describe("useTemplateLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    params.delete("template");
  });

  it("returns null templateData when no template param in URL", () => {
    const { result } = renderHook(() => useTemplateLoader());
    expect(result.current.templateData).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("resolves curated fallback templates in static (disconnected) mode", async () => {
    params.set("template", PAINT_ID);
    const { result } = renderHook(() => useTemplateLoader());
    await waitFor(() => {
      expect(result.current.templateData).not.toBeNull();
    });
    expect(result.current.templateData?.id).toBe(PAINT_ID);
    // NG default market: canonical metric input passes through in meters.
    expect(result.current.templateData?.input_data.unit).toBe("meters");
  });

  it("returns null for an unknown template id in static mode", async () => {
    params.set("template", "does-not-exist");
    const { result } = renderHook(() => useTemplateLoader());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.templateData).toBeNull();
  });
});
