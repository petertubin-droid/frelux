import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, ArrowRight, Loader2, Package } from "lucide-react";
import { fetchCategories } from "@/lib/pro-connect";
import { fetchListings } from "@/lib/marketplace";
import { useSeo } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/structured-data";
import type { DbProCategory } from "@/types/pro-connect";
import type { DbMarketplaceListing } from "@/types/marketplace";
import { PROJECT_TYPE_LABELS } from "@/types/marketplace";
import LocationPicker from "@/components/ui/LocationPicker";
import AdSlot from "@/components/ui/AdSlot";

// ============================================================
// SEO Page: /marketplace/category/:categorySlug
// Shows all listings in a category, indexable by search engines
// ============================================================

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

export default function MarketplaceCategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [category, setCategory] = useState<DbProCategory | null>(null);
  const [listings, setListings] = useState<DbMarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!categorySlug) return;
    setLoading(true);
    (async () => {
      // Find category by slug
      const cats = await fetchCategories();
      const cat = cats.find((c) => c.slug === categorySlug);
      if (!cat) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCategory(cat);

      // Fetch listings in this category
      const { listings: data } = await fetchListings({
        category_id: cat.id,
        limit: 50,
      });
      setListings(data);
      setLoading(false);
    })();
  }, [categorySlug]);

  // SEO
  useSeo({
    title: category
      ? `${category.name} Services & Jobs — FRELUX Marketplace`
      : "Marketplace Category — FRELUX",
    description:
      category?.seo_description ||
      category?.description ||
      `Browse ${category?.name || "construction"} jobs and services on the FRELUX Marketplace. Post a job and get bids from verified professionals.`,
    canonicalPath: `/marketplace/category/${categorySlug}`,
    noIndex: false,
    structuredData: breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Marketplace", path: "/marketplace" },
      {
        name: category?.name || "Category",
        path: `/marketplace/category/${categorySlug}`,
      },
    ]),
  });

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Package
          aria-hidden="true"
          className="mx-auto h-12 w-12 text-muted-foreground/80"
        />
        <h1 className="mt-4 text-xl font-bold text-foreground dark:text-primary-foreground">
          Category Not Found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This category doesn't exist or is no longer active.
        </p>
        <Link
          to="/marketplace"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple"
        >
          <ArrowRight aria-hidden="true" className="h-4 w-4 rotate-180" /> Back
          to Marketplace
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
            <Link to="/" className="hover:text-brand-purple">
              Home
            </Link>
            <span>/</span>
            <Link to="/marketplace" className="hover:text-brand-purple">
              Marketplace
            </Link>
            <span>/</span>
            <span className="text-foreground dark:text-primary-foreground">
              {category?.name || "..."}
            </span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-border bg-card dark:border-white/5 dark:bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground sm:text-3xl">
            {category?.name || "Loading..."}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground dark:text-muted-foreground">
            {category?.description ||
              `Find ${category?.name || "construction"} professionals and job listings on FRELUX.`}
          </p>

          {/* Location filter */}
          <div className="mt-4">
            <LocationPicker compact />
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              aria-hidden="true"
              className="h-6 w-6 animate-spin text-brand-purple"
            />
          </div>
        ) : listings.length === 0 ? (
          <div className="py-20 text-center">
            <Package
              aria-hidden="true"
              className="mx-auto h-12 w-12 text-muted-foreground/80"
            />
            <h2 className="mt-4 text-lg font-semibold text-card-foreground dark:text-muted-foreground/60">
              No Active Listings
            </h2>
            <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
              There are currently no active job listings in this category.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first to post a job in {category?.name}.
            </p>
            <Link
              to="/marketplace/post"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Post a Job
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground dark:text-muted-foreground">
              {listings.length} active{" "}
              {listings.length === 1 ? "listing" : "listings"} in{" "}
              {category?.name}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/marketplace/${listing.id}`}
                  className="group rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-card"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-brand-purple">
                      {PROJECT_TYPE_LABELS[listing.project_type] ||
                        listing.project_type}
                    </span>
                    {listing.urgency === "urgent" && (
                      <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                        Urgent
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-foreground dark:text-primary-foreground group-hover:text-brand-purple">
                    {listing.title}
                  </h3>
                  {listing.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground dark:text-muted-foreground">
                      {listing.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-card-foreground dark:text-muted-foreground/60">
                      {formatBudget(
                        listing.budget_min,
                        listing.budget_max,
                        listing.currency,
                      )}
                    </span>
                    {listing.location_city && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                        <MapPin aria-hidden="true" className="h-3 w-3" />
                        {listing.location_city}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
      <AdSlot slotKey="marketplace_sidebar" className="mt-8" />
    </div>
  );
}
