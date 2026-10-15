import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  UserPlus,
  ShieldCheck,
  Mail,
  Copy,
  Check,
  Trash2,
  Clock,
  ArrowLeft,
  Activity,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  WORKSPACE_ROLES,
  type WorkspaceRole,
  type WorkspaceInvitation,
  type WorkspaceActivityLog,
} from "@/types/workspace";
import {
  listWorkspaceInvitations,
  inviteWorkspaceMember,
  revokeInvitation,
  removeWorkspaceMember,
  updateMemberRole,
  fetchWorkspaceActivity,
} from "@/lib/workspace/workspace-service";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/shadcn/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/shadcn/tabs";

export default function WorkspaceSettings() {
  const { user } = useAuth();
  const {
    activeWorkspace,
    workspaces,
    members,
    currentRole,
    can,
    switchWorkspace,
    refreshMembers,
  } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [activities, setActivities] = useState<WorkspaceActivityLog[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("contractor");
  const [inviteTitle, setInviteTitle] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingInvites(true);
    try {
      const { data, error } = await listWorkspaceInvitations(
        activeWorkspace.id,
      );
      if (error) {
        toast({
          title: "Failed to load invitations",
          message: error,
          variant: "error",
        });
      } else {
        setInvitations(data);
      }
    } finally {
      setLoadingInvites(false);
    }
  }, [activeWorkspace, toast]);

  const loadActivity = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingActivity(true);
    try {
      const { data, error } = await fetchWorkspaceActivity(
        activeWorkspace.id,
        40,
      );
      if (error) {
        toast({
          title: "Failed to load activity",
          message: error,
          variant: "error",
        });
      } else {
        setActivities(data);
      }
    } finally {
      setLoadingActivity(false);
    }
  }, [activeWorkspace, toast]);

  useEffect(() => {
    loadInvitations();
    loadActivity();
  }, [loadInvitations, loadActivity]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !inviteEmail.trim()) return;

    setSendingInvite(true);
    try {
      const res = await inviteWorkspaceMember(
        activeWorkspace.id,
        inviteEmail.trim(),
        inviteRole,
        inviteTitle.trim() || undefined,
      );

      if (res.error) {
        toast({
          title: "Invitation failed",
          message: res.error,
          variant: "error",
        });
      } else {
        toast({
          title: "Invitation sent successfully!",
          message: `An invite for ${inviteRole.replace("_", " ")} was created for ${inviteEmail}`,
          variant: "success",
        });
        setInviteOpen(false);
        setInviteEmail("");
        setInviteTitle("");
        await loadInvitations();
      }
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const res = await revokeInvitation(inviteId);
    if (res.error) {
      toast({
        title: "Failed to revoke invitation",
        message: res.error,
        variant: "error",
      });
    } else {
      toast({ title: "Invitation revoked", variant: "success" });
      await loadInvitations();
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail?: string) => {
    if (!activeWorkspace) return;
    if (
      !confirm(
        `Are you sure you want to remove ${memberEmail || "this member"} from the workspace?`,
      )
    ) {
      return;
    }

    const res = await removeWorkspaceMember(activeWorkspace.id, memberId);
    if (res.error) {
      toast({
        title: "Failed to remove member",
        message: res.error,
        variant: "error",
      });
    } else {
      toast({ title: "Member removed", variant: "success" });
      await refreshMembers();
    }
  };

  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    if (!activeWorkspace) return;
    const res = await updateMemberRole(activeWorkspace.id, memberId, newRole);
    if (res.error) {
      toast({
        title: "Failed to update role",
        message: res.error,
        variant: "error",
      });
    } else {
      toast({ title: "Member role updated", variant: "success" });
      await refreshMembers();
    }
  };

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    toast({ title: "Invite link copied to clipboard!", variant: "success" });
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const isManager = can("canManageMembers") || currentRole === "owner";

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">
          Please sign in to manage workspaces.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      {/* Back button and page title */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mb-4 inline-flex items-center gap-1.5 text-muted-foreground"
        >
          <Link to="/project-workspace">
            <ArrowLeft className="h-4 w-4" /> Back to Project Workspace
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" /> Workspace & Team
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enterprise team collaboration, multi-role permissions, daily site
              logs, and audit trail.
            </p>
          </div>

          {/* Workspace Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              Active:
            </span>
            <Select
              value={activeWorkspace?.id}
              onValueChange={(val) => switchWorkspace(val)}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select Workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full sm:w-[480px]">
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Team ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Invitations ({invitations.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" /> Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* TEAM MEMBERS TAB */}
        <TabsContent value="team" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Workspace Members</h3>
              <p className="text-sm text-muted-foreground">
                Collaborators with role-based access across estimates, site
                logs, and drawings.
              </p>
            </div>
            {isManager && (
              <Button
                onClick={() => setInviteOpen(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" /> Invite Member
              </Button>
            )}
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground font-semibold">
                    <th className="p-3">Member</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Permissions</th>
                    <th className="p-3">Joined</th>
                    {isManager && <th className="p-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const roleInfo = WORKSPACE_ROLES[m.role];
                    const isSelf = m.user_id === user.id;
                    const isOwner = m.role === "owner";

                    return (
                      <tr
                        key={m.id}
                        className="border-b last:border-0 hover:bg-muted/10"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                              {(
                                m.profile?.full_name ||
                                m.profile?.email ||
                                "U"
                              ).charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm leading-tight">
                                {m.profile?.full_name || "Team Member"}
                                {isSelf && (
                                  <span className="ml-1 text-[10px] text-primary font-normal">
                                    (You)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {m.profile?.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          {isManager && !isOwner && !isSelf ? (
                            <Select
                              value={m.role}
                              onValueChange={(val: WorkspaceRole) =>
                                handleRoleChange(m.id, val)
                              }
                            >
                              <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(WORKSPACE_ROLES)
                                  .filter((r) => r.key !== "owner")
                                  .map((r) => (
                                    <SelectItem
                                      key={r.key}
                                      value={r.key}
                                      className="text-xs"
                                    >
                                      {r.label}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleInfo.badgeColor}`}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              {roleInfo.label}
                            </span>
                          )}
                        </td>

                        <td className="p-3 max-w-xs">
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {roleInfo.description}
                          </p>
                        </td>

                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(m.joined_at).toLocaleDateString()}
                        </td>

                        {isManager && (
                          <td className="p-3 text-right">
                            {!isOwner && !isSelf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveMember(m.id, m.profile?.email)
                                }
                                className="text-destructive hover:bg-destructive/10 h-8 px-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* INVITATIONS TAB */}
        <TabsContent value="invitations" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Pending Invitations</h3>
              <p className="text-sm text-muted-foreground">
                Sent invitations awaiting acceptance by recipients.
              </p>
            </div>
            {isManager && (
              <Button
                onClick={() => setInviteOpen(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" /> Invite Member
              </Button>
            )}
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            {invitations.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No pending invitations for this workspace.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground font-semibold">
                      <th className="p-3">Invited Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Expires</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv) => {
                      const roleConfig = WORKSPACE_ROLES[inv.role];
                      const isExpired =
                        new Date(inv.expires_at).getTime() < Date.now();

                      return (
                        <tr
                          key={inv.id}
                          className="border-b last:border-0 hover:bg-muted/10"
                        >
                          <td className="p-3 font-medium flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {inv.email}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleConfig.badgeColor}`}
                            >
                              {roleConfig.label}
                            </span>
                          </td>
                          <td className="p-3">
                            {isExpired ? (
                              <span className="text-xs text-destructive font-medium">
                                Expired
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 font-medium">
                                Pending Acceptance
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {new Date(inv.expires_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyInviteLink(inv.token)}
                              className="h-7 text-xs inline-flex items-center gap-1"
                            >
                              {copiedToken === inv.token ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-500" />{" "}
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copy Link
                                </>
                              )}
                            </Button>
                            {isManager && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeInvite(inv.id)}
                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              >
                                Revoke
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* AUDIT TRAIL TAB */}
        <TabsContent value="audit" className="space-y-6">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Workspace Activity &
              Audit Trail
            </h3>
            <p className="text-sm text-muted-foreground">
              Immutable logging of team invitations, role changes, project
              creations, and daily site logs.
            </p>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No recorded activity events yet.
              </div>
            ) : (
              <div className="divide-y">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {act.action.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {act.entity_type}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {act.metadata && Object.keys(act.metadata).length > 0
                          ? JSON.stringify(act.metadata)
                          : "Action executed"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(act.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* INVITE MEMBER MODAL */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSendInvite}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" /> Invite Team Member
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Recipient Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="collaborator@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invite-role">Assigned Enterprise Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(val: WorkspaceRole) => setInviteRole(val)}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(WORKSPACE_ROLES)
                      .filter((r) => r.key !== "owner")
                      .map((r) => (
                        <SelectItem key={r.key} value={r.key}>
                          {r.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* Role Description Card */}
                <div className="p-3 rounded-lg border bg-muted/40 text-xs space-y-1.5 mt-1">
                  <p className="font-semibold text-foreground">
                    {WORKSPACE_ROLES[inviteRole].label}
                  </p>
                  <p className="text-muted-foreground">
                    {WORKSPACE_ROLES[inviteRole].description}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invite-title">Optional Job Title</Label>
                <Input
                  id="invite-title"
                  placeholder="e.g. Lead Structural Foreman"
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={sendingInvite}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sendingInvite || !inviteEmail.trim()}
              >
                {sendingInvite ? "Sending..." : "Create & Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
