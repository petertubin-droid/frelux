import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
  isSupabaseConfigured: true,
}));

// Mock useSearchParams with no template param
vi.mock("react-router-dom", () => ({
  useSearchParams: () => {
    const params = new URLSearchParams();
    return [params, vi.fn()];
  },
}));

import { useTemplateLoader } from "@/lib/useTemplateLoader";

describe("useTemplateLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null templateData when no template param in URL", () => {
    const { result } = renderHook(() => useTemplateLoader());
    expect(result.current.templateData).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
