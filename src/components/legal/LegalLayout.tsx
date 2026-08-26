import { useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Loader2, FileText, Shield, ScrollText } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { useLegalPage } from '@/lib/useLegalPage';
import { classNames } from '@/lib/utils';
import Container from '@/components/ui/Container';
import AdSlot from '@/components/ui/AdSlot';

export default function LegalLayout({
  slug,
  title,
  updated,
  intro,
  sections,
}: {
  slug: string;
  title: string;
  updated?: string;
  intro?: ReactNode;
  sections: { heading: string; body: ReactNode }[];
}) {
  const { page, loading } = useLegalPage(slug);
  const published = Boolean(page);
  const [activeSection, setActiveSection] = useState<string>('');

  // Track scroll position for active section highlighting
  useEffect(() => {
    if (loading || published) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    sections.forEach((s) => {
      const el = document.getElementById(`section-${s.heading.replace(/\s+/g, '-').toLowerCase()}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [loading, published, sections]);

  const slugify = (s: string) => s.replace(/\s+/g, '-').toLowerCase();

  return (
    <>
      {/* Premium Hero Header */}
      <section className="relative overflow-hidden bg-mesh text-white">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-brand-purple/20 blur-[120px]" />
        </div>
        <Container className="relative py-14 sm:py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md transition-colors hover:text-white"
          >
            <ChevronLeft className="h-3 w-3" />
            Home
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-purple/20 backdrop-blur-sm">
              <FileText className="h-5 w-5 text-brand-purple-light" />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60">
              <Shield className="h-3 w-3" />
              Legal
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
            {loading ? 'Loading…' : published ? page!.title : title}
          </h1>
          {(updated || published) && (
            <p className="mt-3 text-sm text-white/50">
              Last updated {published
                ? new Date(page!.updated_at ?? new Date().toISOString()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : new Date(updated ?? new Date().toISOString()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
          {intro && !loading && !published && (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60">{intro}</p>
          )}
        </Container>
      </section>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-500 dark:text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : published ? (
        /* Published content from admin */
        <Container className="py-12">
          <div className="mx-auto max-w-3xl">
            <div className="prose prose-neutral max-w-none dark:prose-invert">
              <div className="space-y-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {page!.content.split(/\n\n+/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
            <AdSlot slotKey="legal_bottom" className="mt-10" />
          </div>
        </Container>
      ) : (
        /* Draft fallback with premium layout */
        <Container className="py-12">
          <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
            {/* Sticky Table of Contents */}
            <aside className="hidden lg:block">
              <nav className="sticky top-24 space-y-1">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                  Contents
                </p>
                {sections.map((s) => (
                  <a
                    key={s.heading}
                    href={`#section-${slugify(s.heading)}`}
                    className={classNames(
                      'block rounded-lg px-3 py-2 text-sm transition-colors',
                      activeSection === `section-${slugify(s.heading)}`
                        ? 'bg-brand-purple/10 font-medium text-brand-purple dark:bg-brand-purple/15 dark:text-brand-purple-lighter'
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200'
                    )}
                  >
                    {s.heading}
                  </a>
                ))}
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-white/5 dark:bg-white/5">
                  <ScrollText className="h-3.5 w-3.5 text-neutral-500" />
                  <span className="text-xs text-neutral-500 dark:text-neutral-500">{siteConfig.name}</span>
                </div>
              </nav>
            </aside>

            {/* Main Content */}
            <div className="min-w-0">
              {intro && (
                <div className="mb-8 rounded-2xl border border-brand-purple/15 bg-brand-purple/5 p-5 dark:border-brand-purple/20 dark:bg-brand-purple/10">
                  <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{intro}</p>
                </div>
              )}

              <div className="space-y-6">
                {sections.map((s) => (
                  <section
                    key={s.heading}
                    id={`section-${slugify(s.heading)}`}
                    className="scroll-mt-24 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/5 dark:bg-brand-navy-mid"
                  >
                    <h2 className="flex items-center gap-2 text-lg font-bold text-brand-navy dark:text-white">
                      <span className="h-5 w-1 rounded-full bg-brand-purple" />
                      {s.heading}
                    </h2>
                    <div className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                      {s.body}
                    </div>
                  </section>
                ))}
              </div>

              {/* Ad placement */}
              <div className="mt-8">
                <AdSlot slotKey="legal_bottom" />
              </div>

              {/* Footer note */}
              <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/5 dark:bg-white/5">
                <p className="text-xs text-neutral-500 dark:text-neutral-500">
                  {siteConfig.name} · This document is provided for informational purposes. For questions about this policy,{' '}
                  <Link to="/contact" className="font-medium text-brand-purple hover:underline dark:text-brand-purple-lighter">contact us</Link>.
                </p>
              </div>
            </div>
          </div>
        </Container>
      )}
    </>
  );
}
