import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

// ── FAQ Section ────────────────────────────────────────────────────

interface FaqItem {
  question: string;
  answer: ReactNode;
}

export function FaqSection({ title = 'Frequently Asked Questions', faqs }: { title?: string; faqs: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6" aria-label={title}>
      <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{title}</h2>
      <div className="mt-6 space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-neutral-200/60 bg-white dark:border-white/8 dark:bg-brand-navy-mid"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={openIndex === i}
            >
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">{faq.question}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200 ${
                  openIndex === i ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === i && (
              <div className="px-5 pb-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-500">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Related Calculators ─────────────────────────────────────────────

interface RelatedLink {
  label: string;
  path: string;
  description?: string;
}

export function RelatedTools({ title = 'Related calculators & tools', links }: { title?: string; links: RelatedLink[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-label={title}>
      <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">{title}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200/60 bg-white px-5 py-4 transition-all hover:border-brand-purple/30 hover:bg-brand-purple/5 hover:-translate-y-0.5 dark:border-white/8 dark:bg-brand-navy-mid dark:hover:border-brand-purple/30 dark:hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">{link.label}</p>
              {link.description && (
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">{link.description}</p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-brand-purple opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── SEO Content Section ─────────────────────────────────────────────

export function SeoContent({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="space-y-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-500">
        {children}
      </div>
    </section>
  );
}

// ── Standard related calculator groups ──────────────────────────────

const CALC_LINKS = {
  paintCalculator: { label: 'Painting Calculator', path: '/paint-calculator', description: 'Paint quantity, cost & room estimate' },
  screedingCalc: { label: 'Screeding Calculator', path: '/screeding-calculator', description: 'Screeding quantity & cost' },
  popCeilingCalc: { label: 'POP Ceiling Calculator', path: '/pop-ceiling-calculator', description: 'POP material quantity & cost' },
  tileCalc: { label: 'Tile Calculator', path: '/tile-calculator', description: 'Tile quantity, boxes & cost' },
  finishEstimator: { label: 'Finishing Calculator', path: '/finish-estimator', description: 'Painting, Tyrolene & Grafitex' },
  aiColor: { label: 'Smart Color Assistant', path: '/ai-color-assistant', description: 'AI color ideas' },
  colors: { label: 'Color Library', path: '/colors', description: 'Browse paint colors' },
  compareColors: { label: 'Compare Colors', path: '/colors/compare', description: 'Side-by-side comparison' },
  buildToRoof: { label: 'Build-to-Roof Estimator', path: '/build-to-roof-estimator', description: 'Full build cost from foundation to roof' },
  imageEstimator: { label: 'AI Photo Estimator', path: '/image-estimator', description: 'Upload a photo for AI cost estimation' },
  structuralCalc: { label: 'Structural Calculator', path: '/structural-calculator', description: 'Beams, columns & slabs' },
  foundationCalc: { label: 'Foundation Calculator', path: '/foundation-calculator', description: 'Foundation sizing & materials' },
  constructionSeq: { label: 'Construction Sequence', path: '/construction-sequence', description: 'Step-by-step build timeline' },
};

export { CALC_LINKS };
