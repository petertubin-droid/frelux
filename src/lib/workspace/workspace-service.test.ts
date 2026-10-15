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
