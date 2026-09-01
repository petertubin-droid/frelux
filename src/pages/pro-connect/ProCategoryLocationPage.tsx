import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, Loader2, Shield, Briefcase } from "lucide-react";
import {
  fetchCategories,
  fetchLocations,
  searchProfessionals,
} from "@/lib/pro-connect";
import { useSeo } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/structured-data";
import type {
  DbProCategory,
  DbProLocation,
  DbProProfile,
} from "@/types/pro-connect";
import LocationPicker from "@/components/ui/LocationPicker";

// ============================================================
// SEO Page: /pro/:categorySlug/:locationSlug
// Shows verified professionals by category + location
// Example: /pro/painters/port-harcourt
// ============================================================

function slugifyProfessionals(categorySlug: string): string {
  // Map common slugs to readable profession names
  const map: Record<string, string> = {
    painting: "Painters",
    screeding: "Screeders",
    pop_ceiling: "POP Ceiling Installers",
    tiling: "Tilers",
    multi_trade: "Multi-Trade Professionals",
  };
  return (
    map[categorySlug] ||
    categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)
  );
}

export default function ProCategoryLocationPage() {
  const { categorySlug, locationSlug } = useParams<{
    categorySlug: string;
    locationSlug: string;
  }>();
  const [_category, setCategory] = useState<DbProCategory | null>(null);
  const [location, setLocation] = useState<DbProLocation | null>(null);
  const [pros, setPros] = useState<DbProProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!categorySlug || !locationSlug) return;
    setLoading(true);
    (async () => {
      const [cats, locs] = await Promise.all([
        fetchCategories(),
        fetchLocations(),
      ]);
      const cat = cats.find((c) => c.slug === categorySlug);
      const loc =
        locs.find((l) => l.slug === locationSlug) ||
        locs.find(
          (l) =>
            l.city.toLowerCase().replace(/[^a-z0-9]+/g, "-") === locationSlug,
        );

      if (!cat || !loc) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCategory(cat);
      setLocation(loc);

      const result = await searchProfessionals({
        categoryId: cat.id,
        state: loc.state,
        pageSize: 20,
      });
      setPros(result.profiles);
      setLoading(false);
    })();
  }, [categorySlug, locationSlug]);

  const locationLabel = location
    ? [location.city, location.state].filter(Boolean).join(", ")
    : "";
  const professionLabel = slugifyProfessionals(categorySlug || "");

  // SEO
  useSeo({
    title: `${professionLabel} in ${locationLabel || "..."} — FRELUX Pro Connect`,
    description: `Find verified ${professionLabel.toLowerCase()} in ${locationLabel}. Browse profiles, check ratings, and connect with trusted construction professionals on FRELUX.`,
    canonicalPath: `/pro/${categorySlug}/${locationSlug}`,
    noIndex: false,
    structuredData: breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Pro Connect", path: "/pro-connect" },
      { name: professionLabel, path: `/pro/${categorySlug}` },
      {
        name: locationLabel || "Location",
        path: `/pro/${categorySlug}/${locationSlug}`,
      },
    ]),
  });

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Briefcase className="mx-auto h-12 w-12 text-neutral-300" />
        <h1 className="mt-4 text-xl font-bold text-neutral-900 dark:text-white">
          Page Not Found
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          This category or location doesn't exist.
        </p>
        <Link
          to="/pro-connect"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple"
        >
          <ArrowRight aria-hidden="true" className="h-4 w-4 rotate-180" /> Back
          to Pro Connect
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-brand-navy">
      {/* Breadcrumb */}
      <div className="border-b border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-500">
            <Link to="/" className="hover:text-brand-purple">
              Home
            </Link>
            <span>/</span>
            <Link to="/pro-connect" className="hover:text-brand-purple">
              Pro Connect
            </Link>
            <span>/</span>
            <span className="text-neutral-900 dark:text-white">
              {professionLabel} in {location?.city || "..."}
            </span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
            {professionLabel} in {locationLabel || "..."}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-500 dark:text-neutral-500">
            Browse verified {professionLabel.toLowerCase()} in {locationLabel}.
            Check ratings, portfolios, and connect directly.
          </p>
          <div className="mt-4">
            <LocationPicker compact />
          </div>
        </div>
      </div>

      {/* Professionals */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              aria-hidden="true"
              className="h-6 w-6 animate-spin text-brand-purple"
            />
          </div>
        ) : pros.length === 0 ? (
          <div className="rounded-xl border border-neutral-200/60 bg-white p-8 text-center dark:border-white/5 dark:bg-brand-navy-mid">
            <Briefcase className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 text-sm text-neutral-500">
              No {professionLabel.toLowerCase()} listed in {locationLabel} yet.
            </p>
            <Link
              to="/pro-connect/register"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white"
            >
              Register as a Pro
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-500">
              {pros.length}{" "}
              {pros.length === 1 ? "professional" : "professionals"} found
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pros.map((pro) => (
                <Link
                  key={pro.id}
                  to={`/pro-connect/${pro.slug}`}
                  className="group rounded-xl border border-neutral-200/60 bg-white p-4 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-brand-navy-mid"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                      {pro.profile_image_url ? (
                        <img
                          src={pro.profile_image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-bold text-brand-purple">
                          {pro.display_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold text-neutral-900 dark:text-white group-hover:text-brand-purple">
                          {pro.business_name || pro.display_name}
                        </p>
                        {pro.verification_status === "verified" && (
                          <Shield
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                          />
                        )}
                      </div>
                      {pro.bio && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-500">
                          {pro.bio}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-500">
                        {pro.rating_avg > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <span className="text-amber-400 text-xs">★</span>
                            {pro.rating_avg.toFixed(1)}
                          </span>
                        )}
                        {pro.project_count > 0 && (
                          <span>· {pro.project_count} projects</span>
                        )}
                        {pro.years_experience && (
                          <span>· {pro.years_experience} yrs exp</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
