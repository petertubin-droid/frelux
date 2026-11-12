import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Compass,
} from "lucide-react";
import {
  fetchCategories,
  fetchServices,
  fetchLocations,
  searchProfessionals,
  getProProfileServices,
} from "@/lib/pro-connect";
import type {
  DbProCategory,
  DbProService,
  DbProLocation,
  DbProProfile,
} from "@/types/pro-connect";
import ProfessionalCard from "@/components/pro-connect/ProfessionalCard";
import { classNames } from "@/lib/utils";
import { useSeo } from "@/lib/seo";
import _LocationPicker from "@/components/ui/LocationPicker";
import { useLocation } from "@/lib/location";
import { MapPanel } from "@/components/map/MapPanel";
import {
  findNearbyProfessionals,
  type NearbyProfessional,
} from "@/lib/location-discovery";
import { SITE_URL } from "@/lib/seo";
import { Button } from "@/components/ui/shadcn/button";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import { useLanguage } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import AdSlot from "@/components/ui/AdSlot";
import { normalizeProConnectSearchQuery } from "@/lib/pro-connect-search";
import {
  buildTradeOptions,
  matchTrades,
  tradeIdsFor,
  VISIBLE_TRADE_COUNT,
} from "@/lib/pro-connect-trades";
import {
  proConnectCities,
  proConnectLocationsForCountry,
  proConnectStates,
} from "@/pages/pro-connect/coverage";

export default function ProConnectDirectory() {
  const { t } = useLanguage();
  useSeo({
    title: "FRELUX Pro Connect: Find Construction Professionals",
    description:
      "Find construction professionals by trade and location. Directory availability varies by market.",
    canonicalPath: "/pro-connect",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Directory",
      name: "FRELUX Pro Connect",
      description:
        "Find construction professionals by trade and location. Directory availability varies by market.",
      url: `${SITE_URL}/pro-connect`,
      provider: {
        "@type": "Organization",
        name: "FRELUX",
        url: SITE_URL,
      },
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [userLocation, _setUserLocation] =
    useState<ReturnType<typeof useLocation>["location"]>(null);
  const [radius, _setRadius] = useState(25);
  const [_nearbyPros, setNearbyPros] = useState<NearbyProfessional[]>([]);
  const [_nearbyLoading, setNearbyLoading] = useState(false);

  // Profile enrichment data
  const [profileServices, setProfileServices] = useState<
    Record<string, DbProService[]>
  >({});
  const [profileCategories, setProfileCategories] = useState<
    Record<string, DbProCategory>
  >({});

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<string | null>(
    null,
  );

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

  // One chip per trade, not one per category row: the category table holds rows
  // whose names mean the same trade, and rendering them all produced a wall of
  // near-duplicates.
  const trades = useMemo(() => buildTradeOptions(categories), [categories]);

  // A search term that names a trade becomes a trade filter as well as text, so
  // "painters" returns painters rather than only people who typed that word.
  const matchedTrades = useMemo(
    () => matchTrades(trades, searchQuery),
    [trades, searchQuery],
  );
  const matchedTradeIds = useMemo(
    () => tradeIdsFor(matchedTrades),
    [matchedTrades],
  );

  // Search
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await searchProfessionals({
        country: selectedCountry || undefined,
        categoryId: selectedCategory || undefined,
        categoryIds: matchedTradeIds.length > 0 ? matchedTradeIds : undefined,
        serviceId: selectedService || undefined,
        state: selectedState || undefined,
        city: selectedCity || undefined,
        verifiedOnly: verifiedOnly || undefined,
        minRating: minRating || undefined,
        availability:
          (availabilityFilter as "available" | "busy" | undefined) || undefined,
        searchQuery: normalizeProConnectSearchQuery(searchQuery) || undefined,
        page,
        pageSize: 12,
      });
      if (cancelled) return;
      setProfiles((current) =>
        page === 1 ? result.profiles : [...current, ...result.profiles],
      );
      setTotal(result.total);
      setHasMore(result.hasMore);
      setLoading(false);

      // Enrich with services and categories
      const svcMap: Record<string, DbProService[]> = {};
      const catMap: Record<string, DbProCategory> = {};
      for (const p of result.profiles) {
        if (cancelled) return;
        const ps = await getProProfileServices(p.id);
        svcMap[p.id] = ps
          .map((s) => s.service)
          .filter(Boolean) as DbProService[];
        if (p.category_id) {
          const cat = categories.find((c) => c.id === p.category_id);
          if (cat) catMap[p.id] = cat;
        }
      }
      if (!cancelled) {
        setProfileServices((current) => ({ ...current, ...svcMap }));
        setProfileCategories((current) => ({ ...current, ...catMap }));
      }
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [
    selectedCountry,
    selectedCategory,
    selectedService,
    selectedState,
    selectedCity,
    verifiedOnly,
    minRating,
    availabilityFilter,
    searchQuery,
    matchedTradeIds,
    categories,
    page,
  ]);

  // Nearby professionals when location is set
  useEffect(() => {
    if (
      !userLocation ||
      (userLocation.latitude === 0 && userLocation.longitude === 0)
    ) {
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
    })
      .then((data) => {
        setNearbyPros(data);
        setNearbyLoading(false);
      })
      .catch(() => setNearbyLoading(false));
  }, [
    userLocation,
    radius,
    selectedCategory,
    categories,
    verifiedOnly,
    minRating,
  ]);

  const countryLocations = proConnectLocationsForCountry(
    locations,
    selectedCountry,
  );
  const states = proConnectStates(countryLocations);
  const cities = proConnectCities(countryLocations, selectedState);

  const filteredServices = selectedCategory
    ? services.filter((s) => s.category_id === selectedCategory)
    : services;


  function clearFilters() {
    setPage(1);
    setSelectedCategory(null);
    setSelectedService(null);
    setSelectedState(null);
    setSelectedCountry(null);
    setSelectedCity(null);
    setVerifiedOnly(false);
    setMinRating(null);
    setAvailabilityFilter(null);
    setSearchQuery("");
  }

  const hasActiveFilters =
    selectedCountry ||
    selectedCategory ||
    selectedService ||
    selectedState ||
    selectedCity ||
    verifiedOnly ||
    minRating ||
    availabilityFilter ||
    searchQuery;

  return (
    <>
      <PageHeader
        variant="data"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: t("Pro Connect"), path: "/pro-connect" },
          { label: t("Professionals") },
        ]}
        eyebrow={t("Pro Connect")}
        title={t("Find Construction Professionals")}
        subtitle={t(
          "Find construction professionals by trade and location; availability varies by market",
        )}
      />

      <Container className="max-w-7xl pb-12 pt-6">
        {/* Search bar */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              aria-label={t("Search by name, business, bio, or service area")}
              placeholder={t("Search name, business, bio, or service area...")}
              className="w-full rounded-lg border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-card dark:text-primary-foreground"
            />
          </div>
          <Button
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            className={classNames(
              "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
              showFilters || hasActiveFilters
                ? "border-brand-purple bg-primary text-primary-foreground"
                : "border-border bg-card text-card-foreground dark:border-white/10 dark:bg-card dark:text-muted-foreground/60",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">{t("Filters")}</span>
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">
                {
                  [
                    selectedCountry,
                    selectedCategory,
                    selectedService,
                    selectedState,
                    selectedCity,
                    verifiedOnly,
                  ].filter(Boolean).length
                }
              </span>
            )}
          </Button>
        </div>

        <p className="-mt-4 mb-5 text-xs text-muted-foreground">
          {t(
            "Service-area text is self-reported and keyword-searchable; it is not geocoded or used for distance matching.",
          )}
        </p>

        {/* Filters panel */}
        {showFilters && (
          <div className="mb-6 rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  {t("Category")}
                </label>
                <select
                  aria-label={t("Category")}
                  value={selectedCategory || ""}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value || null);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background"
                >
                  <option value="">{t("All categories")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  {t("Service")}
                </label>
                <select
                  aria-label={t("Service")}
                  value={selectedService || ""}
                  onChange={(e) => {
                    setSelectedService(e.target.value || null);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background"
                >
                  <option value="">{t("All services")}</option>
                  {filteredServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* State */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  {t("Country")}
                </label>
                <select
                  aria-label={t("Country")}
                  value={selectedCountry || ""}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value || null);
                    setSelectedState(null);
                    setSelectedCity(null);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background"
                >
                  <option value="">{t("All countries")}</option>
                  {COUNTRY_OPTIONS.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.countries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <select
                  aria-label={t("State")}
                  value={selectedState || ""}
                  onChange={(e) => {
                    setSelectedState(e.target.value || null);
                    setSelectedCity(null);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background"
                >
                  <option value="">{t("All states")}</option>
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  {t("City")}
                </label>
                <select
                  aria-label={t("City")}
                  value={selectedCity || ""}
                  onChange={(e) => {
                    setSelectedCity(e.target.value || null);
                    setPage(1);
                  }}
                  disabled={!selectedState}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm disabled:opacity-50 dark:border-white/10 dark:bg-background"
                >
                  <option value="">{t("All cities")}</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Availability + Rating filters */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  {t("Availability")}
                </label>
                <select
                  aria-label={t("Availability")}
                  value={availabilityFilter || ""}
                  onChange={(e) => {
                    setAvailabilityFilter(e.target.value || null);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background"
                >
                  <option value="">{t("Any availability")}</option>
                  <option value="available">{t("Available now")}</option>
                  <option value="busy">{t("Currently busy")}</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  {t("Minimum Rating")}
                </label>
                <select
                  aria-label={t("Minimum Rating")}
                  value={minRating?.toString() || ""}
                  onChange={(e) => {
                    setMinRating(
                      e.target.value ? parseFloat(e.target.value) : null,
                    );
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background"
                >
                  <option value="">{t("Any rating")}</option>
                  <option value="3">3.0+</option>
                  <option value="4">4.0+</option>
                  <option value="4.5">4.5+</option>
                </select>
              </div>
            </div>

            {/* Verified toggle + Clear */}
            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground/80">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => {
                    setVerifiedOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-border text-brand-purple focus:ring-brand-purple"
                />
                {t("Verified professionals only")}
              </label>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-brand-purple dark:text-brand-purple-lighter"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                  {t("Clear all filters")}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Trade chips: search-aware, and never the full wall at once.
            With a search term, only the trades that term names are offered, so
            typing "painters" leaves one chip and the results, not thirty. With
            no term, a short default list is shown and the rest sit behind a
            disclosure. */}
        {matchedTrades.length > 0 ? (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Trades matching")} “{searchQuery.trim()}”
            </p>
            <div className="flex flex-wrap gap-2">
              {matchedTrades.map((trade) => (
                <Link
                  key={trade.key}
                  to={`/pro-connect/?category=${trade.slugs[0] ?? ""}`}
                  onClick={() => {
                    setSelectedCategory(trade.ids[0]);
                    setPage(1);
                  }}
                  aria-current={
                    trade.ids.includes(selectedCategory ?? "")
                      ? "page"
                      : undefined
                  }
                  className={classNames(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    trade.ids.includes(selectedCategory ?? "")
                      ? "border-brand-purple bg-primary text-primary-foreground"
                      : "border-brand-purple/40 bg-card text-foreground hover:border-brand-purple dark:border-brand-purple/40 dark:bg-card",
                  )}
                >
                  {trade.name}
                </Link>
              ))}
            </div>
          </div>
        ) : searchQuery.trim() ? (
          <p className="mb-6 text-xs text-muted-foreground">
            {t(
              "No trade matches that search, so the results below are listings that mention it.",
            )}
          </p>
        ) : (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Browse by trade")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(showAllTrades
                ? trades
                : trades.slice(0, VISIBLE_TRADE_COUNT)
              ).map((trade) => (
                <Link
                  key={trade.key}
                  to={`/pro-connect/?category=${trade.slugs[0] ?? ""}`}
                  onClick={() => {
                    setSelectedCategory(
                      trade.ids.includes(selectedCategory ?? "")
                        ? null
                        : trade.ids[0],
                    );
                    setPage(1);
                  }}
                  aria-current={
                    trade.ids.includes(selectedCategory ?? "")
                      ? "page"
                      : undefined
                  }
                  className={classNames(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    trade.ids.includes(selectedCategory ?? "")
                      ? "border-brand-purple bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-brand-purple/30 dark:border-white/10 dark:bg-card dark:text-muted-foreground/80",
                  )}
                >
                  {trade.name}
                </Link>
              ))}
              {trades.length > VISIBLE_TRADE_COUNT && (
                <button
                  type="button"
                  onClick={() => setShowAllTrades((v) => !v)}
                  className="rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-brand-purple hover:border-brand-purple dark:border-white/20 dark:text-brand-purple-lighter"
                >
                  {showAllTrades
                    ? t("Show fewer trades")
                    : `${t("All")} ${trades.length} ${t("trades")}`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            {loading
              ? "Searching..."
              : `${total} professional${total !== 1 ? "s" : ""} found`}
          </p>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-sm text-brand-purple dark:text-brand-purple-lighter"
            >
              {t("Clear filters")}
            </Button>
          )}
        </div>

        {/* Results grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl border border-border bg-muted/50 dark:border-white/5 dark:bg-card"
              />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center dark:border-white/5 sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-brand-purple">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">
              {hasActiveFilters
                ? t("No professionals match these filters")
                : t("No professionals listed here yet")}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {hasActiveFilters
                ? t(
                    "Nothing matches the trade, place and rating you selected. Widen the area or clear a filter to see more.",
                  )
                : t(
                    "Pro Connect is still filling up in this market. Professionals appear here as soon as they publish a profile, and you can bring your own contractor in the meantime.",
                  )}
            </p>

            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2 text-xs font-semibold"
                >
                  <X className="h-4 w-4" /> {t("Clear filters")}
                </Button>
              )}
              <Link to="/pro-connect/register">
                <Button size="sm" className="w-full gap-2 text-xs font-semibold sm:w-auto">
                  {t("Are you a professional? List your business")}
                </Button>
              </Link>
              <Link to="/pro-connect/liquidity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground sm:w-auto"
                >
                  <Compass className="h-4 w-4" /> {t("Request a match")}
                </Button>
              </Link>
            </div>
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
                <Button
                  variant="ghost"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                  className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-card-foreground hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground/60"
                >
                  {loading
                    ? t("Loading professionals...")
                    : t("Load more professionals")}
                </Button>
              </div>
            )}
          </>
        )}
        {/* Where the professionals actually are. Below the results on purpose:
            a 340 px map of an empty market used to sit above a zero-result list
            and take the whole first screen. It is also withheld entirely when
            nobody is listed, because there is no pin to show and the empty state
            below says what has to happen. */}
        {total > 0 && (
          <MapPanel
            layers={["pros"]}
            className="mt-10"
            height={300}
            title={t("Professionals on the map")}
            subtitle={t(
              "Every pin is a professional's own listed base. Select one to see who they are.",
            )}
            nearestCount={4}
            exploreHref="/map"
          />
        )}

        <AdSlot slotKey="market_mid" className="mt-8" />
      </Container>
    </>
  );
}
