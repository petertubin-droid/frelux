import { describe, it, expect } from "vitest";
import {
  WORKSPACE_ROLES,
  hasPermission,
  type WorkspaceRole,
} from "./workspace";

describe("Enterprise Workspaces RBAC Matrix", () => {
  it("defines all eight required enterprise roles", () => {
    const roles: WorkspaceRole[] = [
      "owner",
      "project_manager",
      "contractor",
      "foreman",
      "architect",
      "quantity_surveyor",
      "finance_officer",
      "viewer",
    ];

    roles.forEach((role) => {
      expect(WORKSPACE_ROLES[role]).toBeDefined();
      expect(WORKSPACE_ROLES[role].key).toBe(role);
      expect(WORKSPACE_ROLES[role].label).toBeTruthy();
      expect(WORKSPACE_ROLES[role].description).toBeTruthy();
    });
  });

  it("enforces strict owner permissions", () => {
    expect(hasPermission("owner", "canManageMembers")).toBe(true);
    expect(hasPermission("owner", "canEditSettings")).toBe(true);
    expect(hasPermission("owner", "canDeleteProjects")).toBe(true);
    expect(hasPermission("owner", "canEditFinancials")).toBe(true);
    expect(hasPermission("owner", "canSubmitSiteLogs")).toBe(true);
  });

  it("enforces foreman field-only permissions", () => {
    expect(hasPermission("foreman", "canSubmitSiteLogs")).toBe(true);
    expect(hasPermission("foreman", "canManageMembers")).toBe(false);
    expect(hasPermission("foreman", "canEditSettings")).toBe(false);
    expect(hasPermission("foreman", "canDeleteProjects")).toBe(false);
    expect(hasPermission("foreman", "canEditFinancials")).toBe(false);
    expect(hasPermission("foreman", "canViewFinancials")).toBe(false);
    expect(hasPermission("foreman", "canUploadDrawings")).toBe(false);
  });

  it("enforces quantity surveyor (QS) estimation & financial permissions", () => {
    expect(hasPermission("quantity_surveyor", "canCreateEstimates")).toBe(true);
    expect(hasPermission("quantity_surveyor", "canViewFinancials")).toBe(true);
    expect(hasPermission("quantity_surveyor", "canEditFinancials")).toBe(true);
    expect(hasPermission("quantity_surveyor", "canManageMembers")).toBe(false);
    expect(hasPermission("quantity_surveyor", "canDeleteProjects")).toBe(false);
  });

  it("enforces architect drawing upload permissions", () => {
    expect(hasPermission("architect", "canUploadDrawings")).toBe(true);
    expect(hasPermission("architect", "canEditFinancials")).toBe(false);
    expect(hasPermission("architect", "canSubmitSiteLogs")).toBe(false);
    expect(hasPermission("architect", "canManageMembers")).toBe(false);
  });

  it("enforces finance officer procurement and audit permissions", () => {
    expect(hasPermission("finance_officer", "canViewFinancials")).toBe(true);
    expect(hasPermission("finance_officer", "canEditFinancials")).toBe(true);
    expect(hasPermission("finance_officer", "canSubmitSiteLogs")).toBe(false);
    expect(hasPermission("finance_officer", "canUploadDrawings")).toBe(false);
  });

  it("enforces viewer read-only access", () => {
    expect(hasPermission("viewer", "canManageMembers")).toBe(false);
    expect(hasPermission("viewer", "canEditSettings")).toBe(false);
    expect(hasPermission("viewer", "canEditProjects")).toBe(false);
    expect(hasPermission("viewer", "canViewFinancials")).toBe(false);
    expect(hasPermission("viewer", "canEditFinancials")).toBe(false);
    expect(hasPermission("viewer", "canCreateEstimates")).toBe(false);
    expect(hasPermission("viewer", "canSubmitSiteLogs")).toBe(false);
    expect(hasPermission("viewer", "canUploadDrawings")).toBe(false);
    expect(hasPermission("viewer", "canDeleteProjects")).toBe(false);
  });

  it("handles null or undefined role safely", () => {
    expect(hasPermission(null, "canManageMembers")).toBe(false);
    expect(hasPermission(undefined, "canManageMembers")).toBe(false);
  });
});
