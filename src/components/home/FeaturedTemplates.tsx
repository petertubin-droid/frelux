import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, BadgeCheck } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import { getPublicTemplates, calculatorLabel } from '@/lib/templates';
import { CALCULATOR_META } from '@/lib/templates';
import type { DbCalculatorTemplate, CalculatorType } from '@/types/database';

/**
 * Featured Templates section for the homepage.
 * Shows curated public templates that users can click to pre-fill calculators.
 * Links are real <a href> tags (via react-router Link) so crawlers can follow them.
 * Section uses semantic HTML (section, h2, h3, article, nav) for SEO.
 */
export default function FeaturedTemplates() {
  const [templates, setTemplates] = useState<DbCalculatorTemplate[]>([]);
  const [loading, setLoading] = useState(true);

const mountedRef = useRef(true);
    useEffect(() => {
    (async () => {
      try {
        // Fetch only featured templates, fallback data handles no-DB case
        const data = await getPublicTemplates({ featuredOnly: true });
        // Show up to 8 on the homepage
        setTemplates(data.slice(0, 8));
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    })();
  
    return () => { mountedRef.current = false; };
  }, []);

  if (loading) {
    return (
      <section aria-label="Featured calculator templates" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          label="Templates"
          title="Popular Calculator Templates"
          subtitle="Pre-configured scenarios for common Nigerian construction projects. Pick one to start calculating instantly."
        />
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/5" />
          ))}
        </div>
      </section>
    );
  }

  if (templates.length === 0) return null;

  return (
    <section
      aria-label="Featured calculator templates"
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
    >
      <SectionHeading
        label="Templates"
        title="Popular Calculator Templates"
        subtitle="Pre-configured scenarios for common Nigerian construction projects. Pick one to start calculating instantly."
      />

      <nav aria-label="Featured templates" className="mt-8">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {templates.map((template) => {
            const meta = CALCULATOR_META[template.calculator_type as CalculatorType];
            const href = template.slug ? `/templates/${template.slug}` : meta?.path ?? '/templates';
            return (
              <li key={template.id}>
                <article className="group flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 transition-all duration-200 hover:border-brand-purple/30 hover:shadow-md dark:border-white/10 dark:bg-brand-navy-mid dark:hover:border-brand-purple/40">
                  {/* Calculator type badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-purple/8 px-2.5 py-1 text-xs font-medium text-brand-purple dark:bg-brand-purple/15 dark:text-brand-purple-lighter">
                      <Calculator className="h-3 w-3" />
                      {calculatorLabel(template.calculator_type)}
                    </span>
                    {template.is_featured && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-500" title="Featured">
                        <BadgeCheck className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  {/* Template name */}
                  <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">
                    {template.name}
                  </h3>

                  {/* Description */}
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {template.description}
                  </p>

                  {/* CTA link */}
                  <Link
                    to={href}
                    className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-brand-purple transition-colors hover:text-brand-purple-dark dark:text-brand-purple-lighter dark:hover:text-white"
                  >
                    Use template
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* View all templates link */}
      <div className="mt-8 text-center">
        <Link
          to="/templates"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-brand-purple/30 hover:text-brand-purple dark:border-white/10 dark:text-neutral-300 dark:hover:border-brand-purple/40 dark:hover:text-brand-purple-lighter"
        >
          Browse all templates
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
