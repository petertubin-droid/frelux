import { useEffect, useState, type ReactNode } from 'react';
import { Search, AlertCircle, Grid3x3, Palette } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import AdSlot from '@/components/ui/AdSlot';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonGrid } from '@/components/ui/Skeleton';
import ColorCard from '@/components/colors/ColorCard';
import { fetchPaintColors, fetchColorFamilies, fetchColorCategories, fetchColorCombinations, logAnalyticsEvent, fetchFavoriteColorIds, toggleFavoriteColor } from '@/lib/queries';
import { track } from '@/lib/analytics';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/lib/auth';
import type { DbPaintColor, DbColorFamily, DbColorCategory, DbColorCombination } from '@/types/database';
import { classNames } from '@/lib/utils';
import { Link } from 'react-router-dom';

type Tab = 'colors' | 'palettes';
type Status = 'loading' | 'error' | 'ready';

// Representative colors for each family (for the chart)
const familySwatchColors: Record<string, string> = {
  'White': '#F5F5F0',
  'Black': '#1A1A1A',
  'Gray': '#8C8C8C',
  'Beige': '#E3D5B5',
  'Blue': '#1B3A5C',
  'Green': '#2C4A3E',
  'Brown': '#6F4E37',
  'Red': '#9E1B32',
  'Yellow': '#EAB308',
  'Orange': '#C97B5A',
  'Purple': '#5C2E5A',
  'Pink': '#F8C8DC',
};

export default function Colors() {
  useSeo({
    title: 'Color Library — Paint Colors & Palettes',
    description: 'Browse hundreds of professional paint colors and curated color palettes. Filter by color family, room type, style, and more.',
    canonicalPath: '/colors',
    ogType: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'FRELUX Color Library — Paint Colors & Palettes',
      description: 'Browse hundreds of professional paint colors and curated color palettes. Filter by color family, room type, style, and more.',
    },
  });

  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('colors');
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // Colors state
  const [colors, setColors] = useState<DbPaintColor[]>([]);
  const [families, setFamilies] = useState<DbColorFamily[]>([]);
  const [categories, setCategories] = useState<DbColorCategory[]>([]);
  const [totalColors, setTotalColors] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [query, setQuery] = useState('');
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sort, setSort] = useState<'popularity' | 'name' | 'newest' | 'display_order'>('display_order');
  const [favIds, setFavIds] = useState<string[]>([]);

  // Palettes state
  const [palettes, setPalettes] = useState<DbColorCombination[]>([]);
  const [paletteQuery, setPaletteQuery] = useState('');

  useEffect(() => {
    async function loadInitial() {
      const [famRes, catRes] = await Promise.all([fetchColorFamilies(), fetchColorCategories()]);
      setFamilies(famRes.data);
      setCategories(catRes.data);
      if (user) {
        const { ids } = await fetchFavoriteColorIds();
        setFavIds(ids);
      }
    }
    loadInitial();
  }, [user]);

  useEffect(() => {
    if (tab === 'colors') loadColors();
    else loadPalettes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, familyId, categoryId, filterType, sort, query]);

  async function loadColors() {
    setStatus('loading');
    setErrorMsg('');
    const isInterior = filterType === 'interior' ? true : filterType === 'exterior' ? false : null;
    const isFeatured = filterType === 'featured' ? true : null;
    const isTrending = filterType === 'trending' ? true : null;

    const { data, total, error } = await fetchPaintColors({
      query: query || undefined,
      familyId,
      categoryId,
      isInterior,
      isExterior: filterType === 'exterior' ? true : null,
      isFeatured,
      isTrending,
      sort,
      page,
      pageSize,
    });
    if (error) {
      setErrorMsg(error);
      setStatus('error');
      return;
    }
    setColors(data);
    setTotalColors(total);
    setStatus('ready');
    track('color_library_viewed', { tab: 'colors' });
    logAnalyticsEvent('color_library_viewed', { tab: 'colors' });
  }

  async function loadPalettes() {
    setStatus('loading');
    setErrorMsg('');
    const { data, error } = await fetchColorCombinations();
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
      return;
    }
    setPalettes(data);
    setStatus('ready');
    track('color_library_viewed', { tab: 'palettes' });
    logAnalyticsEvent('color_library_viewed', { tab: 'palettes' });
  }

  async function handleToggleFav(colorId: string) {
    if (!user) return;
    const { favorited } = await toggleFavoriteColor(colorId);
    setFavIds((prev) => favorited ? [...prev, colorId] : prev.filter((id) => id !== colorId));
  }

  const filteredPalettes = palettes.filter((p) => {
    if (!paletteQuery) return true;
    return p.title.toLowerCase().includes(paletteQuery.toLowerCase()) || p.description.toLowerCase().includes(paletteQuery.toLowerCase());
  });

  const totalPages = Math.ceil(totalColors / pageSize);
  const roomCats = categories.filter((c) => c.type === 'room');
  const styleCats = categories.filter((c) => c.type === 'style');
  const surfaceCats = categories.filter((c) => c.type === 'surface');

  return (
    <>
      <PageHeader
        eyebrow="Inspiration"
        title="Color Library"
        subtitle="Browse hundreds of professional paint colors and curated palettes with color codes you can take to any paint shop."
        backTo="/"
        backLabel="Home"
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Tab switcher */}
        <div className="mb-6 inline-flex rounded-xl border border-neutral-200/60 bg-white p-1 shadow-card">
          {(['colors', 'palettes'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setPage(1); setStatus('loading'); }}
              className={classNames(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-all duration-200',
                tab === t ? 'bg-brand-purple text-white shadow-sm' : 'text-neutral-600 hover:text-brand-purple'
              )}
            >
              {t === 'colors' ? <Grid3x3 className="h-4 w-4" /> : <Palette className="h-4 w-4" />}
              {t === 'colors' ? 'Individual Colors' : 'Color Palettes'}
            </button>
          ))}
        </div>

        {status === 'loading' && (
          <div className="mt-6">
            <SkeletonGrid count={12} />
          </div>
        )}

        {status === 'error' && (
          <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-3 text-sm font-semibold text-red-700">Couldn't load colors</p>
            <p className="mt-1 text-xs text-red-500">{errorMsg}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 text-sm font-semibold text-brand-purple hover:underline">Try again</button>
          </div>
        )}

        {status === 'ready' && tab === 'colors' && (
          <>
            {/* Color family chart bar */}
            {families.length > 0 && !familyId && !query && !filterType && !categoryId && (
              <div className="mb-8 rounded-2xl border border-neutral-200/60 bg-white p-6 shadow-card">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-sm font-bold text-neutral-900">Color Family Distribution</h3>
                    <p className="mt-0.5 text-xs text-neutral-400">Click a family to filter</p>
                  </div>
                  <span className="text-xs font-semibold text-neutral-400">{totalColors} colors</span>
                </div>
                {/* Bar chart */}
                <div className="flex h-10 overflow-hidden rounded-xl border border-neutral-200/60">
                  {families.map((f, i) => {
                    const segmentWidth = `${100 / families.length}%`;
                    const swatch = familySwatchColors[f.name] || '#CCCCCC';
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => { setFamilyId(f.id); setPage(1); }}
                        className="group relative h-full transition-all duration-300 hover:flex-grow-[1.5]"
                        style={{ background: swatch, width: segmentWidth }}
                        title={f.name}
                      >
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">{f.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* Family labels */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {families.map((f) => {
                    const swatch = familySwatchColors[f.name] || '#CCCCCC';
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => { setFamilyId(f.id); setPage(1); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200/60 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors hover:border-brand-purple/30 hover:text-brand-purple"
                      >
                        <span className="h-3 w-3 rounded-full ring-1 ring-black/5" style={{ background: swatch }} />
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search + filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search colors…" className="input-field pl-9" />
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="input-field sm:w-auto">
                <option value="display_order">Default order</option>
                <option value="popularity">Most popular</option>
                <option value="name">Name (A to Z)</option>
                <option value="newest">Newest first</option>
              </select>
            </div>

            {/* Filter chips */}
            <div className="mt-4 space-y-3">
              <FilterRow label="Family">
                <Chip active={!familyId} onClick={() => { setFamilyId(null); setPage(1); }}>All</Chip>
                {families.map((f) => (
                  <Chip key={f.id} active={familyId === f.id} onClick={() => { setFamilyId(f.id); setPage(1); }}>{f.name}</Chip>
                ))}
              </FilterRow>
              <FilterRow label="Quick filters">
                <Chip active={!filterType} onClick={() => { setFilterType(null); setPage(1); }}>All</Chip>
                <Chip active={filterType === 'interior'} onClick={() => { setFilterType('interior'); setPage(1); }}>Interior</Chip>
                <Chip active={filterType === 'exterior'} onClick={() => { setFilterType('exterior'); setPage(1); }}>Exterior</Chip>
                <Chip active={filterType === 'featured'} onClick={() => { setFilterType('featured'); setPage(1); }}>Featured</Chip>
                <Chip active={filterType === 'trending'} onClick={() => { setFilterType('trending'); setPage(1); }}>Trending</Chip>
              </FilterRow>
              <FilterRow label="Room">
                <Chip active={!categoryId} onClick={() => { setCategoryId(null); setPage(1); }}>All</Chip>
                {roomCats.map((c) => (
                  <Chip key={c.id} active={categoryId === c.id} onClick={() => { setCategoryId(c.id); setPage(1); }}>{c.name.replace(' Colors', '')}</Chip>
                ))}
              </FilterRow>
              <FilterRow label="Style">
                {styleCats.map((c) => (
                  <Chip key={c.id} active={categoryId === c.id} onClick={() => { setCategoryId(c.id); setPage(1); }}>{c.name.replace(' Colors', '')}</Chip>
                ))}
              </FilterRow>
              <FilterRow label="Surface">
                {surfaceCats.map((c) => (
                  <Chip key={c.id} active={categoryId === c.id} onClick={() => { setCategoryId(c.id); setPage(1); }}>{c.name.replace(' Colors', '')}</Chip>
                ))}
              </FilterRow>
            </div>

            <p className="mt-4 text-sm text-neutral-500">{totalColors} colors found</p>

            {/* Color grid — premium cards */}
            {colors.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {colors.map((c) => (
                  <ColorCard key={c.id} color={c} isFavorited={favIds.includes(c.id)} onToggleFavorite={user ? handleToggleFav : undefined} />
                ))}
              </div>
            ) : (
              <EmptyState
                illustration="search"
                title="No colors match your filters"
                description="Try adjusting your search or filters to find what you're looking for."
                actionLabel="Clear filters"
                onAction={() => { setQuery(''); setFamilyId(null); setCategoryId(null); setFilterType(null); setPage(1); }}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 transition-colors disabled:opacity-40 hover:bg-neutral-50">Prev</button>
                <span className="px-3 text-sm text-neutral-500">Page {page} of {totalPages}</span>
                <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 transition-colors disabled:opacity-40 hover:bg-neutral-50">Next</button>
              </div>
            )}
          </>
        )}

        {status === 'ready' && tab === 'palettes' && (
          <>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input type="search" value={paletteQuery} onChange={(e) => setPaletteQuery(e.target.value)} placeholder="Search palettes…" className="input-field pl-9" />
            </div>

            {filteredPalettes.length > 0 ? (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPalettes.map((c) => (
                  <Link key={c.id} to={`/colors/${c.slug}`} className="group overflow-hidden rounded-2xl border border-neutral-200/60 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-premium hover:border-neutral-200">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img src={c.image_url} alt={c.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                      {/* Premium color strip */}
                      <div className="absolute bottom-0 left-0 right-0 flex gap-1 bg-white/95 p-3 backdrop-blur-md">
                        {[c.main_color_code, c.secondary_color_code, c.accent_color_code].map((hex) => (
                          <div key={hex} className="h-8 flex-1 rounded-lg ring-1 ring-black/5" style={{ background: hex }} title={hex} />
                        ))}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-display text-lg font-bold text-neutral-900 transition-colors group-hover:text-brand-purple">{c.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 line-clamp-2">{c.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="rounded-full bg-brand-purple/10 px-2.5 py-1 text-[11px] font-semibold text-brand-purple">{c.style}</span>
                        {c.is_trending && <span className="rounded-full bg-accent-orange/15 px-2.5 py-1 text-[11px] font-semibold text-accent-orange">Trending</span>}
                        {c.is_featured && <span className="rounded-full bg-accent-green/10 px-2.5 py-1 text-[11px] font-semibold text-accent-green">Featured</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                illustration="search"
                title="No palettes match your search"
                description="Try a different search term to find color palettes."
              />
            )}
          </>
        )}

        <AdSlot slotKey="colors_gallery_bottom" className="mt-10" />
      </div>
    </>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <span className="shrink-0 pt-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 sm:w-20">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={classNames('rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200', active ? 'border-brand-purple bg-brand-purple text-white shadow-sm' : 'border-neutral-200/60 bg-white text-neutral-600 hover:border-brand-purple/30 hover:text-brand-purple')}>
      {children}
    </button>
  );
}
