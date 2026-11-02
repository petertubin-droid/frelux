import React from "react";
import { Link } from "react-router-dom";
import {
  Users,
  ShieldCheck,
  UserPlus,
  Mail,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WORKSPACE_ROLES } from "@/types/workspace";
import type { DbContractorProject } from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

interface Props {
  project: DbContractorProject;
}

export const ProjectTeamTab: React.FC<Props> = ({ project }) => {
  const { t } = useLanguage();
  const { members, activeWorkspace, can } = useWorkspace();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Project Team & Access
            Control
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Role-based access matrix governing estimates, daily logs, financial
            visibility, and blueprint submissions for {project.name}.
          </p>
        </div>
        {can("canManageMembers") && (
          <Button asChild className="flex items-center gap-1.5">
            <Link to="/workspace-settings">
              <UserPlus className="h-4 w-4" />
              {t("Manage Team & Invite")}
            </Link>
          </Button>
        )}
      </div>

      {/* Team Members List */}
      <div className="grid gap-4 md:grid-cols-2">
        {members.map((member) => {
          const roleConfig = WORKSPACE_ROLES[member.role];
          const displayName =
            member.profile?.full_name ||
            member.profile?.email?.split("@")[0] ||
            "Team Member";

          return (
            <div
              key={member.id}
              className="p-4 rounded-xl border bg-card flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                    {displayName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm leading-tight">
                      {displayName}
                    </h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3" />
                      {member.profile?.email || "Unknown email"}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleConfig.badgeColor}`}
                >
                  <ShieldCheck className="h-3 w-3" />
                  {roleConfig.label}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                {roleConfig.description}
              </p>

              <div className="pt-2 border-t grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  {roleConfig.canEditFinancials ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground/40" />
                  )}
                  <span>{t("Financial Management")}</span>
                </div>
                <div className="flex items-center gap-1">
                  {roleConfig.canSubmitSiteLogs ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground/40" />
                  )}
                  <span>{t("Site Shift Logs")}</span>
                </div>
                <div className="flex items-center gap-1">
                  {roleConfig.canCreateEstimates ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground/40" />
                  )}
                  <span>{t("Estimate / BOQ Creation")}</span>
                </div>
                <div className="flex items-center gap-1">
                  {roleConfig.canUploadDrawings ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground/40" />
                  )}
                  <span>{t("Architectural Blueprints")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Definitions Overview */}
      <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> FRELUX Enterprise
          Role Hierarchy
        </h4>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          {Object.values(WORKSPACE_ROLES).map((r) => (
            <div key={r.key} className="p-2.5 rounded-lg border bg-card/60">
              <span className="font-semibold block">{r.label}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                {r.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
