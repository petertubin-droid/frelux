import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Check, Loader2, AlertCircle, BookOpen, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle, AdminInput, AdminIconButton, AdminSelect, AdminTextarea } from '@/components/admin/AdminUi';
import { MediaUploader } from '@/components/admin/MediaUploader';
import type { DbLearnCategory, DbLearnArticle, LearnArticleStatus } from '@/types/database';
import { classNames } from '@/lib/utils';
import { checkGoogleCompliance, type GoogleComplianceReport } from '@/lib/google-compliance';

type Status = 'loading' | 'ready' | 'error';

export default function AdminLearn() {
  const [tab, setTab] = useState<'articles' | 'categories'>('articles');
  const [articles, setArticles] = useState<DbLearnArticle[]>([]);
  const [categories, setCategories] = useState<DbLearnCategory[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbLearnArticle | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setStatus('loading'); setError('');
    try {
      const [artRes, catRes] = await Promise.all([
        supabase.from('learn_articles').select('*').order('updated_at', { ascending: false }),
        supabase.from('learn_categories').select('*').order('sort_order', { ascending: true }),
      ]);
      setArticles((artRes.data ?? []) as DbLearnArticle[]);
      setCategories((catRes.data ?? []) as DbLearnCategory[]);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setStatus('error');
    }
  }

  async function handleSave(article: Partial<DbLearnArticle> & { slug: string; title: string; category_slug: string }) {
    setMutationError(null);
    let result;
    if (editing) {
      result = await supabase.from('learn_articles').update({ ...article, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      result = await supabase.from('learn_articles').insert(article);
    }
    if (result.error) {
      setMutationError(result.error.message);
      return;
    }
    setShowEditor(false);
    setEditing(null);
    loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this article?')) return;
    setMutationError(null);
    const { error: delError } = await supabase.from('learn_articles').delete().eq('id', id);
    if (delError) {
      setMutationError(delError.message);
      return;
    }
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleTogglePublished(article: DbLearnArticle) {
    const newStatus: LearnArticleStatus = article.status === 'published' ? 'draft' : 'published';
    const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'published' && !article.published_at) updates.published_at = new Date().toISOString();
    setMutationError(null);
    const { error: updateError } = await supabase.from('learn_articles').update(updates).eq('id', article.id);
    if (updateError) {
      setMutationError(updateError.message);
      return;
    }
    setArticles((prev) => prev.map((a) => a.id === article.id ? { ...a, status: newStatus, published_at: updates.published_at as string ?? a.published_at } : a));
  }

  async function handleToggleCategoryActive(cat: DbLearnCategory) {
    setMutationError(null);
    const { error: updateError } = await supabase.from('learn_categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    if (updateError) {
      setMutationError(updateError.message);
      return;
    }
    setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
  }

  if (status === 'loading') return <><AdminHeader title="Learn" subtitle="Manage educational articles and categories." /><StateMessage type="loading" title="Loading…" message="Fetching content." /></>;
  if (status === 'error') return <><AdminHeader title="Learn" subtitle="Manage educational articles and categories." /><StateMessage type="error" title="Error" message={error} /></>;

  return (
    <>
      <AdminHeader
        title="Learn"
        subtitle="Manage educational articles and categories."
        action={tab === 'articles' ? <AdminButton onClick={() => { setEditing(null); setShowEditor(true); }}><Plus aria-hidden="true" className="h-4 w-4" /> New Article</AdminButton> : undefined}
      />

      {mutationError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" /> {mutationError}
        </div>
      )}

      {/* Tab switcher */}
      <div className="mb-6 inline-flex rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-1">
        {(['articles', 'categories'] as const).map((t) => (
          <AdminButton key={t} type="button" onClick={() => setTab(t)}
            className={classNames('rounded-md px-4 py-2 text-sm font-semibold capitalize transition-all', tab === t ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:text-brand-purple')}>
            {t}
          </AdminButton>
        ))}
      </div>

      {/* Articles tab */}
      {tab === 'articles' && !showEditor && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {articles.length === 0 ? (
            <StateMessage type="empty" title="No articles yet" message="Create your first article to publish in the Learn section." action={<AdminButton onClick={() => setShowEditor(true)}><Plus aria-hidden="true" className="h-4 w-4" /> New Article</AdminButton>} />
          ) : articles.map((article) => (
            <div key={article.id} className="card p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-500" />
                  <p className="truncate text-sm font-bold text-brand-navy dark:text-white">{article.title}</p>
                  <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', article.status === 'published' ? 'bg-accent-green/15 text-accent-green' : 'bg-neutral-100 text-neutral-500')}>{article.status}</span>
                  {article.is_featured && <span className="rounded-full bg-accent-orange/15 px-2 py-0.5 text-[10px] font-semibold text-accent-orange">Featured</span>}
                </div>
                <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">{article.category_slug.replace(/-/g, ' ')} · {new Date(article.updated_at).toLocaleDateString()}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Toggle checked={article.status === 'published'} onChange={() => handleTogglePublished(article)} />
                <AdminIconButton variant="ghost" type="button" onClick={() => { setEditing(article); setShowEditor(true); }} className="rounded-md p-2 text-neutral-500 hover:text-brand-purple"><Pencil className="h-4 w-4" /></AdminIconButton>
                <AdminIconButton variant="ghost" type="button" onClick={() => handleDelete(article.id)} className="rounded-md p-2 text-neutral-300 hover:text-red-500"><Trash2 aria-hidden="true" className="h-4 w-4" /></AdminIconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Article editor */}
      {tab === 'articles' && showEditor && (
        <ArticleEditor
          article={editing}
          categories={categories}
          onSave={handleSave}
          onCancel={() => { setShowEditor(false); setEditing(null); }}
        />
      )}

      {/* Categories tab */}
      {tab === 'categories' && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.id} className="card p-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple"><BookOpen aria-hidden="true" className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm font-bold text-brand-navy dark:text-white">{cat.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500">/{cat.slug} · Order {cat.sort_order}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-500 dark:text-neutral-500">{cat.is_active ? 'Active' : 'Inactive'}</span>
                <Toggle checked={cat.is_active} onChange={() => handleToggleCategoryActive(cat)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// =========================================================
// Article Editor
// =========================================================
function ArticleEditor({ article, categories, onSave, onCancel }: {
  article: DbLearnArticle | null;
  categories: DbLearnCategory[];
  onSave: (data: Partial<DbLearnArticle> & { slug: string; title: string; category_slug: string }) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    slug: article?.slug ?? '',
    title: article?.title ?? '',
    excerpt: article?.excerpt ?? '',
    content: article?.content ?? '',
    category_slug: article?.category_slug ?? (categories[0]?.slug ?? ''),
    cover_image_url: article?.cover_image_url ?? '',
    author: article?.author ?? '',
    read_time_minutes: article?.read_time_minutes ?? 5,
    status: article?.status ?? 'draft',
    is_featured: article?.is_featured ?? false,
    meta_title: article?.meta_title ?? '',
    meta_description: article?.meta_description ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [complianceReport, setComplianceReport] = useState<GoogleComplianceReport | null>(null);
  const [showCompliance, setShowCompliance] = useState(false);

  function runComplianceCheck(): GoogleComplianceReport {
    return checkGoogleCompliance({
      slug: form.slug.trim(),
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content,
      category_slug: form.category_slug,
      author: form.author.trim() || null,
      read_time_minutes: Number(form.read_time_minutes) || null,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      meta_keywords: null,
      cover_image_url: form.cover_image_url.trim() || null,
      status: form.status,
      is_featured: form.is_featured,
    });
  }

  async function handleSubmit() {
    if (!form.slug.trim() || !form.title.trim() || !form.category_slug) {
      setError('Slug, title, and category are required.');
      return;
    }
    // Google compliance gate — block publishing non-compliant articles
    if (form.status === 'published') {
      const report = runComplianceCheck();
      if (!report.compliant) {
        setComplianceReport(report);
        setShowCompliance(true);
        setError(`Article fails Google compliance check (${report.blockingIssues.length} blocking issue(s)). Fix issues or save as draft.`);
        return;
      }
    }
    setSaving(true); setError('');
    try {
      const data: Record<string, unknown> = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        category_slug: form.category_slug,
        cover_image_url: form.cover_image_url.trim() || null,
        author: form.author.trim() || null,
        read_time_minutes: Number(form.read_time_minutes) || null,
        status: form.status,
        is_featured: form.is_featured,
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
      };
      if (form.status === 'published' && !article?.published_at) {
        data.published_at = new Date().toISOString();
      }
      onSave(data as Partial<DbLearnArticle> & { slug: string; title: string; category_slug: string });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">{article ? 'Edit Article' : 'New Article'}</h2>
        <AdminIconButton variant="ghost" type="button" onClick={onCancel} ><X aria-hidden="true" className="h-4 w-4" /></AdminIconButton>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle aria-hidden="true" className="h-4 w-4" /> {error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Title"><AdminInput  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></AdminField>
        <AdminField label="Slug" hint="URL friendly identifier, e.g. how to paint a wall"><AdminInput  value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></AdminField>
      </div>

      <AdminField label="Category">
        <AdminSelect  value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value })}>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </AdminSelect>
      </AdminField>

      <AdminField label="Excerpt" hint="Short summary shown in article cards and search results.">
        <AdminTextarea  rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
      </AdminField>

      <AdminField label="Content" hint="Markdown formatted article body. Supports headings, lists, bold, and code blocks.">
        <AdminTextarea className="font-mono text-sm" rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="# Introduction&#10;Write your article here…" />
      </AdminField>

      <div className="grid gap-4 sm:grid-cols-2">
        <MediaUploader label="Cover Image" value={form.cover_image_url} onChange={(url) => setForm({ ...form, cover_image_url: url })} folder="learn" />
        <AdminField label="Author"><AdminInput  value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></AdminField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Read Time (minutes)"><AdminInput type="number" min={1}  value={form.read_time_minutes} onChange={(e) => setForm({ ...form, read_time_minutes: Number(e.target.value) })} /></AdminField>
        <AdminField label="Status">
          <AdminSelect  value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LearnArticleStatus })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </AdminSelect>
        </AdminField>
      </div>

      <AdminCard className="bg-neutral-50 dark:bg-white/5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">SEO Settings</h3>
        <div className="space-y-4">
          <AdminField label="Meta Title" hint="Overrides the default page title for search engines."><AdminInput  value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} /></AdminField>
          <AdminField label="Meta Description" hint="Overrides the default description for search engines."><AdminTextarea  rows={2} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} /></AdminField>
        </div>
      </AdminCard>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <AdminInput type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-brand-purple focus:ring-brand-purple" />
          Featured article
        </label>
      </div>

      {/* Google Compliance Checker */}
      <div className="flex items-center gap-3">
        <AdminButton type="button" onClick={() => { setComplianceReport(runComplianceCheck()); setShowCompliance(true); }}>
          <AlertCircle aria-hidden="true" className="h-4 w-4" /> Check Google Compliance
        </AdminButton>
      </div>

      {showCompliance && complianceReport && (
        <AdminCard className={classNames('space-y-2', complianceReport.compliant ? 'border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/5' : 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5')}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">Google Compliance Report</h3>
            <AdminIconButton variant="ghost" type="button" onClick={() => setShowCompliance(false)}><X aria-hidden="true" className="h-4 w-4" /></AdminIconButton>
          </div>
          <p className="text-sm font-semibold text-brand-navy dark:text-white">Score: {complianceReport.score}/100 — {complianceReport.compliant ? '✅ Compliant' : '❌ Not compliant for publishing'}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={classNames('rounded-full px-2 py-1 font-semibold', complianceReport.eeattAssessment.experience === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>Experience: {complianceReport.eeattAssessment.experience}</span>
            <span className={classNames('rounded-full px-2 py-1 font-semibold', complianceReport.eeattAssessment.expertise === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>Expertise: {complianceReport.eeattAssessment.expertise}</span>
            <span className={classNames('rounded-full px-2 py-1 font-semibold', complianceReport.eeattAssessment.authoritativeness === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>Authoritativeness: {complianceReport.eeattAssessment.authoritativeness}</span>
            <span className={classNames('rounded-full px-2 py-1 font-semibold', complianceReport.eeattAssessment.trustworthiness === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>Trustworthiness: {complianceReport.eeattAssessment.trustworthiness}</span>
          </div>
          {complianceReport.blockingIssues.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-red-600">Blocking Issues</p>
              {complianceReport.blockingIssues.map((issue, i) => <p key={i} className="text-xs text-red-600">{issue}</p>)}
            </div>
          )}
          {complianceReport.advisoryIssues.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Advisory Issues</p>
              {complianceReport.advisoryIssues.map((issue, i) => <p key={i} className="text-xs text-amber-600">{issue}</p>)}
            </div>
          )}
        </AdminCard>
      )}

      <div className="flex justify-end gap-3">
        <AdminButton onClick={onCancel}>Cancel</AdminButton>
        <AdminButton onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Check aria-hidden="true" className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Article'}
        </AdminButton>
      </div>
    </AdminCard>
  );
}
