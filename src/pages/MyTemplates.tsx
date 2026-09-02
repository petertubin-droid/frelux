import { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Loader2, Bookmark, ChevronRight, LogIn, Upload, Download } from 'lucide-react';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/lib/auth';
import { useUserTemplates } from '@/lib/useTemplates';
import { calculatorLabel, CALCULATOR_META, exportTemplate, importTemplate } from '@/lib/templates';
import TemplateCard from '@/components/templates/TemplateCard';
import type { CalculatorType, DbCalculatorTemplate } from '@/types/database';
import { classNames } from '@/lib/utils';
import { Button } from "@/components/ui/shadcn/button";

const SORT_OPTIONS = [
  { key: 'recent', label: 'Recent' },
  { key: 'name', label: 'Name' },
  { key: 'favorites', label: 'Favorites' },
] as const;

const CATEGORY_TABS: { key: CalculatorType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paint', label: 'Painting' },
  { key: 'tile', label: 'Tiling' },
  { key: 'screeding', label: 'Screeding' },
  { key: 'pop', label: 'POP Ceiling' },
];

export default function MyTemplates() {
  useSeo({
    title: 'My Templates',
    description: 'Your saved calculator templates for FRELUX.',
    canonicalPath: '/my-templates',
    noIndex: true,
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'name' | 'favorites'>('recent');
  const [activeCategory, setActiveCategory] = useState<CalculatorType | 'all'>('all');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const { templates, loading, error, remove, duplicate, toggleFavorite, refresh } = useUserTemplates(
    activeCategory === 'all' ? undefined : activeCategory
  );

  // The hook doesn't support search/sort params, so we filter client-side
  const filtered = useMemo(() => {
    let result = [...templates];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q)
      );
    }
    if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'favorites') result.sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite));
    else result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return result;
  }, [templates, search, sort]);

  function handleExportAll() {
    if (filtered.length === 0) return;
    // Export each template as a separate JSON download
    for (const t of filtered) {
      exportTemplate(t);
    }
  }

  function handleExportOne(template: DbCalculatorTemplate) {
    exportTemplate(template);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImportStatus('Importing...');
    setImportError(null);
    try {
      const result = await importTemplate(user.id, file);
      setImportStatus(`Imported "${result.name}" successfully!`);
      await refresh();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import template');
      setImportStatus(null);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
      // Clear status after 3 seconds
      setTimeout(() => { setImportStatus(null); setImportError(null); }, 3000);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Bookmark className="mx-auto h-10 w-10 text-muted-foreground/80 dark:text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold text-foreground dark:text-primary-foreground">Sign in to view your templates</h1>
        <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
          Your saved calculator templates are private and tied to your account.
        </p>
        <Link to="/dashboard" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <LogIn className="h-4 w-4" /> Sign In
        </Link>
      </div>
    );
  }

  const handleUse = (template: DbCalculatorTemplate) => {
    const path = CALCULATOR_META[template.calculator_type].path;
    navigate(`${path}?template=${template.id}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">
        <Link to="/" className="hover:text-brand-purple dark:hover:text-brand-purple-lighter">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span>My Templates</span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground dark:text-primary-foreground sm:text-3xl">
            My Templates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
            Your saved calculator configurations. Private and secure.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground/80"
            title="Import a template from JSON file"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          {filtered.length > 0 && (
            <Button
              onClick={handleExportAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground/80"
              title="Export all templates as JSON files"
            >
              <Download aria-hidden="true" className="h-3.5 w-3.5" /> Export All
            </Button>
          )}
          <Link
            to="/templates"
            className="shrink-0 text-xs font-medium text-brand-purple hover:underline dark:text-brand-purple-lighter"
          >
            Browse FRELUX Templates
          </Link>
        </div>
      </div>

      {/* Import status */}
      {importStatus && (
        <div className="mt-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          {importStatus}
        </div>
      )}
      {importError && (
        <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {importError}
        </div>
      )}

      {/* Controls */}
      <div className="mt-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your templates..."
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground dark:placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-2">
            {SORT_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={classNames(
                  'rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  sort === opt.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted dark:bg-white/5 dark:text-muted-foreground/80'
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className={classNames(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                activeCategory === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted dark:bg-white/5 dark:text-muted-foreground/80'
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-brand-purple" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/50 p-12 text-center dark:border-white/10 dark:bg-white/5">
          <Bookmark className="mx-auto h-8 w-8 text-muted-foreground/80 dark:text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-muted-foreground dark:text-muted-foreground/80">No templates yet</p>
          <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
            Use "Save as Template" in any calculator to create your first one. You can also import a template from a JSON file.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(['paint', 'tile', 'screeding', 'pop'] as CalculatorType[]).map((type) => (
              <Link
                key={type}
                to={CALCULATOR_META[type].path}
                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground/80"
              >
                {calculatorLabel(type)} Calculator
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              variant="private"
              onUse={() => handleUse(t)}
              onDelete={() => remove(t.id)}
              onDuplicate={() => duplicate(t.id)}
              onToggleFavorite={() => toggleFavorite(t.id, t.is_favorite)}
              onExport={() => handleExportOne(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
