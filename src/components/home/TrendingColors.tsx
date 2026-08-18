import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Award, Clock, ArrowRight } from 'lucide-react';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import { fetchTrendingColors, fetchFeaturedColors, fetchRecentlyAddedColors } from '@/lib/queries';
import { readableTextColor } from '@/lib/colors';
import type { DbPaintColor } from '@/types/database';

export default function TrendingColors() {
  const [trending, setTrending] = useState<DbPaintColor[]>([]);
  const [featured, setFeatured] = useState<DbPaintColor[]>([]);
  const [recent, setRecent] = useState<DbPaintColor[]>([]);

  useEffect(() => {
    Promise.all([fetchTrendingColors(6), fetchFeaturedColors(6), fetchRecentlyAddedColors(6)])
      .then(([t, f, r]) => {
        setTrending(t.data);
        setFeatured(f.data);
        setRecent(r.data);
      });
  }, []);

  if (trending.length === 0 && featured.length === 0 && recent.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-neutral-50/50 py-24 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-30" aria-hidden="true" />

      <SectionHeading
        label="Color inspiration"
        title="Trending & featured colors"
        subtitle="Explore what's popular right now, from timeless classics to the latest trending shades."
        align="center"
      />

      <Container className="relative mt-16 space-y-14">
        {/* Trending */}
        {trending.length > 0 && (
          <ColorRow icon={TrendingUp} title="Trending Colors" colors={trending} />
        )}

        {/* Featured */}
        {featured.length > 0 && (
          <ColorRow icon={Award} title="Featured Colors" colors={featured} />
        )}

        {/* Recently added */}
        {recent.length > 0 && (
          <ColorRow icon={Clock} title="Recently Added" colors={recent} />
        )}

        <div className="text-center">
          <Link to="/colors" className="group inline-flex items-center gap-2 rounded-xl bg-brand-purple px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 transition-all hover:bg-brand-purple-dark hover:shadow-xl active:scale-[0.98]">
            Browse all colors <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

function ColorRow({ icon: Icon, title, colors }: { icon: typeof TrendingUp; title: string; colors: DbPaintColor[] }) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-purple/8 text-brand-purple">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="font-display text-lg font-bold text-neutral-900">{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {colors.map((c) => (
          <Link
            key={c.id}
            to={`/colors/paint/${c.slug}`}
            className="card-hover group overflow-hidden rounded-xl border border-neutral-200/60 bg-white"
          >
            <div className="aspect-square" style={{ background: c.hex_code }}>
              <span
                className="flex h-full items-center justify-center text-xs font-bold uppercase opacity-60"
                style={{ color: readableTextColor(c.hex_code) }}
              >
                {c.hex_code}
              </span>
            </div>
            <div className="p-3">
              <p className="truncate text-xs font-semibold text-neutral-900">{c.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
