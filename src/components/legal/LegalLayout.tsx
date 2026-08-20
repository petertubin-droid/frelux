import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { useLegalPage } from '@/lib/useLegalPage';

// Renders a legal page. When a published version exists in Supabase, it is
// shown as final content. Otherwise the built-in draft `sections` are shown
// with a clear "draft" notice — so public visitors never see raw placeholder
// text presented as final legal content.
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-brand-purple dark:text-neutral-400 dark:hover:text-brand-purple-lighter"
      >
        <ChevronLeft className="h-4 w-4" />
        Home
      </Link>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-400 dark:text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : published ? (
        // Published content from the admin panel
        <article>
          <header className="mt-6 border-b border-neutral-200 pb-6 dark:border-white/5">
            <p className="section-label mb-2">Legal</p>
            <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl dark:text-white">{page!.title}</h1>
            <p className="mt-2 text-sm text-neutral-400 dark:text-neutral-500">
              Last updated {new Date(page!.updated_at).toLocaleDateString()}
            </p>
          </header>
          <div className="mt-8 space-y-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {page!.content.split(/\n\n+/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </article>
      ) : (
        // Draft fallback (built-in Phase 1 content)
        <>
          <header className="mt-6 border-b border-neutral-200 pb-6 dark:border-white/5">
            <p className="section-label mb-2">Legal</p>
            <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl dark:text-white">{title}</h1>
            {updated && <p className="mt-2 text-sm text-neutral-400 dark:text-neutral-500">Draft · last updated {updated}</p>}
            {intro && <div className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">{intro}</div>}
          </header>

          <div className="mt-8 space-y-8">
            {sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-lg font-bold text-brand-navy dark:text-white">{s.heading}</h2>
                <div className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{s.body}</div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-neutral-500">
            This page is draft content for {siteConfig.name} and will be finalized before launch. It does not yet
            represent final legal terms. Please consult a qualified professional before relying on it.
          </div>
        </>
      )}
    </div>
  );
}
