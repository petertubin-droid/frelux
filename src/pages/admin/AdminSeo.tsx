import { useEffect, useState } from 'react';
import { AdminHeader, AdminCard } from '@/components/admin/AdminUi';
import { FileText, Image, Code, CheckCircle2, XCircle, ExternalLink, Globe, Map, Bot } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SeoPageStatus {
  path: string;
  label: string;
  hasSeo: boolean;
  hasSchema: boolean;
  schemaTypes: string[];
}

const SEO_PAGES: SeoPageStatus[] = [
  { path: '/', label: 'Home', hasSeo: true, hasSchema: true, schemaTypes: ['WebApplication', 'FAQPage', 'BreadcrumbList'] },
  { path: '/paint-calculator', label: 'Paint Calculator', hasSeo: true, hasSchema: false, schemaTypes: [] },
  { path: '/cost-estimator', label: 'Cost Estimator', hasSeo: true, hasSchema: false, schemaTypes: [] },
  { path: '/screeding-calculator', label: 'Screeding Calculator', hasSeo: true, hasSchema: false, schemaTypes: [] },
  { path: '/pop-ceiling-calculator', label: 'POP Ceiling Calculator', hasSeo: true, hasSchema: false, schemaTypes: [] },
  { path: '/tile-calculator', label: 'Tile Calculator', hasSeo: true, hasSchema: false, schemaTypes: [] },
  { path: '/colors', label: 'Color Library', hasSeo: true, hasSchema: true, schemaTypes: ['CollectionPage'] },
  { path: '/ai-color-assistant', label: 'AI Color Assistant', hasSeo: true, hasSchema: false, schemaTypes: [] },
  { path: '/learn', label: 'Learn Hub', hasSeo: true, hasSchema: true, schemaTypes: ['Article'] },
  { path: '/about', label: 'About', hasSeo: true, hasSchema: false, schemaTypes: [] },
  { path: '/privacy-policy', label: 'Privacy Policy', hasSeo: true, hasSchema: false, schemaTypes: [] },
  { path: '/terms', label: 'Terms of Service', hasSeo: true, hasSchema: false, schemaTypes: [] },
];

export default function AdminSeo() {
  const [articleCount, setArticleCount] = useState<number | null>(null);
  const [colorCount, setColorCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [artRes, colorRes] = await Promise.all([
          supabase.from('learn_articles').select('*', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('paint_colors').select('*', { count: 'exact', head: true }),
        ]);
        setArticleCount(artRes.count ?? 0);
        setColorCount(colorRes.count ?? 0);
      } catch {
        setArticleCount(0);
        setColorCount(0);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <AdminHeader title="SEO Settings" subtitle="Search engine optimization status, structured data coverage, and indexing tools." />

      {/* Quick Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCard className="p-5">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-brand-purple" />
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">SEO Pages</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-brand-navy dark:text-white">{SEO_PAGES.length}</p>
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Pages with meta tags</p>
        </AdminCard>
        <AdminCard className="p-5">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-accent-green" />
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Schema Pages</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-brand-navy dark:text-white">{SEO_PAGES.filter(p => p.hasSchema).length}</p>
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Pages with structured data</p>
        </AdminCard>
        <AdminCard className="p-5">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent-orange" />
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Learn Articles</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-brand-navy dark:text-white">{loading ? '…' : articleCount}</p>
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Published articles (Article schema)</p>
        </AdminCard>
        <AdminCard className="p-5">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-accent-cyan" />
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Colors</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-brand-navy dark:text-white">{loading ? '…' : colorCount}</p>
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Colors indexed (CollectionPage)</p>
        </AdminCard>
      </div>

      {/* SEO Files */}
      <AdminCard className="mb-6 p-5">
        <h2 className="text-sm font-bold text-brand-navy dark:text-white">SEO Infrastructure Files</h2>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">These files are deployed and accessible by search engines.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SeoFileCard icon={Map} label="sitemap.xml" url="/sitemap.xml" description="XML sitemap with all public URLs and image entries" />
          <SeoFileCard icon={Bot} label="robots.txt" url="/robots.txt" description="Crawl directives for Googlebot, Bingbot, and other crawlers" />
          <SeoFileCard icon={FileText} label="manifest.json" url="/manifest.json" description="PWA manifest for installable web app" />
        </div>
      </AdminCard>

      {/* Google Search Console */}
      <AdminCard className="mb-6 p-5">
        <h2 className="text-sm font-bold text-brand-navy dark:text-white">Google Search Console</h2>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Submit your sitemap and monitor indexing status.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-purple/90">
            <ExternalLink className="h-4 w-4" /> Open Search Console
          </a>
          <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-neutral-700 dark:text-neutral-300">
            <ExternalLink className="h-4 w-4" /> Rich Results Test
          </a>
          <a href="https://pagespeed.web.dev/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-neutral-700 dark:text-neutral-300">
            <ExternalLink className="h-4 w-4" /> PageSpeed Insights
          </a>
        </div>
      </AdminCard>

      {/* Page-by-page SEO coverage */}
      <AdminCard className="mb-6 p-5">
        <h2 className="text-sm font-bold text-brand-navy dark:text-white">SEO Coverage by Page</h2>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Meta tags, Open Graph, and structured data status per route.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="py-2 pr-4 font-semibold text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Page</th>
                <th className="py-2 pr-4 font-semibold text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Path</th>
                <th className="py-2 pr-4 font-semibold text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Meta Tags</th>
                <th className="py-2 pr-4 font-semibold text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Structured Data</th>
              </tr>
            </thead>
            <tbody>
              {SEO_PAGES.map((page) => (
                <tr key={page.path} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="py-2.5 pr-4 font-medium text-brand-navy dark:text-white">{page.label}</td>
                  <td className="py-2.5 pr-4 text-neutral-400 dark:text-neutral-500">{page.path}</td>
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-green">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    {page.hasSchema ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-green">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {page.schemaTypes.join(', ')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-400 dark:text-neutral-500">
                        <XCircle className="h-3.5 w-3.5" /> None
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* SEO Features Overview */}
      <AdminCard className="p-5">
        <h2 className="text-sm font-bold text-brand-navy dark:text-white">Implemented SEO Features</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FeatureItem label="Canonical URLs" description="Every page sets a canonical link tag to prevent duplicate content issues" />
          <FeatureItem label="Open Graph + Twitter Cards" description="Per-page OG and Twitter meta tags via useSeo hook" />
          <FeatureItem label="JSON-LD Structured Data" description="WebApplication, FAQPage, BreadcrumbList, Article, and CollectionPage schemas" />
          <FeatureItem label="Sitemap with Image Entries" description="XML sitemap includes lastmod dates and image sitemap support" />
          <FeatureItem label="Bots.txt with Bot Rules" description="Googlebot, Bingbot, Yandex, DuckDuckBot rules with crawl delays" />
          <FeatureItem label="PWA Manifest" description="Installable web app with shortcuts for calculators and tools" />
          <FeatureItem label="Mobile Web App Meta" description="apple-mobile-web-app, format-detection, msapplication meta tags" />
          <FeatureItem label="DNS Prefetch + Preconnect" description="Performance hints for fonts, analytics, and CDN resources" />
          <FeatureItem label="Per-page SEO Hook" description="useSeo hook manages title, description, keywords, OG, and canonical per route" />
          <FeatureItem label="Cache Headers" description="Proper Content-Type and caching for sitemap, robots, and manifest" />
        </div>
      </AdminCard>
    </>
  );
}

function SeoFileCard({ icon: Icon, label, url, description }: { icon: typeof Map; label: string; url: string; description: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="group rounded-lg border border-neutral-200 p-4 transition-all hover:border-brand-purple hover:shadow-sm dark:border-neutral-700">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-purple" />
        <span className="text-sm font-bold text-brand-navy dark:text-white">{label}</span>
        <ExternalLink className="ml-auto h-3 w-3 text-neutral-300 transition-colors group-hover:text-brand-purple" />
      </div>
      <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">{description}</p>
    </a>
  );
}

function FeatureItem({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-green" />
      <div>
        <p className="text-sm font-semibold text-brand-navy dark:text-white">{label}</p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">{description}</p>
      </div>
    </div>
  );
}
