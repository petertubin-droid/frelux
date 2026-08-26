import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2, Plus, X, Search, Plug, Puzzle, BookOpen, ShieldCheck, ToggleLeft, Activity, History, FolderTree, FolderOpen, RotateCcw } from 'lucide-react';
import { getTool } from '@/components/studio/tools';
import { ToolHeader } from '@/components/studio/StudioShared';
import { AdminCard, AdminButton, AdminField, Toggle, StateMessage } from '@/components/admin/AdminUi';
import { classNames } from '@/lib/utils';
import {
  fetchPlugins, updatePluginStatus,
  fetchPrompts, createPrompt, deletePrompt,
  fetchIntegrations, createIntegration, updateIntegration, deleteIntegration,
  fetchFeatures, updateFeature,
  fetchRoles, createRole, deleteRole,
  fetchMetrics,
  fetchArtifacts, deleteArtifact, fetchVersions, updateArtifact,
} from '@/lib/ai-studio';
import type { DbStudioPlugin, DbStudioPrompt, DbStudioIntegration, DbStudioFeature, DbStudioRole, DbStudioMetric, DbStudioArtifact, DbStudioVersion } from '@/types/database';

export default function StudioManagement() {
  const { toolSlug } = useParams<{ toolSlug: string }>();
  const tool = getTool(toolSlug ?? '');
  if (!tool) return <div className="py-20 text-center text-sm text-neutral-400">Tool not found.</div>;

  switch (toolSlug) {
    case 'plugin_manager': return <PluginManager />;
    case 'prompt_library': return <PromptLibrary />;
    case 'integration_center': return <IntegrationCenter />;
    case 'feature_management': return <FeatureManagement />;
    case 'role_management': return <RoleManagement />;
    case 'system_monitoring': return <SystemMonitoring />;
    case 'version_history': return <VersionHistory />;
    case 'project_explorer': return <ProjectExplorer />;
    case 'file_manager': return <FileManager />;
    default: return <div className="py-20 text-center text-sm text-neutral-400">Unknown tool.</div>;
  }
}

// =========================================================
// Plugin Manager
// =========================================================
function PluginManager() {
  const [plugins, setPlugins] = useState<DbStudioPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlugins().then(setPlugins).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function handleToggle(plugin: DbStudioPlugin) {
    const newStatus = plugin.status === 'enabled' ? 'disabled' : plugin.status === 'disabled' ? 'enabled' : 'installed';
    await updatePluginStatus(plugin.id, newStatus as DbStudioPlugin['status']);
    setPlugins((prev) => prev.map((p) => p.id === plugin.id ? { ...p, status: newStatus as DbStudioPlugin['status'] } : p));
  }

  async function handleInstall(plugin: DbStudioPlugin) {
    await updatePluginStatus(plugin.id, 'installed');
    setPlugins((prev) => prev.map((p) => p.id === plugin.id ? { ...p, status: 'installed', installed_at: new Date().toISOString() } : p));
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching plugins." />;
  if (error) return <StateMessage type="error" title="Error" message={error} />;

  return (
    <div>
      <ToolHeader icon={Puzzle} title="Plugin & Module Manager" description="Install, enable, and manage platform plugins and modules." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plugins.map((p) => (
          <AdminCard key={p.id} className="flex flex-col">
            <div className="flex items-start justify-between">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple"><Puzzle className="h-5 w-5" /></div>
              <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', p.status === 'enabled' ? 'bg-accent-green/15 text-accent-green' : p.status === 'installed' ? 'bg-accent-blue/15 text-accent-blue' : 'bg-neutral-100 text-neutral-500 dark:text-neutral-400')}>{p.status}</span>
            </div>
            <h3 className="mt-3 text-sm font-bold text-brand-navy dark:text-white">{p.name}</h3>
            <p className="mt-1 flex-1 text-xs text-neutral-500 dark:text-neutral-400">{p.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-neutral-400">v{p.version}{p.author && ` · ${p.author}`}</span>
              {p.is_official && <span className="rounded bg-brand-purple/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-purple">Official</span>}
            </div>
            <div className="mt-3 flex gap-2">
              {p.status === 'available' ? (
                <AdminButton onClick={() => handleInstall(p)} className="flex-1">Install</AdminButton>
              ) : (
                <div className="flex flex-1 items-center justify-between">
                  <Toggle checked={p.status === 'enabled'} onChange={() => handleToggle(p)} />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{p.status === 'enabled' ? 'Enabled' : 'Disabled'}</span>
                </div>
              )}
            </div>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}

// =========================================================
// Prompt Library
// =========================================================
function PromptLibrary() {
  const [prompts, setPrompts] = useState<DbStudioPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', category: '', system_prompt: '', user_prompt_template: '' });

  useEffect(() => {
    fetchPrompts().then(setPrompts).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    try {
      await createPrompt(formData);
      setShowForm(false);
      setFormData({ title: '', category: '', system_prompt: '', user_prompt_template: '' });
      const refreshed = await fetchPrompts();
      setPrompts(refreshed);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this prompt?')) return;
    await deletePrompt(id);
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching prompts." />;

  const categories = [...new Set(prompts.map((p) => p.category))];

  return (
    <div>
      <ToolHeader icon={BookOpen} title="Prompt Library" description="Reusable prompt templates for all AI Studio tools." />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex justify-end">
        <AdminButton onClick={() => setShowForm(!showForm)}>{showForm ? <X aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />} {showForm ? 'Cancel' : 'New Prompt'}</AdminButton>
      </div>
      {showForm && (
        <AdminCard className="mb-4">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Title"><input className="input-field" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></AdminField>
              <AdminField label="Category"><input className="input-field" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. page_builder" /></AdminField>
            </div>
            <AdminField label="System Prompt"><textarea className="input-field" rows={3} value={formData.system_prompt} onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })} /></AdminField>
            <AdminField label="User Prompt Template"><textarea className="input-field" rows={3} value={formData.user_prompt_template} onChange={(e) => setFormData({ ...formData, user_prompt_template: e.target.value })} placeholder="Use {placeholders} for variables" /></AdminField>
            <AdminButton onClick={handleCreate} disabled={!formData.title || !formData.system_prompt}>Save Prompt</AdminButton>
          </div>
        </AdminCard>
      )}
      {categories.map((cat) => (
        <div key={cat} className="mb-6">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400">{cat}</h3>
          <div className="space-y-2">
            {prompts.filter((p) => p.category === cat).map((p) => (
              <div key={p.id} className="group flex items-center justify-between rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-brand-navy dark:text-white">{p.title}</p>
                    {p.is_builtin && <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">Built in</span>}
                  </div>
                  {p.description && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{p.description}</p>}
                </div>
                {!p.is_builtin && (
                  <button type="button" onClick={() => handleDelete(p.id)} className="rounded-md p-2 text-neutral-300 hover:text-red-500"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// =========================================================
// Integration Center
// =========================================================
function IntegrationCenter() {
  const [integrations, setIntegrations] = useState<DbStudioIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', service_type: '' });

  useEffect(() => {
    fetchIntegrations().then(setIntegrations).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    try {
      await createIntegration(formData);
      setShowForm(false);
      setFormData({ name: '', service_type: '' });
      const refreshed = await fetchIntegrations();
      setIntegrations(refreshed);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
  }

  async function handleToggle(integ: DbStudioIntegration) {
    const newStatus = integ.status === 'connected' ? 'disconnected' : 'connected';
    await updateIntegration(integ.id, { status: newStatus, health_status: newStatus === 'connected' ? 'healthy' : 'unknown' });
    setIntegrations((prev) => prev.map((i) => i.id === integ.id ? { ...i, status: newStatus, health_status: newStatus === 'connected' ? 'healthy' : 'unknown' } : i));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this integration?')) return;
    await deleteIntegration(id);
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching integrations." />;

  return (
    <div>
      <ToolHeader icon={Plug} title="Integration Center" description="Manage connections to external services and APIs." />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex justify-end">
        <AdminButton onClick={() => setShowForm(!showForm)}>{showForm ? <X aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />} {showForm ? 'Cancel' : 'Add Integration'}</AdminButton>
      </div>
      {showForm && (
        <AdminCard className="mb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Name"><input className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></AdminField>
            <AdminField label="Service Type"><input className="input-field" value={formData.service_type} onChange={(e) => setFormData({ ...formData, service_type: e.target.value })} placeholder="e.g. stripe, sendgrid" /></AdminField>
          </div>
          <div className="mt-4"><AdminButton onClick={handleCreate} disabled={!formData.name}>Add</AdminButton></div>
        </AdminCard>
      )}
      <div className="space-y-3">
        {integrations.length === 0 ? (
          <StateMessage type="empty" title="No integrations" message="Add your first integration to get started." />
        ) : integrations.map((i) => (
          <div key={i.id} className="group flex items-center justify-between rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple"><Plug className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-semibold text-brand-navy dark:text-white">{i.name}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{i.service_type} · {i.health_status}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', i.status === 'connected' ? 'bg-accent-green/15 text-accent-green' : 'bg-neutral-100 text-neutral-500 dark:text-neutral-400')}>{i.status}</span>
              <Toggle checked={i.status === 'connected'} onChange={() => handleToggle(i)} />
              <button type="button" onClick={() => handleDelete(i.id)} className="rounded-md p-2 text-neutral-300 hover:text-red-500"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================
// Feature Management
// =========================================================
function FeatureManagement() {
  const [features, setFeatures] = useState<DbStudioFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatures().then(setFeatures).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function handleToggle(f: DbStudioFeature) {
    await updateFeature(f.id, { is_enabled: !f.is_enabled });
    setFeatures((prev) => prev.map((x) => x.id === f.id ? { ...x, is_enabled: !x.is_enabled } : x));
  }

  async function handleRollout(f: DbStudioFeature, pct: number) {
    await updateFeature(f.id, { rollout_percentage: pct });
    setFeatures((prev) => prev.map((x) => x.id === f.id ? { ...x, rollout_percentage: pct } : x));
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching features." />;

  return (
    <div>
      <ToolHeader icon={ToggleLeft} title="Feature Management" description="Control feature flags and rollout percentages." />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="space-y-3">
        {features.map((f) => (
          <AdminCard key={f.id} className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-brand-navy dark:text-white">{f.label}</p>
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">{f.feature_key}</code>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">{f.category}</span>
              </div>
              {f.description && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{f.description}</p>}
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-neutral-400">Rollout:</label>
                <input type="range" min={0} max={100} step={10} value={f.rollout_percentage} onChange={(e) => handleRollout(f, Number(e.target.value))} className="h-1 w-32 cursor-pointer accent-brand-purple" />
                <span className="text-xs font-semibold text-neutral-600">{f.rollout_percentage}%</span>
              </div>
            </div>
            <Toggle checked={f.is_enabled} onChange={() => handleToggle(f)} />
          </AdminCard>
        ))}
      </div>
    </div>
  );
}

// =========================================================
// Role & Permission Management
// =========================================================
function RoleManagement() {
  const [roles, setRoles] = useState<DbStudioRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ role_name: '', description: '', permissions: '' });

  useEffect(() => {
    fetchRoles().then(setRoles).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    try {
      const perms = formData.permissions.split(',').map((p) => p.trim()).filter(Boolean);
      await createRole({ role_name: formData.role_name, description: formData.description, permissions: perms });
      setShowForm(false);
      setFormData({ role_name: '', description: '', permissions: '' });
      const refreshed = await fetchRoles();
      setRoles(refreshed);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this role?')) return;
    try { await deleteRole(id); setRoles((prev) => prev.filter((r) => r.id !== id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching roles." />;

  return (
    <div>
      <ToolHeader icon={ShieldCheck} title="Role & Permission Management" description="Define roles and manage access permissions." />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mb-4 flex justify-end">
        <AdminButton onClick={() => setShowForm(!showForm)}>{showForm ? <X aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />} {showForm ? 'Cancel' : 'New Role'}</AdminButton>
      </div>
      {showForm && (
        <AdminCard className="mb-4">
          <div className="space-y-4">
            <AdminField label="Role Name"><input className="input-field" value={formData.role_name} onChange={(e) => setFormData({ ...formData, role_name: e.target.value })} /></AdminField>
            <AdminField label="Description"><input className="input-field" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></AdminField>
            <AdminField label="Permissions" hint="Comma separated, e.g. studio:*, artifacts:read"><input className="input-field" value={formData.permissions} onChange={(e) => setFormData({ ...formData, permissions: e.target.value })} /></AdminField>
            <AdminButton onClick={handleCreate} disabled={!formData.role_name}>Create Role</AdminButton>
          </div>
        </AdminCard>
      )}
      <div className="space-y-3">
        {roles.map((r) => (
          <AdminCard key={r.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-brand-navy dark:text-white">{r.role_name}</p>
                  {r.is_system && <span className="rounded bg-brand-purple/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-purple">System</span>}
                </div>
                {r.description && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{r.description}</p>}
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.permissions.map((perm, i) => (
                    <span key={i} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-mono text-neutral-600">{perm}</span>
                  ))}
                </div>
              </div>
              {!r.is_system && <button type="button" onClick={() => handleDelete(r.id)} className="rounded-md p-2 text-neutral-300 hover:text-red-500"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>}
            </div>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}

// =========================================================
// System Monitoring
// =========================================================
function SystemMonitoring() {
  const [metrics, setMetrics] = useState<DbStudioMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics(undefined, 50).then(setMetrics).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching metrics." />;

  const categories = [...new Set(metrics.map((m) => m.category))];

  return (
    <div>
      <ToolHeader icon={Activity} title="System Monitoring" description="Monitor system health, performance, and usage metrics." />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {metrics.length === 0 ? (
        <StateMessage type="empty" title="No metrics recorded" message="Metrics will appear here as the system generates them." />
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-400">{cat}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {metrics.filter((m) => m.category === cat).map((m) => (
                  <div key={m.id} className="rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-4">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{m.metric_name}</p>
                    <p className="mt-1 text-xl font-bold text-brand-navy dark:text-white">{m.metric_value.toLocaleString()}{m.unit && ` ${m.unit}`}</p>
                    <p className="mt-0.5 text-[10px] text-neutral-400">{new Date(m.recorded_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================
// Version History
// =========================================================
function VersionHistory() {
  const [artifacts, setArtifacts] = useState<DbStudioArtifact[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [versions, setVersions] = useState<DbStudioVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArtifacts().then(setArtifacts).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected) fetchVersions(selected).then(setVersions).catch(() => {});
    else setVersions([]);
  }, [selected]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this artifact and all its versions?')) return;
    await deleteArtifact(id);
    setArtifacts((prev) => prev.filter((a) => a.id !== id));
    if (selected === id) { setSelected(null); setVersions([]); }
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching artifacts." />;

  return (
    <div>
      <ToolHeader icon={History} title="Version History" description="View and restore artifact versions over time." />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2">
          {artifacts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a.id)}
              className={classNames('flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors', selected === a.id ? 'border-brand-purple bg-brand-purple/5' : 'border-neutral-200 bg-white hover:border-neutral-300')}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-navy dark:text-white">{a.title}</p>
                <p className="text-xs text-neutral-400">{a.artifact_type} · v{a.version_number}</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }} className="ml-2 text-neutral-300 hover:text-red-500"><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button>
            </button>
          ))}
        </div>
        <div>
          {selected && versions.length > 0 ? (
            <div className="space-y-3">
              {versions.map((v) => (
                <div key={v.id} className="rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-brand-navy dark:text-white">Version {v.version_number}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-400">{new Date(v.created_at).toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`Restore artifact to version ${v.version_number}?`)) return;
                          try {
                            await updateArtifact(selected, { content: v.content });
                            setArtifacts((prev) => prev.map((a) => a.id === selected ? { ...a, content: v.content, version_number: v.version_number } : a));
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-brand-purple/30 px-2.5 py-1 text-xs font-semibold text-brand-purple hover:bg-brand-purple/5"
                      >
                        <RotateCcw aria-hidden="true" className="h-3 w-3" /> Restore
                      </button>
                    </div>
                  </div>
                  {v.change_summary && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{v.change_summary}</p>}
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700 dark:text-neutral-200"><code>{v.content.slice(0, 500)}{v.content.length > 500 ? '...' : ''}</code></pre>
                </div>
              ))}
            </div>
          ) : (
            <StateMessage type="empty" title="Select an artifact" message="Choose an artifact to view its version history." />
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// Project Explorer (read-only project structure viewer)
// =========================================================
function ProjectExplorer() {
  const [tree, setTree] = useState<{ name: string; path: string; type: string; children?: unknown[] }[]>([]);

  useEffect(() => {
    // Static project structure representation
    setTree([
      { name: 'src', path: 'src', type: 'dir', children: [
        { name: 'components', path: 'src/components', type: 'dir', children: [
          { name: 'admin', path: 'src/components/admin', type: 'dir' },
          { name: 'studio', path: 'src/components/studio', type: 'dir' },
          { name: 'layout', path: 'src/components/layout', type: 'dir' },
          { name: 'home', path: 'src/components/home', type: 'dir' },
          { name: 'ui', path: 'src/components/ui', type: 'dir' },
        ]},
        { name: 'pages', path: 'src/pages', type: 'dir', children: [
          { name: 'admin', path: 'src/pages/admin', type: 'dir' },
          { name: 'studio', path: 'src/pages/studio', type: 'dir' },
          { name: 'legal', path: 'src/pages/legal', type: 'dir' },
        ]},
        { name: 'lib', path: 'src/lib', type: 'dir' },
        { name: 'types', path: 'src/types', type: 'dir' },
        { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
        { name: 'main.tsx', path: 'src/main.tsx', type: 'file' },
        { name: 'index.css', path: 'src/index.css', type: 'file' },
      ]},
      { name: 'supabase', path: 'supabase', type: 'dir', children: [
        { name: 'functions', path: 'supabase/functions', type: 'dir' },
        { name: 'migrations', path: 'supabase/migrations', type: 'dir' },
      ]},
      { name: 'public', path: 'public', type: 'dir' },
      { name: 'package.json', path: 'package.json', type: 'file' },
      { name: 'vite.config.ts', path: 'vite.config.ts', type: 'file' },
      { name: 'tailwind.config.js', path: 'tailwind.config.js', type: 'file' },
    ]);
  }, []);

  return (
    <div>
      <ToolHeader icon={FolderTree} title="Project Explorer" description="Browse the project structure and file organization." />
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-4">
        <div className="space-y-1">
          {tree.map((node) => <TreeNode key={node.path} node={node} depth={0} />)}
        </div>
      </div>
    </div>
  );
}

function TreeNode({ node, depth }: { node: { name: string; path: string; type: string; children?: unknown[] }; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const isDir = node.type === 'dir';
  const children = node.children as { name: string; path: string; type: string; children?: unknown[] }[] | undefined;

  return (
    <div>
      <button
        type="button"
        onClick={() => isDir && setOpen(!open)}
        className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-neutral-50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDir ? (
          <FolderOpen aria-hidden="true" className="h-4 w-4 text-brand-purple" />
        ) : (
          <FolderTree className="h-4 w-4 text-neutral-400" />
        )}
        <span className={isDir ? 'font-semibold text-brand-navy dark:text-white' : 'text-neutral-600'}>{node.name}</span>
      </button>
      {isDir && open && children && (
        <div>
          {children.map((child) => <TreeNode key={child.path} node={child} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

// =========================================================
// File Manager (artifact-based file management)
// =========================================================
function FileManager() {
  const [artifacts, setArtifacts] = useState<DbStudioArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchArtifacts().then(setArtifacts).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const filtered = artifacts.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()) || a.artifact_type.toLowerCase().includes(search.toLowerCase()));

  async function handleDelete(id: string) {
    if (!confirm('Delete this file?')) return;
    await deleteArtifact(id);
    setArtifacts((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching files." />;

  return (
    <div>
      <ToolHeader icon={FolderOpen} title="File Manager" description="Manage generated artifacts and project files." />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="relative mb-4 w-full sm:max-w-xs">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…" className="input-field pl-9" />
      </div>
      {filtered.length === 0 ? (
        <StateMessage type="empty" title="No files found" message="Generate artifacts using the AI tools to see them here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <div key={a.id} className="group rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-navy dark:text-white">{a.title}</p>
                  <p className="text-xs text-neutral-400">{a.artifact_type} · {a.language}</p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">{new Date(a.updated_at).toLocaleDateString()}</p>
                </div>
                <button type="button" onClick={() => handleDelete(a.id)} className="rounded-md p-1.5 text-neutral-300 opacity-0 hover:text-red-500 group-hover:opacity-100"><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
