import { useState, useEffect, useCallback } from 'react';
import {AdminHeader, AdminCard, AdminButton, StateMessage, AdminIconButton, AdminInput, AdminSelect} from '@/components/admin/AdminUi';
import { AdminModal } from '@/components/admin/AdminModal';
import { supabase } from '@/lib/supabase';
import type { DbTimelineTemplate, ProjectType, TimelinePhase } from "@/types/database";
import { Plus, Trash2, Edit3, Calendar } from 'lucide-react';

const PROJECT_TYPES: ProjectType[] = ['painting', 'screeding', 'pop_ceiling', 'tiling', 'multi_trade'];

export default function AdminTimelineTemplates() {
  const [templates, setTemplates] = useState<DbTimelineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbTimelineTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('timeline_templates')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) { setError(error.message); }
    else { setTemplates((data ?? []) as DbTimelineTemplate[]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    const { error } = await supabase.from('timeline_templates').delete().eq('id', id);
    if (error) { setError(error.message); return; }
    fetchTemplates();
  };

  return (
    <div>
      <AdminHeader
        title="Timeline Templates"
        subtitle="Manage project timeline phase templates for each project type"
        action={<AdminButton onClick={() => { setEditing(null); setShowForm(true); }}><Plus aria-hidden="true" className="h-4 w-4" /> Add Template</AdminButton>}
      />

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <StateMessage type="loading" title="Loading templates..." message="" />
      ) : templates.length === 0 ? (
        <StateMessage type="empty" title="No templates found" message="Create timeline templates for project types." />
      ) : (
        <div className="space-y-4">
          {templates.map(tpl => (
            <AdminCard key={tpl.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-neutral-800">{tpl.name}</h3>
                  <p className="text-xs text-neutral-500 capitalize">{tpl.project_type.replace(/_/g, ' ')}</p>
                  {tpl.description && <p className="mt-1 text-sm text-neutral-600">{tpl.description}</p>}
                </div>
                <div className="flex gap-1">
                  <AdminIconButton variant="ghost" onClick={() => { setEditing(tpl); setShowForm(true); }} ><Edit3 aria-hidden="true" className="h-4 w-4 text-neutral-500" /></AdminIconButton>
                  <AdminIconButton variant="danger" onClick={() => handleDelete(tpl.id)} ><Trash2 aria-hidden="true" className="h-4 w-4 text-red-500" /></AdminIconButton>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {tpl.phases.map((phase, i) => (
                  <div key={i} className="flex items-center gap-1 rounded-lg bg-neutral-100 px-3 py-1 text-xs">
                    <Calendar aria-hidden="true" className="h-3 w-3 text-neutral-400" />
                    <span className="font-medium">{phase.name}</span>
                    <span className="text-neutral-400 dark:text-neutral-500">{phase.days}d</span>
                  </div>
                ))}
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {showForm && (
        <TemplateForm
          template={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); fetchTemplates(); }}
        />
      )}
    </div>
  );
}

function TemplateForm({ template, onClose, onSaved }: { template: DbTimelineTemplate | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(template?.name ?? '');
  const [projectType, setProjectType] = useState<ProjectType>(template?.project_type ?? 'painting');
  const [description, setDescription] = useState(template?.description ?? '');
  const [phases, setPhases] = useState<Array<{ phase: TimelinePhase; name: string; days: number; depends_on: string }>>(
    template?.phases.map(p => ({ phase: p.phase, name: p.name, days: p.days, depends_on: p.depends_on ?? '' })) ??
    [{ phase: 'preparation' as TimelinePhase, name: 'Surface Preparation', days: 1, depends_on: '' }],
  );
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const payload = {
      name,
      project_type: projectType,
      description: description || null,
      phases: phases.map(p => ({ ...p, depends_on: p.depends_on || null })),
      is_active: true,
      sort_order: template?.sort_order ?? 0,
    };

    if (template) {
      const { error } = await supabase.from('timeline_templates').update(payload).eq('id', template.id);
      if (error) { setError(error.message); return; }
    } else {
      const { error } = await supabase.from('timeline_templates').insert(payload);
      if (error) { setError(error.message); return; }
    }
    onSaved();
  };

  return (
    <AdminModal open onClose={onClose} title={template ? 'Edit Template' : 'Add Template'} maxWidth="max-w-2xl">

        {error && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</div>}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Name</span>
              <AdminInput value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Project Type</span>
              <AdminSelect value={projectType} onChange={e => setProjectType(e.target.value as ProjectType)} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </AdminSelect>
            </label>
          </div>

          <label className="block">
            <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Description</span>
            <AdminInput value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </label>

          <div>
            <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Phases</span>
            <div className="mt-2 space-y-2">
              {phases.map((phase, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_80px_1fr_auto] gap-2">
                  <AdminInput value={phase.name} onChange={e => { const p = [...phases]; p[i] = { ...p[i], name: e.target.value }; setPhases(p); }} placeholder="Phase name" className="rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
                  <AdminSelect value={phase.phase} onChange={e => { const p = [...phases]; p[i] = { ...p[i], phase: e.target.value as 'preparation' | 'screeding' | 'pop_installation' | 'primer' | 'painting' | 'tiling' | 'drying' | 'inspection' | 'completion' }; setPhases(p); }} className="rounded-lg border border-neutral-200 px-2 py-1.5 text-sm">
                    <option value="preparation">preparation</option><option value="screeding">screeding</option><option value="pop_installation">pop_installation</option><option value="primer">primer</option><option value="painting">painting</option><option value="tiling">tiling</option><option value="drying">drying</option><option value="inspection">inspection</option><option value="completion">completion</option>
                  </AdminSelect>
                  <AdminInput type="number" value={phase.days} onChange={e => { const p = [...phases]; p[i] = { ...p[i], days: +e.target.value }; setPhases(p); }} placeholder="Days" className="rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
                  <AdminInput value={phase.depends_on ?? ""} onChange={e => { const p = [...phases]; p[i] = { ...p[i], depends_on: e.target.value }; setPhases(p); }} placeholder="Depends on (name)" className="rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
                  <AdminIconButton variant="danger" onClick={() => setPhases(phases.filter((_, j) => j !== i))} ><Trash2 aria-hidden="true" className="h-4 w-4 text-red-500" /></AdminIconButton>
                </div>
              ))}
            </div>
            <AdminButton variant="link" onClick={() => setPhases([...phases, { phase: 'preparation' as const, name: '', days: 1, depends_on: '' }])} className="mt-2"><Plus aria-hidden="true" className="h-4 w-4" /> Add Phase</AdminButton>
          </div>

          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton>
            <AdminButton onClick={handleSave}>{template ? 'Update' : 'Create'} Template</AdminButton>
          </div>
        </div>
    </AdminModal>
  );
}
