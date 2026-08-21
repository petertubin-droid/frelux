import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, Loader2, AlertCircle, Clock, Award } from 'lucide-react';
import { getIcon } from '@/lib/icon-map';
import PageHeader from '@/components/ui/PageHeader';
import { supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import type { DbLearnCategory, DbLearnArticle } from '@/types/database';
import AskAiWidget from '@/components/learn/AskAiWidget';

type Status = 'loading' | 'ready' | 'error';

export default function Learn() {
  useSeo({
    title: 'Learn: Painting Guides, Tips & Tutorials',
    description: 'Explore painting guides, DIY tutorials, color psychology, buying guides, and expert tips to make your next paint project a success.',
    canonicalPath: '/learn',
    ogType: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'FRELUX Learn: Painting Guides & Tutorials',
      description: 'Educational hub for painting guides, DIY tutorials, color psychology, and more.',
    },
  });

  const [categories, setCategories] = useState<DbLearnCategory[]>([]);
  const [featured, setFeatured] = useState<DbLearnArticle[]>([]);
  const [recent, setRecent] = useState<DbLearnArticle[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [catRes, featRes, recentRes] = await Promise.all([
          supabase.from('learn_categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
          supabase.from('learn_articles').select('*').eq('status', 'published').eq('is_featured', true).order('published_at', { ascending: false }).limit(3),
          supabase.from('learn_articles').select('*').eq('status', 'published').order('published_at', { ascending: false }).limit(6),
        ]);

        setCategories((catRes.data ?? []) as DbLearnCategory[]);
        setFeatured((featRes.data ?? []) as DbLearnArticle[]);
        setRecent((recentRes.data ?? []) as DbLearnArticle[]);
        setStatus('ready');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setStatus('error');
      }
    }
    load();
  }, []);

  if (status === 'loading')
    return (
      <>
        <PageHeader eyebrow="Education" title="Learn" subtitle="Guides, tutorials, and expert tips to help you paint with confidence." breadcrumbs={[{ label: 'Learn Hub' }]} />
        <div className="flex items-center justify-center gap-2 py-32 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      </>
    );

  if (status === 'error')
    return (
      <>
        <PageHeader eyebrow="Education" title="Learn" subtitle="Guides, tutorials, and expert tips to help you paint with confidence." breadcrumbs={[{ label: 'Learn Hub' }]} />
        <div className="mx-auto max-w-md py-20 text-center"><AlertCircle className="mx-auto h-8 w-8 text-red-400" /><p className="mt-3 text-sm text-red-600">{error}</p></div>
      </>
    );

  return (
    <>
      <PageHeader eyebrow="Education" title="Learn" subtitle="Guides, tutorials, and expert tips to help you paint with confidence." breadcrumbs={[{ label: 'Learn Hub' }]} />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Featured articles */}
        {featured.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">Featured</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((article) => (
                <Link key={article.id} to={`/learn/${article.slug}`} className="group overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid transition-all hover:-translate-y-1 hover:shadow-lg">
                  {article.cover_image_url && (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img src={article.cover_image_url} alt={article.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2">
                      <Award className="h-3.5 w-3.5 text-accent-orange" />
                      <span className="text-xs font-semibold uppercase tracking-widest text-accent-orange">Featured</span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-brand-navy dark:text-white">{article.title}</h3>
                    {article.excerpt && <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">{article.excerpt}</p>}
                    <div className="mt-3 flex items-center gap-3 text-xs text-neutral-400">
                      {article.author && <span>{article.author}</span>}
                      {article.read_time_minutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {article.read_time_minutes} min read</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Browse by category */}
        <section className="mb-12">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">Browse by topic</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const IconComponent = getIcon(cat.icon);
              return (
                <Link key={cat.id} to={`/learn/category/${cat.slug}`} className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-5 transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md">
                  <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-brand-navy dark:text-white">{cat.name}</h3>
                    {cat.description && <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">{cat.description}</p>}
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple">
                      Explore <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent articles */}
        {recent.length > 0 && (
          <section>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">Latest articles</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((article) => (
                <Link key={article.id} to={`/learn/${article.slug}`} className="group overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid transition-all hover:-translate-y-1 hover:shadow-lg">
                  {article.cover_image_url && (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img src={article.cover_image_url} alt={article.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    </div>
                  )}
                  <div className="p-5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-brand-purple">{article.category_slug.replace(/-/g, ' ')}</span>
                    <h3 className="mt-2 text-base font-bold text-brand-navy dark:text-white">{article.title}</h3>
                    {article.excerpt && <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">{article.excerpt}</p>}
                    <div className="mt-3 flex items-center gap-3 text-xs text-neutral-400">
                      {article.author && <span>{article.author}</span>}
                      {article.read_time_minutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {article.read_time_minutes} min read</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {recent.length === 0 && featured.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-16 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="mt-4 text-sm font-semibold text-neutral-600">Articles coming soon</p>
            <p className="mt-1 text-xs text-neutral-400">We're preparing guides, tutorials, and tips. Check back shortly.</p>
          </div>
        )}
      </div>
      <AskAiWidget />
    </>
  );
}
