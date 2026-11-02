/**
 * Workspace RBAC permission matrix (Engine #12 — RBAC & clearance)
 *
 * Single deterministic source of truth for what each workspace
 * role may do. The DB is the base truth for WHICH roles exist
 * (workspace_members / workspace_invitations CHECK constraints,
 * supabase/migrations/…enterprise_workspaces_rbac.sql); the
 * registry-sync test in this folder fails if the two drift.
 *
 * Rules of this module:
 *  - Unknown roles and unknown permissions are REFUSED, never
 *    guessed. Every refusal carries an honest reason.
 *  - A suspended or revoked member has NO permissions at all:
 *    the DB helper functions (is_workspace_member,
 *    get_workspace_user_role, can_manage_workspace) filter on
 *    status = 'active', so the client must too — a member row
 *    with a stale UI copy cannot be used to unlock anything.
 *  - This matrix governs the UI surface only. It is NOT the
 *    security boundary: Postgres RLS policies enforce the same
 *    role powers server-side, and a compromised client cannot
 *    grant itself anything by editing this file's output.
 *    docs/rbac-threat-model.md documents the boundary.
 */

export type WorkspaceRole =
  | "owner"
  | "project_manager"
  | "contractor"
  | "foreman"
  | "architect"
  | "quantity_surveyor"
  | "finance_officer"
  | "viewer";

/** Roles that exist as workspace_members rows (DB CHECK constraint). */
export const WORKSPACE_MEMBER_ROLES: readonly WorkspaceRole[] = [
  "owner",
  "project_manager",
  "contractor",
  "foreman",
  "architect",
  "quantity_surveyor",
  "finance_officer",
  "viewer",
];

/**
 * Roles a member can be INVITED as. 'owner' is not invitable: the
 * workspace owner is fixed at creation (DB CHECK constraint on
 * workspace_invitations.role has the same 7 values).
 */
export const INVITABLE_ROLES: readonly WorkspaceRole[] = [
  "project_manager",
  "contractor",
  "foreman",
  "architect",
  "quantity_surveyor",
  "finance_officer",
  "viewer",
];

/** Membership lifecycle states (DB CHECK constraint). */
export const MEMBER_STATUSES = ["active", "suspended", "revoked"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

/** Invitation lifecycle states (DB CHECK constraint). */
export const INVITATION_STATUSES = [
  "pending",
  "accepted",
  "revoked",
  "expired",
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/**
 * The permission catalog. Mirrors the boolean capability flags
 * historically defined on WorkspaceRoleDetails so the existing UI
 * matrix and this catalog cannot disagree (sync-tested).
 */
export const WORKSPACE_PERMISSIONS = [
  "manage_members",
  "edit_settings",
  "edit_projects",
  "delete_projects",
  "view_financials",
  "edit_financials",
  "create_estimates",
  "submit_site_logs",
  "upload_drawings",
] as const;
export type WorkspacePermission = (typeof WORKSPACE_PERMISSIONS)[number];

/**
 * Grants per role, as a plain record: auditable at a glance.
 * These mirror WORKSPACE_ROLES in src/types/workspace.ts exactly;
 * permission-matrix.test.ts pins the equivalence both ways.
 */
const GRANTS: Record<WorkspaceRole, readonly WorkspacePermission[]> = {
  owner: [
    "manage_members",
    "edit_settings",
    "edit_projects",
    "delete_projects",
    "view_financials",
    "edit_financials",
    "create_estimates",
    "submit_site_logs",
    "upload_drawings",
  ],
  project_manager: [
    "manage_members",
    "edit_projects",
    "view_financials",
    "edit_financials",
    "create_estimates",
    "submit_site_logs",
    "upload_drawings",
  ],
  contractor: [
    "edit_projects",
    "view_financials",
    "create_estimates",
    "submit_site_logs",
    "upload_drawings",
  ],
  foreman: ["submit_site_logs"],
  architect: ["upload_drawings"],
  quantity_surveyor: ["view_financials", "edit_financials", "create_estimates"],
  finance_officer: ["view_financials", "edit_financials"],
  viewer: [],
};

export interface PermissionDecision {
  allowed: boolean;
  reason: string;
}

/**
 * Pure permission check with an honest reason either way. A null /
 * undefined role (signed out, not a member, or membership not yet
 * loaded) is refused — never assumed permissive.
 */
export function can(
  role: WorkspaceRole | string | null | undefined,
  permission: WorkspacePermission,
): PermissionDecision {
  if (role == null || role === "") {
    return {
      allowed: false,
      reason: "No workspace role: sign in and be an active member of the workspace first",
    };
  }
  if (!WORKSPACE_MEMBER_ROLES.includes(role as WorkspaceRole)) {
    return {
      allowed: false,
      reason: `Unknown workspace role "${role}": refused rather than guessed`,
    };
  }
  if (!WORKSPACE_PERMISSIONS.includes(permission)) {
    return {
      allowed: false,
      reason: `Unknown permission "${permission}": refused rather than guessed`,
    };
  }
  if (GRANTS[role as WorkspaceRole].includes(permission)) {
    return { allowed: true, reason: "Granted by the workspace permission matrix" };
  }
  return {
    allowed: false,
    reason: `Role "${role}" does not include "${permission}" in this workspace`,
  };
}

/**
 * Membership status gate: even a correct role grants NOTHING unless
 * the membership is active. Mirrors the DB helper functions, which
 * all filter on status = 'active'.
 */
export function canWithStatus(
  role: WorkspaceRole | string | null | undefined,
  status: MemberStatus | string | null | undefined,
  permission: WorkspacePermission,
): PermissionDecision {
  if (status !== "active") {
    return {
      allowed: false,
      reason:
        status === "suspended" || status === "revoked"
          ? `Membership is ${status}: access is revoked until an active member with manage-members rights restores it`
          : `Membership status "${status ?? "unknown"}" is not active: access is refused`,
    };
  }
  return can(role, permission);
}

/**
 * Can this member manage OTHER members (invite, change role,
 * remove)? Server-side this is can_manage_workspace(): owner or
 * project_manager with active status. The matrix must agree —
 * sync-tested against can_manage_workspace's role list.
 */
export function canManageMembers(
  role: WorkspaceRole | string | null | undefined,
  status: MemberStatus | string | null | undefined = "active",
): boolean {
  return canWithStatus(role, status, "manage_members").allowed;
}
