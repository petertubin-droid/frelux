// =========================================================
// USESYSTEMSTATUS HOOK TESTS
//
// Live status from archie-status via stage1-client, polled
// every 30s. Pinned:
//   * success → data set, loading cleared, no error
//   * null status → honest isError (never a fake healthy)
//   * thrown failure → isError
//   * refresh() re-fetches on demand
// =========================================================
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/lib/archie/stage1-client", () => ({
  fetchSystemStatus: vi.fn(),
}));

import { fetchSystemStatus } from "@/lib/archie/stage1-client";
import { useSystemStatus } from "@/hooks/useSystemStatus";

const STATUS = { ok: true, services: [] } as never;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSystemStatus", () => {
  it("starts loading, then resolves with real status data", async () => {
    vi.mocked(fetchSystemStatus).mockResolvedValue(STATUS);
    const { result } = renderHook(() => useSystemStatus());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBe(STATUS);
    expect(result.current.isError).toBe(false);
  });

  it("a null status is reported as an error — never fake healthy", async () => {
    vi.mocked(fetchSystemStatus).mockResolvedValue(null);
    const { result } = renderHook(() => useSystemStatus());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("a thrown failure sets isError without crashing the hook", async () => {
    vi.mocked(fetchSystemStatus).mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useSystemStatus());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });

  it("refresh() re-fetches the status on demand", async () => {
    vi.mocked(fetchSystemStatus).mockResolvedValue(STATUS);
    const { result } = renderHook(() => useSystemStatus());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.refresh();
    });
    expect(fetchSystemStatus).toHaveBeenCalledTimes(2);
  });

  it("polls every 30 seconds while mounted", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchSystemStatus).mockResolvedValue(STATUS);
    const { result, unmount } = renderHook(() => useSystemStatus());
    await act(async () => {});
    expect(fetchSystemStatus).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(fetchSystemStatus).toHaveBeenCalledTimes(2);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(fetchSystemStatus).toHaveBeenCalledTimes(4);
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(90_000);
    });
    expect(fetchSystemStatus).toHaveBeenCalledTimes(4); // interval cleared
  });
});
