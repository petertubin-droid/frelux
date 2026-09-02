import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Loader2, Package, Briefcase } from 'lucide-react';
import { fetchCategories, fetchLocations } from '@/lib/pro-connect';
import { fetchListings } from '@/lib/marketplace';
import { searchProfessionals } from '@/lib/pro-connect';
import { useSeo } from '@/lib/seo';
import { breadcrumbSchema } from '@/lib/structured-data';
import type { DbProCategory, DbProLocation, DbProProfile } from '@/types/pro-connect';
import type { DbMarketplaceListing } from '@/types/marketplace';

// ============================================================
// SEO Page: /marketplace/:categorySlug/:locationSlug
// Shows listings + professionals in a specific category + location
// ============================================================

function formatBudget(min: number | null, max: number | null, currency: string) {
  const sym = currency === 'NGN' ? '₦' : '';
  if (min && max) return `${sym}${min.toLocaleString()} – ${sym}${max.toLocaleString()}`;
  if (min) return `From ${sym}${min.toLocaleString()}`;
  if (max) return `Up to ${sym}${max.toLocaleString()}`;
  return 'Budget negotiable';
}

export default function MarketplaceCategoryLocationPage() {
  const { categorySlug, locationSlug } = useParams<{ categorySlug: string; locationSlug: string }>();
  const [category, setCategory] = useState<DbProCategory | null>(null);
  const [location, setLocation] = useState<DbProLocation | null>(null);
  const [listings, setListings] = useState<DbMarketplaceListing[]>([]);
  const [pros, setPros] = useState<DbProProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!categorySlug || !locationSlug) return;
    setLoading(true);
    (async () => {
      const [cats, locs] = await Promise.all([fetchCategories(), fetchLocations()]);
      const cat = cats.find((c) => c.slug === categorySlug);
      const loc = locs.find((l) => l.slug === locationSlug) ||
                  locs.find((l) => l.city.toLowerCase().replace(/[^a-z0-9]+/g, '-') === locationSlug);

      if (!cat || !loc) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCategory(cat);
      setLocation(loc);

      // Fetch listings with category + state filter
      const { listings: listingData } = await fetchListings({
        category_id: cat.id,
        location_state: loc.state,
        limit: 30,
      });
      const cityFiltered = loc.city ? listingData.filter((l) => l.location_city === loc.city) : listingData;
      setListings(cityFiltered);

      // Fetch professionals
      const proResult = await searchProfessionals({
        categoryId: cat.id,
        state: loc.state,
        pageSize: 20,
      });
      setPros(proResult.profiles);
      setLoading(false);
    })();
  }, [categorySlug, locationSlug]);

  const locationLabel = location ? [location.city, location.state].filter(Boolean).join(', ') : '';
  const pageTitle = `${category?.name || '...'} in ${locationLabel || '...'}`;

  // SEO
  useSeo({
    title: `${category?.name || ''} ${locationLabel ? `in ${locationLabel}` : ''} — FRELUX Marketplace`,
    description: `Find ${category?.name || 'construction'} professionals and job listings${locationLabel ? ` in ${locationLabel}` : ''}. Post a job and get bids from verified local pros on FRELUX.`,
    canonicalPath: `/marketplace/${categorySlug}/${locationSlug}`,
    noIndex: false,
    structuredData: breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Marketplace', path: '/marketplace' },
      { name: category?.name || 'Category', path: `/marketplace/category/${categorySlug}` },
      { name: locationLabel || 'Location', path: `/marketplace/${categorySlug}/${locationSlug}` },
    ]),
  });

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Package aria-hidden="true" className="mx-auto h-12 w-12 text-muted-foreground/80" />
        <h1 className="mt-4 text-xl font-bold text-foreground dark:text-primary-foreground">Page Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This category or location doesn't exist.</p>
        <Link to="/marketplace" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple">
          <ArrowRight aria-hidden="true" className="h-4 w-4 rotate-180" /> Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 dark:bg-background">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-card dark:border-white/5 dark:bg-card">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground dark:text-muted-foreground">
            <Link to="/" className="hover:text-brand-purple">Home</Link>
            <span>/</span>
            <Link to="/marketplace" className="hover:text-brand-purple">Marketplace</Link>
            <span>/</span>
            <Link to={`/marketplace/category/${categorySlug}`} className="hover:text-brand-purple">{category?.name}</Link>
            <span>/</span>
            <span className="text-foreground dark:text-primary-foreground">{location?.city}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-border bg-card dark:border-white/5 dark:bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground sm:text-3xl">{pageTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground dark:text-muted-foreground">
            {category?.description || `Find ${category?.name} professionals and jobs${locationLabel ? ` in ${locationLabel}` : ''}.`}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-brand-purple" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Listings */}
            <section>
              <h2 className="mb-4 text-lg font-bold text-foreground dark:text-primary-foreground">
                {category?.name} Jobs in {locationLabel}
                {listings.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({listings.length})</span>}
              </h2>
              {listings.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-card p-8 text-center dark:border-white/5 dark:bg-card">
                  <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/80" />
                  <p className="mt-2 text-sm text-muted-foreground">No active {category?.name} jobs in this location yet.</p>
                  <Link to="/marketplace/post" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                    Post a Job
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {listings.map((listing) => (
                    <Link key={listing.id} to={`/marketplace/${listing.id}`} className="group rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-card">
                      <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground group-hover:text-brand-purple">{listing.title}</h3>
                      <p className="mt-1 text-xs font-semibold text-card-foreground dark:text-muted-foreground/60">{formatBudget(listing.budget_min, listing.budget_max, listing.currency)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Professionals */}
            <section>
              <h2 className="mb-4 text-lg font-bold text-foreground dark:text-primary-foreground">
                {category?.name} Professionals in {locationLabel}
                {pros.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({pros.length})</span>}
              </h2>
              {pros.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-card p-8 text-center dark:border-white/5 dark:bg-card">
                  <p className="text-sm text-muted-foreground">No {category?.name} professionals listed in this location yet.</p>
                  <Link to="/pro-connect/register" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-brand-purple px-4 py-2 text-sm font-semibold text-brand-purple">
                    Register as a Pro
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pros.map((pro) => (
                    <Link key={pro.id} to={`/pro-connect/${pro.slug}`} className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-card">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted dark:bg-white/5">
                        {pro.profile_image_url ? (
                          <img src={pro.profile_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-brand-purple">{pro.display_name?.charAt(0).toUpperCase()}</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground dark:text-primary-foreground group-hover:text-brand-purple">{pro.business_name || pro.display_name}</p>
                        {pro.verification_status === 'verified' && <span className="text-xs text-emerald-500">✓ Verified</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
