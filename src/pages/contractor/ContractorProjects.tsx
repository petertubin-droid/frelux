import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Package,
  MoreVertical,
  Copy,
  Archive,
  RotateCcw,
  Trash2,
  ChevronRight,
  Clock,
  Users,
  Building2,
  Calendar,
  DollarSign,
} from 'lucide-react';
import {
  fetchContractorProjects,
  deleteContractorProject,
  duplicateContractorProject,
  archiveContractorProject,
  restoreContractorProject,
} from '@/lib/contractor';
import type { DbContractorProject } from '@/types/database';
import { useSeo } from '@/lib/seo';
import { getSafeError } from "@/lib/safeError";
import { Button } from "@/components/ui/shadcn/button";

// ============================================================
// Constants
// ============================================================

type ProjectStatus = DbContractorProject['status'];
type ProjectType = DbContractorProject['project_type'];

const STATUS_OPTIONS: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const TYPE_OPTIONS: { value: ProjectType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'painting', label: 'Painting' },
  { value: 'screeding', label: 'Screeding' },
  { value: 'pop_ceiling', label: 'POP Ceiling' },
  { value: 'tiling', label: 'Tiling' },
  { value: 'multi_trade', label: 'Multi-trade' },
];

const STATUS_BADGE_CLASSES: Record<ProjectStatus, string> = {
  draft: 'bg-muted text-card-foreground',
  in_progress: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  in_progress: 'In progress',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
};

const TYPE_LABELS: Record<ProjectType, string> = {
  painting: 'Painting',
  screeding: 'Screeding',
  pop_ceiling: 'POP Ceiling',
  tiling: 'Tiling',
  multi_trade: 'Multi-trade',
};

const TYPE_BADGE_CLASSES: Record<ProjectType, string> = {
  painting: 'bg-indigo-50 text-indigo-700',
  screeding: 'bg-amber-50 text-amber-700',
  pop_ceiling: 'bg-purple-50 text-purple-700',
  tiling: 'bg-teal-50 text-teal-700',
  multi_trade: 'bg-pink-50 text-pink-700',
};

// ============================================================
// Helpers
// ============================================================

function formatCurrency(value: number, symbol: string): string {
  return `${symbol}${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================================
// Component
// ============================================================

export default function ContractorProjects() {
  useSeo({ title: 'FRELUX', description: 'FRELUX', noIndex: true });
  const navigate = useNavigate();

  const [projects, setProjects] = useState<DbContractorProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ProjectType | 'all'>('all');

  // Per-card dropdown + per-card action loading
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // ---------- Data fetching ----------
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchContractorProjects();
      setProjects(data);
    } catch (err) {
      setError(getSafeError(err, 'Failed to load projects'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ---------- Close dropdown on outside click ----------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------- Derived / filtered list ----------
  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (typeFilter !== 'all' && p.project_type !== typeFilter) return false;
      if (!q) return true;
      const name = p.name.toLowerCase();
      const client = (p.client_name ?? '').toLowerCase();
      return name.includes(q) || client.includes(q);
    });
  }, [projects, search, statusFilter, typeFilter]);

  const hasActiveFilters =
    search.trim() !== '' || statusFilter !== 'all' || typeFilter !== 'all';

  // ---------- Actions ----------
  const handleOpen = (p: DbContractorProject) => {
    setOpenMenuId(null);
    navigate(`/contractor/dashboard/${p.id}`);
  };

  const handleDuplicate = useCallback(
    async (p: DbContractorProject) => {
      setOpenMenuId(null);
      setBusyId(p.id);
      try {
        await duplicateContractorProject(p.id);
        await loadProjects();
      } catch (err) {
        setError(getSafeError(err, 'Failed to duplicate project'));
      } finally {
        setBusyId(null);
      }
    },
    [loadProjects],
  );

  const handleArchive = useCallback(
    async (p: DbContractorProject) => {
      setOpenMenuId(null);
      setBusyId(p.id);
      try {
        await archiveContractorProject(p.id);
        await loadProjects();
      } catch (err) {
        setError(getSafeError(err, 'Failed to archive project'));
      } finally {
        setBusyId(null);
      }
    },
    [loadProjects],
  );

  const handleRestore = useCallback(
    async (p: DbContractorProject) => {
      setOpenMenuId(null);
      setBusyId(p.id);
      try {
        await restoreContractorProject(p.id);
        await loadProjects();
      } catch (err) {
        setError(getSafeError(err, 'Failed to restore project'));
      } finally {
        setBusyId(null);
      }
    },
    [loadProjects],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setBusyId(id);
      setConfirmDeleteId(null);
      try {
        await deleteContractorProject(id);
        await loadProjects();
      } catch (err) {
        setError(getSafeError(err, 'Failed to delete project'));
      } finally {
        setBusyId(null);
      }
    },
    [loadProjects],
  );

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ---------- Header ---------- */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your contractor estimation projects
            </p>
          </div>
          <Button
            type="button"
            onClick={() => navigate('/contractor/wizard')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-background px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-card-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* ---------- Error banner ---------- */}
        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
            <Button
              type="button"
              onClick={() => setError(null)}
              className="text-sm font-medium text-red-700 hover:text-red-800"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* ---------- Toolbar: search + filters ---------- */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project name or client…"
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
                className="w-full appearance-none rounded-lg border border-border bg-card py-2.5 pl-10 pr-8 text-sm font-medium text-card-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring sm:w-44"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ProjectType | 'all')}
              className="w-full appearance-none rounded-lg border border-border bg-card py-2.5 pl-3 pr-8 text-sm font-medium text-card-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring sm:w-40"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ---------- Content ---------- */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
              <p className="text-sm text-muted-foreground">Loading projects…</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            hasActiveFilters={hasActiveFilters}
            onCreate={() => navigate('/contractor/wizard')}
            onReset={resetFilters}
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Showing {filteredProjects.length}{' '}
              {filteredProjects.length === 1 ? 'project' : 'projects'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  busy={busyId === project.id}
                  menuOpen={openMenuId === project.id}
                  confirmDelete={confirmDeleteId === project.id}
                  onToggleMenu={() =>
                    setOpenMenuId((prev) => (prev === project.id ? null : project.id))
                  }
                  onOpen={() => handleOpen(project)}
                  onDuplicate={() => handleDuplicate(project)}
                  onArchive={() => handleArchive(project)}
                  onRestore={() => handleRestore(project)}
                  onRequestDelete={() => setConfirmDeleteId(project.id)}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                  onConfirmDelete={() => handleDelete(project.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && !busyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Delete project?</h3>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              This action cannot be undone. The project and all of its rooms, calculations,
              and associated data will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground hover:bg-muted/50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Project Card
// ============================================================

interface ProjectCardProps {
  project: DbContractorProject;
  busy: boolean;
  menuOpen: boolean;
  confirmDelete: boolean;
  onToggleMenu: () => void;
  onOpen: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

function ProjectCard({
  project,
  busy,
  menuOpen,
  confirmDelete,
  onToggleMenu,
  onOpen,
  onDuplicate,
  onArchive,
  onRestore,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: ProjectCardProps) {
  const isArchived = project.status === 'archived';
  const progress = Math.max(0, Math.min(100, project.progress_percentage ?? 0));

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:bg-card dark:border-white/5 transition hover:shadow-md">
      {/* Top row: badges + menu */}
      <div className="flex items-start justify-between px-5 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
              TYPE_BADGE_CLASSES[project.project_type],
            )}
          >
            {TYPE_LABELS[project.project_type]}
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
              STATUS_BADGE_CLASSES[project.status],
            )}
          >
            {STATUS_LABELS[project.status]}
          </span>
        </div>

        <div className="relative">
          <Button variant="ghost"
            type="button"
            onClick={onToggleMenu}
            disabled={busy}
            className="rounded-md p-1.5 text-muted-foreground transition hover:text-muted-foreground disabled:opacity-50"
            aria-label="Project actions"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
              <Button
                type="button"
                onClick={onOpen}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-card-foreground hover:bg-muted/50"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                Open
              </Button>
              <Button
                type="button"
                onClick={onDuplicate}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-card-foreground hover:bg-muted/50"
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
                Duplicate
              </Button>
              {isArchived ? (
                <Button
                  type="button"
                  onClick={onRestore}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-card-foreground hover:bg-muted/50"
                >
                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  Restore
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={onArchive}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-card-foreground hover:bg-muted/50"
                >
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  Archive
                </Button>
              )}
              <div className="my-1 border-t border-border/50" />
              <Button
                type="button"
                onClick={onRequestDelete}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Body: clickable to open */}
      <Button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col items-start px-5 pb-5 pt-3 text-left"
      >
        <h3 className="line-clamp-2 text-base font-semibold text-foreground group-hover:text-card-foreground">
          {project.name}
        </h3>

        <div className="mt-3 flex w-full flex-col gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            {project.client_name || 'No client'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {project.building_type}
          </span>
        </div>

        {/* Total cost */}
        <div className="mt-4 flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-bold text-foreground">
            {formatCurrency(project.total_project_cost ?? 0, project.currency_symbol || '₦')}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-4 w-full">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-card-foreground">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isArchived ? 'bg-muted-foreground/40' : 'bg-background',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Updated date */}
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <Calendar className="h-3.5 w-3.5" />
          Updated {formatDate(project.updated_at)}
        </div>
      </Button>

      {/* Inline delete confirmation (when toggled from menu) */}
      {confirmDelete && (
        <div className="border-t border-border/50 px-5 py-3">
          <p className="mb-2 text-xs text-muted-foreground">
            This cannot be undone. Delete this project?
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={onCancelDelete}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-muted/50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirmDelete}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Busy overlay */}
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Empty State
// ============================================================

interface EmptyStateProps {
  hasActiveFilters: boolean;
  onCreate: () => void;
  onReset: () => void;
}

function EmptyState({ hasActiveFilters, onCreate, onReset }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">
        {hasActiveFilters ? 'No projects found' : 'No projects yet'}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasActiveFilters
          ? 'Try adjusting your search or filters to find what you are looking for.'
          : 'Start by creating your first contractor estimation project.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {hasActiveFilters ? (
          <Button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground hover:bg-muted/50"
          >
            Clear filters
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-background px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-card-foreground/90"
        >
          <Plus className="h-4 w-4" />
          Create your first project
        </Button>
      </div>
    </div>
  );
}
