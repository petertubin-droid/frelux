import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Plus, Copy, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';
import {
  getPublicTemplates,
  getUserTemplates,
  createUserTemplate,
  updateUserTemplate,
  deleteUserTemplate,
  duplicateUserTemplate,
} from '@/lib/templates';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import type { DbCalculatorTemplate, CalculatorType } from '@/types/database';

export default function TemplatePicker({
  calculatorType,
  onLoad,
  currentData,
}: {
  calculatorType: CalculatorType;
  onLoad: (data: Record<string, unknown>) => void;
  currentData: Record<string, unknown>;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [publicTemplates, setPublicTemplates] = useState<DbCalculatorTemplate[]>([]);
  const [userTemplates, setUserTemplates] = useState<DbCalculatorTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const [pub, usr] = await Promise.all([
        getPublicTemplates({ calculatorType }),
        user ? getUserTemplates(user.id, { calculatorType }) : Promise.resolve([]),
      ]);
      setPublicTemplates(pub);
      setUserTemplates(usr);
    } catch {
      setPublicTemplates([]);
      setUserTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [calculatorType, user]);

  useEffect(() => {
    if (!open) return;
    loadTemplates();
  }, [open, loadTemplates]);

  async function handleSave() {
    if (!saveName.trim() || !user) return;
    setSaving(true);
    try {
      await createUserTemplate(user.id, {
        calculator_type: calculatorType,
        name: saveName.trim(),
        input_data: currentData,
        visibility: 'private',
      });
      toast({ type: 'success', title: 'Template loaded', message: `"${saveName.trim()}" is now in your templates.` });
      setSaveName('');
      loadTemplates();
    } catch (e) {
      toast({ type: 'error', title: 'Failed to save template', message: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user || !confirm('Delete this template?')) return;
    try {
      await deleteUserTemplate(id, user.id);
      toast({ type: 'success', title: 'Template deleted' });
      loadTemplates();
    } catch (e) {
      toast({ type: 'error', title: 'Failed to delete', message: e instanceof Error ? e.message : 'Unknown error' });
    }
  }

  async function handleDuplicate(id: string) {
    if (!user) return;
    try {
      await duplicateUserTemplate(id, user.id);
      toast({ type: 'success', title: 'Template duplicated' });
      loadTemplates();
    } catch (e) {
      toast({ type: 'error', title: 'Failed to duplicate', message: e instanceof Error ? e.message : 'Unknown error' });
    }
  }

  async function handleRename(id: string) {
    if (!user || !editName.trim()) return;
    try {
      await updateUserTemplate(id, user.id, { name: editName.trim() });
      setEditingId(null);
      toast({ type: 'success', title: 'Template renamed' });
      loadTemplates();
    } catch (e) {
      toast({ type: 'error', title: 'Failed to rename', message: e instanceof Error ? e.message : 'Unknown error' });
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-white/5 bg-white dark:bg-brand-navy-mid px-4 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200 transition-colors hover:border-brand-purple hover:text-brand-purple press-scale"
      >
        <Bookmark aria-hidden="true" className="h-4 w-4" />
        Templates
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-brand-navy-mid shadow-xl animate-tooltip-in">
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-sm text-neutral-400 dark:text-neutral-500">
                  <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> Loading templates…
                </div>
              ) : (
                <>
                  {/* Built-in / public templates */}
                  <div>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Built-in Templates</h4>
                    {publicTemplates.length > 0 ? (
                      <div className="space-y-1">
                        {publicTemplates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              onLoad(t.input_data);
                              setOpen(false);
                              toast({ type: 'info', title: 'Template loaded', message: t.name });
                            }}
                            className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-neutral-50 dark:bg-white/5"
                          >
                            <Bookmark aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t.name}</p>
                              {t.description && <p className="text-xs text-neutral-400 dark:text-neutral-500">{t.description}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500">No built-in templates available.</p>
                    )}
                  </div>

                  {/* User templates */}
                  {user && (
                    <div className="mt-4 border-t border-neutral-100 pt-4">
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">My Templates</h4>
                      {userTemplates.length > 0 ? (
                        <div className="space-y-1">
                          {userTemplates.map((t) => (
                            <div key={t.id} className="group flex items-start gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-neutral-50 dark:bg-white/5">
                              {editingId === t.id ? (
                                <div className="flex flex-1 items-center gap-1">
                                  <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1 rounded border border-neutral-200 dark:border-white/5 px-2 py-1 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleRename(t.id)}
                                  />
                                  <button onClick={() => handleRename(t.id)} className="rounded bg-brand-purple p-1 text-white"><Check aria-hidden="true" className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => setEditingId(null)} className="rounded border border-neutral-200 dark:border-white/5 p-1 text-neutral-500 dark:text-neutral-400 dark:text-neutral-500"><X className="h-3.5 w-3.5" /></button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      onLoad(t.input_data);
                                      setOpen(false);
                                      toast({ type: 'info', title: 'Template loaded', message: t.name });
                                    }}
                                    className="flex flex-1 items-start gap-2 text-left"
                                  >
                                    <Bookmark aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t.name}</p>
                                      {t.description && <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{t.description}</p>}
                                    </div>
                                  </button>
                                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button onClick={() => { setEditingId(t.id); setEditName(t.name); }} className="rounded p-1 text-neutral-400 dark:text-neutral-500 hover:text-brand-purple" title="Rename"><Pencil aria-hidden="true" className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => handleDuplicate(t.id)} className="rounded p-1 text-neutral-400 dark:text-neutral-500 hover:text-brand-purple" title="Duplicate"><Copy aria-hidden="true" className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => handleDelete(t.id)} className="rounded p-1 text-neutral-400 dark:text-neutral-500 hover:text-red-500" title="Delete"><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500">No saved templates yet. Save your current calculation below.</p>
                      )}

                      {/* Save current as template */}
                      <div className="mt-3 border-t border-neutral-100 pt-3">
                        <div className="flex gap-2">
                          <input
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            placeholder="Save current as template…"
                            className="flex-1 rounded-lg border border-neutral-200 dark:border-white/5 px-3 py-2 text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                          />
                          <button
                            onClick={handleSave}
                            disabled={saving || !saveName.trim()}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-purple px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 press-scale"
                          >
                            {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!user && (
                    <div className="mt-4 border-t border-neutral-100 pt-4">
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">
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
