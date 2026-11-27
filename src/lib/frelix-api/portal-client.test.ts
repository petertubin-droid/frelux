import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserEntitlement, verifyApiPlanPayment } from "./portal-client";

// Mock supabase client from "@/lib/supabase"
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from "@/lib/supabase";

describe("portal-client getUserEntitlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when user is not authenticated", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: null,
    } as any);

    const ent = await getUserEntitlement();
    expect(ent).toBeNull();
  });

  it("returns entitlement row and marks expired when paid_until has passed", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    } as any);

    const pastDate = new Date(Date.now() - 1000000).toISOString();
    const mockRow = {
      id: "ent-1",
      user_id: "user-123",
      plan_key: "developer",
      status: "ACTIVE",
      paid_until: pastDate,
      created_date: pastDate,
      updated_at: pastDate,
    };

    const mockQueryBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder);

    const ent = await getUserEntitlement();
    expect(ent).not.toBeNull();
    expect(ent?.status).toBe("EXPIRED");
  });

  it("returns ACTIVE status when paid_until is in the future", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    } as any);

    const futureDate = new Date(Date.now() + 10000000).toISOString();
    const mockRow = {
      id: "ent-2",
      user_id: "user-123",
      plan_key: "developer",
      status: "ACTIVE",
      paid_until: futureDate,
      created_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockQueryBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder);

    const ent = await getUserEntitlement();
    expect(ent).not.toBeNull();
    expect(ent?.status).toBe("ACTIVE");
    expect(ent?.plan_key).toBe("developer");
  });
});

describe("portal-client verifyApiPlanPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success: false when invoke reports an error", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: new Error("Network timeout"),
    } as any);

    const res = await verifyApiPlanPayment("ref-failed", "developer");
    expect(res.success).toBe(false);
    expect(res.message).toContain("Network timeout");
  });

  it("returns success: false when data.status is false", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { status: false, message: "Transaction was abandoned" },
      error: null,
    } as any);

    const res = await verifyApiPlanPayment("ref-abandoned", "developer");
    expect(res.success).toBe(false);
    expect(res.message).toBe("Transaction was abandoned");
  });

  it("returns success on verified transaction", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        status: true,
        message: "API Developer plan activated successfully",
        data: { plan_key: "developer" },
      },
      error: null,
    } as any);

    const res = await verifyApiPlanPayment("ref-success", "developer");
    expect(res.success).toBe(true);
    expect(res.message).toContain("activated successfully");
  });
});
