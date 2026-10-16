import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listUserWorkspaces,
  getWorkspace,
  createWorkspace,
  inviteWorkspaceMember,
  getInvitationByToken,
  acceptInvitation,
  fetchProjectSiteLogs,
  createProjectSiteLog,
  removeWorkspaceMember,
  updateMemberRole,
  setMemberStatus,
  getMyMembership,
} from "./workspace-service";
import { supabase } from "@/lib/supabase";

describe("Workspace Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is unauthenticated on listUserWorkspaces", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const res = await listUserWorkspaces();
    expect(res.error).toBe("Authentication required");
    expect(res.data).toEqual([]);
  });

  it("creates workspace and automatically adds owner membership", async () => {
    const mockUser = { id: "user-123", email: "builder@frelux.com" };
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    const mockWs = {
      id: "ws-999",
      name: "Summit Construction",
      owner_id: "user-123",
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const fromSpy = vi
      .spyOn(supabase, "from")
      .mockImplementation((table: string) => {
        if (table === "workspaces") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: mockWs, error: null }),
              }),
            }),
          } as any;
        }
        if (table === "workspace_members") {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          } as any;
        }
        if (table === "workspace_activity_logs") {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          } as any;
        }
        return {} as any;
      });

    const res = await createWorkspace("Summit Construction");
    expect(res.error).toBeNull();
    expect(res.data?.id).toBe("ws-999");
    expect(res.data?.name).toBe("Summit Construction");
  });

  it("checks expiration when verifying invitation token", async () => {
    const expiredInvite = {
      id: "inv-1",
      workspace_id: "ws-1",
      email: "foreman@frelux.com",
      role: "foreman",
      token: "expired-token",
      expires_at: new Date(Date.now() - 100000).toISOString(), // expired in past
      status: "pending",
    };

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "workspace_invitations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: expiredInvite, error: null }),
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const res = await getInvitationByToken("expired-token");
    expect(res.error).toBe("This invitation has expired");
    expect(res.data).toBeNull();
  });
});

describe("Engine #12: RBAC gating of member-management mutations", () => {
  const WS = "ws-1";
  const TARGET_ID = "member-42";

  /** Mock the caller's own membership row (role + status). */
  function mockMyMembership(role: string | null, status = "active") {
    const select = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: role ? { role, status } : null,
            error: null,
          })),
        })),
      })),
    }));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "workspace_members") return { select } as never;
      throw new Error(`unexpected table ${table}`);
    });
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as any);
  }

  it("getMyMembership returns the caller's role and status", async () => {
    mockMyMembership("project_manager", "active");
    const res = await getMyMembership(WS);
    expect(res.data).toEqual({ role: "project_manager", status: "active" });
    expect(res.error).toBeNull();
  });

  it("getMyMembership refuses a non-member honestly", async () => {
    mockMyMembership(null);
    const res = await getMyMembership(WS);
    expect(res.data).toBeNull();
    expect(res.error).toContain("not a member");
  });

  it("removeWorkspaceMember refuses a signed-out caller", async () => {
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);
    const res = await removeWorkspaceMember(WS, TARGET_ID);
    expect(res.success).toBe(false);
    expect(res.error).toBe("Authentication required");
  });

  it("removeWorkspaceMember refuses a role without manage-members", async () => {
    mockMyMembership("contractor");
    const res = await removeWorkspaceMember(WS, TARGET_ID);
    expect(res.success).toBe(false);
    expect(res.error).toContain("contractor");
  });

  it("removeWorkspaceMember refuses a SUSPENDED project_manager: status beats role", async () => {
    mockMyMembership("project_manager", "suspended");
    const res = await removeWorkspaceMember(WS, TARGET_ID);
    expect(res.success).toBe(false);
    expect(res.error).toContain("suspended");
  });

  it("updateMemberRole refuses a viewer with the matrix reason", async () => {
    mockMyMembership("viewer");
    const res = await updateMemberRole(WS, TARGET_ID, "contractor");
    expect(res.success).toBe(false);
    expect(res.error).toContain("manage_members");
  });

  /**
   * Select-chain mock with a result QUEUE: each maybeSingle call pops
   * the next result. Call 1 = the caller's own membership; call 2 =
   * the mutation target. Both go through the same query shape.
   */
  function mockMemberSelectQueue(results: Array<Record<string, unknown> | null>) {
    const queue = [...results];
    return vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: queue.length > 0 ? queue.shift() ?? null : null,
            error: null,
          })),
        })),
      })),
    }));
  }

  it("setMemberStatus suspends a member and writes an audit entry", async () => {
    mockMyMembership("owner");
    let captured: Record<string, unknown> | null = null;
    const update = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    }));
    const select = mockMemberSelectQueue([
      { role: "owner", status: "active" }, // caller membership
      { role: "foreman", user_id: "user-9" }, // target
    ]);
    const insert = vi.fn(async (row: Record<string, unknown>) => {
      captured = row;
      return { error: null };
    });
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "workspace_members") {
        return { select, update } as never;
      }
      if (table === "workspace_activity_logs") return { insert } as never;
      throw new Error(`unexpected table ${table}`);
    });
    const res = await setMemberStatus(WS, TARGET_ID, "suspended");
    expect(res.success).toBe(true);
    expect(update).toHaveBeenCalled();
    // The audit trail records WHO did WHAT: actor comes from auth
    expect(captured).not.toBeNull();
    expect((captured as unknown as Record<string, unknown>)["action"]).toBe("member_suspended");
    expect((captured as unknown as Record<string, unknown>)["workspace_id"]).toBe(WS);
  });

  it("setMemberStatus refuses to suspend the OWNER member row", async () => {
    mockMyMembership("owner");
    const select = mockMemberSelectQueue([
      { role: "owner", status: "active" }, // caller membership
      { role: "owner", user_id: "user-9" }, // target: the owner row
    ]);
    const update = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    }));
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "workspace_members") return { select, update } as never;
      throw new Error(`unexpected table ${table}`);
    });
    const res = await setMemberStatus(WS, TARGET_ID, "revoked");
    expect(res.success).toBe(false);
    expect(res.error).toContain("owner cannot be suspended or revoked");
    expect(update).not.toHaveBeenCalled();
  });

  it("setMemberStatus refuses an unknown status value honestly", async () => {
    mockMyMembership("owner");
    const res = await setMemberStatus(WS, TARGET_ID, "sleepy" as never);
    // The refusal happens BEFORE any DB call: unknown status is refused
    expect(res.success).toBe(false);
  });
});
