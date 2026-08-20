import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, ChevronRight, ArrowRight, Calculator, AlertCircle, Layers } from 'lucide-react';
import { useSeo } from '@/lib/seo';
import { getPublicTemplateBySlug, getRelatedPublicTemplates, calculatorLabel, calculatorPath, CALCULATOR_META } from '@/lib/templates';
import type { DbCalculatorTemplate, CalculatorType } from '@/types/database';

export default function TemplateDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<DbCalculatorTemplate | null>(null);
  const [related, setRelated] = useState<DbCalculatorTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const t = await getPublicTemplateBySlug(slug);
        if (!t) {
          setError('Template not found');
          return;
        }
        setTemplate(t);
        const rel = await getRelatedPublicTemplates(t.calculator_type, t.id);
        setRelated(rel);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load template');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const seoMeta = useMemo(() => {
    if (!template) return null;
    return {
      title: template.seo_title ?? `${template.name} | FRELUX`,
      description: template.seo_description ?? `${template.name}, use this template with the FRELUX ${calculatorLabel(template.calculator_type)} calculator.`,
      canonicalPath: `/templates/${template.slug}`,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: template.name,
        description: template.seo_description ?? template.description ?? '',
        author: { '@type': 'Organization', name: 'FRELUX' },
        publisher: { '@type': 'Organization', name: 'FRELUX' },
      },
    };
  }, [template]);

  useSeo(seoMeta ?? { title: 'Template', description: 'FRELUX calculator template', canonicalPath: `/templates/${slug}` });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600" />
        <h1 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">Template Not Found</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{error ?? 'This template may have been removed.'}</p>
        <Link to="/templates" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-purple dark:text-brand-purple-lighter">
          Browse all templates <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const calcPath = CALCULATOR_META[template.calculator_type].path;
  const inputSummary = buildInputSummary(template);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        <Link to="/" className="hover:text-brand-purple dark:hover:text-brand-purple-lighter">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/templates" className="hover:text-brand-purple dark:hover:text-brand-purple-lighter">Templates</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-neutral-700 dark:text-neutral-300">{template.name}</span>
      </div>

      {/* Header */}
      <div className="mt-6">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-purple/8 px-2.5 py-1 text-xs font-medium text-brand-purple dark:bg-brand-purple/15 dark:text-brand-purple-lighter">
          <Calculator className="h-3 w-3" />
          {calculatorLabel(template.calculator_type)}
        </span>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
          {template.name}
        </h1>
        {template.description && (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{template.description}</p>
        )}
      </div>

      {/* Explanatory content */}
      <div className="prose prose-sm mt-6 max-w-none dark:prose-invert">
        <p>
          This template is pre-configured for the {template.name.toLowerCase()} project. When you use this template,
          the FRELUX {calculatorLabel(template.calculator_type)} calculator will open with these inputs pre-filled.
          The calculator then runs the current calculation engine using today's material prices and coverage rules.
        </p>
      </div>

      {/* Input summary */}
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/10 dark:bg-brand-navy-mid">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-white">
          <Layers className="h-4 w-4 text-brand-purple" />
          Template Configuration
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {inputSummary.map((item) => (
            <div key={item.label} className="flex flex-col">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{item.label}</dt>
              <dd className="text-sm text-neutral-900 dark:text-white">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => navigate(`${calcPath}?template=${template.id}`)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-purple px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-purple-dark"
        >
          Use This Template
          <ArrowRight className="h-4 w-4" />
        </button>
        <Link
          to={calcPath}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-6 py-3 text-sm font-medium text-neutral-600 transition-colors hover:border-brand-purple/30 hover:text-brand-purple dark:border-white/10 dark:text-neutral-300"
        >
          Open {calculatorLabel(template.calculator_type)} Calculator
        </Link>
      </div>

      {/* Related templates */}
      {related.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">Related Templates</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {related.map((t) => (
              <Link
                key={t.id}
                to={`/templates/${t.slug}`}
                className="group flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 transition-colors hover:border-brand-purple/30 dark:border-white/10 dark:bg-brand-navy-mid"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{t.name}</p>
                  {t.description && <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">{t.description}</p>}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function buildInputSummary(template: DbCalculatorTemplate): { label: string; value: string }[] {
  const d = template.input_data;
  const parts: { label: string; value: string }[] = [];

  if (template.calculator_type === 'paint') {
    if (d.length) parts.push({ label: 'Length', value: `${d.length} ${d.unit ?? ''}` });
    if (d.width) parts.push({ label: 'Width', value: `${d.width} ${d.unit ?? ''}` });
    if (d.wallHeight) parts.push({ label: 'Wall Height', value: `${d.wallHeight} ${d.unit ?? ''}` });
    if (d.coats) parts.push({ label: 'Coats', value: String(d.coats) });
    if (d.projectType) parts.push({ label: 'Project Type', value: String(d.projectType) });
    if (d.includeCeiling) parts.push({ label: 'Ceiling', value: 'Included' });
    if (d.doors) parts.push({ label: 'Doors', value: String(d.doors) });
    if (d.windows) parts.push({ label: 'Windows', value: String(d.windows) });
    if (d.wasteMargin) parts.push({ label: 'Waste Margin', value: `${d.wasteMargin}%` });
  } else if (template.calculator_type === 'tile') {
    if (d.length) parts.push({ label: 'Length', value: `${d.length} ${d.unit ?? ''}` });
    if (d.width) parts.push({ label: 'Width', value: `${d.width} ${d.unit ?? ''}` });
    if (d.tileWidthMm) parts.push({ label: 'Tile Size', value: `${d.tileWidthMm}×${d.tileHeightMm}mm` });
    if (d.method) parts.push({ label: 'Method', value: String(d.method) });
    if (d.surfaceType) parts.push({ label: 'Surface', value: String(d.surfaceType) });
    if (d.wasteMargin) parts.push({ label: 'Waste Margin', value: `${d.wasteMargin}%` });
  } else if (template.calculator_type === 'screeding') {
    if (d.roomLength) parts.push({ label: 'Room Length', value: `${d.roomLength} ${d.unit ?? ''}` });
    if (d.roomWidth) parts.push({ label: 'Room Width', value: `${d.roomWidth} ${d.unit ?? ''}` });
    if (d.wallHeight) parts.push({ label: 'Wall Height', value: `${d.wallHeight} ${d.unit ?? ''}` });
    if (d.doors) parts.push({ label: 'Doors', value: String(d.doors) });
    if (d.windows) parts.push({ label: 'Windows', value: String(d.windows) });
  } else if (template.calculator_type === 'pop') {
    if (d.roomLength) parts.push({ label: 'Room Length', value: `${d.roomLength} ${d.unit ?? ''}` });
    if (d.roomWidth) parts.push({ label: 'Room Width', value: `${d.roomWidth} ${d.unit ?? ''}` });
    if (d.includeDecorative) parts.push({ label: 'Decorative', value: 'Included' });
    if (d.includeOptional) parts.push({ label: 'Optional Items', value: 'Included' });
    if (d.wasteMargin) parts.push({ label: 'Waste Margin', value: `${d.wasteMargin}%` });
  }

  return parts;
}
