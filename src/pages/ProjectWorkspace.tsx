import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, Folder, Clock, MapPin, Trash2, Edit, Archive, ArrowRight, TrendingUp, Package, DollarSign, CheckCircle2, Calendar, Sparkles } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import { useSeo } from '@/lib/seo';
import { supabase } from '@/lib/supabase';
import type { DbContractorProject } from '@/types/database';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  on_hold: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  archived: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Planning', in_progress: 'In Progress', on_hold: 'On Hold', completed: 'Completed', archived: 'Archived',
};

export default function ProjectWorkspace() {
  useSeo({ title: 'Project Workspace: Manage Your Construction Projects', description: 'Create and manage painting, screeding, tiling and finishing projects. Track progress, generate shopping lists, share estimates with clients.', canonicalPath: '/project-workspace', noIndex: true });
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<DbContractorProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', project_type: 'painting', building_type: 'residential', location: '' });
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('contractor_projects').select('*').order('updated_at', { ascending: false });
    if (statusFilter) query = query.eq('status', statusFilter);
    const { data, error } = await query;
    if (error) { toast({ title: error.message, variant: 'error' }); }
    else {
      let filtered = (data || []) as DbContractorProject[];
      if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()));
      setProjects(filtered);
    }
    setLoading(false);
  }, [user, statusFilter, search, toast]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  async function handleCreate() {
    if (!newProject.name.trim()) { toast({ title: 'Project name is required', variant: 'error' }); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.from('contractor_projects').insert({
        name: newProject.name, description: newProject.description || null,
        project_type: newProject.project_type, building_type: newProject.building_type,
        location: newProject.location || null, status: 'draft',
      }).select().single();
      if (error) throw error;
      toast({ title: 'Project created!', variant: 'success' });
      setShowCreate(false);
      setNewProject({ name: '', description: '', project_type: 'painting', building_type: 'residential', location: '' });
      navigate(`/project-workspace/${data.id}`);
    } catch (err) { toast({ title: (err as Error).message, variant: 'error' }); }
    finally { setCreating(false); }
  }

  async function handleArchive(id: string) {
    await supabase.from('contractor_projects').update({ status: 'archived' }).eq('id', id);
    toast({ title: 'Project archived', variant: 'success' });
    loadProjects();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project permanently? This cannot be undone.')) return;
    await supabase.from('contractor_projects').delete().eq('id', id);
    toast({ title: 'Project deleted', variant: 'success' });
    loadProjects();
  }

  if (!user) {
    return <div className="container mx-auto py-20 text-center text-muted-foreground">Please log in to access your project workspace.</div>;
  }

  const inputCls = 'w-full rounded-lg border bg-background px-4 py-2.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none';
  const labelCls = 'block text-sm font-medium mb-1.5 text-foreground';

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Project Workspace" subtitle="Your central hub for managing all construction and finishing projects." />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Stats row */}
        <div className="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-4">
          {[
            { icon: Folder, label: 'Total Projects', value: projects.length, color: 'text-blue-500' },
            { icon: TrendingUp, label: 'In Progress', value: projects.filter(p => p.status === 'in_progress').length, color: 'text-amber-500' },
            { icon: CheckCircle2, label: 'Completed', value: projects.filter(p => p.status === 'completed').length, color: 'text-emerald-500' },
            { icon: DollarSign, label: 'Total Value', value: '₦' + projects.reduce((s, p) => s + (p.total_project_cost || 0), 0).toLocaleString(), color: 'text-primary' },
          ].map((stat, i) => (
            <div key={i} className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <stat.icon className={`h-5 w-5 mb-2 ${stat.color} group-hover:scale-110 transition-transform`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="w-full rounded-lg border pl-10 pr-4 py-2.5 text-sm bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="rounded-lg border bg-background px-3 py-2.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/50 outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="draft">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <button onClick={() => setShowCreate(true)} className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">
            <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" /> New Project
          </button>
        </div>

        {/* Projects grid */}
        {loading && <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}

        {!loading && projects.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No projects yet. Create your first project to get started.</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105">
              <Plus className="h-4 w-4" /> Create Project
            </button>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, i) => (
              <div key={project.id} className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[project.status] || STATUS_COLORS.draft}`}>{STATUS_LABELS[project.status] || project.status}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleArchive(project.id)} className="rounded-lg p-1.5 hover:bg-muted transition-colors" title="Archive"><Archive className="h-4 w-4 text-muted-foreground" /></button>
                    <button onClick={() => handleDelete(project.id)} className="rounded-lg p-1.5 hover:bg-destructive/10 transition-colors" title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></button>
                  </div>
                </div>
                <Link to={`/project-workspace/${project.id}`} className="block">
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
                  {project.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                    <span className="inline-flex items-center gap-1 capitalize"><Package className="h-3 w-3" /> {project.project_type.replace('_', ' ')}</span>
                    {project.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {project.location}</span>}
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                  {project.total_project_cost > 0 && (
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-xs text-muted-foreground">Total Cost</span>
                      <span className="font-semibold text-sm">₦{project.total_project_cost.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                    Open Project <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
            <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ animation: 'fadeInScale 0.3s ease-out' }}>
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Create New Project</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Project Name *</label>
                  <input className={inputCls} value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} placeholder="e.g. My New House" autoFocus />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea className={inputCls} rows={2} value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} placeholder="Brief description..." />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Project Type</label>
                    <select className={inputCls} value={newProject.project_type} onChange={(e) => setNewProject({ ...newProject, project_type: e.target.value })}>
                      <option value="painting">Painting</option>
                      <option value="screeding">Screeding</option>
                      <option value="pop_ceiling">POP Ceiling</option>
                      <option value="tiling">Tiling</option>
                      <option value="multi_trade">Multi-Trade</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Building Type</label>
                    <select className={inputCls} value={newProject.building_type} onChange={(e) => setNewProject({ ...newProject, building_type: e.target.value })}>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                      <option value="renovation">Renovation</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Location (optional)</label>
                  <input className={inputCls} value={newProject.location} onChange={(e) => setNewProject({ ...newProject, location: e.target.value })} placeholder="e.g. Lagos, Nigeria" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-all">Cancel</button>
                  <button onClick={handleCreate} disabled={creating} className="group flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" /> Create</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
      </div>
    </div>
  );
}
