import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, MapPin, Clock, Users, ArrowRight, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { fetchListings } from '@/lib/marketplace';
import { fetchCategories } from '@/lib/pro-connect';
import type { DbMarketplaceListing } from '@/types/marketplace';
import type { DbProCategory } from '@/types/pro-connect';
import { PROJECT_TYPE_LABELS, URGENCY_LABELS, LISTING_STATUS_LABELS } from '@/types/marketplace';
import { classNames } from '@/lib/utils';
import { useSeo } from '@/lib/seo';

const PROJECT_TYPES = [
  { value: 'painting', label: 'Painting' },
  { value: 'screeding', label: 'Screeding' },
  { value: 'pop_ceiling', label: 'POP Ceiling' },
  { value: 'tiling', label: 'Tiling' },
  { value: 'multi_trade', label: 'Multi-Trade' },
];

const NIGERIAN_STATES = [
  'Lagos', 'Abuja FCT', 'Rivers', 'Kano', 'Oyo', 'Kaduna', 'Enugu', 'Delta', 'Edo', 'Ogun', 'Anambra', 'Imo',
];

function formatBudget(min: number | null, max: number | null, currency: string) {
  const sym = currency === 'NGN' ? '₦' : '';
  if (min && max) return `${sym}${min.toLocaleString()} – ${sym}${max.toLocaleString()}`;
  if (min) return `From ${sym}${min.toLocaleString()}`;
  if (max) return `Up to ${sym}${max.toLocaleString()}`;
  return 'Budget negotiable';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3.6e6);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}

export default function MarketplaceHome() {
  useSeo({
    title: 'FRELUX Marketplace: Post Jobs & Find Verified Construction Pros',
    description: 'Post your construction or finishing job and receive bids from verified professionals across Nigeria. Painters, tilers, screeders, POP installers and more.',
    canonicalPath: '/marketplace',
    ogType: 'website',
  });

  const [listings, setListings] = useState<DbMarketplaceListing[]>([]);
  const [categories, setCategories] = useState<DbProCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [projectType, setProjectType] = useState('');
  const [state, setState] = useState('');
  const [urgency, setUrgency] = useState('');

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const off = reset ? 0 : offset;
    const { listings: data, total: count } = await fetchListings({
      search: search || undefined,
      project_type: projectType || undefined,
      location_state: state || undefined,
      limit: 12,
      offset: off,
    });
    setListings(reset ? data : [...listings, ...data]);
    setTotal(count);
    setHasMore(off + data.length < count);
    setOffset(reset ? 12 : off + data.length);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, projectType, state, offset]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, projectType, state]);

  const activeFilters = [projectType, state, urgency].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-brand-navy">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
                Marketplace
              </h1>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Post a job and get bids from verified construction professionals near you.
              </p>
            </div>
            <Link
              to="/marketplace/post"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-purple-dark"
            >
              <Plus className="h-4 w-4" />
              Post a Job
            </Link>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="sticky top-16 z-20 border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-white/5 dark:bg-brand-navy-mid/80">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs..."
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-purple focus:outline-none dark:border-white/10 dark:bg-brand-navy dark:text-white"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={classNames(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                showFilters || activeFilters > 0
                  ? 'border-brand-purple text-brand-purple'
                  : 'border-neutral-200 text-neutral-600 hover:text-neutral-900 dark:border-white/10 dark:text-neutral-400'
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilters > 0 && (
                <span className="rounded-full bg-brand-purple px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 dark:border-white/10 dark:bg-brand-navy dark:text-white"
              >
                <option value="">All Project Types</option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 dark:border-white/10 dark:bg-brand-navy dark:text-white"
              >
                <option value="">All States</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 dark:border-white/10 dark:bg-brand-navy dark:text-white"
              >
                <option value="">Any Urgency</option>
                <option value="urgent">Urgent</option>
                <option value="standard">Standard</option>
                <option value="flexible">Flexible</option>
              </select>

              {activeFilters > 0 && (
                <button
                  onClick={() => { setProjectType(''); setState(''); setUrgency(''); }}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Listings grid */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading && listings.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-neutral-100 p-4 dark:bg-white/5">
              <Search className="h-8 w-8 text-neutral-400" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-neutral-700 dark:text-white">No jobs found</h3>
            <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">Try adjusting filters or post a new job.</p>
            <Link
              to="/marketplace/post"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white hover:bg-brand-purple-dark"
            >
              <Plus className="h-4 w-4" /> Post a Job
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
              {total} {total === 1 ? 'job' : 'jobs'} available
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/marketplace/${listing.id}`}
                  className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-brand-navy-mid dark:hover:border-brand-purple-lighter/30"
                >
                  {/* Top row: type badge + urgency */}
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-brand-purple/10 px-2 py-1 text-[11px] font-semibold text-brand-purple">
                      {PROJECT_TYPE_LABELS[listing.project_type] || listing.project_type}
                    </span>
                    {listing.urgency === 'urgent' && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                        <Clock className="h-3 w-3" /> Urgent
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="mt-2 line-clamp-2 text-sm font-bold text-neutral-900 dark:text-white group-hover:text-brand-purple dark:group-hover:text-brand-purple-lighter">
                    {listing.title}
                  </h3>

                  {/* Description */}
                  {listing.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {listing.description}
                    </p>
                  )}

                  {/* Location */}
                  {listing.location_state && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                      <MapPin className="h-3 w-3" />
                      {[listing.location_area, listing.location_city, listing.location_state].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {/* Budget */}
                  <p className="mt-1 text-sm font-bold text-brand-navy dark:text-white">
                    {formatBudget(listing.budget_min, listing.budget_max, listing.currency)}
                  </p>

                  {/* Footer: bids + time */}
                  <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-white/5">
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                      <Users className="h-3 w-3" />
                      {listing.bid_count} {listing.bid_count === 1 ? 'bid' : 'bids'}
                    </span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      {timeAgo(listing.created_at)}
                    </span>
                  </div>

                  {/* Status badge for non-open */}
                  {listing.status !== 'open' && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
                      {LISTING_STATUS_LABELS[listing.status]}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {hasMore && !loading && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => load(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-neutral-300"
                >
                  Load More <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Category quick filters */}
      {categories.length > 0 && !showFilters && (
        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
            Browse by Category
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                to={`/marketplace?category=${cat.slug}`}
                className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-neutral-400"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
