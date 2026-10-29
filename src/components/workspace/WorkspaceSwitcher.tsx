import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ChevronDown,
  Plus,
  Users,
  Settings,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WORKSPACE_ROLES } from "@/types/workspace";
import { Button } from "@/components/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/shadcn/dialog";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { useLanguage } from "@/lib/i18n";

export const WorkspaceSwitcher: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const { t } = useLanguage();
  const {
    activeWorkspace,
    workspaces,
    currentRole,
    switchWorkspace,
    createWorkspace,
  } = useWorkspace();

  const [createOpen, setCreateOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creating, setCreating] = useState(false);

  const roleInfo = currentRole ? WORKSPACE_ROLES[currentRole] : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setCreating(true);
    try {
      const created = await createWorkspace(newWsName.trim());
      if (created) {
        setNewWsName("");
        setCreateOpen(false);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 max-w-[280px] bg-card border-border hover:bg-accent text-left px-3 py-1.5 h-auto"
            >
              <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="flex flex-col text-left overflow-hidden mr-1">
                <span className="text-xs font-semibold truncate leading-tight">
                  {activeWorkspace?.name || "Select Workspace"}
                </span>
                {roleInfo && (
                  <span className="text-[10px] text-muted-foreground truncate leading-tight">
                    {roleInfo.label}
                  </span>
                )}
              </div>
              <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Workspaces ({workspaces.length})
            </DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => switchWorkspace(ws.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{ws.name}</span>
                </div>
                {ws.id === activeWorkspace?.id && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 cursor-pointer text-primary focus:text-primary"
            >
              <Plus className="h-4 w-4" />
              <span>{t("Create New Workspace")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                to="/workspace-settings"
                className="flex items-center gap-2 cursor-pointer w-full text-foreground"
              >
                <Settings className="h-4 w-4" />
                <span>{t("Workspace Settings & Team")}</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {roleInfo && (
          <span
            className={`hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleInfo.badgeColor}`}
            title={roleInfo.description}
          >
            <ShieldCheck className="h-3 w-3" />
            {roleInfo.label}
          </span>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>{t("Create Enterprise Workspace")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="ws-name">
                  {t("Workspace / Organization Name")}
                </Label>
                <Input
                  id="ws-name"
                  placeholder="e.g., Summit Construction Group"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  autoFocus
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Workspaces isolate team members, projects, daily site logs,
                  and budgets.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={creating || !newWsName.trim()}>
                {creating ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
