import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, Loader2, Store, Briefcase } from 'lucide-react';
import { useLocation, DISTANCE_FILTERS, formatDistance } from '@/lib/location';
import { findNearbyProfessionals, findNearbyListings, type NearbyProfessional, type NearbyListing } from '@/lib/location-discovery';
import { classNames } from '@/lib/utils';

// ============================================================
// CalculatorNearMe — "Find This Material Near Me" + "Find a Professional Near Me"
// ============================================================
// Embedded in calculator result cards.
// Uses the user's selected location to show nearby marketplace sellers
// and FRELUX professionals relevant to the calculator's trade.

interface CalculatorNearMeProps {
  // What trade this calculator is for (maps to pro category slug)
  tradeSlug: string;
  // Material name for the "find material" search
  materialName?: string;
  // Project type for listing filter
  projectType?: string;
}

export default function CalculatorNearMe({
  tradeSlug,
  materialName,
  projectType,
}: CalculatorNearMeProps) {
  const { location, loading: locLoading, detect, _setManual, error } = useLocation();
  const [radius, setRadius] = useState(25);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [pros, setPros] = useState<NearbyProfessional[]>([]);
  const [listings, setListings] = useState<NearbyListing[]>([]);
  const [activeTab, setActiveTab] = useState<'professionals' | 'listings'>('professionals');

  async function handleSearch() {
    if (!location) return;
    if (location.latitude === 0 && location.longitude === 0) return;
    setSearching(true);
    setShowResults(true);

    const [proData, listingData] = await Promise.all([
      findNearbyProfessionals({
        latitude: location.latitude,
        longitude: location.longitude,
        radiusKm: radius,
        categorySlug: tradeSlug,
      }),
      findNearbyListings({
        latitude: location.latitude,
        longitude: location.longitude,
        radiusKm: radius,
        projectType,
        categorySlug: tradeSlug,
      }),
    ]);

    setPros(proData);
    setListings(listingData);
    setSearching(false);
  }

  const hasLocation = location && (location.latitude !== 0 || location.longitude !== 0);

  return (
    <div className="rounded-xl border border-brand-purple/20 bg-brand-purple/5 p-4 dark:bg-brand-purple/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-brand-navy dark:text-white">
            {materialName ? `Find "${materialName}" Near You` : 'Find Professionals Near You'}
          </h4>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Connect with verified FRELUX professionals and marketplace sellers in your area.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={detect}
            disabled={locLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-brand-purple/90 disabled:opacity-50"
          >
            {locLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
            {locLoading ? 'Detecting...' : 'Use My Location'}
          </button>
          {hasLocation && (
            <button
              onClick={handleSearch}
              disabled={searching}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-purple/30 bg-white px-3 py-1.5 text-xs font-semibold text-brand-purple transition-all hover:bg-brand-purple/10 disabled:opacity-50 dark:bg-transparent"
            >
              {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Search
            </button>
          )}
        </div>
      </div>

      {/* Location display + radius */}
      {hasLocation && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <MapPin className="h-3 w-3 text-brand-purple" />
            {location.label || 'Location set'}
          </span>
          <div className="flex items-center gap-1">
            {DISTANCE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setRadius(f.value)}
                className={classNames(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                  radius === f.value
                    ? 'bg-brand-purple text-white'
                    : 'text-neutral-400 hover:text-brand-purple'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{error}</p>}

      {/* Results */}
      {showResults && hasLocation && (
        <div className="mt-4 space-y-3 border-t border-brand-purple/10 pt-3">
          {/* Tab switcher */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('professionals')}
              className={classNames(
                'inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                activeTab === 'professionals' ? 'bg-brand-purple text-white' : 'text-neutral-500 hover:text-brand-purple'
              )}
            >
              <Briefcase className="h-3 w-3" />
              Professionals ({pros.length})
            </button>
            <button
              onClick={() => setActiveTab('listings')}
              className={classNames(
                'inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                activeTab === 'listings' ? 'bg-brand-purple text-white' : 'text-neutral-500 hover:text-brand-purple'
              )}
            >
              <Store className="h-3 w-3" />
              Jobs ({listings.length})
            </button>
          </div>

          {searching ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-brand-purple" />
            </div>
          ) : activeTab === 'professionals' ? (
            pros.length === 0 ? (
              <p className="text-xs text-neutral-500">No professionals found within {radius} km.</p>
            ) : (
              <div className="space-y-2">
                {pros.slice(0, 5).map((pro) => (
                  <Link
                    key={pro.id}
                    to={`/pro-connect/${pro.slug}`}
                    className="flex items-center gap-2.5 rounded-lg border border-neutral-200/60 bg-white p-2.5 transition-all hover:border-brand-purple/30 dark:border-white/5 dark:bg-brand-navy-mid"
                  >
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                      {pro.profile_image_url ? (
                        <img src={pro.profile_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-brand-purple">
                          {pro.display_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-neutral-900 dark:text-white">{pro.business_name || pro.display_name}</p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {pro.verification_status === 'verified' ? '✓ Verified' : ''} {pro.rating_avg > 0 ? `· ${pro.rating_avg.toFixed(1)}★` : ''} · {formatDistance(pro.distance_km)}
                      </p>
                    </div>
                  </Link>
                ))}
                {pros.length > 5 && (
                  <Link to="/pro-connect" className="block text-center text-xs text-brand-purple hover:underline">
                    View all {pros.length} professionals →
                  </Link>
                )}
              </div>
            )
          ) : listings.length === 0 ? (
            <p className="text-xs text-neutral-500">No job listings found within {radius} km.</p>
          ) : (
            <div className="space-y-2">
              {listings.slice(0, 5).map((listing) => (
                <Link
                  key={listing.id}
                  to={`/marketplace/${listing.id}`}
                  className="flex items-center gap-2.5 rounded-lg border border-neutral-200/60 bg-white p-2.5 transition-all hover:border-brand-purple/30 dark:border-white/5 dark:bg-brand-navy-mid"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                    <Briefcase className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-neutral-900 dark:text-white">{listing.title}</p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      {listing.location_city || ''} · {formatDistance(listing.distance_km)}
                    </p>
                  </div>
                </Link>
              ))}
              {listings.length > 5 && (
                <Link to="/marketplace" className="block text-center text-xs text-brand-purple hover:underline">
                  View all {listings.length} jobs →
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
