import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  MapPin,
  Calendar,
  Layers,
  Clock3,
  ArrowRight,
  SearchX,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { fetchWithOfflineCache, describeAge } from "@/lib/offline-store";
import {
  fetchPublishedCaseStudies,
  type CaseStudyView,
} from "@/lib/case-studies";
import { CATEGORY_LABELS } from "@/lib/case-study-labels";

export default function CaseStudies() {
  useSeo({
    title: "Before & After Case Studies: Real Projects, Real Numbers | FRELUX",
    description:
      "In-depth before and after case studies of real Nigerian painting, screeding, POP ceiling and tiling projects: the scope, the challenges, the outcome and what it cost.",
    canonicalPath: "/case-studies",
    ogType: "website",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "FRELUX Before & After Case Studies",
        description:
          "Curated project case studies with before and after photos, scope, challenges, outcomes and budgets.",
      },
    ],
  });

  const [studies, setStudies] = useState<CaseStudyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchWithOfflineCache(
          "case-studies:published",
          () => fetchPublishedCaseStudies(),
        );
        if (cancelled) return;
        setStudies(result.data ?? []);
        setCachedAt(result.source === "cache" ? result.cachedAt : null);
      } catch (_e) {
        if (!cancelled)
          setError(
            "Could not load case studies right now. Please try again shortly.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Before & After Case Studies"
        subtitle="Real projects from the FRELUX community, documented end to end: scope, challenges, outcome and cost."
      />

      {cachedAt && !loading && (
        <p className="mt-4 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
          Showing saved case studies (cached {describeAge(cachedAt)}). They will
          refresh when you are back online.
        </p>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2
            aria-hidden="true"
            className="h-8 w-8 animate-spin text-brand-purple"
          />
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && studies.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border p-12 text-center">
          <SearchX
            aria-hidden="true"
            className="h-10 w-10 text-muted-foreground"
          />
          <p className="text-lg font-semibold text-foreground">
            No case studies published yet
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Case studies are curated from approved gallery projects. Check back
            soon, or{" "}
            <Link
              to="/gallery"
              className="font-medium text-brand-purple underline-offset-4 hover:underline"
            >
              browse the full gallery
            </Link>{" "}
            in the meantime.
          </p>
        </div>
      )}

      {!loading && studies.length > 0 && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {studies.map((view) => (
            <CaseStudyCard key={view.caseStudy.id} view={view} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CaseStudyCard({ view }: { view: CaseStudyView }) {
  const { caseStudy, entry, beforeImage, afterImage } = view;
  return (
    <Link
      to={`/case-studies/${caseStudy.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-shadow hover:shadow-lg"
    >
      <div className="grid grid-cols-2">
        <figure className="relative aspect-[4/3] overflow-hidden bg-muted">
          <span className="absolute left-2 top-2 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Before
          </span>
          {beforeImage ? (
            <img
              src={beforeImage.image_url}
              alt={`Before: ${entry.title}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No photo
            </div>
          )}
        </figure>
        <figure className="relative aspect-[4/3] overflow-hidden bg-muted">
          <span className="absolute left-2 top-2 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            After
          </span>
          {afterImage ? (
            <img
              src={afterImage.image_url}
              alt={`After: ${entry.title}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No photo
            </div>
          )}
        </figure>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {CATEGORY_LABELS[entry.project_category] ?? entry.project_category}
          </span>
          {entry.location && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" />{" "}
              {entry.location}
            </span>
          )}
          {entry.completion_date && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar aria-hidden="true" className="h-3.5 w-3.5" />{" "}
              {new Date(entry.completion_date).toLocaleDateString()}
            </span>
          )}
        </div>
        <h2 className="text-lg font-semibold leading-snug text-foreground">
          {caseStudy.headline}
        </h2>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {caseStudy.summary}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {caseStudy.project_duration && (
              <span className="inline-flex items-center gap-1">
                <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{" "}
                {caseStudy.project_duration}
              </span>
            )}
            {caseStudy.materials_used.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Layers aria-hidden="true" className="h-3.5 w-3.5" />{" "}
                {caseStudy.materials_used.slice(0, 2).join(", ")}
                {caseStudy.materials_used.length > 2
                  ? ` +${caseStudy.materials_used.length - 2}`
                  : ""}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-purple">
            Read case study{" "}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
