import { supabase } from "@/lib/supabase";
import {
  canManageMembers as matrixCanManageMembers,
  canWithStatus,
  type MemberStatus,
} from "@/lib/rbac/permission-matrix";
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceRole,
  ProjectSiteLog,
  WorkspaceActivityLog,
} from "@/types/workspace";

export async function listUserWorkspaces(): Promise<{
  data: Workspace[];
  error: string | null;
}> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return { data: [], error: "Authentication required" };

    // Workspaces owned by user or where user is an active member
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data || []) as Workspace[], error: null };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to load workspaces";
    return { data: [], error: msg };
  }
}

export async function getWorkspace(
  workspaceId: string,
): Promise<{ data: Workspace | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: (data as Workspace) || null, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load workspace";
    return { data: null, error: msg };
  }
}

export async function createWorkspace(
  name: string,
): Promise<{ data: Workspace | null; error: string | null }> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return { data: null, error: "Authentication required" };

    const { data: ws, error: wsError } = await supabase
      .from("workspaces")
      .insert({
        name,
        owner_id: user.id,
      })
      .select()
      .single();

    if (wsError || !ws) {
      return {
        data: null,
        error: wsError?.message || "Failed to create workspace",
      };
    }

    // Automatically add owner membership
    await supabase.from("workspace_members").insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: "owner",
      status: "active",
    });

    await logWorkspaceActivity(
      ws.id,
      null,
      "workspace_created",
      "workspace",
      ws.id,
      { name },
    );

    return { data: ws as Workspace, error: null };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to create workspace";
    return { data: null, error: msg };
  }
}

export async function listWorkspaceMembers(
  workspaceId: string,
): Promise<{ data: WorkspaceMember[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("workspace_members")
      .select(
        `
        id,
        workspace_id,
        user_id,
        role,
        title,
        status,
        invited_by,
        joined_at,
        created_at,
        updated_at,
        profile:profiles(id, email, full_name, avatar_url)
      `,
      )
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .order("joined_at", { ascending: true });

    if (error) return { data: [], error: error.message };
    return { data: (data || []) as unknown as WorkspaceMember[], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load members";
    return { data: [], error: msg };
  }
}

export async function inviteWorkspaceMember(
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
  title?: string,
): Promise<{ data: WorkspaceInvitation | null; error: string | null }> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return { data: null, error: "Authentication required" };

    const cleanEmail = email.trim().toLowerCase();

    // Check if user is already an active member
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("id, profile:profiles!inner(email)")
      .eq("workspace_id", workspaceId)
      .eq("profiles.email", cleanEmail)
      .maybeSingle();

    if (existingMember) {
      return {
        data: null,
        error: "This user is already an active member of this workspace",
      };
    }

    const { data, error } = await supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email: cleanEmail,
        role,
        title: title || null,
        invited_by: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    await logWorkspaceActivity(
      workspaceId,
      null,
      "member_invited",
      "workspace_invitation",
      data.id,
      { email: cleanEmail, role },
    );

    return { data: data as WorkspaceInvitation, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to invite member";
    return { data: null, error: msg };
  }
}

export async function listWorkspaceInvitations(
  workspaceId: string,
): Promise<{ data: WorkspaceInvitation[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: (data || []) as WorkspaceInvitation[], error: null };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to load invitations";
    return { data: [], error: msg };
  }
}

export async function revokeInvitation(
  invitationId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from("workspace_invitations")
      .update({ status: "revoked" })
      .eq("id", invitationId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to revoke invitation";
    return { success: false, error: msg };
  }
}

export async function getInvitationByToken(
  token: string,
): Promise<{ data: WorkspaceInvitation | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("workspace_invitations")
      .select("*, workspace:workspaces(id, name)")
      .eq("token", token)
      .eq("status", "pending")
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data)
      return { data: null, error: "Invitation not found or no longer active" };

    if (new Date(data.expires_at).getTime() < Date.now()) {
      return { data: null, error: "This invitation has expired" };
    }

    return { data: data as unknown as WorkspaceInvitation, error: null };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to verify invitation";
    return { data: null, error: msg };
  }
}

export async function acceptInvitation(
  token: string,
): Promise<{ success: boolean; workspaceId?: string; error: string | null }> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user)
      return {
        success: false,
        error: "Please log in to accept this invitation",
      };

    const { data: invite, error: fetchErr } = await getInvitationByToken(token);
    if (fetchErr || !invite) {
      return { success: false, error: fetchErr || "Invalid invitation" };
    }

    // Insert or update member record
    const { error: memberErr } = await supabase
      .from("workspace_members")
      .upsert(
        {
          workspace_id: invite.workspace_id,
          user_id: user.id,
          role: invite.role,
          title: invite.title,
          status: "active",
          invited_by: invite.invited_by,
          joined_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,user_id" },
      );

    if (memberErr) return { success: false, error: memberErr.message };

    // Mark invitation accepted
    await supabase
      .from("workspace_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    await logWorkspaceActivity(
      invite.workspace_id,
      null,
      "member_joined",
      "workspace_member",
      user.id,
      { role: invite.role, email: invite.email },
    );

    return { success: true, workspaceId: invite.workspace_id, error: null };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to accept invitation";
    return { success: false, error: msg };
  }
}

/**
 * Engine #12 (RBAC): fetch the CALLER's own membership in a workspace.
 * Used to gate mutations with the permission matrix client-side; the
 * database RLS policies remain the hard boundary and enforce the same
 * rule list (can_manage_workspace), so a tampered client cannot
 * elevate itself — it just gets an honest refusal.
 */
export async function getMyMembership(
  workspaceId: string,
): Promise<{ data: { role: WorkspaceRole; status: MemberStatus } | null; error: string | null }> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return { data: null, error: "Authentication required" };
    const { data, error } = await supabase
      .from("workspace_members")
      .select("role, status")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: "You are not a member of this workspace" };
    return { data: { role: data.role as WorkspaceRole, status: data.status as MemberStatus }, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load membership";
    return { data: null, error: msg };
  }
}

/** Engine #12: matrix gate for member-management mutations. */
async function requireManageMembers(workspaceId: string): Promise<{ allowed: boolean; error: string | null }> {
  const { data: me, error } = await getMyMembership(workspaceId);
  if (error || !me) return { allowed: false, error: error ?? "Membership check failed" };
  const decision = canWithStatus(me.role, me.status, "manage_members");
  if (!decision.allowed) return { allowed: false, error: decision.reason };
  return { allowed: true, error: null };
}

/**
 * Engine #12 (RBAC): suspend, revoke or restore a member. The owner
 * member row cannot be suspended/revoked — it is the workspace's
 * management anchor; owner transfer is a deliberate future feature
 * and is refused honestly rather than half-supported.
 */
export async function setMemberStatus(
  workspaceId: string,
  memberId: string,
  status: MemberStatus,
): Promise<{ success: boolean; error: string | null }> {
  const gate = await requireManageMembers(workspaceId);
  if (!gate.allowed) return { success: false, error: gate.error };

  try {
    // Refuse to change the OWNER row's status
    const { data: target, error: targetErr } = await supabase
      .from("workspace_members")
      .select("role, user_id")
      .eq("id", memberId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (targetErr) return { success: false, error: targetErr.message };
    if (!target) return { success: false, error: "Member not found in this workspace" };
    if (target.role === "owner") {
      return {
        success: false,
        error: "The workspace owner cannot be suspended or revoked; owner transfer is not supported yet",
      };
    }

    const { error } = await supabase
      .from("workspace_members")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", memberId)
      .eq("workspace_id", workspaceId);

    if (error) return { success: false, error: error.message };

    await logWorkspaceActivity(
      workspaceId,
      null,
      `member_${status}`,
      "workspace_member",
      memberId,
      { newStatus: status },
    );

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update member status";
    return { success: false, error: msg };
  }
}

export async function removeWorkspaceMember(
  workspaceId: string,
  memberId: string,
): Promise<{ success: boolean; error: string | null }> {
  const gate = await requireManageMembers(workspaceId);
  if (!gate.allowed) return { success: false, error: gate.error };

  try {
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("id", memberId)
      .eq("workspace_id", workspaceId);

    if (error) return { success: false, error: error.message };

    await logWorkspaceActivity(
      workspaceId,
      null,
      "member_removed",
      "workspace_member",
      memberId,
      {},
    );

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove member";
    return { success: false, error: msg };
  }
}

export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  role: WorkspaceRole,
  title?: string,
): Promise<{ success: boolean; error: string | null }> {
  const gate = await requireManageMembers(workspaceId);
  if (!gate.allowed) return { success: false, error: gate.error };

  try {
    const { error } = await supabase
      .from("workspace_members")
      .update({
        role,
        ...(title !== undefined ? { title } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId)
      .eq("workspace_id", workspaceId);

    if (error) return { success: false, error: error.message };

    await logWorkspaceActivity(
      workspaceId,
      null,
      "role_updated",
      "workspace_member",
      memberId,
      { newRole: role, title },
    );

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update role";
    return { success: false, error: msg };
  }
}

// ----------------------------------------------------------------------------
// DAILY SITE LOGS (Field Material Usage & Mobile Logs for Foremen)
// ----------------------------------------------------------------------------

export async function fetchProjectSiteLogs(
  projectId: string,
): Promise<{ data: ProjectSiteLog[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("project_site_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("log_date", { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: (data || []) as ProjectSiteLog[], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load site logs";
    return { data: [], error: msg };
  }
}

export async function createProjectSiteLog(
  payload: Omit<
    ProjectSiteLog,
    "id" | "created_at" | "updated_at" | "approved_by" | "approved_at"
  >,
): Promise<{ data: ProjectSiteLog | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("project_site_logs")
      .insert({
        project_id: payload.project_id,
        workspace_id: payload.workspace_id,
        created_by: payload.created_by,
        log_date: payload.log_date,
        shift: payload.shift,
        weather_condition: payload.weather_condition,
        temperature_celsius: payload.temperature_celsius,
        workers_count: payload.workers_count,
        work_performed: payload.work_performed,
        material_usage: payload.material_usage,
        equipment_on_site: payload.equipment_on_site,
        safety_incidents: payload.safety_incidents,
        delays_issues: payload.delays_issues,
        attachments: payload.attachments,
        status: payload.status || "submitted",
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    if (payload.workspace_id) {
      await logWorkspaceActivity(
        payload.workspace_id,
        payload.project_id,
        "site_log_submitted",
        "project_site_log",
        data.id,
        {
          log_date: payload.log_date,
          workers_count: payload.workers_count,
          materials_count: payload.material_usage?.length || 0,
        },
      );
    }

    return { data: data as ProjectSiteLog, error: null };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to submit site log";
    return { data: null, error: msg };
  }
}

export async function updateProjectSiteLogStatus(
  logId: string,
  status: "approved" | "rejected" | "draft" | "submitted",
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;

    const { error } = await supabase
      .from("project_site_logs")
      .update({
        status,
        approved_by: status === "approved" ? user?.id : null,
        approved_at: status === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update status";
    return { success: false, error: msg };
  }
}

// ----------------------------------------------------------------------------
// WORKSPACE ACTIVITY / AUDIT LOGGING
// ----------------------------------------------------------------------------

export async function logWorkspaceActivity(
  workspaceId: string,
  projectId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const actorId = userRes?.user?.id || null;
    await supabase.from("workspace_activity_logs").insert({
      workspace_id: workspaceId,
      project_id: projectId,
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  } catch {
    // Activity logging should fail silently rather than block primary operations
  }
}

export async function fetchWorkspaceActivity(
  workspaceId: string,
  limit = 50,
): Promise<{ data: WorkspaceActivityLog[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("workspace_activity_logs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { data: [], error: error.message };
    return { data: (data || []) as WorkspaceActivityLog[], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load activity";
    return { data: [], error: msg };
  }
}
