import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { fetchColorBySlug, fetchRelatedColors, fetchColorCategories } from '@/lib/queries';
import { logAnalyticsEvent } from '@/lib/queries';
import { useSeo } from '@/lib/seo';
import type { DbColorCombination, DbColorCategory } from '@/types/database';
import AdSlot from '@/components/ui/AdSlot';
import NotFound from '@/pages/NotFound';

type Status = 'loading' | 'ready' | 'error';

export default function ColorDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [color, setColor] = useState<DbColorCombination | null>(null);
  const [related, setRelated] = useState<DbColorCombination[]>([]);
  const [categories, setCategories] = useState<DbColorCategory[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useSeo({
    title: color ? `${color.title}: Color Combination` : 'Color Combination',
    description:
      color?.description ?? 'View this curated paint color combination with color codes, recommended rooms, and styling tips.',
    canonicalPath: color ? `/colors/${color.slug}` : '/colors',
    ogType: 'article',
    ogImage: color?.image_url,
    noIndex: !color || !color.is_published,
  });

  useEffect(() => {
    async function load() {
      if (!slug) return;
      setStatus('loading');
      const { data, error } = await fetchColorBySlug(slug);
      if (error) {
        setStatus('error');
        return;
      }
      if (!data) {
        setStatus('ready');
        setColor(null);
        return;
      }
      setColor(data);
      const [relRes, catRes] = await Promise.all([
        fetchRelatedColors(data.category_ids ?? [], data.id),
        fetchColorCategories(),
      ]);
      setRelated(relRes.data);
      setCategories(catRes.data);
      setStatus('ready');
      logAnalyticsEvent('color_page_viewed', { slug: data.slug });
    }
    load();
  }, [slug]);

  function copy(hex: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hex);
      setCopied(hex);
      window.setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1500);
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-sm text-neutral-500">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle aria-hidden="true" className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-3 text-sm font-semibold text-red-700">Couldn’t load this color combination.</p>
        <Link to="/colors" className="mt-4 inline-block text-sm font-semibold text-brand-purple hover:underline">
          Back to color ideas
        </Link>
      </div>
    );
  }

  if (!color) return <NotFound />;

  const swatches = [
    { label: 'Main color', name: color.main_color_name, hex: color.main_color_code },
    { label: 'Secondary color', name: color.secondary_color_name, hex: color.secondary_color_code },
    { label: 'Accent color', name: color.accent_color_name, hex: color.accent_color_code },
  ];
  const colorCats = categories.filter((c) => (color.category_ids ?? []).includes(c.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        to="/colors"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-brand-purple"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        All color ideas
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <img src={color.image_url} alt={color.title} className="h-full w-full object-cover" loading="lazy" />
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5">
            {colorCats.map((cat) => (
              <span
                key={cat.id}
                className="rounded-full bg-brand-purple/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-purple"
              >
                {cat.name}
              </span>
            ))}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl dark:text-white">{color.title}</h1>
          <p className="mt-3 text-base leading-relaxed text-neutral-600">{color.description}</p>

          <div className="mt-6 space-y-3">
            {swatches.map((s) => (
              <div
                key={s.hex}
                className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-3 dark:border-white/5 dark:bg-brand-navy-mid"
              >
                <div
                  className="h-12 w-12 shrink-0 rounded-md ring-1 ring-black/10"
                  style={{ background: s.hex }}
                />
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">{s.label}</p>
                  <p className="text-sm font-semibold text-brand-navy dark:text-white">{s.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copy(s.hex)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:border-neutral-300 hover:text-brand-purple dark:border-white/5 dark:text-neutral-300 dark:hover:text-brand-purple-lighter"
                >
                  {copied === s.hex ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-accent-green" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
                  {copied === s.hex ? 'Copied' : s.hex}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Recommended rooms" value={(color.recommended_rooms ?? []).join(', ') || 'N/A'} />
            <Info label="Style" value={color.style} />
          </div>
        </div>
      </div>

      <AdSlot slotKey="color_detail_mid" className="my-10" />

      {related.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-brand-navy dark:text-white">Related combinations</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((c) => (
              <Link
                key={c.id}
                to={`/colors/${c.slug}`}
                className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all dark:border-white/5 dark:bg-brand-navy-mid hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={c.image_url}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 flex gap-1 bg-white/90 p-2 backdrop-blur">
                    {[c.main_color_code, c.secondary_color_code, c.accent_color_code].map((hex) => (
                      <div
                        key={hex}
                        className="h-5 flex-1 rounded ring-1 ring-black/5"
                        style={{ background: hex }}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-base font-bold text-brand-navy dark:text-white">{c.title}</h3>
                  <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{c.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-white/5 dark:border-white/5 dark:bg-brand-navy-mid">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">{label}</p>
      <p className="mt-1 text-sm text-neutral-700">{value}</p>
    </div>
  );
}
