import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { fetchCategories, fetchServices, fetchLocations, searchProfessionals, getProProfileServices } from '@/lib/pro-connect';
import type { DbProCategory, DbProService, DbProLocation, DbProProfile } from '@/types/pro-connect';
import ProfessionalCard from '@/components/pro-connect/ProfessionalCard';
import { classNames } from '@/lib/utils';
import { useSeo } from '@/lib/seo';
import LocationPicker from '@/components/ui/LocationPicker';
import { useLocation } from '@/lib/location';
import { findNearbyProfessionals, type NearbyProfessional } from '@/lib/location-discovery';
import { formatDistance } from '@/lib/location';

export default function ProConnectDirectory() {
  useSeo({
    title: 'FRELUX Pro Connect: Find Construction Professionals in Nigeria',
    description: 'Find verified painters, tilers, screeders, POP installers, contractors, engineers, and other construction professionals across Nigeria.',
    canonicalPath: '/pro-connect',
    ogType: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Directory',
      'name': 'FRELUX Pro Connect',
      'description': 'Find verified painters, tilers, screeders, POP installers, contractors, engineers, and other construction professionals across Nigeria.',
      'url': 'https://freluxtools.netlify.app/pro-connect',
      'provider': {
        '@type': 'Organization',
        'name': 'FRELUX PAINT CALC',
        'url': 'https://freluxtools.netlify.app'
      },
      'areaServed': {
        '@type': 'Country',
        'name': 'Nigeria'
      }
    },
  });
  const { categorySlug } = useParams();
  const [_searchParams, _setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<DbProCategory[]>([]);
  const [services, setServices] = useState<DbProService[]>([]);
  const [locations, setLocations] = useState<DbProLocation[]>([]);
  const [profiles, setProfiles] = useState<DbProProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [_page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<ReturnType<typeof useLocation>['location']>(null);
  const [radius, setRadius] = useState(25);
  const [nearbyPros, setNearbyPros] = useState<NearbyProfessional[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  // Profile enrichment data
  const [profileServices, setProfileServices] = useState<Record<string, DbProService[]>>({});
  const [profileCategories, setProfileCategories] = useState<Record<string, DbProCategory>>({});

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<string | null>(null);

  // Resolve category from URL slug
  useEffect(() => {
    if (categorySlug && categories.length > 0) {
      const cat = categories.find((c) => c.slug === categorySlug);
      if (cat) setSelectedCategory(cat.id);
    }
  }, [categorySlug, categories]);

  // Initial data load
  useEffect(() => {
    (async () => {
      const [cats, svcs, locs] = await Promise.all([
        fetchCategories(),
        fetchServices(),
        fetchLocations(),
      ]);
      setCategories(cats);
      setServices(svcs);
      setLocations(locs);
    })();
  }, []);

  // Search
  useEffect(() => {
    (async () => {
      setLoading(true);
      setPage(1);
      const result = await searchProfessionals({
        categoryId: selectedCategory || undefined,
        serviceId: selectedService || undefined,
        state: selectedState || undefined,
        city: selectedCity || undefined,
        verifiedOnly: verifiedOnly || undefined,
        minRating: minRating || undefined,
        availability: (availabilityFilter as 'available' | 'busy' | undefined) || undefined,
        searchQuery: searchQuery || undefined,
        page: 1,
        pageSize: 12,
      });
      setProfiles(result.profiles);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setLoading(false);

      // Enrich with services and categories
      const svcMap: Record<string, DbProService[]> = {};
      const catMap: Record<string, DbProCategory> = {};
      for (const p of result.profiles) {
        const ps = await getProProfileServices(p.id);
        svcMap[p.id] = ps.map((s) => s.service).filter(Boolean) as DbProService[];
        if (p.category_id) {
          const cat = categories.find((c) => c.id === p.category_id);
          if (cat) catMap[p.id] = cat;
        }
      }
      setProfileServices(svcMap);
      setProfileCategories(catMap);
    })();
  }, [selectedCategory, selectedService, selectedState, selectedCity, verifiedOnly, minRating, availabilityFilter, searchQuery, categories]);

  // Nearby professionals when location is set
  useEffect(() => {
    if (!userLocation || (userLocation.latitude === 0 && userLocation.longitude === 0)) {
      setNearbyPros([]);
      return;
    }
    setNearbyLoading(true);
    const cat = categories.find((c) => c.id === selectedCategory);
    findNearbyProfessionals({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      radiusKm: radius,
      categorySlug: cat?.slug,
      verifiedOnly,
      minRating: minRating ?? undefined,
    }).then((data) => {
      setNearbyPros(data);
      setNearbyLoading(false);
    }).catch(() => setNearbyLoading(false));
  }, [userLocation, radius, selectedCategory, categories, verifiedOnly, minRating]);

  const states = [...new Set(locations.map((l) => l.state))].sort();
  const cities = selectedState
    ? [...new Set(locations.filter((l) => l.state === selectedState).map((l) => l.city))].sort()
    : [];

  const filteredServices = selectedCategory
    ? services.filter((s) => s.category_id === selectedCategory)
    : services;

  function clearFilters() {
    setSelectedCategory(null);
    setSelectedService(null);
    setSelectedState(null);
    setSelectedCity(null);
    setVerifiedOnly(false);
    setMinRating(null);
    setAvailabilityFilter(null);
    setSearchQuery('');
  }

  const hasActiveFilters = selectedCategory || selectedService || selectedState || selectedCity || verifiedOnly || minRating || availabilityFilter || searchQuery;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
          Find Construction Professionals
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          Connect with verified painters, tilers, screeders, POP installers, and more across Nigeria
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, business, or keyword..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-brand-navy-mid dark:text-white"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={classNames(
            'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
            showFilters || hasActiveFilters
              ? 'border-brand-purple bg-brand-purple text-white'
              : 'border-neutral-200 bg-white text-neutral-700 dark:border-white/10 dark:bg-brand-navy-mid dark:text-neutral-200'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">
              {[selectedCategory, selectedService, selectedState, selectedCity, verifiedOnly].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Category */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Category</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Service */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Service</label>
              <select
                value={selectedService || ''}
                onChange={(e) => setSelectedService(e.target.value || null)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              >
                <option value="">All services</option>
                {filteredServices.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* State */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">State</label>
              <select
                value={selectedState || ''}
                onChange={(e) => { setSelectedState(e.target.value || null); setSelectedCity(null); }}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              >
                <option value="">All states</option>
                {states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">City</label>
              <select
                value={selectedCity || ''}
                onChange={(e) => setSelectedCity(e.target.value || null)}
                disabled={!selectedState}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-white/10 dark:bg-brand-navy"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Availability + Rating filters */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Availability</label>
              <select
                value={availabilityFilter || ''}
                onChange={(e) => setAvailabilityFilter(e.target.value || null)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              >
                <option value="">Any availability</option>
                <option value="available">Available now</option>
                <option value="busy">Currently busy</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Minimum Rating</label>
              <select
                value={minRating?.toString() || ''}
                onChange={(e) => setMinRating(e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy"
              >
                <option value="">Any rating</option>
                <option value="3">3.0+</option>
                <option value="4">4.0+</option>
                <option value="4.5">4.5+</option>
              </select>
            </div>
          </div>

          {/* Verified toggle + Clear */}
          <div className="mt-4 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-neutral-300 text-brand-purple focus:ring-brand-purple"
              />
              Verified professionals only
            </label>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-brand-purple dark:text-brand-purple-lighter"
              >
                <X className="h-4 w-4" />
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category quick filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/pro-connect?category=${cat.slug}`}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            className={classNames(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              selectedCategory === cat.id
                ? 'border-brand-purple bg-brand-purple text-white'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-purple/30 dark:border-white/10 dark:bg-brand-navy-mid dark:text-neutral-300'
            )}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {loading ? 'Searching...' : `${total} professional${total !== 1 ? 's' : ''} found`}
        </p>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-sm text-brand-purple dark:text-brand-purple-lighter">
            Clear filters
          </button>
        )}
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-neutral-200 bg-neutral-50 dark:border-white/5 dark:bg-brand-navy-mid" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center dark:border-white/5 dark:bg-brand-navy-mid">
          <p className="text-neutral-400 dark:text-neutral-500">No professionals found matching your criteria.</p>
          <p className="mt-2 text-sm text-neutral-400 dark:text-neutral-500">
            Try expanding your search area or removing some filters.
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-4 text-sm font-medium text-brand-purple dark:text-brand-purple-lighter">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <ProfessionalCard
                key={p.id}
                profile={p}
                category={profileCategories[p.id]}
                services={profileServices[p.id] || []}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-neutral-200 px-6 py-3 text-sm font-medium text-neutral-700 hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-neutral-200"
              >
                Load more professionals
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
