import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, BadgeCheck, Calculator, ChevronRight } from 'lucide-react';
import { useSeo } from '@/lib/seo';
import { getPublicTemplates, calculatorLabel } from '@/lib/templates';
import type { DbCalculatorTemplate, CalculatorType } from '@/types/database';
import { classNames } from '@/lib/utils';

import { RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
const CATEGORY_TABS: { key: CalculatorType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paint', label: 'Painting' },
  { key: 'tile', label: 'Tiling' },
  { key: 'screeding', label: 'Screeding' },
  { key: 'pop', label: 'POP Ceiling' },
];

export default function Templates() {
  useSeo({
    title: 'Calculator Templates',
    description: 'Browse professionally curated FRELUX calculator templates for painting, tiling, screeding, and POP ceiling projects. Get instant material estimates.',
    canonicalPath: '/templates',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'FRELUX Calculator Templates',
      description: 'Professionally curated calculator templates for construction material estimation.',
    },
  });

  const [templates, setTemplates] = useState<DbCalculatorTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CalculatorType | 'all'>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicTemplates();
        setTemplates(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let result = templates;
    if (activeCategory !== 'all') {
      result = result.filter((t) => t.calculator_type === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [templates, activeCategory, search]);

  const featured = useMemo(() => filtered.filter((t) => t.is_featured), [filtered]);
  const rest = useMemo(() => filtered.filter((t) => !t.is_featured), [filtered]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          <Link to="/" className="hover:text-brand-purple dark:hover:text-brand-purple-lighter">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span>Templates</span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
          FRELUX Calculator Templates
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
          Professionally curated templates for common painting, tiling, screeding, and POP ceiling projects.
          Each template uses the FRELUX calculation engine with current prices and material rules.
        </p>
      </div>

      {/* Search + filters */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-neutral-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className={classNames(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                activeCategory === tab.key
                  ? 'bg-brand-purple text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center dark:border-white/10 dark:bg-white/5">
          <BadgeCheck className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600" />
          <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-300">No templates found</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Try a different search or category filter.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {featured.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <BadgeCheck className="h-3.5 w-3.5 text-amber-500" />
                Featured Templates
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((t) => (
                  <PublicTemplateCard key={t.id} template={t} />
                ))}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                All Templates
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((t) => (
                  <PublicTemplateCard key={t.id} template={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calculator links */}
      <div className="mt-10 rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Browse Calculators</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['paint', 'tile', 'screeding', 'pop'] as CalculatorType[]).map((type) => (
            <Link
              key={type}
              to={type === 'paint' ? '/paint-calculator' : type === 'tile' ? '/tile-calculator' : type === 'screeding' ? '/screeding-calculator' : '/pop-ceiling-calculator'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:border-brand-purple/30 hover:text-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-neutral-300"
            >
              <Calculator className="h-3.5 w-3.5" />
              {calculatorLabel(type)}
            </Link>
          ))}
        </div>
        <RelatedTools links={[
          CALC_LINKS.paintCalculator,
          CALC_LINKS.screedingCalc,
          CALC_LINKS.costEstimator,
          CALC_LINKS.paintingEstimator,
        ]} />

      </div>
    </div>
  );
}

function PublicTemplateCard({ template }: { template: DbCalculatorTemplate }) {
  return (
    <Link
      to={`/templates/${template.slug}`}
      className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-4 transition-all duration-200 hover:border-brand-purple/30 hover:shadow-sm dark:border-white/10 dark:bg-brand-navy-mid dark:hover:border-brand-purple/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-purple/8 px-2.5 py-1 text-xs font-medium text-brand-purple dark:bg-brand-purple/15 dark:text-brand-purple-lighter">
          <Calculator className="h-3 w-3" />
          {calculatorLabel(template.calculator_type)}
        </span>
        {template.is_featured && <BadgeCheck className="h-3.5 w-3.5 text-amber-500" />}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">{template.name}</h3>
      {template.description && (
        <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{template.description}</p>
      )}
      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-brand-purple dark:text-brand-purple-lighter">
        View Template
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
