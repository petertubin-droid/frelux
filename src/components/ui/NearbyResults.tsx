import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Shield, Loader2, Briefcase, ArrowRight, Navigation } from 'lucide-react';
import { findNearbyProfessionals, findNearbyListings, type NearbyProfessional, type NearbyListing } from '@/lib/location-discovery';
import { formatDistance } from '@/lib/location';
import { classNames } from '@/lib/utils';
import type { UserLocation } from '@/lib/location';
import LocationPicker from '@/components/ui/LocationPicker';

// ============================================================
// NearbyResults — shows ranked nearby professionals + listings
// ============================================================

interface NearbyResultsProps {
  // What to show
  mode: 'professionals' | 'listings' | 'both';
  // Optional filters
  categorySlug?: string;
  projectType?: string;
  // For calculator integration
  _materialQuery?: string;
  // Title override
  title?: string;
  // Show compact (for calculator embeds)
  compact?: boolean;
}

export default function NearbyResults({
  mode,
  categorySlug,
  projectType,
  _materialQuery,
  title,
  compact = false,
}: NearbyResultsProps) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [radius, setRadius] = useState(25);
  const [loading, setLoading] = useState(false);
  const [pros, setPros] = useState<NearbyProfessional[]>([]);
  const [listings, setListings] = useState<NearbyListing[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async () => {
    if (!userLocation || (userLocation.latitude === 0 && userLocation.longitude === 0)) return;
    setLoading(true);
    setHasSearched(true);

    const tasks: Promise<void>[] = [];

    if (mode === 'professionals' || mode === 'both') {
      tasks.push(
        findNearbyProfessionals({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radiusKm: radius,
          categorySlug,
        }).then((data) => { setPros(data); })
      );
    }

    if (mode === 'listings' || mode === 'both') {
      tasks.push(
        findNearbyListings({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radiusKm: radius,
          projectType,
          categorySlug,
        }).then((data) => { setListings(data); })
      );
    }

    await Promise.all(tasks);
    setLoading(false);
  }, [userLocation, radius, mode, categorySlug, projectType]);

  useEffect(() => {
    if (userLocation && (userLocation.latitude !== 0 || userLocation.longitude !== 0)) {
      search();
    }
  }, [userLocation, radius, search]);

  const showPros = mode === 'professionals' || mode === 'both';
  const showListings = mode === 'listings' || mode === 'both';
  const hasResults = (showPros && pros.length > 0) || (showListings && listings.length > 0);

  return (
    <div className={classNames('rounded-2xl border border-neutral-200/60 bg-white dark:border-white/10 dark:bg-brand-navy-mid', compact ? 'p-4' : 'p-6')}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
          {title || (mode === 'professionals' ? 'Professionals Near You' : mode === 'listings' ? 'Jobs Near You' : 'Near You')}
        </h3>
        {!userLocation && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
            Set your location to discover nearby {mode === 'professionals' ? 'professionals' : mode === 'listings' ? 'job listings' : 'professionals and listings'}.
          </p>
        )}
      </div>

      {/* Location picker */}
      <div className="mb-4">
        <LocationPicker
          onLocationChange={setUserLocation}
          onRadiusChange={setRadius}
          showRadius={true}
          compact={compact}
        />
      </div>

      {/* Results */}
      {userLocation && hasSearched && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-brand-purple" />
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center">
              <MapPin aria-hidden="true" className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600" />
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
                No {mode === 'professionals' ? 'professionals' : mode === 'listings' ? 'listings' : 'results'} found within {radius} km of your location.
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                Try increasing the distance filter or check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Professionals */}
              {showPros && pros.length > 0 && (
                <div className="space-y-2">
                  {!compact && <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Professionals ({pros.length})</p>}
                  {pros.slice(0, compact ? 3 : 10).map((pro) => (
                    <Link
                      key={pro.id}
                      to={`/pro-connect/${pro.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-neutral-200/60 p-3 transition-all hover:border-brand-purple/30 hover:bg-brand-purple/5 dark:border-white/5 dark:hover:bg-white/5"
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                            {pro.business_name || pro.display_name}
                          </p>
                          {pro.verification_status === 'verified' && (
                            <Shield aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-500">
                          {pro.rating_avg > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <Star aria-hidden="true" className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {pro.rating_avg.toFixed(1)}
                            </span>
                          )}
                          {pro.project_count > 0 && <span>· {pro.project_count} projects</span>}
                          <span className="inline-flex items-center gap-0.5">
                            · <Navigation className="h-3 w-3" />
                            {formatDistance(pro.distance_km)}
                          </span>
                        </div>
                      </div>
                      <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Listings */}
              {showListings && listings.length > 0 && (
                <div className="space-y-2">
                  {!compact && <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Job Listings ({listings.length})</p>}
                  {listings.slice(0, compact ? 3 : 10).map((listing) => (
                    <Link
                      key={listing.id}
                      to={`/marketplace/${listing.id}`}
                      className="flex items-center gap-3 rounded-xl border border-neutral-200/60 p-3 transition-all hover:border-brand-purple/30 hover:bg-brand-purple/5 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{listing.title}</p>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-500">
                          <span className="capitalize">{listing.project_type.replace('_', ' ')}</span>
                          {listing.location_city && <span>· {listing.location_city}</span>}
                          <span className="inline-flex items-center gap-0.5">
                            · <Navigation className="h-3 w-3" />
                            {formatDistance(listing.distance_km)}
                          </span>
                        </div>
                      </div>
                      <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
