import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, ArrowRight, Loader2, Package } from 'lucide-react';
import { fetchLocations } from '@/lib/pro-connect';
import { fetchListings } from '@/lib/marketplace';
import { searchProfessionals } from '@/lib/pro-connect';
import { useSeo } from '@/lib/seo';
import { breadcrumbSchema } from '@/lib/structured-data';
import type { DbProLocation } from '@/types/pro-connect';
import type { DbMarketplaceListing } from '@/types/marketplace';
import type { DbProProfile } from '@/types/pro-connect';
import { PROJECT_TYPE_LABELS } from '@/types/marketplace';
import { classNames } from '@/lib/utils';
import LocationPicker from '@/components/ui/LocationPicker';

// ============================================================
// SEO Page: /marketplace/sellers/:locationSlug
// Shows marketplace listings + professionals in a location
// ============================================================

function formatBudget(min: number | null, max: number | null, currency: string) {
  const sym = currency === 'NGN' ? '₦' : '';
  if (min && max) return `${sym}${min.toLocaleString()} – ${sym}${max.toLocaleString()}`;
  if (min) return `From ${sym}${min.toLocaleString()}`;
  if (max) return `Up to ${sym}${max.toLocaleString()}`;
  return 'Budget negotiable';
}

export default function MarketplaceLocationPage() {
  const { locationSlug } = useParams<{ locationSlug: string }>();
  const [location, setLocation] = useState<DbProLocation | null>(null);
  const [listings, setListings] = useState<DbMarketplaceListing[]>([]);
  const [pros, setPros] = useState<DbProProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!locationSlug) return;
    setLoading(true);
    (async () => {
      const locations = await fetchLocations();
      const loc = locations.find((l) => l.slug === locationSlug);
      if (!loc) {
        // Try matching by city name lowercased
        const byCity = locations.find((l) => l.city.toLowerCase().replace(/[^a-z0-9]+/g, '-') === locationSlug);
        if (!byCity) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setLocation(byCity);
      } else {
        setLocation(loc);
      }

      const dbLoc = loc || locations.find((l) => l.city.toLowerCase().replace(/[^a-z0-9]+/g, '-') === locationSlug);
      if (!dbLoc) return;

      // Fetch listings in this location
      const { listings: listingData } = await fetchListings({
        location_state: dbLoc.state,
        limit: 30,
      });
      // Filter by city if available
      const cityFiltered = dbLoc.city ? listingData.filter((l) => l.location_city === dbLoc.city) : listingData;
      setListings(cityFiltered);

      // Fetch professionals in this location
      const proResult = await searchProfessionals({
        state: dbLoc.state,
        pageSize: 20,
      });
      setPros(proResult.profiles);
      setLoading(false);
    })();
  }, [locationSlug]);

  const locationLabel = location ? [location.city, location.state].filter(Boolean).join(', ') : '';

  // SEO
  useSeo({
    title: location
      ? `Construction Jobs & Professionals in ${locationLabel} — FRELUX Marketplace`
      : 'Marketplace by Location — FRELUX',
    description: location?.seo_description ||
      `Find verified construction professionals, painters, tilers, and job listings in ${locationLabel}. Post a job and get bids from local pros.`,
    canonicalPath: `/marketplace/sellers/${locationSlug}`,
    noIndex: false,
    structuredData: breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Marketplace', path: '/marketplace' },
      { name: locationLabel || 'Location', path: `/marketplace/sellers/${locationSlug}` },
    ]),
  });

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <MapPin className="mx-auto h-12 w-12 text-neutral-300" />
        <h1 className="mt-4 text-xl font-bold text-neutral-900 dark:text-white">Location Not Found</h1>
        <p className="mt-2 text-sm text-neutral-500">This location doesn't exist or is no longer active.</p>
        <Link to="/marketplace" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple">
          <ArrowRight className="h-4 w-4 rotate-180" /> Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-brand-navy">
      {/* Breadcrumb */}
      <div className="border-b border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <Link to="/" className="hover:text-brand-purple">Home</Link>
            <span>/</span>
            <Link to="/marketplace" className="hover:text-brand-purple">Marketplace</Link>
            <span>/</span>
            <span className="text-neutral-900 dark:text-white">{locationLabel || '...'}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
            {location ? `${locationLabel}` : 'Loading...'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
            Find construction professionals and job listings in {locationLabel}.
          </p>
          <div className="mt-4">
            <LocationPicker compact />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Listings */}
            <section>
              <h2 className="mb-4 text-lg font-bold text-neutral-900 dark:text-white">
                Job Listings in {locationLabel}
                {listings.length > 0 && <span className="ml-2 text-sm font-normal text-neutral-400">({listings.length})</span>}
              </h2>
              {listings.length === 0 ? (
                <div className="rounded-xl border border-neutral-200/60 bg-white p-8 text-center dark:border-white/5 dark:bg-brand-navy-mid">
                  <Package className="mx-auto h-8 w-8 text-neutral-300" />
                  <p className="mt-2 text-sm text-neutral-500">No active job listings in this location yet.</p>
                  <Link to="/marketplace/post" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white">
                    Post the First Job
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {listings.map((listing) => (
                    <Link
                      key={listing.id}
                      to={`/marketplace/${listing.id}`}
                      className="group rounded-xl border border-neutral-200/60 bg-white p-4 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-brand-navy-mid"
                    >
                      <span className="rounded-md bg-brand-purple/10 px-2 py-1 text-xs font-semibold text-brand-purple">
                        {PROJECT_TYPE_LABELS[listing.project_type] || listing.project_type}
                      </span>
                      <h3 className="mt-3 text-sm font-bold text-neutral-900 dark:text-white group-hover:text-brand-purple">{listing.title}</h3>
                      <p className="mt-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                        {formatBudget(listing.budget_min, listing.budget_max, listing.currency)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Professionals */}
            <section>
              <h2 className="mb-4 text-lg font-bold text-neutral-900 dark:text-white">
                Professionals in {locationLabel}
                {pros.length > 0 && <span className="ml-2 text-sm font-normal text-neutral-400">({pros.length})</span>}
              </h2>
              {pros.length === 0 ? (
                <div className="rounded-xl border border-neutral-200/60 bg-white p-8 text-center dark:border-white/5 dark:bg-brand-navy-mid">
                  <p className="text-sm text-neutral-500">No professionals listed in this location yet.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pros.map((pro) => (
                    <Link
                      key={pro.id}
                      to={`/pro-connect/${pro.slug}`}
                      className="group flex items-center gap-3 rounded-xl border border-neutral-200/60 bg-white p-4 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-brand-navy-mid"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                        {pro.profile_image_url ? (
                          <img src={pro.profile_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-brand-purple">
                            {pro.display_name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white group-hover:text-brand-purple">
                          {pro.business_name || pro.display_name}
                        </p>
                        {pro.verification_status === 'verified' && (
                          <span className="text-xs text-emerald-500">✓ Verified</span>
                        )}
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
