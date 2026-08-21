import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';

import SectionHeading from '@/components/ui/SectionHeading';
import { fetchColorCombinations, fetchColorCategories } from '@/lib/queries';
import type { DbColorCombination, DbColorCategory } from '@/types/database';

export default function ColorPreview() {
  const [combinations, setCombinations] = useState<DbColorCombination[]>([]);
  const [categories, setCategories] = useState<DbColorCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [combRes, catRes] = await Promise.all([fetchColorCombinations(), fetchColorCategories()]);
      setCombinations(combRes.data.slice(0, 3));
      setCategories(catRes.data);
      setLoading(false);
    }
    load();
  }, []);

  function catName(id: string): string {
    return categories.find((c) => c.id === id)?.name ?? '';
  }

  return (
    <section data-tour="colors" className="bg-white py-24 sm:py-28 dark:bg-brand-navy">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            label="Color ideas"
            title="Find colors that fit your space"
            subtitle="Browse curated palettes for every room and style, from calm neutrals to bold statements."
          />
          <Link to="/colors" className="btn-outline shrink-0">
            View all colors
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading && (
            <div className="col-span-full flex items-center justify-center gap-2 py-16 text-sm text-neutral-400 dark:text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading color palettes…
            </div>
          )}
          {!loading && combinations.length === 0 && (
            <div className="col-span-full py-16 text-center text-sm text-neutral-400 dark:text-neutral-500">
              No color combinations published yet.
            </div>
          )}
          {combinations.map((c) => (
            <Link
              key={c.id}
              to={`/colors/${c.slug}`}
              className="card-hover group overflow-hidden rounded-2xl border border-neutral-200/60 bg-white dark:border-white/5 dark:bg-brand-navy-mid"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={c.image_url}
                  alt={c.title}
                  width={400}
                  height={300}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 flex gap-1 bg-white/90 p-3 backdrop-blur-md">
                  {[c.main_color_code, c.secondary_color_code, c.accent_color_code].map((hex) => (
                    <div
                      key={hex}
                      className="h-8 flex-1 rounded-lg ring-1 ring-black/5"
                      style={{ background: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
              <div className="p-6">
                {(c.category_ids ?? []).length > 0 && (
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-purple">
                    {catName(c.category_ids[0])}
                  </p>
                )}
                <h3 className="mt-1.5 font-display text-lg font-bold text-neutral-900">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 line-clamp-2">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
