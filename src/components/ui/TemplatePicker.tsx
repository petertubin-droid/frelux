import { useEffect, useState } from 'react';
import { Bookmark, Plus, Copy, Trash2, Pencil, Check, X, Loader2, Upload } from 'lucide-react';
import { fetchBuiltinTemplates, fetchUserTemplates, saveUserTemplate, updateUserTemplate, deleteUserTemplate, duplicateUserTemplate } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { classNames } from '@/lib/utils';
import type { DbCalculatorTemplate, TemplateType } from '@/types/database';

export default function TemplatePicker({
  templateType,
  onLoad,
  currentData,
}: {
  templateType: TemplateType;
  onLoad: (data: Record<string, unknown>) => void;
  currentData: Record<string, unknown>;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [builtin, setBuiltin] = useState<DbCalculatorTemplate[]>([]);
  const [userTemplates, setUserTemplates] = useState<DbCalculatorTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (!open) return;
    loadTemplates();
  }, [open]);

  async function loadTemplates() {
    setLoading(true);
    const [builtinRes, userRes] = await Promise.all([
      fetchBuiltinTemplates(templateType),
      user ? fetchUserTemplates(templateType) : Promise.resolve({ data: [], error: null }),
    ]);
    setBuiltin(builtinRes.data);
    setUserTemplates(userRes.data);
    setLoading(false);
  }

  async function handleSave() {
    if (!saveName.trim() || !user) return;
    setSaving(true);
    const { error } = await saveUserTemplate(templateType, saveName.trim(), currentData);
    setSaving(false);
    if (error) {
      toast({ type: 'error', title: 'Failed to save template', message: error });
      return;
    }
    toast({ type: 'success', title: 'Template saved', message: `"${saveName.trim()}" is now in your templates.` });
    setSaveName('');
    loadTemplates();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    const { error } = await deleteUserTemplate(id);
    if (error) {
      toast({ type: 'error', title: 'Failed to delete', message: error });
      return;
    }
    toast({ type: 'success', title: 'Template deleted' });
    loadTemplates();
  }

  async function handleDuplicate(id: string) {
    const { error } = await duplicateUserTemplate(id);
    if (error) {
      toast({ type: 'error', title: 'Failed to duplicate', message: error });
      return;
    }
    toast({ type: 'success', title: 'Template duplicated' });
    loadTemplates();
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    const { error } = await updateUserTemplate(id, { name: editName.trim() });
    if (error) {
      toast({ type: 'error', title: 'Failed to rename', message: error });
      return;
    }
    setEditingId(null);
    toast({ type: 'success', title: 'Template renamed' });
    loadTemplates();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-brand-purple hover:text-brand-purple press-scale"
      >
        <Bookmark className="h-4 w-4" />
        Templates
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-neutral-200 bg-white shadow-xl animate-tooltip-in">
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-sm text-neutral-400">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading templates…
                </div>
              ) : (
                <>
                  {/* Built-in templates */}
                  <div>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">Built-in Templates</h4>
                    {builtin.length > 0 ? (
                      <div className="space-y-1">
                        {builtin.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              onLoad(t.calculator_data);
                              setOpen(false);
                              toast({ type: 'info', title: 'Template loaded', message: t.name });
                            }}
                            className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-neutral-50"
                          >
                            <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-neutral-800">{t.name}</p>
                              {t.description && <p className="text-xs text-neutral-400">{t.description}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="px-3 py-2 text-xs text-neutral-400">No built-in templates available.</p>
                    )}
                  </div>

                  {/* User templates */}
                  {user && (
                    <div className="mt-4 border-t border-neutral-100 pt-4">
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">My Templates</h4>
                      {userTemplates.length > 0 ? (
                        <div className="space-y-1">
                          {userTemplates.map((t) => (
                            <div key={t.id} className="group flex items-start gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-neutral-50">
                              {editingId === t.id ? (
                                <div className="flex flex-1 items-center gap-1">
                                  <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1 rounded border border-neutral-200 px-2 py-1 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleRename(t.id)}
                                  />
                                  <button onClick={() => handleRename(t.id)} className="rounded bg-brand-purple p-1 text-white"><Check className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => setEditingId(null)} className="rounded border border-neutral-200 p-1 text-neutral-500"><X className="h-3.5 w-3.5" /></button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      onLoad(t.calculator_data);
                                      setOpen(false);
                                      toast({ type: 'info', title: 'Template loaded', message: t.name });
                                    }}
                                    className="flex flex-1 items-start gap-2 text-left"
                                  >
                                    <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-neutral-800">{t.name}</p>
                                      {t.description && <p className="truncate text-xs text-neutral-400">{t.description}</p>}
                                    </div>
                                  </button>
                                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button onClick={() => { setEditingId(t.id); setEditName(t.name); }} className="rounded p-1 text-neutral-400 hover:text-brand-purple" title="Rename"><Pencil className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => handleDuplicate(t.id)} className="rounded p-1 text-neutral-400 hover:text-brand-purple" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => handleDelete(t.id)} className="rounded p-1 text-neutral-400 hover:text-red-500" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="px-3 py-2 text-xs text-neutral-400">No saved templates yet. Save your current calculation below.</p>
                      )}

                      {/* Save current as template */}
                      <div className="mt-3 border-t border-neutral-100 pt-3">
                        <div className="flex gap-2">
                          <input
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="Save current as template…"
                            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                          />
                          <button
                            onClick={handleSave}
                            disabled={saving || !saveName.trim()}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-purple px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 press-scale"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!user && (
                    <div className="mt-4 border-t border-neutral-100 pt-4">
                      <p className="text-xs text-neutral-400">
                        <a href="/login" className="font-semibold text-brand-purple hover:underline">Sign in</a> to save your own templates.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
