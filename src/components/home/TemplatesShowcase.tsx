import { Link } from 'react-router-dom';
import { Save, Copy, Heart, Share2, FileText, ArrowRight, Bookmark, FolderOpen } from 'lucide-react';
import Container from '@/components/ui/Container';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const templateActions = [
  {
    icon: Save,
    title: 'Save',
    description: 'Store your calculation for later',
  },
  {
    icon: FileText,
    title: 'Rename',
    description: 'Organize with descriptive names',
  },
  {
    icon: Copy,
    title: 'Duplicate',
    description: 'Clone and adjust for new projects',
  },
  {
    icon: Heart,
    title: 'Favorite',
    description: 'Bookmark your most-used estimates',
  },
  {
    icon: Share2,
    title: 'Share',
    description: 'Send a link to your contractor',
  },
  {
    icon: FolderOpen,
    title: 'Reuse',
    description: 'Start from a previous estimate',
  },
];

export default function TemplatesShowcase() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-24 dark:bg-brand-navy bg-noise">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-30" aria-hidden="true" />

      <Container className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-purple">Saved calculations</span>
          <h2 className="mt-3 font-display text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
            Save, reuse & share your estimates
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-500 dark:text-neutral-400">
            Every calculation is a reusable template. Organize your projects, duplicate past estimates, and share with your team.
          </p>
        </div>

        {/* Template action cards */}
        <div ref={ref} className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templateActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <div
                key={action.title}
                className="group flex items-start gap-4 rounded-2xl border border-neutral-200/60 bg-white p-5 transition-all duration-300 hover:border-brand-purple/20 hover:shadow-premium dark:border-white/5 dark:bg-brand-navy-mid dark:hover:border-brand-purple/30"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
                  transitionDelay: `${i * 60}ms`,
                  transitionDuration: '500ms',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-purple/8 text-brand-purple transition-all duration-300 group-hover:bg-brand-purple group-hover:text-white group-hover:scale-105 dark:bg-brand-purple/15 dark:text-brand-purple-lighter">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-white">{action.title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{action.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Example template preview */}
        <div className="mt-12 mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-premium dark:border-white/10 dark:bg-brand-navy-mid">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-brand-purple/8 px-2.5 py-1 text-xs font-medium text-brand-purple dark:bg-brand-purple/15 dark:text-brand-purple-lighter">
                  <FileText className="h-3 w-3" />
                  Painting
                </span>
                <span className="flex items-center gap-0.5 text-xs text-amber-500">
                  <Bookmark className="h-3 w-3 fill-amber-500" />
                </span>
              </div>
              <span className="text-xs text-neutral-400">3 months ago</span>
            </div>
            <div className="px-5 py-4">
              <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">Living Room, 2 Coats</h3>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">12 × 12 ft · 2 coats · Premium emulsion</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
                <span>14 L paint</span>
                <span>·</span>
                <span>2 buckets</span>
                <span>·</span>
                <span>38 m² area</span>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-neutral-100 px-5 py-3 dark:border-white/5">
              <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-brand-purple/5 hover:text-brand-purple dark:text-neutral-400 dark:hover:text-brand-purple-lighter">
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </button>
              <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-brand-purple/5 hover:text-brand-purple dark:text-neutral-400 dark:hover:text-brand-purple-lighter">
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
              <Link
                to="/my-templates"
                className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-purple transition-all hover:gap-2 dark:text-brand-purple-lighter"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            to="/templates"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-purple px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 transition-all hover:bg-brand-purple-dark hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Browse all templates
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
