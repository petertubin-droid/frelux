import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEstimatorDraft } from "./useEstimatorDraft";

const mockToast = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({
    toast: mockToast,
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe("useEstimatorDraft", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockToast.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves draft into localStorage on debounced state change", () => {
    const initialState = { length: 10, width: 5 };
    const { rerender } = renderHook(
      ({ state }) => useEstimatorDraft("test_calc", state, { debounceMs: 200 }),
      { initialProps: { state: initialState } },
    );

    // Initial mount doesn't overwrite if no draft
    expect(window.localStorage.getItem("frelux_draft_test_calc")).toBeNull();

    // Change state
    const nextState = { length: 20, width: 10 };
    rerender({ state: nextState });

    // Advance debounce timer
    act(() => {
      vi.advanceTimersByTime(250);
    });

    const stored = window.localStorage.getItem("frelux_draft_test_calc");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.data).toEqual({ length: 20, width: 10 });
    expect(parsed.savedAt).toBeDefined();
  });

  it("restores draft on mount and invokes onRestore and toast", () => {
    const savedPayload = {
      data: { length: 15, width: 8, projectName: "Restored Site" },
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      "frelux_draft_roof_quote",
      JSON.stringify(savedPayload),
    );

    const onRestoreMock = vi.fn();

    const { result } = renderHook(() =>
      useEstimatorDraft(
        "roof_quote",
        { length: 0, width: 0, projectName: "" },
        { onRestore: onRestoreMock, showToast: true },
      ),
    );

    expect(result.current.isRestored).toBe(true);
    expect(result.current.hasSavedDraft).toBe(true);
    expect(onRestoreMock).toHaveBeenCalledWith(savedPayload.data);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Calculation restored",
      }),
    );
  });

  it("clears draft and removes from localStorage", () => {
    window.localStorage.setItem(
      "frelux_draft_test_clear",
      JSON.stringify({ data: { a: 1 } }),
    );

    const { result } = renderHook(() =>
      useEstimatorDraft("test_clear", { a: 1 }),
    );

    act(() => {
      result.current.clearDraft();
    });

    expect(window.localStorage.getItem("frelux_draft_test_clear")).toBeNull();
    expect(result.current.hasSavedDraft).toBe(false);
    expect(result.current.isRestored).toBe(false);
  });
});
