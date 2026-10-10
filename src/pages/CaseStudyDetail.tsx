import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Loader2,
  MapPin,
  Calendar,
  Layers,
  Clock3,
  Wallet,
  ArrowLeft,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { fetchCaseStudyById, type CaseStudyView } from "@/lib/case-studies";
import { CATEGORY_LABELS } from "@/lib/case-study-labels";

export default function CaseStudyDetail() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<CaseStudyView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const headline = view?.caseStudy.headline;
  useSeo({
    title: headline ? `${headline} | FRELUX Case Study` : "Case Study | FRELUX",
    description:
      view?.caseStudy.summary ??
      "A real before and after project documented end to end with FRELUX.",
    canonicalPath: `/case-studies/${id ?? ""}`,
    ogType: "article",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = id ? await fetchCaseStudyById(id) : null;
        if (cancelled) return;
        if (!result) setNotFound(true);
        else setView(result);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2
          aria-hidden="true"
          className="h-8 w-8 animate-spin text-brand-purple"
        />
      </div>
    );
  }

  if (notFound || !view) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <PageHeader
          title="Case study not found"
          subtitle="It may have been unpublished or removed."
        />
        <Link
          to="/case-studies"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-purple hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to case
          studies
        </Link>
      </div>
    );
  }

  const { caseStudy, entry, beforeImage, afterImage, images } = view;
  const currency = caseStudy.currency ?? "NGN";
  const currencySymbol = currency === "NGN" ? "₦" : `${currency} `;

  return (
    <article className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/case-studies"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-purple hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All case studies
      </Link>

      <div className="mt-4">
        <PageHeader title={caseStudy.headline} subtitle={caseStudy.summary} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {CATEGORY_LABELS[entry.project_category] ?? entry.project_category}
        </span>
        {entry.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden="true" className="h-4 w-4" /> {entry.location}
          </span>
        )}
        {entry.completion_date && (
          <span className="inline-flex items-center gap-1">
            <Calendar aria-hidden="true" className="h-4 w-4" /> Completed{" "}
            {new Date(entry.completion_date).toLocaleDateString()}
          </span>
        )}
        {caseStudy.project_duration && (
          <span className="inline-flex items-center gap-1">
            <Clock3 aria-hidden="true" className="h-4 w-4" />{" "}
            {caseStudy.project_duration}
          </span>
        )}
        {caseStudy.budget !== null && caseStudy.budget !== undefined && (
          <span className="inline-flex items-center gap-1">
            <Wallet aria-hidden="true" className="h-4 w-4" /> {currencySymbol}
            {caseStudy.budget.toLocaleString()}
          </span>
        )}
      </div>

      {/* Before / After hero pair */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <figure className="overflow-hidden rounded-xl border bg-muted">
          <span className="block border-b bg-muted/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Before
          </span>
          {beforeImage ? (
            <img
              src={beforeImage.image_url}
              alt={`Before: ${entry.title}`}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-sm text-muted-foreground">
              No before photo
            </div>
          )}
        </figure>
        <figure className="overflow-hidden rounded-xl border bg-muted">
          <span className="block border-b bg-muted/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            After
          </span>
          {afterImage ? (
            <img
              src={afterImage.image_url}
              alt={`After: ${entry.title}`}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-sm text-muted-foreground">
              No after photo
            </div>
          )}
        </figure>
      </div>

      {/* Story sections */}
      <div className="mt-8 space-y-6">
        {caseStudy.project_scope && (
          <Section title="Project Scope" body={caseStudy.project_scope} />
        )}
        {caseStudy.challenges && (
          <Section title="Challenges" body={caseStudy.challenges} />
        )}
        {caseStudy.outcome && (
          <Section title="Outcome" body={caseStudy.outcome} />
        )}
        {caseStudy.materials_used.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Materials Used
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {caseStudy.materials_used.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm text-foreground"
                >
                  <Layers
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-muted-foreground"
                  />{" "}
                  {m}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Additional photos */}
      {images.length > 2 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">More Photos</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.slice(2).map((img) => (
              <figure
                key={img.id}
                className="overflow-hidden rounded-lg border bg-muted"
              >
                <img
                  src={img.image_url}
                  alt={img.caption ?? entry.title}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
              </figure>
            ))}
          </div>
        </div>
      )}

      <p className="mt-10 text-sm text-muted-foreground">
        This case study is part of the{" "}
        <Link
          to="/gallery"
          className="font-medium text-brand-purple underline-offset-4 hover:underline"
        >
          FRELUX before &amp; after gallery
        </Link>
        . Want numbers for your own project?{" "}
        <Link
          to="/calculators"
          className="font-medium text-brand-purple underline-offset-4 hover:underline"
        >
          Run a free estimate
        </Link>
        .
      </p>
    </article>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {body}
      </p>
    </section>
  );
}
