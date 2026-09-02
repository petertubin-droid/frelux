import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Loader2,
  ChevronRight,
  ArrowRight,
  Calculator,
  AlertCircle,
  Layers,
} from "lucide-react";
import { useSeo } from "@/lib/seo";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import {
  getPublicTemplateBySlug,
  getRelatedPublicTemplates,
  calculatorLabel,
  CALCULATOR_META,
} from "@/lib/templates";
import type { DbCalculatorTemplate } from "@/types/database";
import { SITE_URL } from "@/lib/seo";
import { getSafeError } from "@/lib/safeError";
import { Button } from "@/components/ui/shadcn/button";

export default function TemplateDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<DbCalculatorTemplate | null>(null);
  const [related, setRelated] = useState<DbCalculatorTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const t = await getPublicTemplateBySlug(slug);
        if (!t) {
          setError("Template not found");
          return;
        }
        setTemplate(t);
        const rel = await getRelatedPublicTemplates(t.calculator_type, t.id);
        setRelated(rel);
      } catch (e) {
        setError(getSafeError(e, "Failed to load template"));
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const seoMeta = useMemo(() => {
    if (!template) return null;
    const calcLabel = calculatorLabel(template.calculator_type);
    return {
      title: template.seo_title ?? `${template.name}: ${calcLabel} Template`,
      description:
        template.seo_description ??
        `Use the ${template.name} template with the FRELUX ${calcLabel} calculator. Pre-configured for Nigerian construction projects with real material prices.`,
      canonicalPath: `/templates/${template.slug}`,
      ogType: "article",
      structuredDataArray: [
        {
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: template.name,
          description: template.seo_description ?? template.description ?? "",
          author: { "@type": "Organization", name: "FRELUX PAINT CALC" },
          publisher: { "@type": "Organization", name: "FRELUX PAINT CALC" },
          url: `${SITE_URL}/templates/${template.slug}`,
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: "Templates",
              item: `${SITE_URL}/templates`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: template.name,
              item: `${SITE_URL}/templates/${template.slug}`,
            },
          ],
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `What is the ${template.name} template?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `The ${template.name} template is a pre-configured starting point for the FRELUX ${calcLabel} calculator. It comes with common dimensions and settings pre-filled, which you can adjust to match your actual measurements.`,
              },
            },
            {
              "@type": "Question",
              name: `How do I use this ${calcLabel.toLowerCase()} template?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `Click "Use This Template" to open the ${calcLabel} calculator with the template's inputs pre-filled. Adjust the dimensions to match your project, then run the calculation to get material quantities and cost estimates.`,
              },
            },
            {
              "@type": "Question",
              name: "Are the prices in this template current?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Template dimensions and settings are pre-configured, but material prices are always loaded from the current market database when you run the calculator. This ensures your estimate reflects today's prices, not outdated ones.",
              },
            },
          ],
        },
      ],
    };
  }, [template]);

  useSeo(
    seoMeta ?? {
      title: "Template",
      description: "FRELUX calculator template",
      canonicalPath: `/templates/${slug}`,
    },
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          aria-hidden="true"
          className="h-6 w-6 animate-spin text-brand-purple"
        />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto h-10 w-10 text-muted-foreground/80 dark:text-muted-foreground"
        />
        <h1 className="mt-4 text-lg font-semibold text-foreground dark:text-primary-foreground">
          Template Not Found
        </h1>
        <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
          {error ?? "This template may have been removed."}
        </p>
        <Link
          to="/templates"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-purple dark:text-brand-purple-lighter"
        >
          Browse all templates <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const calcPath = CALCULATOR_META[template.calculator_type].path;
  const calcLabel = calculatorLabel(template.calculator_type);
  const inputSummary = buildInputSummary(template);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: "Templates", path: "/templates" },
          { label: template.name },
        ]}
      />

      {/* Header */}
      <div className="mt-6">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/8 px-2.5 py-1 text-xs font-medium text-brand-purple dark:bg-primary/15 dark:text-brand-purple-lighter">
          <Calculator aria-hidden="true" className="h-3 w-3" />
          {calcLabel}
        </span>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground dark:text-primary-foreground sm:text-3xl">
          {template.name}
        </h1>
        {template.description && (
          <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
            {template.description}
          </p>
        )}
      </div>

      {/* Explanatory content */}
      <div className="prose prose-sm mt-6 max-w-none dark:prose-invert">
        <p>
          This template is pre-configured for the {template.name.toLowerCase()}{" "}
          project. When you use this template, the FRELUX {calcLabel} calculator
          will open with these inputs pre-filled. The calculator then runs the
          current calculation engine using today's material prices and coverage
          rules specific to Nigerian construction practices.
        </p>
      </div>

      {/* Input summary */}
      <div className="mt-6 rounded-xl border border-border bg-card p-5 dark:border-white/10 dark:bg-card">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground dark:text-primary-foreground">
          <Layers aria-hidden="true" className="h-4 w-4 text-brand-purple" />
          Template Configuration
        </h2>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {inputSummary.map((item) => (
            <div key={item.label} className="flex flex-col">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
                {item.label}
              </dt>
              <dd className="text-sm text-foreground dark:text-primary-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* How it works explanation */}
      <div className="prose prose-sm mt-6 max-w-none dark:prose-invert">
        <h2>How This Template Works</h2>
        <p>
          When you click "Use This Template," the {calcLabel} opens with the
          configuration above already filled in. You can adjust any value to
          match your actual room or surface dimensions. The calculator uses
          Nigerian coverage rates, real product sizes, and current market prices
          to compute material quantities and cost estimates. Every formula,
          waste factor, and coverage rate is transparent and visible in the
          results.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button variant="ghost"
          onClick={() => navigate(`${calcPath}?template=${template.id}`)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Use This Template
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Link
          to={calcPath}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-brand-purple/30 hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground/80"
        >
          Open {calcLabel} Calculator
        </Link>
      </div>

      {/* FAQ */}
      <div className="mt-10">
        <h2 className="mb-4 font-display text-lg font-bold text-foreground dark:text-primary-foreground">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
            <h3 className="text-sm font-semibold text-foreground dark:text-primary-foreground">
              What is the {template.name} template?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground dark:text-muted-foreground">
              The {template.name} template is a pre-configured starting point
              for the FRELUX {calcLabel} calculator. It comes with common
              dimensions and settings pre-filled, which you can adjust to match
              your actual measurements.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
            <h3 className="text-sm font-semibold text-foreground dark:text-primary-foreground">
              How do I use this {calcLabel.toLowerCase()} template?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground dark:text-muted-foreground">
              Click "Use This Template" to open the {calcLabel} with the
              template's inputs pre-filled. Adjust the dimensions to match your
              project, then run the calculation to get material quantities and
              cost estimates.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
            <h3 className="text-sm font-semibold text-foreground dark:text-primary-foreground">
              Are the prices in this template current?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground dark:text-muted-foreground">
              Template dimensions and settings are pre-configured, but material
              prices are always loaded from the current market database when you
              run the calculator. This ensures your estimate reflects today's
              prices.
            </p>
          </div>
        </div>
      </div>

      {/* Related templates */}
      {related.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-foreground dark:text-primary-foreground">
            Related Templates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 sm:grid-cols-2">
            {related.map((t) => (
              <Link
                key={t.id}
                to={`/templates/${t.slug}`}
                className="group flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:border-brand-purple/30 dark:border-white/10 dark:bg-card"
              >
                <div>
                  <p className="text-sm font-medium text-foreground dark:text-primary-foreground">
                    {t.name}
                  </p>
                  {t.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground dark:text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related calculator link */}
      <div className="mt-10 border-t border-border/60 pt-6 dark:border-white/5">
        <Link
          to={calcPath}
          className="group inline-flex items-center gap-2 text-sm font-semibold text-brand-purple dark:text-brand-purple-lighter"
        >
          Open the {calcLabel} directly
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </div>
  );
}

function buildInputSummary(
  template: DbCalculatorTemplate,
): { label: string; value: string }[] {
  const d = template.input_data;
  const parts: { label: string; value: string }[] = [];

  if (template.calculator_type === "paint") {
    if (d.length)
      parts.push({ label: "Length", value: `${d.length} ${d.unit ?? ""}` });
    if (d.width)
      parts.push({ label: "Width", value: `${d.width} ${d.unit ?? ""}` });
    if (d.wallHeight)
      parts.push({
        label: "Wall Height",
        value: `${d.wallHeight} ${d.unit ?? ""}`,
      });
    if (d.coats) parts.push({ label: "Coats", value: String(d.coats) });
    if (d.projectType)
      parts.push({ label: "Project Type", value: String(d.projectType) });
    if (d.includeCeiling) parts.push({ label: "Ceiling", value: "Included" });
    if (d.doors) parts.push({ label: "Doors", value: String(d.doors) });
    if (d.windows) parts.push({ label: "Windows", value: String(d.windows) });
    if (d.wasteMargin)
      parts.push({ label: "Waste Margin", value: `${d.wasteMargin}%` });
  } else if (template.calculator_type === "tile") {
    if (d.length)
      parts.push({ label: "Length", value: `${d.length} ${d.unit ?? ""}` });
    if (d.width)
      parts.push({ label: "Width", value: `${d.width} ${d.unit ?? ""}` });
    if (d.tileWidthMm)
      parts.push({
        label: "Tile Size",
        value: `${d.tileWidthMm}x${d.tileHeightMm}mm`,
      });
    if (d.method) parts.push({ label: "Method", value: String(d.method) });
    if (d.surfaceType)
      parts.push({ label: "Surface", value: String(d.surfaceType) });
    if (d.wasteMargin)
      parts.push({ label: "Waste Margin", value: `${d.wasteMargin}%` });
  } else if (template.calculator_type === "screeding") {
    if (d.roomLength)
      parts.push({
        label: "Room Length",
        value: `${d.roomLength} ${d.unit ?? ""}`,
      });
    if (d.roomWidth)
      parts.push({
        label: "Room Width",
        value: `${d.roomWidth} ${d.unit ?? ""}`,
      });
    if (d.wallHeight)
      parts.push({
        label: "Wall Height",
        value: `${d.wallHeight} ${d.unit ?? ""}`,
      });
    if (d.doors) parts.push({ label: "Doors", value: String(d.doors) });
    if (d.windows) parts.push({ label: "Windows", value: String(d.windows) });
  } else if (template.calculator_type === "pop") {
    if (d.roomLength)
      parts.push({
        label: "Room Length",
        value: `${d.roomLength} ${d.unit ?? ""}`,
      });
    if (d.roomWidth)
      parts.push({
        label: "Room Width",
        value: `${d.roomWidth} ${d.unit ?? ""}`,
      });
    if (d.includeDecorative)
      parts.push({ label: "Decorative", value: "Included" });
    if (d.includeOptional)
      parts.push({ label: "Optional Items", value: "Included" });
    if (d.wasteMargin)
      parts.push({ label: "Waste Margin", value: `${d.wasteMargin}%` });
  }

  return parts;
}
