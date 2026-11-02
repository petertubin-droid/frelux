export type WorkspaceRole =
  | "owner"
  | "project_manager"
  | "contractor"
  | "foreman"
  | "architect"
  | "quantity_surveyor"
  | "finance_officer"
  | "viewer";

export interface WorkspaceRoleDetails {
  key: WorkspaceRole;
  label: string;
  badgeColor: string;
  description: string;
  canManageMembers: boolean;
  canEditSettings: boolean;
  canEditProjects: boolean;
  canViewFinancials: boolean;
  canEditFinancials: boolean;
  canCreateEstimates: boolean;
  canSubmitSiteLogs: boolean;
  canUploadDrawings: boolean;
  canDeleteProjects: boolean;
}

export const WORKSPACE_ROLES: Record<WorkspaceRole, WorkspaceRoleDetails> = {
  owner: {
    key: "owner",
    label: "Workspace Owner",
    badgeColor:
      "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    description:
      "Full administrative and financial authority over workspace, billing, membership, and projects.",
    canManageMembers: true,
    canEditSettings: true,
    canEditProjects: true,
    canViewFinancials: true,
    canEditFinancials: true,
    canCreateEstimates: true,
    canSubmitSiteLogs: true,
    canUploadDrawings: true,
    canDeleteProjects: true,
  },
  project_manager: {
    key: "project_manager",
    label: "Project Manager",
    badgeColor:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    description:
      "Coordinates project schedules, budgets, tasks, team access, and client communications.",
    canManageMembers: true,
    canEditSettings: false,
    canEditProjects: true,
    canViewFinancials: true,
    canEditFinancials: true,
    canCreateEstimates: true,
    canSubmitSiteLogs: true,
    canUploadDrawings: true,
    canDeleteProjects: false,
  },
  contractor: {
    key: "contractor",
    label: "General Contractor",
    badgeColor:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    description:
      "Oversees site execution, trade tasks, material orders, and subcontractor coordination.",
    canManageMembers: false,
    canEditSettings: false,
    canEditProjects: true,
    canViewFinancials: true,
    canEditFinancials: false,
    canCreateEstimates: true,
    canSubmitSiteLogs: true,
    canUploadDrawings: true,
    canDeleteProjects: false,
  },
  foreman: {
    key: "foreman",
    label: "Site Foreman",
    badgeColor:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    description:
      "Field lead submitting daily site logs, material deliveries, worker counts, and site photos.",
    canManageMembers: false,
    canEditSettings: false,
    canEditProjects: false,
    canViewFinancials: false,
    canEditFinancials: false,
    canCreateEstimates: false,
    canSubmitSiteLogs: true,
    canUploadDrawings: false,
    canDeleteProjects: false,
  },
  architect: {
    key: "architect",
    label: "Architect / Designer",
    badgeColor:
      "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    description:
      "Uploads architectural blueprints, BIM/IFC models, specifications, and drawing revisions.",
    canManageMembers: false,
    canEditSettings: false,
    canEditProjects: false,
    canViewFinancials: false,
    canEditFinancials: false,
    canCreateEstimates: false,
    canSubmitSiteLogs: false,
    canUploadDrawings: true,
    canDeleteProjects: false,
  },
  quantity_surveyor: {
    key: "quantity_surveyor",
    label: "Quantity Surveyor / QS",
    badgeColor:
      "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    description:
      "Builds and audits bills of quantities (BOQ), material takeoffs, and unit cost breakdowns.",
    canManageMembers: false,
    canEditSettings: false,
    canEditProjects: false,
    canViewFinancials: true,
    canEditFinancials: true,
    canCreateEstimates: true,
    canSubmitSiteLogs: false,
    canUploadDrawings: false,
    canDeleteProjects: false,
  },
  finance_officer: {
    key: "finance_officer",
    label: "Finance / Procurement",
    badgeColor:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
    description:
      "Manages financial exports, tax calculations, supplier procurement lists, and payment records.",
    canManageMembers: false,
    canEditSettings: false,
    canEditProjects: false,
    canViewFinancials: true,
    canEditFinancials: true,
    canCreateEstimates: false,
    canSubmitSiteLogs: false,
    canUploadDrawings: false,
    canDeleteProjects: false,
  },
  viewer: {
    key: "viewer",
    label: "Viewer / Client",
    badgeColor:
      "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
    description:
      "Read-only access to authorized progress reports, calculations, and approved client summaries.",
    canManageMembers: false,
    canEditSettings: false,
    canEditProjects: false,
    canViewFinancials: false,
    canEditFinancials: false,
    canCreateEstimates: false,
    canSubmitSiteLogs: false,
    canUploadDrawings: false,
    canDeleteProjects: false,
  },
};

export function hasPermission(
  role: WorkspaceRole | null | undefined,
  permission: keyof Omit<
    WorkspaceRoleDetails,
    "key" | "label" | "badgeColor" | "description"
  >,
): boolean {
  if (!role) return false;
  const config = WORKSPACE_ROLES[role];
  if (!config) return false;
  return Boolean(config[permission]);
}

export interface Workspace {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  title: string | null;
  status: "active" | "suspended" | "revoked";
  invited_by: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  title: string | null;
  token: string;
  invited_by: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  workspace?: {
    id: string;
    name: string;
  } | null;
}

export interface MaterialUsageRecord {
  material_name: string;
  quantity: number;
  unit: string;
  purpose?: string;
  batch_number?: string;
}

export interface ProjectSiteLog {
  id: string;
  project_id: string;
  workspace_id: string | null;
  created_by: string;
  log_date: string;
  shift: "day" | "night" | "weekend";
  weather_condition: string | null;
  temperature_celsius: number | null;
  workers_count: number;
  work_performed: string;
  material_usage: MaterialUsageRecord[];
  equipment_on_site: string | null;
  safety_incidents: string | null;
  delays_issues: string | null;
  attachments: string[];
  status: "draft" | "submitted" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export interface WorkspaceActivityLog {
  id: string;
  workspace_id: string;
  project_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
