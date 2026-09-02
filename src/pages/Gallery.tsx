import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Calendar,
  Filter,
  Crown,
  ArrowRight,
  Share2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import {
  fetchPublicGallery,
  fetchGalleryImages,
} from "@/lib/project-intelligence";
import type { DbGalleryEntry } from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "painting", label: "Painting" },
  { key: "screeding", label: "Screeding" },
  { key: "pop_ceiling", label: "POP Ceiling" },
  { key: "tiling", label: "Tiling" },
  { key: "finishing", label: "Finishing" },
  { key: "construction", label: "Construction" },
];

export default function Gallery() {
  useSeo({
    title: "Before & After Project Gallery: Real Painting Transformations",
    description:
      "Browse real FRELUX project transformations. See before and after photos of painting, screeding, POP ceiling, tiling, and finishing projects.",
    canonicalPath: "/gallery",
    ogType: "website",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "FRELUX Before & After Gallery",
        description:
          "Real project transformations from the FRELUX community showcasing painting, screeding, POP ceiling, tiling, and finishing work.",
      },
    ],
  });

  const { user } = useAuth();
  const [entries, setEntries] = useState<DbGalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [images, setImages] = useState<
    Record<string, { before?: string; after?: string }>
  >({});

  const loadGallery = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPublicGallery({
        category: filter || undefined,
        limit: 24,
      });
      setEntries(data);
      const imgPromises = data.map(async (entry) => {
        const imgs = await fetchGalleryImages(entry.id);
        const before = imgs.find((i) => i.image_type === "before");
        const after = imgs.find((i) => i.image_type === "after");
        return [
          entry.id,
          { before: before?.image_url, after: after?.image_url },
        ] as const;
      });
      const imgResults = await Promise.all(imgPromises);
      const imgMap: Record<string, { before?: string; after?: string }> = {};
      for (const [id, urls] of imgResults) imgMap[id] = urls;
      setImages(imgMap);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="Community"
        title="Before & After Gallery"
        subtitle="Real project transformations from the FRELUX community."
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Filter bar + Share button */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 ${
                filter === cat.key
                  ? "bg-primary text-primary-foreground shadow-md shadow-brand-purple/25"
                  : "border border-border bg-card text-muted-foreground hover:border-brand-purple/30 dark:border-white/10 dark:bg-card dark:text-muted-foreground"
              }`}
            >
              {cat.label}
            </Button>
          ))}
          {user && (
            <Link
              to="/gallery/new"
              className="group ml-auto inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-brand-purple/20 transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              Share Your Project
            </Link>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            <p className="text-sm text-muted-foreground">Loading gallery…</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-brand-purple mb-4">
              <ImageIcon className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-bold text-foreground dark:text-primary-foreground">
              No gallery entries yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to share your project transformation!
            </p>
            {user && (
              <Link
                to="/gallery/new"
                className="group mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-brand-purple/20 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                Share Your Project
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        )}

        {/* Gallery grid */}
        {!loading && !error && entries.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry, i) => {
              const imgs = images[entry.id] || {};
              return (
                <div
                  key={entry.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-card"
                  style={{
                    animation: `fadeInUp 0.4s ease-out ${i * 60}ms both`,
                  }}
                >
                  {/* Image with hover overlay */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted dark:bg-white/5">
                    {imgs.after ? (
                      <img
                        src={imgs.after}
                        alt={`${entry.title} - after`}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : imgs.before ? (
                      <img
                        src={imgs.before}
                        alt={`${entry.title} - before`}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground/80">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}

                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    {/* Featured badge */}
                    {entry.is_featured && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
                        <Crown className="h-3 w-3" /> Featured
                      </span>
                    )}

                    {/* Hover actions */}
                    <div className="absolute bottom-3 left-3 flex gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
                      <Button className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-card-foreground backdrop-blur transition-all hover:scale-110 hover:text-brand-purple">
                        <Crown className="h-4 w-4" />
                      </Button>
                      <Button className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-card-foreground backdrop-blur transition-all hover:scale-110 hover:text-brand-purple">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-bold text-foreground dark:text-primary-foreground group-hover:text-brand-purple transition-colors duration-300">
                      {entry.title}
                    </h3>
                    {entry.description && (
                      <p className="mt-1.5 text-sm text-muted-foreground dark:text-muted-foreground line-clamp-2">
                        {entry.description}
                      </p>
                    )}

                    {/* Tags */}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-brand-purple capitalize">
                        {entry.project_category}
                      </span>
                      {entry.paint_type_used && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground dark:bg-white/10">
                          {entry.paint_type_used}
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {entry.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {entry.location}
                        </span>
                      )}
                      {entry.completion_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{" "}
                          {new Date(entry.completion_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA section */}
        {!loading && !error && entries.length > 0 && (
          <div className="mt-12 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-6 text-center sm:p-8">
            <h3 className="text-lg font-bold text-foreground dark:text-primary-foreground">
              Showcase Your Work
            </h3>
            <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
              Share your before and after photos with the FRELUX community and
              inspire others.
            </p>
            {user ? (
              <Link
                to="/gallery/new"
                className="group mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-brand-purple/20 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                Upload Your Project
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            ) : (
              <Link
                to="/auth"
                className="group mt-5 inline-flex items-center gap-2 rounded-lg border border-brand-purple/30 px-5 py-2.5 text-sm font-semibold text-brand-purple transition-all duration-300 hover:scale-105 hover:bg-primary/10"
              >
                Sign in to Share
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
