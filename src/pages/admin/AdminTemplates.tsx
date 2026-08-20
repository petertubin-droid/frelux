import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Edit2, Trash2, Copy, Star, Eye, EyeOff, Save, X, Search, ChevronDown } from 'lucide-react';
import {
  adminGetAllTemplates,
  adminCreateTemplate,
  adminUpdateTemplate,
  adminDeleteTemplate,
  calculatorLabel,
} from '@/lib/templates';
import { useToast } from '@/components/ui/Toast';
import type { DbCalculatorTemplate, CalculatorType } from '@/types/database';
import { classNames } from '@/lib/utils';

const CALC_TYPES: CalculatorType[] = ['paint', 'tile', 'pop', 'screeding'];

export default function AdminTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<DbCalculatorTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DbCalculatorTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetAllTemplates();
      setTemplates(data);
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : 'Failed to load templates' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = templates.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.slug ?? '').includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      await adminDeleteTemplate(id);
      toast({ type: 'success', title: 'Template deleted' });
      await load();
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : 'Delete failed' });
    }
  };

  const handleDuplicate = async (t: DbCalculatorTemplate) => {
    try {
      await adminCreateTemplate({
        calculator_type: t.calculator_type,
        name: `${t.name} (Copy)`,
        description: t.description ?? undefined,
        input_data: t.input_data,
        is_published: false,
        is_featured: false,
      });
      toast({ type: 'success', title: 'Template duplicated' });
      await load();
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : 'Duplicate failed' });
    }
  };

  const togglePublished = async (t: DbCalculatorTemplate) => {
    try {
      await adminUpdateTemplate(t.id, { is_published: !t.is_published });
      toast({ type: 'success', title: t.is_published ? 'Unpublished' : 'Published' });
      await load();
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : 'Update failed' });
    }
  };

  const toggleFeatured = async (t: DbCalculatorTemplate) => {
    try {
      await adminUpdateTemplate(t.id, { is_featured: !t.is_featured });
      await load();
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : 'Update failed' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Calculator Templates</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Manage public FRELUX templates and user-submitted templates.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-white/5">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
              {filtered.map((t) => (
                <tr key={t.id} className="bg-white dark:bg-transparent">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900 dark:text-white">{t.name}</div>
                    {t.description && <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">{t.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-brand-purple/8 px-2 py-0.5 text-xs font-medium text-brand-purple dark:bg-brand-purple/15 dark:text-brand-purple-lighter">
                      {calculatorLabel(t.calculator_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{t.visibility}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => togglePublished(t)} className={classNames('rounded-md p-1', t.is_published ? 'text-green-500' : 'text-neutral-300 dark:text-neutral-600')}>
                      {t.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleFeatured(t)}>
                      <Star className={classNames('h-4 w-4', t.is_featured ? 'text-amber-500' : 'text-neutral-300 dark:text-neutral-600')} fill={t.is_featured ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{t.slug ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(t)} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5 dark:hover:text-white" title="Edit">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDuplicate(t)} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5 dark:hover:text-white" title="Duplicate">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">No templates found.</div>
          )}
        </div>
      )}

      {/* Edit/Create modal */}
      {(editing || creating) && (
        <TemplateEditor
          template={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={async () => { setEditing(null); setCreating(false); await load(); }}
        />
      )}
    </div>
  );
}

interface TemplateEditorProps {
  template: DbCalculatorTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

function TemplateEditor({ template, onClose, onSaved }: TemplateEditorProps) {
  const { toast } = useToast();
  const isEdit = !!template;
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [calculatorType, setCalculatorType] = useState<CalculatorType>(template?.calculator_type ?? 'paint');
  const [inputJson, setInputJson] = useState(() => {
    try { return JSON.stringify(template?.input_data ?? {}, null, 2); } catch { return '{}'; }
  });
  const [slug, setSlug] = useState(template?.slug ?? '');
  const [seoTitle, setSeoTitle] = useState(template?.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(template?.seo_description ?? '');
  const [isPublished, setIsPublished] = useState(template?.is_published ?? true);
  const [isFeatured, setIsFeatured] = useState(template?.is_featured ?? false);
  const [displayOrder, setDisplayOrder] = useState(template?.display_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { toast({ type: 'error', title: 'Name is required' }); return; }
    let parsedData: Record<string, unknown>;
    try { parsedData = JSON.parse(inputJson); setJsonError(null); }
    catch (e) { setJsonError(e instanceof Error ? e.message : 'Invalid JSON'); return; }

    setSaving(true);
    try {
      if (isEdit && template) {
        await adminUpdateTemplate(template.id, {
          name: name.trim(),
          description: description.trim() || null,
          calculator_type: calculatorType,
          input_data: parsedData,
          slug: slug.trim() || null,
          seo_title: seoTitle.trim() || null,
          seo_description: seoDescription.trim() || null,
          is_published: isPublished,
          is_featured: isFeatured,
          display_order: displayOrder,
        });
        toast({ type: 'success', title: 'Template updated' });
      } else {
        await adminCreateTemplate({
          calculator_type: calculatorType,
          name: name.trim(),
          description: description.trim() || undefined,
          input_data: parsedData,
          slug: slug.trim() || undefined,
          seo_title: seoTitle.trim() || undefined,
          seo_description: seoDescription.trim() || undefined,
          is_published: isPublished,
          is_featured: isFeatured,
          display_order: displayOrder,
        });
        toast({ type: 'success', title: 'Template created' });
      }
      onSaved();
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-brand-navy-mid" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            {isEdit ? 'Edit Template' : 'Create Template'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </div>

          {/* Calculator type */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Calculator Type</label>
            <select value={calculatorType} onChange={(e) => setCalculatorType(e.target.value as CalculatorType)} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
              {CALC_TYPES.map((t) => <option key={t} value={t}>{calculatorLabel(t)}</option>)}
            </select>
          </div>

          {/* Input JSON */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Input Configuration (JSON)</label>
            <textarea value={inputJson} onChange={(e) => setInputJson(e.target.value)} rows={8} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs dark:border-white/10 dark:bg-black/20 dark:text-white" />
            {jsonError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{jsonError}</p>}
          </div>

          {/* SEO fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">URL Slug</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. 10x12-bedroom-painting" className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Display Order</label>
              <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">SEO Title</label>
            <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">SEO Description</label>
            <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="rounded border-neutral-300" />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="rounded border-neutral-300" />
              Featured
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button onClick={onClose} className="flex-1 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 dark:border-white/10 dark:text-neutral-300">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
