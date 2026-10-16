/**
 * Permission matrix tests (Engine #12 — RBAC & clearance)
 *
 * Pins: the matrix refuses unknown roles/permissions instead of
 * guessing, revocation beats role, the matrix equals the
 * historical WORKSPACE_ROLES flags in both directions, and the
 * role/status registries mirror the database CHECK constraints
 * character-for-character (registry-sync, like the IoT engine).
 */

import { describe, it, expect } from "vitest";
import {
  can,
  canManageMembers,
  canWithStatus,
  INVITABLE_ROLES,
  MEMBER_STATUSES,
  INVITATION_STATUSES,
  WORKSPACE_MEMBER_ROLES,
  WORKSPACE_PERMISSIONS,
  type WorkspacePermission,
} from "./permission-matrix";
import { WORKSPACE_ROLES, type WorkspaceRole } from "@/types/workspace";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("registry sync: the matrix mirrors the database CHECK constraints", () => {
  // The migration file is the base truth for which roles/statuses exist.
  const migrationPath = resolve(
    __dirname,
    "../../../supabase/migrations/20261017000000_enterprise_workspaces_rbac.sql",
  );
  const migration = readFileSync(migrationPath, "utf8");

  it("file is the enterprise workspaces migration", () => {
    expect(migration).toContain("workspace_members");
    expect(migration).toContain("workspace_invitations");
  });

  it("member roles mirror workspace_members.role CHECK", () => {
    const m = migration.match(
      /CREATE TABLE IF NOT EXISTS public\.workspace_members[\s\S]*?CHECK \(\s*role IN \(([^)]*)\)/,
    );
    expect(m).not.toBeNull();
    const dbRoles = m![1]
      .split(",")
      .map((v) => v.trim().replace(/'/g, ""))
      .filter(Boolean);
    expect(dbRoles.sort()).toEqual([...WORKSPACE_MEMBER_ROLES].sort());
  });

  it("invitable roles mirror workspace_invitations.role CHECK (never owner)", () => {
    const m = migration.match(
      /CREATE TABLE IF NOT EXISTS public\.workspace_invitations[\s\S]*?CHECK \(\s*role IN \(([^)]*)\)/,
    );
    expect(m).not.toBeNull();
    const dbRoles = m![1]
      .split(",")
      .map((v) => v.trim().replace(/'/g, ""))
      .filter(Boolean);
    expect(dbRoles.sort()).toEqual([...INVITABLE_ROLES].sort());
    expect(dbRoles).not.toContain("owner");
  });

  it("member statuses mirror workspace_members.status CHECK", () => {
    const m = migration.match(
      /CREATE TABLE IF NOT EXISTS public\.workspace_members[\s\S]*?status IN \(([^)]*)\)/,
    );
    expect(m).not.toBeNull();
    const dbStatuses = m![1]
      .split(",")
      .map((v) => v.trim().replace(/'/g, ""))
      .filter(Boolean);
    expect(dbStatuses.sort()).toEqual([...MEMBER_STATUSES].sort());
  });

  it("invitation statuses mirror workspace_invitations.status CHECK", () => {
    const m = migration.match(
      /CREATE TABLE IF NOT EXISTS public\.workspace_invitations[\s\S]*?status IN \(([^)]*)\)/,
    );
    expect(m).not.toBeNull();
    const dbStatuses = m![1]
      .split(",")
      .map((v) => v.trim().replace(/'/g, ""))
      .filter(Boolean);
    expect(dbStatuses.sort()).toEqual([...INVITATION_STATUSES].sort());
  });

  it("manage-members matrix agrees with can_manage_workspace() (owner + project_manager only)", () => {
    const managers = WORKSPACE_MEMBER_ROLES.filter((r) =>
      canManageMembers(r, "active"),
    );
    expect(managers.sort()).toEqual(["owner", "project_manager"].sort());
    // the DB function is the server-side enforcement of the same list
    expect(migration).toContain(
      "role IN ('owner', 'project_manager')",
    );
  });
});

describe("the matrix equals the historical WORKSPACE_ROLES flags (both directions)", () => {
  const flagToPermission: Record<string, WorkspacePermission> = {
    canManageMembers: "manage_members",
    canEditSettings: "edit_settings",
    canEditProjects: "edit_projects",
    canDeleteProjects: "delete_projects",
    canViewFinancials: "view_financials",
    canEditFinancials: "edit_financials",
    canCreateEstimates: "create_estimates",
    canSubmitSiteLogs: "submit_site_logs",
    canUploadDrawings: "upload_drawings",
  };

  it("every flag matches can() for every role", () => {
    for (const role of Object.keys(WORKSPACE_ROLES) as WorkspaceRole[]) {
      for (const [flag, permission] of Object.entries(flagToPermission)) {
        const fromFlags = WORKSPACE_ROLES[role][
          flag as keyof (typeof WORKSPACE_ROLES)[typeof role]
        ] as boolean;
        const fromMatrix = can(role, permission).allowed;
        expect({ role, flag, fromFlags, fromMatrix }).toEqual({
          role,
          flag,
          fromFlags,
          fromMatrix: fromFlags,
        });
      }
    }
  });

  it("the permission catalog covers every historical flag", () => {
    expect(Object.keys(flagToPermission).length).toBe(
      WORKSPACE_PERMISSIONS.length,
    );
  });
});

describe("can(): explicit refusals, never guesses", () => {
  it("grants owner full power", () => {
    for (const p of WORKSPACE_PERMISSIONS) {
      expect(can("owner", p).allowed).toBe(true);
    }
  });

  it("viewer has no grants", () => {
    for (const p of WORKSPACE_PERMISSIONS) {
      expect(can("viewer", p).allowed).toBe(false);
    }
  });

  it("refuses an unknown role with an honest reason", () => {
    const d = can("superadmin", "edit_settings");
    expect(d.allowed).toBe(false);
    expect(d.reason).toContain("Unknown workspace role");
  });

  it("refuses an unknown permission rather than guessing", () => {
    const d = can("owner", "delete_workspace" as WorkspacePermission);
    expect(d.allowed).toBe(false);
    expect(d.reason).toContain("Unknown permission");
  });

  it("refuses a missing role (signed out / not a member)", () => {
    expect(can(null, "view_financials").allowed).toBe(false);
    expect(can(undefined, "view_financials").allowed).toBe(false);
    expect(can("", "view_financials").allowed).toBe(false);
  });

  it("every refusal states its reason", () => {
    const d = can("foreman", "edit_financials");
    expect(d.allowed).toBe(false);
    expect(d.reason).toContain("foreman");
    expect(d.reason).toContain("edit_financials");
  });
});

describe("canWithStatus(): revocation beats role", () => {
  it("an active owner keeps full power", () => {
    expect(canWithStatus("owner", "active", "manage_members").allowed).toBe(
      true,
    );
  });

  it("a suspended owner has NOTHING — status beats role", () => {
    const d = canWithStatus("owner", "suspended", "manage_members");
    expect(d.allowed).toBe(false);
    expect(d.reason).toContain("suspended");
  });

  it("a revoked member is refused for everything", () => {
    for (const p of WORKSPACE_PERMISSIONS) {
      expect(canWithStatus("owner", "revoked", p).allowed).toBe(false);
    }
  });

  it("an unknown status is refused, honestly", () => {
    const d = canWithStatus("owner", "maybe", "edit_projects");
    expect(d.allowed).toBe(false);
    expect(d.reason).toContain("not active");
  });

  it("a missing status is refused (never assumed active)", () => {
    expect(canWithStatus("owner", null, "edit_projects").allowed).toBe(false);
    expect(canWithStatus("owner", undefined, "edit_projects").allowed).toBe(
      false,
    );
  });
});

describe("canManageMembers(): the manage-members gate", () => {
  it("owner and project_manager manage members; no other role", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("project_manager")).toBe(true);
    for (const r of [
      "contractor",
      "foreman",
      "architect",
      "quantity_surveyor",
      "finance_officer",
      "viewer",
    ]) {
      expect(canManageMembers(r)).toBe(false);
    }
  });

  it("a suspended project_manager cannot manage members", () => {
    expect(canManageMembers("project_manager", "suspended")).toBe(false);
  });
});
