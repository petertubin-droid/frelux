import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WORKSPACE_ROLES, type WorkspaceInvitation } from "@/types/workspace";
import {
  getInvitationByToken,
  acceptInvitation,
} from "@/lib/workspace/workspace-service";
import { Button } from "@/components/ui/shadcn/button";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/lib/i18n";

export default function AcceptInvitation() {
  const { t } = useLanguage();
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const { switchWorkspace, refreshWorkspaces } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState<WorkspaceInvitation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    async function verify() {
      if (!token) {
        setError("Missing invitation token");
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await getInvitationByToken(token);
      if (res.error || !res.data) {
        setError(res.error || "Invalid invitation");
      } else {
        setInvitation(res.data);
      }
      setLoading(false);
    }

    verify();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await acceptInvitation(token);
      if (res.error) {
        toast({
          title: "Failed to accept invitation",
          message: res.error,
          variant: "error",
        });
      } else {
        toast({
          title: "Welcome to the workspace!",
          message: `You have joined ${invitation?.workspace?.name || "the workspace"}.`,
          variant: "success",
        });
        await refreshWorkspaces();
        if (res.workspaceId) {
          switchWorkspace(res.workspaceId);
        }
        navigate("/project-workspace");
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">
          {t("Verifying invitation details...")}
        </p>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl border bg-card text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold">{t("Invitation Unavailable")}</h2>
          <p className="text-sm text-muted-foreground">
            {error || "This invitation link is invalid or has expired."}
          </p>
          <Button asChild className="w-full mt-4">
            <Link to="/project-workspace">{t("Return to Projects")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const roleInfo = WORKSPACE_ROLES[invitation.role];

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full p-8 rounded-2xl border bg-card shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">{t("Workspace Invitation")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("You've been invited to collaborate on FRELUX Enterprise.")}
          </p>
        </div>

        <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {t("Workspace")}
            </span>
            <span className="font-semibold text-sm">
              {invitation.workspace?.name || "Enterprise Workspace"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {t("Assigned Role")}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleInfo.badgeColor}`}
            >
              <ShieldCheck className="h-3 w-3" />
              {roleInfo.label}
            </span>
          </div>

          <div className="pt-2 border-t text-xs text-muted-foreground">
            <p className="leading-relaxed">{roleInfo.description}</p>
          </div>
        </div>

        {!user ? (
          <div className="space-y-3 text-center">
            <p className="text-xs text-muted-foreground">
              Sign in or create a free account with{" "}
              <span className="font-medium text-foreground">
                {invitation.email}
              </span>{" "}
              to accept this invitation.
            </p>
            <Button asChild className="w-full">
              <Link to={`/auth?redirect=/invite/${token}`}>
                {t("Sign In to Accept")}{" "}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  {t("Accepting...")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Accept Invitation & Join
                  Workspace
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{user.email}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
