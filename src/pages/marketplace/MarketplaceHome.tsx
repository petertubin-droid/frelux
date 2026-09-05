import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  MapPin,
  Loader2,
  SlidersHorizontal,
  X,
  Store,
  Briefcase,
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
  const sym = currency === "NGN" ? "₦" : "";
  if (min && max)
    return `${sym}${min.toLocaleString()} – ${sym}${max.toLocaleString()}`;
  if (min) return `From ${sym}${min.toLocaleString()}`;
  if (max) return `Up to ${sym}${max.toLocaleString()}`;
  return "Budget negotiable";
}

function formatPrice(p: number, currency: string) {
  const sym = currency === "NGN" ? "₦" : "";
  return `${sym}${p.toLocaleString()}`;
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
      "Post construction jobs and get bids from verified pros, or buy and sell building materials, painting supplies, and interior design products across Nigeria.",
    canonicalPath: "/marketplace",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Marketplace",
      name: "FRELUX Marketplace",
      description:
        "Post construction jobs and get bids from verified pros, or buy and sell building materials, painting supplies, and interior design products across Nigeria.",
      url: `${SITE_URL}/marketplace`,
      provider: {
        "@type": "Organization",
        name: "FRELUX PROJECT CALC",
        url: SITE_URL,
      },
      areaServed: {
        "@type": "Country",
        name: "Nigeria",
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

  // Load jobs — uses refs to avoid re-creation on state change (prevents infinite render loop)
  const jobsOffsetRef = useRef(jobsOffset);
  const listingsRef = useRef(listings);
  jobsOffsetRef.current = jobsOffset;
  listingsRef.current = listings;

  const loadJobs = useCallback(
    async (reset = false) => {
      setJobsLoading(true);
      const off = reset ? 0 : jobsOffsetRef.current;
      const { listings: data, total: count } = await fetchListings({
        search: jobSearch || undefined,
        project_type: projectType || undefined,
        location_state: jobState || undefined,
        limit: 12,
        offset: off,
      });
      setListings(reset ? data : [...listingsRef.current, ...data]);
      setJobsTotal(count);
      setJobsHasMore(off + data.length < count);
      if (reset) setJobsOffset(0);
      else setJobsOffset(off + data.length);
      setJobsLoading(false);
    },
    [jobSearch, projectType, jobState],
  );

  // Load products — same ref pattern to prevent infinite loop
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
      const { products: data, total: count } = await searchProducts({
        search: productSearch || undefined,
        category_id: catId,
        condition: (productCondition || undefined) as
          ProductCondition | undefined,
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
      setProductsLoading(false);
    },
    [
      productSearch,
      productCategory,
      productCondition,
      productState,
      productSort,
      productCategories,
    ],
  );

  useEffect(() => {
    if (tab === "jobs") loadJobs(true);
  }, [tab, jobSearch, projectType, jobState, loadJobs]);

  useEffect(() => {
    if (tab === "products") loadProducts(true);
  }, [
    tab,
    productSearch,
    productCategory,
    productCondition,
    productState,
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
      {/* ── Hero Section: BUILD. BUY. SELL. CONNECT. ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/20">
        {/* Decorative grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="text-center">
            {/* Tagline words */}
            <div className="mb-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              <span className="text-primary-foreground">BUILD.</span>
              <span className="text-brand-purple-lighter">BUY.</span>
              <span className="text-primary-foreground">SELL.</span>
              <span className="text-brand-purple-lighter">CONNECT.</span>
            </div>

            <p className="mx-auto max-w-2xl text-sm text-muted-foreground/80 sm:text-base">
              Nigeria's #1 marketplace for construction materials, professional
              services, and building projects. Find trusted suppliers, hire
              verified pros, and get your project done.
            </p>

            {/* Quick action buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/marketplace/post"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg"
              >
                <Plus aria-hidden="true" className="h-4 w-4" /> Post a Job
              </Link>
              <Link
                to="/marketplace/products/post"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-primary-foreground backdrop-blur transition-all hover:bg-white/10"
              >
                <Store className="h-4 w-4" /> Sell a Product
              </Link>
              <Link
                to="/pro-connect/register"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-primary-foreground backdrop-blur transition-all hover:bg-white/10"
              >
                <Briefcase className="h-4 w-4" /> Become a Pro
              </Link>
            </div>

            {/* Stats bar */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground sm:gap-10">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary-foreground">
                  {jobsTotal + productsTotal}
                </span>
                <span>Active Listings</span>
              </div>
              <div className="hidden h-8 w-px bg-white/10 sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary-foreground">14</span>
                <span>Categories</span>
              </div>
              <div className="hidden h-8 w-px bg-white/10 sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary-foreground">36</span>
                <span>States Covered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Showcase ── */}
      <div className="border-b border-border/50 dark:border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Browse by Category
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
                icon: "✨",
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
                to={`/marketplace/category/${cat.slug}`}
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
              <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground sm:text-3xl">
                FRELUX Marketplace
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Post jobs, buy & sell building materials and interior design
                products.
              </p>
            </div>
            <div className="flex gap-2">
              {tab === "jobs" ? (
                <Link
                  to="/marketplace/post"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" /> Post a Job
                </Link>
              ) : (
                <Link
                  to="/marketplace/products/post"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" /> Sell a Product
                </Link>
              )}
            </div>
          </div>

          {/* Tab switcher */}
          <div className="mt-5 flex gap-1">
            <Button variant="ghost"
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
                    tab === "jobs"
                      ? "bg-white/20"
                      : "bg-muted dark:bg-white/5",
                  )}
                >
                  {jobsTotal}
                </span>
              )}
            </Button>
            <Button variant="ghost"
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
      {/* Native banner slot — placement "marketplace_native" */}
      <AdSlot slotKey="marketplace_native" className="mt-8" />
      {/* Ad slot — placement "marketplace_bottom" */}
      <AdSlot slotKey="marketplace_bottom" className="mt-8" />
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
            value={props.search}
            onChange={(e) => props.setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="w-full rounded-lg border border-border py-2.5 pl-10 pr-4 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          />
        </div>
        <Button variant="ghost"
          onClick={() => props.setShowFilters(!props.showFilters)}
          className={classNames(
            "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium",
            props.showFilters
              ? "border-brand-purple bg-primary/5 text-brand-purple"
              : "border-border text-muted-foreground dark:border-white/10 dark:text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </Button>
      </div>

      {/* Filters */}
      {props.showFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={props.projectType}
            onChange={(e) => props.setProjectType(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          >
            <option value="">All trades</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={props.state}
            onChange={(e) => props.setState(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          >
            <option value="">All states</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button variant="ghost"
            onClick={() => {
              props.setProjectType("");
              props.setState("");
              props.setSearch("");
            }}
            className="text-xs text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground/80"
          >
            <X aria-hidden="true" className="inline h-3 w-3" /> Clear
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
                to={`/marketplace/${listing.id}`}
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
            No jobs found
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search or post a job.
          </p>
          <Link
            to="/marketplace/post"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus aria-hidden="true" className="h-4 w-4" /> Post a Job
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
                to={`/marketplace/${listing.id}`}
                className="group rounded-xl border border-border p-5 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground dark:bg-white/5">
                    {PROJECT_TYPE_LABELS[listing.project_type] ||
                      listing.project_type}
                  </span>
                  {listing.is_featured && (
                    <span className="text-xs font-bold text-brand-purple">
                      ★
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
              <Button variant="ghost"
                onClick={props.onLoadMore}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
              >
                Load More
              </Button>
            </div>
          )}
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
  sort: string;
  setSort: (v: string) => void;
  categories: DbProductCategory[];
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  onLoadMore: () => void;
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
            value={props.search}
            onChange={(e) => props.setSearch(e.target.value)}
            placeholder="Search products, brands, materials..."
            className="w-full rounded-lg border border-border py-2.5 pl-10 pr-4 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          />
        </div>
        <select
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
        <Button variant="ghost"
          onClick={() => props.setShowFilters(!props.showFilters)}
          className={classNames(
            "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium",
            props.showFilters
              ? "border-brand-purple bg-primary/5 text-brand-purple"
              : "border-border text-muted-foreground dark:border-white/10 dark:text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </Button>
      </div>

      {/* Category pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="ghost"
          onClick={() => props.setCategory("")}
          className={classNames(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            !props.category
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground",
          )}
        >
          All
        </Button>
        {props.categories.map((c) => (
          <Button variant="ghost"
            key={c.id}
            onClick={() => props.setCategory(c.slug)}
            className={classNames(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              props.category === c.slug
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground",
            )}
          >
            {c.name}
          </Button>
        ))}
      </div>

      {/* Filters */}
      {props.showFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={props.condition}
            onChange={(e) => props.setCondition(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          >
            <option value="">Any condition</option>
            {Object.entries(PRODUCT_CONDITION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={props.state}
            onChange={(e) => props.setState(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          >
            <option value="">All states</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button variant="ghost"
            onClick={() => {
              props.setCondition("");
              props.setState("");
              props.setCategory("");
              props.setSearch("");
            }}
            className="text-xs text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground/80"
          >
            <X aria-hidden="true" className="inline h-3 w-3" /> Clear
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
            No products found
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search or list a product for sale.
          </p>
          <Link
            to="/marketplace/products/post"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus aria-hidden="true" className="h-4 w-4" /> Sell a Product
          </Link>
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
                <Link
                  key={product.id}
                  to={`/marketplace/products/${product.id}`}
                  className="group rounded-xl border border-border overflow-hidden transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/10"
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
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/80">
                        <Store className="h-8 w-8" />
                      </div>
                    )}
                    {discount && (
                      <span className="absolute left-2 top-2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
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
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{PRODUCT_CONDITION_LABELS[product.condition]}</span>
                      {product.location_city && (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin aria-hidden="true" className="h-2.5 w-2.5" />
                          {product.location_city}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          {props.hasMore && (
            <div className="mt-6 text-center">
              <Button variant="ghost"
                onClick={props.onLoadMore}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
