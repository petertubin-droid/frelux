import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "@/lib/auth";
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceRoleDetails,
} from "@/types/workspace";
import {
  listUserWorkspaces,
  listWorkspaceMembers,
  createWorkspace as apiCreateWorkspace,
} from "@/lib/workspace/workspace-service";
import { hasPermission } from "@/types/workspace";

interface WorkspaceContextValue {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  members: WorkspaceMember[];
  currentRole: WorkspaceRole | null;
  currentMember: WorkspaceMember | null;
  loading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  refreshWorkspaces: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  can: (
    permission: keyof Omit<
      WorkspaceRoleDetails,
      "key" | "label" | "badgeColor" | "description"
    >,
  ) => boolean;
  hasRole: (roles: WorkspaceRole[]) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined,
);

const ACTIVE_WS_KEY = "frelux_active_workspace_id";

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    null,
  );
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: wsError } = await listUserWorkspaces();
      if (wsError) {
        setError(wsError);
        setWorkspaces([]);
        setActiveWorkspace(null);
        return;
      }

      setWorkspaces(data);

      if (data.length > 0) {
        const savedId = localStorage.getItem(ACTIVE_WS_KEY);
        const matched = data.find((w) => w.id === savedId) || data[0];
        setActiveWorkspace(matched);
      } else {
        // Fallback: create default personal workspace if none exists
        const fallbackName = user.user_metadata?.full_name
          ? `${user.user_metadata.full_name}'s Workspace`
          : "My Enterprise Workspace";
        const { data: newWs } = await apiCreateWorkspace(fallbackName);
        if (newWs) {
          setWorkspaces([newWs]);
          setActiveWorkspace(newWs);
          localStorage.setItem(ACTIVE_WS_KEY, newWs.id);
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load workspace data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMembers = useCallback(async () => {
    if (!activeWorkspace) {
      setMembers([]);
      return;
    }
    const { data } = await listWorkspaceMembers(activeWorkspace.id);
    setMembers(data);
  }, [activeWorkspace]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      const found = workspaces.find((w) => w.id === workspaceId);
      if (found) {
        setActiveWorkspace(found);
        localStorage.setItem(ACTIVE_WS_KEY, found.id);
      }
    },
    [workspaces],
  );

  const createWorkspace = useCallback(
    async (name: string): Promise<Workspace | null> => {
      const { data, error: createErr } = await apiCreateWorkspace(name);
      if (createErr || !data) {
        setError(createErr || "Failed to create workspace");
        return null;
      }
      setWorkspaces((prev) => [...prev, data]);
      setActiveWorkspace(data);
      localStorage.setItem(ACTIVE_WS_KEY, data.id);
      return data;
    },
    [],
  );

  const currentMember = useMemo(() => {
    if (!user || !members.length) return null;
    return members.find((m) => m.user_id === user.id) || null;
  }, [user, members]);

  const currentRole = useMemo<WorkspaceRole | null>(() => {
    if (!user || !activeWorkspace) return null;
    if (activeWorkspace.owner_id === user.id) return "owner";
    return currentMember?.role || null;
  }, [user, activeWorkspace, currentMember]);

  const can = useCallback(
    (
      permission: keyof Omit<
        WorkspaceRoleDetails,
        "key" | "label" | "badgeColor" | "description"
      >,
    ) => {
      return hasPermission(currentRole, permission);
    },
    [currentRole],
  );

  const hasRole = useCallback(
    (roles: WorkspaceRole[]) => {
      if (!currentRole) return false;
      return roles.includes(currentRole);
    },
    [currentRole],
  );

  const value: WorkspaceContextValue = {
    activeWorkspace,
    workspaces,
    members,
    currentRole,
    currentMember,
    loading,
    error,
    switchWorkspace,
    createWorkspace,
    refreshWorkspaces: loadWorkspaces,
    refreshMembers: loadMembers,
    can,
    hasRole,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

const DEFAULT_WORKSPACE_CONTEXT: WorkspaceContextValue = {
  activeWorkspace: null,
  workspaces: [],
  members: [],
  currentRole: null,
  currentMember: null,
  loading: false,
  error: null,
  switchWorkspace: () => {},
  createWorkspace: async () => null,
  refreshWorkspaces: async () => {},
  refreshMembers: async () => {},
  can: () => false,
  hasRole: () => false,
};

export const useWorkspace = (): WorkspaceContextValue => {
  const context = useContext(WorkspaceContext);
  return context || DEFAULT_WORKSPACE_CONTEXT;
};
