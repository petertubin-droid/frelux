import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  deviceClass,
  getSessionId,
  getVisitorId,
  resetTrafficDedupe,
  shouldTrackPath,
  trackPageView,
} from "@/lib/traffic";

const insert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(async () => ({ from: () => ({ insert }) })),
  isSupabaseConfigured: true,
}));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  insert.mockClear();
  resetTrafficDedupe();
});

describe("traffic privacy rules", () => {
  it("never measures admin or account surfaces", () => {
    expect(shouldTrackPath("/admin/analytics")).toBe(false);
    expect(shouldTrackPath("/admin")).toBe(false);
    expect(shouldTrackPath("/my-projects")).toBe(false);
    expect(shouldTrackPath("/login")).toBe(false);
    expect(shouldTrackPath("/calculators/paint")).toBe(true);
    expect(shouldTrackPath("/")).toBe(true);
  });

  it("keeps a stable visitor id across reads", () => {
    const first = getVisitorId();
    expect(first).toBeTruthy();
    expect(getVisitorId()).toBe(first);
  });

  it("keeps one session id inside the activity window", () => {
    const first = getSessionId();
    expect(first).toBeTruthy();
    expect(getSessionId()).toBe(first);
  });

  it("classifies the device without user agents when width decides", () => {
    expect(["mobile", "tablet", "desktop"]).toContain(deviceClass());
  });
});

describe("trackPageView", () => {
  it("records one page view with source and device metadata", async () => {
    await trackPageView("/estimators/paint");
    expect(insert).toHaveBeenCalledTimes(1);
    const payload = insert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.event).toBe("page_view");
    expect(payload.page_path).toBe("/estimators/paint");
    expect(payload.visitor_id).toBeTruthy();
    expect(payload.session_id).toBeTruthy();
    expect(payload.referrer).toBeTruthy();
    expect(["mobile", "tablet", "desktop"]).toContain(payload.device);
  });

  it("ignores admin navigation", async () => {
    await trackPageView("/admin/settings");
    expect(insert).not.toHaveBeenCalled();
  });

  it("collapses duplicate views of the same path", async () => {
    await trackPageView("/marketplace");
    await trackPageView("/marketplace");
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
