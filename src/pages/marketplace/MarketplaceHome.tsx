import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPanel } from "@/components/map/MapPanel";
import {
  Briefcase,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from "lucide-react";
import { fetchListings } from "@/lib/marketplace";
import {
  searchProducts,
  fetchProductCategories,
} from "@/lib/marketplace-products";
import type { DbMarketplaceListing } from "@/types/marketplace";
import type {
  DbMarketplaceProduct,
  DbProductCategory,
  ProductCondition,
} from "@/types/marketplace-products";
import type {} from "@/types/pro-connect";
import { PROJECT_TYPE_LABELS } from "@/types/marketplace";
import { PRODUCT_CONDITION_LABELS } from "@/types/marketplace-products";
import { classNames } from "@/lib/utils";
import { useSeo } from "@/lib/seo";
import LocationPicker from "@/components/ui/LocationPicker";
import { useLocation } from "@/lib/location";
import {
  findNearbyListings,
  type NearbyListing,
} from "@/lib/location-discovery";
import { formatDistance } from "@/lib/location";
import AdSlot from "@/components/ui/AdSlot";
import { SITE_URL } from "@/lib/seo";
import { Button } from "@/components/ui/shadcn/button";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import { formatByCode } from "@/lib/international/currency-format";
import { buildTradeOptions } from "@/lib/pro-connect-trades";
import { tx } from "@/lib/i18n";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";

const PROJECT_TYPES = [
  { value: "painting", label: "Painting" },
  { value: "screeding", label: "Screeding" },
  { value: "pop_ceiling", label: "POP Ceiling" },
  { value: "tiling", label: "Tiling" },
  { value: "multi_trade", label: "Multi-Trade" },
];

const NIGERIAN_STATES = [
  "Lagos",
  "Abuja FCT",
  "Rivers",
  "Kano",
  "Oyo",
  "Kaduna",
  "Enugu",
  "Delta",
  "Edo",
  "Ogun",
  "Anambra",
  "Imo",
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "popular", label: "Most Popular" },
];

function formatBudget(
  min: number | null,
  max: number | null,
  currency: string,
) {
  // Per-item currency from the listing row: format through the central
  // currency layer so non-NGN listings render their real symbol
  // (USD, GHS, ...) instead of a bare number.
  if (min && max)
    return `${formatByCode(min, currency)} – ${formatByCode(max, currency)}`;
  if (min) return `From ${formatByCode(min, currency)}`;
  if (max) return `Up to ${formatByCode(max, currency)}`;
  return "Budget negotiable";
}

function formatPrice(p: number, currency: string) {
  return formatByCode(p, currency);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3.6e6);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
}

type Tab = "jobs" | "products";

export default function MarketplaceHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "jobs";
  const [tab, setTab] = useState<Tab>(initialTab);

  useSeo({
    title:
      "FRELUX Marketplace: Construction Jobs, Building Materials & Interior Products",
    description:
      "Post construction jobs and get bids from verified pros, or buy and sell building materials, painting supplies, and interior design products in available locations.",
    canonicalPath: "/marketplace",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Marketplace",
      name: "FRELUX Marketplace",
      description:
        "Post construction jobs and get bids from verified pros, or buy and sell building materials, painting supplies, and interior design products in available locations.",
      url: `${SITE_URL}/marketplace`,
      provider: {
        "@type": "Organization",
        name: "FRELUX",
        url: SITE_URL,
      },
    },
  });

  // Jobs state
  const [listings, setListings] = useState<DbMarketplaceListing[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsOffset, setJobsOffset] = useState(0);
  const [jobsHasMore, setJobsHasMore] = useState(false);
  const [jobSearch, setJobSearch] = useState("");
  const [projectType, setProjectType] = useState("");
  const [jobState, setJobState] = useState("");
  const [jobCountry, setJobCountry] = useState("");

  // Products state
  const [products, setProducts] = useState<DbMarketplaceProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsOffset, setProductsOffset] = useState(0);
  const [productsHasMore, setProductsHasMore] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productCondition, setProductCondition] = useState("");
  const [productState, setProductState] = useState("");
  const [productCountry, setProductCountry] = useState("");
  const [productSort, setProductSort] = useState("newest");
  const [productCategories, setProductCategories] = useState<
    DbProductCategory[]
  >([]);

  // Shared state
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] =
    useState<ReturnType<typeof useLocation>["location"]>(null);
  const [radius, setRadius] = useState(25);
  const [nearbyListings, setNearbyListings] = useState<NearbyListing[]>([]);

  // Load categories
  useEffect(() => {
    fetchProductCategories()
      .then(setProductCategories)
      .catch(() => {});
  }, []);

  // Load jobs, uses refs to avoid re-creation on state change (prevents infinite render loop)
  const jobsOffsetRef = useRef(jobsOffset);
  const listingsRef = useRef(listings);
  jobsOffsetRef.current = jobsOffset;
  listingsRef.current = listings;

  const loadJobs = useCallback(
    async (reset = false) => {
      setJobsLoading(true);
      setLoadError(null);
      const off = reset ? 0 : jobsOffsetRef.current;
      try {
        const { listings: data, total: count } = await fetchListings({
          search: jobSearch || undefined,
          project_type: projectType || undefined,
          location_country: jobCountry || undefined,
          location_state: jobState || undefined,
          limit: 12,
          offset: off,
        });
        setListings(reset ? data : [...listingsRef.current, ...data]);
        setJobsTotal(count);
        setJobsHasMore(off + data.length < count);
        if (reset) setJobsOffset(0);
        else setJobsOffset(off + data.length);
      } catch {
        if (reset) setListings([]);
        setLoadError(
          "We could not load the marketplace just now. Check your connection and try again.",
        );
      } finally {
        setJobsLoading(false);
      }
    },
    [jobSearch, projectType, jobState, jobCountry],
  );

  // Load products, same ref pattern to prevent infinite loop
  // A rejected query used to leave the page on its skeletons forever, because
  // neither loader caught anything. One failure now ends loading and says so.
  const [loadError, setLoadError] = useState<string | null>(null);

  const productsOffsetRef = useRef(productsOffset);
  const productsRef = useRef(products);
  productsOffsetRef.current = productsOffset;
  productsRef.current = products;

  const loadProducts = useCallback(
    async (reset = false) => {
      setProductsLoading(true);
      const off = reset ? 0 : productsOffsetRef.current;
      const catId = productCategories.find(
        (c) => c.slug === productCategory,
      )?.id;
      setLoadError(null);
      try {
        const { products: data, total: count } = await searchProducts({
          search: productSearch || undefined,
          category_id: catId,
          condition: (productCondition || undefined) as
            ProductCondition | undefined,
          location_country: productCountry || undefined,
          location_state: productState || undefined,
          sort: productSort as
            "newest" | "price_low" | "price_high" | "popular" | "featured",
          limit: 24,
          offset: off,
        });
        setProducts(reset ? data : [...productsRef.current, ...data]);
        setProductsTotal(count);
        setProductsHasMore(off + data.length < count);
        if (reset) setProductsOffset(0);
        else setProductsOffset(off + data.length);
      } catch {
        if (reset) setProducts([]);
        setLoadError(
          "We could not load these products just now. Check your connection and try again.",
        );
      } finally {
        setProductsLoading(false);
      }
    },
    [
      productSearch,
      productCategory,
      productCondition,
      productState,
      productCountry,
      productSort,
      productCategories,
    ],
  );

  useEffect(() => {
    if (tab === "jobs") loadJobs(true);
  }, [tab, jobSearch, projectType, jobState, jobCountry, loadJobs]);

  useEffect(() => {
    if (tab === "products") loadProducts(true);
  }, [
    tab,
    productSearch,
    productCategory,
    productCondition,
    productState,
    productCountry,
    productSort,
    loadProducts,
  ]);

  // Nearby listings
  useEffect(() => {
    if (
      !userLocation ||
      (userLocation.latitude === 0 && userLocation.longitude === 0)
    ) {
      setNearbyListings([]);
      return;
    }
    findNearbyListings({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      radiusKm: radius,
      projectType: projectType || undefined,
    })
      .then(setNearbyListings)
      .catch(() => {});
  }, [userLocation, radius, projectType]);

  function switchTab(newTab: Tab) {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: tx("Marketplace") },
        ]}
        eyebrow={tx("Construction trade marketplace")}
        title={tx("Marketplace")}
        subtitle={tx(
          "Find construction materials, professional services, and building projects in available locations. Marketplace listings vary by region.",
        )}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/marketplace/post/"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus aria-hidden="true" className="h-4 w-4" /> {tx("Post a Job")}
            </Link>
            <Link
              to="/marketplace/products/post/"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Store className="h-4 w-4" /> {tx("Sell a Product")}
            </Link>
            <Link
              to="/pro-connect/register/"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Briefcase className="h-4 w-4" /> {tx("Become a Pro")}
            </Link>
          </div>
        }
      />

      {/* Live counts sit under the header rather than inside it, so the
          figures stay honest when the directory is empty. */}
      <div className="border-b border-border/60 dark:border-white/5">
        <Container className="max-w-7xl">
          <dl className="flex flex-wrap items-center gap-x-8 gap-y-3 py-4 text-sm">
            <div className="flex items-baseline gap-2">
              <dt className="order-2 text-muted-foreground">
                {tx("Active Listings")}
              </dt>
              <dd className="order-1 text-base font-semibold text-foreground">
                {jobsTotal + productsTotal}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="order-2 text-muted-foreground">
                {tx("Categories")}
              </dt>
              <dd className="order-1 text-base font-semibold text-foreground">
                14
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="order-2 text-muted-foreground">
                {tx("States Covered")}
              </dt>
              <dd className="order-1 text-base font-semibold text-foreground">
                36
              </dd>
            </div>
          </dl>
        </Container>
      </div>

      {/* ── Category Showcase ── */}
      <div className="border-b border-border/50 dark:border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {tx("Browse by Category")}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              {
                slug: "building-materials",
                label: "Building Materials",
                icon: "🏗️",
                count: null,
              },
              {
                slug: "painting-materials",
                label: "Paint & Decoration",
                icon: "🎨",
                count: null,
              },
              { slug: "roofing", label: "Roofing", icon: "🏠", count: null },
              {
                slug: "flooring",
                label: "Tiles & Flooring",
                icon: "📐",
                count: null,
              },
              {
                slug: "pop-ceiling",
                label: "POP & Ceiling",
                icon: "◆",
                count: null,
              },
              {
                slug: "tools-kits",
                label: "Tools & Equipment",
                icon: "🔧",
                count: null,
              },
              { slug: "services", label: "Services", icon: "🛠️", count: null },
            ].map((cat) => (
              <Link
                key={cat.slug}
                to={`/marketplace/category/${cat.slug}/`}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border p-4 transition-all hover:border-brand-purple/30 hover:bg-primary/5 dark:border-white/10 dark:hover:bg-white/5"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-center text-xs font-medium text-card-foreground group-hover:text-brand-purple dark:text-muted-foreground/80 dark:group-hover:text-brand-purple-lighter">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-border/50 dark:border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground dark:text-primary-foreground sm:text-3xl">
                {tx("FRELUX Marketplace")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Post jobs, buy & sell building materials and interior design
                products.
              </p>
            </div>
            <div className="flex gap-2">
              {tab === "jobs" ? (
                <Link
                  to="/marketplace/post/"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />{" "}
                  {tx("Post a Job")}
                </Link>
              ) : (
                <Link
                  to="/marketplace/products/post/"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />{" "}
                  {tx("Sell a Product")}
                </Link>
              )}
            </div>
          </div>

          {/* Tab switcher */}
          <div className="mt-5 flex gap-1">
            <Button
              variant="ghost"
              onClick={() => switchTab("jobs")}
              className={classNames(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                tab === "jobs"
                  ? "bg-background text-primary-foreground dark:bg-white dark:text-foreground"
                  : "text-muted-foreground hover:text-card-foreground dark:text-muted-foreground",
              )}
            >
              <Briefcase className="h-4 w-4" /> Jobs
              {jobsTotal > 0 && (
                <span
                  className={classNames(
                    "rounded-full px-1.5 py-0.5 text-xs",
                    tab === "jobs" ? "bg-white/20" : "bg-muted dark:bg-white/5",
                  )}
                >
                  {jobsTotal}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => switchTab("products")}
              className={classNames(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                tab === "products"
                  ? "bg-background text-primary-foreground dark:bg-white dark:text-foreground"
                  : "text-muted-foreground hover:text-card-foreground dark:text-muted-foreground",
              )}
            >
              <Store className="h-4 w-4" /> Products
              {productsTotal > 0 && (
                <span
                  className={classNames(
                    "rounded-full px-1.5 py-0.5 text-xs",
                    tab === "products"
                      ? "bg-white/20"
                      : "bg-muted dark:bg-white/5",
                  )}
                >
                  {productsTotal}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loadError && (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm font-medium text-foreground">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                tab === "jobs" ? loadJobs(true) : loadProducts(true)
              }
              className="shrink-0 text-xs font-semibold"
            >
              {tx("Try again")}
            </Button>
          </div>
        )}
        {tab === "jobs" ? (
          <JobsTab
            listings={listings}
            loading={jobsLoading}
            total={jobsTotal}
            hasMore={jobsHasMore}
            search={jobSearch}
            setSearch={setJobSearch}
            projectType={projectType}
            setProjectType={setProjectType}
            state={jobState}
            country={jobCountry}
            setCountry={setJobCountry}
            setState={setJobState}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            onLoadMore={() => {
              setJobsOffset(jobsOffset + 12);
              loadJobs(false);
            }}
            nearbyListings={nearbyListings}
            radius={radius}
            userLocation={userLocation}
            setUserLocation={setUserLocation}
            setRadius={setRadius}
          />
        ) : (
          <ProductsTab
            products={products}
            loading={productsLoading}
            total={productsTotal}
            hasMore={productsHasMore}
            search={productSearch}
            setSearch={setProductSearch}
            category={productCategory}
            setCategory={setProductCategory}
            condition={productCondition}
            setCondition={setProductCondition}
            state={productState}
            country={productCountry}
            setCountry={setProductCountry}
            setState={setProductState}
            sort={productSort}
            setSort={setProductSort}
            categories={productCategories}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            onLoadMore={() => {
              setProductsOffset(productsOffset + 24);
              loadProducts(false);
            }}
          />
        )}
      </div>
      <AdSlot slotKey="marketplace_sidebar" className="mt-8" />
      {/* Native banner slot, placement "marketplace_native" */}
      <AdSlot slotKey="marketplace_native" className="mt-8" />
    </div>
  );
}

// ============================================================
// JOBS TAB
// ============================================================
function JobsTab(props: {
  listings: DbMarketplaceListing[];
  loading: boolean;
  total: number;
  hasMore: boolean;
  search: string;
  setSearch: (v: string) => void;
  projectType: string;
  setProjectType: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  onLoadMore: () => void;
  nearbyListings: NearbyListing[];
  radius: number;
  userLocation: ReturnType<typeof useLocation>["location"];
  setUserLocation: (v: ReturnType<typeof useLocation>["location"]) => void;
  setRadius: (v: number) => void;
}) {
  return (
    <div>
      {/* Search bar */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            aria-label="Search jobs"
            value={props.search}
            onChange={(e) => props.setSearch(e.target.value)}
            placeholder={tx("Search jobs...")}
            className="w-full rounded-lg border border-border py-2.5 pl-10 pr-4 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          />
        </div>
        <Button
          variant="ghost"
          onClick={() => props.setShowFilters(!props.showFilters)}
          className={classNames(
            "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium",
            props.showFilters
              ? "border-brand-purple bg-primary/5 text-brand-purple"
              : "border-border text-muted-foreground dark:border-white/10 dark:text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" /> {tx("Filters")}
        </Button>
      </div>

      {/* Filters */}
      {props.showFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          <select
            aria-label="Filter by trade"
            value={props.projectType}
            onChange={(e) => props.setProjectType(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          >
            <option value="">{tx("All trades")}</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by country"
            value={props.country}
            onChange={(e) => props.setCountry(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          >
            <option value="">{tx("All countries")}</option>
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
            aria-label="Filter by state"
            value={props.state}
            onChange={(e) => props.setState(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          >
            <option value="">{tx("All states")}</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              props.setProjectType("");
              props.setState("");
              props.setCountry("");
              props.setSearch("");
            }}
            className="text-xs text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground/80"
          >
            <X aria-hidden="true" className="inline h-3 w-3" /> {tx("Clear")}
          </Button>
        </div>
      )}

      {/* Location */}
      <div className="mb-4">
        <LocationPicker
          onLocationChange={props.setUserLocation}
          onRadiusChange={props.setRadius}
          showRadius={true}
        />
      </div>

      {/* Nearby */}
      {props.userLocation && props.nearbyListings.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-bold text-foreground dark:text-primary-foreground">
            Jobs Near You{" "}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({props.nearbyListings.length} within {props.radius} km)
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {props.nearbyListings.slice(0, 6).map((listing) => (
              <Link
                key={listing.id}
                to={`/marketplace/${listing.id}/`}
                className="group rounded-xl border border-brand-purple/20 bg-primary/5 p-4 transition-all hover:border-brand-purple/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-brand-purple">
                    {PROJECT_TYPE_LABELS[listing.project_type] ||
                      listing.project_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    📍 {formatDistance(listing.distance_km)}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-bold text-foreground dark:text-primary-foreground group-hover:text-brand-purple">
                  {listing.title}
                </h3>
                {listing.location_city && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {listing.location_city}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Listings grid */}
      {props.loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2
            aria-hidden="true"
            className="h-5 w-5 animate-spin text-brand-purple"
          />
        </div>
      ) : props.listings.length === 0 ? (
        <div className="py-12 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/80" />
          <p className="mt-3 text-sm font-medium text-foreground dark:text-primary-foreground">
            {tx("No jobs found")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tx("Try adjusting your search or post a job.")}
          </p>
          <Link
            to="/marketplace/post/"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus aria-hidden="true" className="h-4 w-4" /> {tx("Post a Job")}
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {props.total} jobs found
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {props.listings.map((listing) => (
              <Link
                key={listing.id}
                to={`/marketplace/${listing.id}/`}
                className="group rounded-xl border border-border p-5 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground dark:bg-white/5">
                    {PROJECT_TYPE_LABELS[listing.project_type] ||
                      listing.project_type}
                  </span>
                  {listing.is_featured && (
                    <span className="rounded-md bg-brand-purple/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-purple">
                      Featured
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-base font-bold text-foreground dark:text-primary-foreground group-hover:text-brand-purple">
                  {listing.title}
                </h3>
                {listing.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {listing.description}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-brand-purple">
                    {formatBudget(
                      listing.budget_min,
                      listing.budget_max,
                      listing.currency,
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {timeAgo(listing.created_at)}
                  </span>
                </div>
                {(listing.location_city || listing.location_state) && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin aria-hidden="true" className="h-3 w-3" />
                    {listing.location_city && `${listing.location_city}, `}
                    {listing.location_state}
                  </div>
                )}
              </Link>
            ))}
          </div>
          {props.hasMore && (
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={props.onLoadMore}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
              >
                {tx("Load More")}
              </Button>
            </div>
          )}
          {/* Paid placement sits after the goods, never inside the grid, so a
              sponsored card can never be mistaken for an organic result. */}
          <AdSlot slotKey="marketplace_native" className="mt-6" />
          <AdSlot slotKey="marketplace_sidebar" className="mt-4" />
        </>
      )}
    </div>
  );
}

// ============================================================
// PRODUCTS TAB
// ============================================================
function ProductsTab(props: {
  products: DbMarketplaceProduct[];
  loading: boolean;
  total: number;
  hasMore: boolean;
  search: string;
  setSearch: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  condition: string;
  setCondition: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
  categories: DbProductCategory[];
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  onLoadMore: () => void;
}) {
  // One pill per category, not per row: the category table repeats some names, and
  // a repeated name reads as a bug to a buyer. The rest sit behind a disclosure so
  // the pills never push the products off the first screen.
  const categoryOptions = useMemo(
    () =>
      buildTradeOptions(
        props.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
      ),
    [props.categories],
  );
  const [showAllCategories, setShowAllCategories] = useState(false);
  const visibleCategories = showAllCategories
    ? categoryOptions
    : categoryOptions.slice(0, 8);

  return (
    <div>
      {/* Materials and open projects on the map */}
      <MapPanel
        layers={["materials", "jobs"]}
        className="mb-6"
        height={320}
        title={tx("What is on the map")}
        subtitle={tx(
          "Stock from sellers and open projects you can bid on, plotted where they really are, anywhere in the world.",
        )}
        nearestCount={3}
        exploreHref="/map"
      />

      {/* Search bar */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            aria-label="Search products, brands, materials"
            value={props.search}
            onChange={(e) => props.setSearch(e.target.value)}
            placeholder={tx("Search products, brands, materials...")}
            className="w-full rounded-lg border border-border py-2.5 pl-10 pr-4 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          />
        </div>
        <select
          aria-label="Sort products"
          value={props.sort}
          onChange={(e) => props.setSort(e.target.value)}
          className="rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          onClick={() => props.setShowFilters(!props.showFilters)}
          className={classNames(
            "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium",
            props.showFilters
              ? "border-brand-purple bg-primary/5 text-brand-purple"
              : "border-border text-muted-foreground dark:border-white/10 dark:text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" /> {tx("Filters")}
        </Button>
      </div>

      {/* Category pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          onClick={() => props.setCategory("")}
          className={classNames(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            !props.category
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground",
          )}
        >
          {tx("All")}
        </Button>
        {visibleCategories.map((c) => {
          const slug = c.slugs[0] ?? "";
          const active = props.category === slug;
          return (
            <Button
              variant="ghost"
              key={c.key}
              aria-pressed={active}
              onClick={() => props.setCategory(active ? "" : slug)}
              className={classNames(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground",
              )}
            >
              {c.name}
            </Button>
          );
        })}
        {categoryOptions.length > 8 && (
          <Button
            variant="ghost"
            onClick={() => setShowAllCategories((v) => !v)}
            className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-brand-purple dark:border-white/20 dark:text-brand-purple-lighter"
          >
            {showAllCategories
              ? tx("Fewer categories")
              : `${tx("All")} ${categoryOptions.length} ${tx("categories")}`}
          </Button>
        )}
      </div>

      {/* Filters */}
      {props.showFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          <select
            aria-label="Filter by condition"
            value={props.condition}
            onChange={(e) => props.setCondition(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          >
            <option value="">{tx("Any condition")}</option>
            {Object.entries(PRODUCT_CONDITION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by country"
            value={props.country}
            onChange={(e) => props.setCountry(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          >
            <option value="">{tx("All countries")}</option>
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
            aria-label="Filter by state"
            value={props.state}
            onChange={(e) => props.setState(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          >
            <option value="">{tx("All states")}</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              props.setCondition("");
              props.setState("");
              props.setCategory("");
              props.setSearch("");
            }}
            className="text-xs text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground/80"
          >
            <X aria-hidden="true" className="inline h-3 w-3" /> {tx("Clear")}
          </Button>
        </div>
      )}

      {/* Products grid */}
      {props.loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2
            aria-hidden="true"
            className="h-5 w-5 animate-spin text-brand-purple"
          />
        </div>
      ) : props.products.length === 0 ? (
        <div className="py-12 text-center">
          <Store className="mx-auto h-10 w-10 text-muted-foreground/80" />
          <p className="mt-3 text-sm font-medium text-foreground dark:text-primary-foreground">
            {tx("No products found")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sellers are joining soon. Meanwhile, plan your project with our free
            tools, or list a product for sale.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/marketplace/products/post/"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />{" "}
              {tx("Sell a Product")}
            </Link>
            <Link
              to="/learn/"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground dark:border-white/10 dark:text-primary-foreground"
            >
              {tx("Read the guides")}
            </Link>
            <Link
              to="/prices/"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground dark:border-white/10 dark:text-primary-foreground"
            >
              {tx("Check material prices")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {props.total} products found
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {props.products.map((product) => {
              const discount =
                product.compare_at_price &&
                product.compare_at_price > product.price
                  ? Math.round(
                      ((product.compare_at_price - product.price) /
                        product.compare_at_price) *
                        100,
                    )
                  : null;
              return (
                <div
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/10"
                >
                  <Link
                    to={`/marketplace/products/${product.id}/`}
                    className="block"
                  >
                    {/* Image */}
                    <div className="aspect-square overflow-hidden bg-muted dark:bg-white/5 relative">
                      {product.images.length > 0 ? (
                        <img
                          src={
                            product.images[product.primary_image_idx] ||
                            product.images[0]
                          }
                          alt={product.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/80">
                          <Store className="h-8 w-8" />
                        </div>
                      )}
                      {discount && (
                        <span className="absolute left-2 top-2 rounded bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                          -{discount}%
                        </span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-foreground dark:text-primary-foreground group-hover:text-brand-purple">
                        {product.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {product.category?.name || "Other"}
                      </p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-sm font-bold text-brand-purple">
                          {formatPrice(product.price, product.currency)}
                        </span>
                        {product.compare_at_price &&
                          product.compare_at_price > product.price && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatPrice(
                                product.compare_at_price,
                                product.currency,
                              )}
                            </span>
                          )}
                      </div>
                      {product.description && (
                        // Two lines of the real description: a grid of bare
                        // titles tells a buyer nothing about the goods.
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {PRODUCT_CONDITION_LABELS[product.condition]}
                        </span>
                        {product.location_city && (
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin
                              aria-hidden="true"
                              className="h-2.5 w-2.5"
                            />
                            {product.location_city}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  {/* Seller contact stays outside the card link: a button
                      nested inside an anchor is invalid HTML and a mis-tap
                      opened the product instead of the message box. */}
                  <div className="border-t border-border px-3 py-2 dark:border-white/10">
                    <Link
                      to={`/marketplace/products/${product.id}/?contact=1`}
                      className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-border text-xs font-semibold text-foreground transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-primary-foreground"
                    >
                      <MessageCircle
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />
                      {tx("Message seller")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          {props.hasMore && (
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={props.onLoadMore}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
              >
                {tx("Load More")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
