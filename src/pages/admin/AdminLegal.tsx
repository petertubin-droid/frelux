import { useEffect, useState } from 'react';
import { Pencil, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DbLegalPage } from '@/types/database';
import { AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle, AdminInput, AdminTextarea } from '@/components/admin/AdminUi';
import { AdminModal } from '@/components/admin/AdminModal';

export default function AdminLegal() {
  const [items, setItems] = useState<DbLegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbLegalPage | null>(null);

  async function load() {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from('legal_pages').select('*').order('title');
    if (error) setError(error.message);
    setItems(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function togglePublished(item: DbLegalPage) {
    const { error } = await supabase.from('legal_pages').update({ is_published: !item.is_published }).eq('id', item.id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, is_published: !p.is_published } : p)));
  }

  return (
    <>
      <AdminHeader title="Legal Pages" subtitle="Manage privacy policy, terms, and other legal content. Unpublished pages are not shown to public visitors." />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading ? <StateMessage type="loading" title="Loading…" message="Fetching legal pages." />
        : items.length === 0 ? <StateMessage type="empty" title="No legal pages" message="Legal pages will appear here once created." />
        : (
          <div className="space-y-3">
            {items.map((item) => (
              <AdminCard key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <FileText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-brand-navy dark:text-white">{item.title}</h3>
                      {item.is_published ? <span className="rounded-full bg-accent-green/15 px-2 py-0.5 text-[11px] font-semibold text-accent-green">Published</span> : <span className="rounded-full bg-accent-yellow/20 px-2 py-0.5 text-[11px] font-semibold text-accent-yellow">Draft</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">/{item.slug} · updated {new Date(item.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Toggle checked={item.is_published} onChange={() => togglePublished(item)} />
                  <AdminButton variant="secondary" onClick={() => setEditing(item)}><Pencil className="h-3.5 w-3.5" /> Edit</AdminButton>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      {editing && <LegalForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function LegalForm({ initial, onClose, onSaved }: { initial: DbLegalPage; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [isPublished, setIsPublished] = useState(initial.is_published);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSave() {
    if (!title.trim()) { setFormError('Title is required'); return; }
    if (!content.trim()) { setFormError('Content is required'); return; }
    setSaving(true); setFormError(null);
    const { error } = await supabase.from('legal_pages').update({ title: title.trim(), content: content.trim(), is_published: isPublished }).eq('id', initial.id);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    onSaved();
  }

  return (
    <AdminModal open onClose={onClose} title="Edit {initial.title}" maxWidth="max-w-2xl">
          <AdminField label="Title"><AdminInput  value={title} onChange={(e) => setTitle(e.target.value)} /></AdminField>
          <AdminField label="Content" hint="Plain text. Paragraphs separated by blank lines."><AdminTextarea className="min-h-[300px] resize-y font-mono text-sm" value={content} onChange={(e) => setContent(e.target.value)} /></AdminField>
          <div>
            <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Published</span>
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">When published, this content replaces the default draft layout on the public site.</p>
            <div className="mt-2"><Toggle checked={isPublished} onChange={setIsPublished} /></div>
          </div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-3 pt-2"><AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton><AdminButton onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}{!saving && <CheckCircle2 aria-hidden="true" className="h-4 w-4" />}</AdminButton></div>
    </AdminModal>
  );
}
