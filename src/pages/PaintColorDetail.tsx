import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { SITE_URL } from "@/lib/site-config";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Bookmark,
  ArrowRight,
} from "lucide-react";
import {
  fetchPaintColorBySlug,
  fetchRelatedPaintColors,
  fetchColorFamilies,
  fetchColorCategories,
  trackColorView,
  toggleFavoriteColor,
  fetchFavoriteColorIds,
  fetchRelationshipOverrides,
  fetchPaintColors,
} from "@/lib/queries";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import {
  colourDescription,
  colourFaq,
  colourFaqJsonLd,
  colourSeo,
  mixRecipe,
  recipeCaveat,
  recipeSentence,
} from "../../scripts/lib/color-mixing.mjs";
import { useAuth } from "@/lib/auth";
import {
  readableTextColor,
  complementaryColor,
  analogousColors,
  triadicColors,
  lighterColor,
  darkerColor,
  matchingTrimColor,
  matchingCeilingColor,
  coordinatedAccentColor,
  normalizeHex,
} from "@/lib/colors";
import { classNames } from "@/lib/utils";
import type {
  DbPaintColor,
  DbColorFamily,
  DbColorCategory,
  DbColorRelationshipOverride,
  ColorRelationshipType,
} from "@/types/database";
import NotFound from "@/pages/NotFound";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

type Status = "loading" | "ready" | "error";

export default function PaintColorDetail() {
  const { t } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [color, setColor] = useState<DbPaintColor | null>(null);
  const [related, setRelated] = useState<DbPaintColor[]>([]);
  const [families, setFamilies] = useState<DbColorFamily[]>([]);
  const [categories, setCategories] = useState<DbColorCategory[]>([]);
  const [overrides, setOverrides] = useState<DbColorRelationshipOverride[]>([]);
  const [allColors, setAllColors] = useState<DbPaintColor[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);

  // Everything below is computed from the stored HEX value, so the page says
  // the same thing the prerendered copy says, and a new colour needs no data
  // beyond the colour itself.
  const mix = useMemo(
    () => (color?.hex_code ? mixRecipe(color.hex_code) : null),
    [color?.hex_code],
  );
  const faq = useMemo(
    () => (color ? colourFaq(color.name, color.hex_code) : []),
    [color],
  );

  useBreadcrumbJsonLd([
    { name: "Color library", path: "/colors" },
    { name: color?.name ?? "Paint color", path: `/colors/paint/${slug ?? ""}` },
  ]);
  const pageSeo = useMemo(
    () => (color ? colourSeo(color.name, color.hex_code) : null),
    [color],
  );
  const faqSchema = useMemo(() => colourFaqJsonLd(faq), [faq]);

  useSeo({
    title: pageSeo?.title ?? "Paint color",
    description:
      pageSeo?.description ??
      "View this professional paint color with full color codes and recommendations.",
    canonicalPath: color ? `/colors/paint/${color.slug}` : "/colors",
    ogType: "article",
    noIndex: !color,
    structuredData: color
      ? {
          "@context": "https://schema.org",
          // DefinedTerm, not Product: a paint colour is a reference entity
          // with no price/stock/reviews. "Product" made Search Console
          // demand aggregateRating/review (2026-10-10). We never invent them.
          "@type": "DefinedTerm",
          name: color.name,
          description: `${color.name} (${color.hex_code}). RGB(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b}). Professional paint color.`,
          termCode: color.hex_code,
          inDefinedTermSet: {
            "@type": "DefinedTermSet",
            name:
              families.find((f) => f.id === color.color_family_id)?.name ??
              "Paint Color",
            url: `${SITE_URL}/colors`,
          },
        }
      : undefined,
    structuredDataArray: faqSchema ? [faqSchema] : undefined,
  });

  useEffect(() => {
    async function load() {
      if (!slug) return;
      setStatus("loading");
      const { data, error } = await fetchPaintColorBySlug(slug);
      if (error) {
        setStatus("error");
        return;
      }
      if (!data) {
        setStatus("ready");
        setColor(null);
        return;
      }
      setColor(data);

      const [relRes, famRes, catRes, overrideRes, allColorsRes] =
        await Promise.all([
          fetchRelatedPaintColors(data, 8),
          fetchColorFamilies(),
          fetchColorCategories(),
          fetchRelationshipOverrides(data.id),
          fetchPaintColors({ pageSize: 500 }),
        ]);
      setRelated(relRes.data);
      setFamilies(famRes.data);
      setCategories(catRes.data);
      setOverrides(overrideRes.data);
      setAllColors(allColorsRes.data);

      if (user) {
        trackColorView(data.id);
        const { ids } = await fetchFavoriteColorIds();
        setIsFav(ids.includes(data.id));
      }
      setStatus("ready");
    }
    load();
  }, [slug, user]);

  function copy(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied((c) => (c === text ? null : c)), 1500);
    }
  }

  async function handleFav() {
    if (!user || !color) return;
    const { favorited } = await toggleFavoriteColor(color.id);
    setIsFav(favorited);
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-red-400"
        />
        <p className="mt-3 text-sm font-semibold text-red-700">
          {t("Couldn't load this color.")}
        </p>
        <Link
          to="/colors/"
          className="mt-4 inline-block text-sm font-semibold text-brand-purple hover:underline"
        >
          {t("Back to color library")}
        </Link>
      </div>
    );
  }
  if (!color) return <NotFound />;

  const family = families.find((f) => f.id === color.color_family_id);
  const category = categories.find((c) => c.id === color.category_id);
  const textColor = readableTextColor(color.hex_code);
  const rgb = `rgb(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})`;
  const hsl = `hsl(${Math.round(color.hsl_h)}, ${Math.round(color.hsl_s)}%, ${Math.round(color.hsl_l)}%)`;

  const copyFields = [
    { label: "HEX", value: color.hex_code },
    { label: "RGB", value: rgb },
    { label: "HSL", value: hsl },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t("Home"), path: "/" },
          { label: t("Colours"), path: "/colors/" },
          { label: color.name },
        ]}
        eyebrow={
          [family?.name, category?.name].filter(Boolean).join(" · ") ||
          undefined
        }
        title={color.name}
        subtitle={
          [
            color.is_interior ? t("Interior") : null,
            color.is_exterior ? t("Exterior") : null,
            color.is_trending ? t("Trending") : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
      />

      <Container className="max-w-5xl pb-12 pt-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Color preview */}
          <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
            <div
              className="flex aspect-square items-center justify-center"
              style={{ background: color.hex_code }}
            >
              <span
                className="text-3xl font-bold uppercase tracking-widest"
                style={{ color: textColor }}
              >
                {color.hex_code}
              </span>
            </div>
            {user && (
              <Button
                variant="ghost"
                type="button"
                onClick={handleFav}
                className={classNames(
                  "flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors",
                  isFav
                    ? "bg-red-50 text-red-600"
                    : "bg-card text-muted-foreground hover:bg-muted/50",
                )}
              >
                <Bookmark
                  className={classNames("h-4 w-4", isFav && "fill-current")}
                />{" "}
                {isFav ? "Favorited" : "Add to favorites"}
              </Button>
            )}
          </div>

          {/* Color info */}
          <div>
            {/* Copyable color values */}
            <div className="mt-6 space-y-3">
              {copyFields.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3 dark:border-white/5 dark:bg-card"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {f.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground dark:text-primary-foreground">
                      {f.value}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => copy(f.value)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:border-border hover:text-brand-purple dark:border-white/5 dark:text-muted-foreground/80 dark:hover:text-brand-purple-lighter"
                  >
                    {copied === f.value ? (
                      <Check
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-accent-green"
                      />
                    ) : (
                      <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    {copied === f.value ? "Copied" : "Copy"}
                  </Button>
                </div>
              ))}
            </div>

            {/* Recommended usage */}
            {color.recommended_usage.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("Recommended usage")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {color.recommended_usage.map((u) => (
                    <span
                      key={u}
                      className="rounded-lg bg-muted px-3 py-1.5 text-sm text-card-foreground"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Finish compatibility */}
            {color.finish_compatibility.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("Compatible finishes")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {color.finish_compatibility.map((f) => (
                    <span
                      key={f}
                      className="rounded-lg bg-muted px-3 py-1.5 text-sm text-card-foreground"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Link
                to="/colors/compare/"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
              >
                Compare colors{" "}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Mix build: the tinters that reproduce the stored shade */}
        {mix && (
          <section className="mt-12" aria-labelledby="mix-heading">
            <h2
              id="mix-heading"
              className="text-xl font-bold text-foreground dark:text-primary-foreground"
            >
              What to mix to get {color.name}
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              {recipeSentence(color.name, mix)}{" "}
              {colourDescription(color.name, color.hex_code)}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {mix.components.map(
                (component: {
                  key: string;
                  name: string;
                  hex: string;
                  millilitresPerLitre: number;
                }) => (
                  <div
                    key={component.key}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <div
                      className="h-10 w-full rounded-md border border-border"
                      style={{ background: component.hex }}
                      aria-hidden="true"
                    />
                    <p className="mt-3 text-sm font-semibold text-foreground dark:text-primary-foreground">
                      {component.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {component.millilitresPerLitre} ml per litre of mixed
                      paint.
                    </p>
                  </div>
                ),
              )}
            </div>
            <p className="mt-4 max-w-3xl text-xs text-muted-foreground">
              {recipeCaveat(mix)}
            </p>
          </section>
        )}

        {/* Questions the colour page answers from its own values */}
        {faq.length > 0 && (
          <section className="mt-12" aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="text-xl font-bold text-foreground dark:text-primary-foreground"
            >
              Questions about {color.name}
            </h2>
            <dl className="mt-4 space-y-4">
              {faq.map((entry: { question: string; answer: string }) => (
                <div key={entry.question}>
                  <dt className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                    {entry.question}
                  </dt>
                  <dd className="mt-1 max-w-3xl text-sm text-muted-foreground">
                    {entry.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Related colors */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
              {t("Similar colors")}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
              {related.map((c) => (
                <Link
                  key={c.id}
                  to={`/colors/paint/${c.slug}/`}
                  className="group overflow-hidden rounded-lg border border-border bg-card transition-all dark:border-white/5 dark:bg-card hover:-translate-y-1 hover:shadow-md"
                >
                  <div
                    className="aspect-square"
                    style={{ background: c.hex_code }}
                  />
                  <div className="p-2">
                    <p className="truncate text-xs font-semibold text-foreground dark:text-primary-foreground">
                      {c.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Color Relationship Engine */}
        <ColorRelationships
          color={color}
          allColors={allColors}
          overrides={overrides}
        />
      </Container>
    </>
  );
}

function ColorRelationships({
  color,
  allColors,
  overrides,
}: {
  color: DbPaintColor;
  allColors: DbPaintColor[];
  overrides: DbColorRelationshipOverride[];
}) {
  const { t } = useLanguage();
  const hex = normalizeHex(color.hex_code);
  const overrideMap = new Map(
    overrides.map((o) => [o.relationship_type, o.override_color_ids]),
  );

  function getColors(
    type: ColorRelationshipType,
    computedHexes: string[],
  ): DbPaintColor[] {
    const overrideIds = overrideMap.get(type);
    if (overrideIds && overrideIds.length > 0) {
      return overrideIds
        .map((id) => allColors.find((c) => c.id === id))
        .filter(Boolean) as DbPaintColor[];
    }
    return computedHexes
      .map((h) =>
        allColors.find(
          (c) => normalizeHex(c.hex_code).toUpperCase() === h.toUpperCase(),
        ),
      )
      .filter(Boolean) as DbPaintColor[];
  }

  const sections: {
    type: ColorRelationshipType;
    title: string;
    colors: DbPaintColor[];
  }[] = [
    {
      type: "complementary",
      title: "Complementary",
      colors: getColors("complementary", [complementaryColor(hex)]),
    },
    {
      type: "analogous",
      title: "Analogous",
      colors: getColors("analogous", analogousColors(hex)),
    },
    {
      type: "triadic",
      title: "Triadic",
      colors: getColors("triadic", triadicColors(hex)),
    },
    {
      type: "lighter",
      title: "Lighter Alternatives",
      colors: getColors("lighter", [
        lighterColor(hex, 15),
        lighterColor(hex, 25),
      ]),
    },
    {
      type: "darker",
      title: "Darker Alternatives",
      colors: getColors("darker", [darkerColor(hex, 15), darkerColor(hex, 25)]),
    },
    {
      type: "matching_trim",
      title: "Matching Trim Colors",
      colors: getColors("matching_trim", [matchingTrimColor(hex)]),
    },
    {
      type: "matching_ceiling",
      title: "Matching Ceiling Colors",
      colors: getColors("matching_ceiling", [matchingCeilingColor(hex)]),
    },
    {
      type: "coordinated_accent",
      title: "Coordinated Accent Colors",
      colors: getColors("coordinated_accent", [coordinatedAccentColor(hex)]),
    },
  ];

  const hasAny = sections.some((s) => s.colors.length > 0);
  if (!hasAny) return null;

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
        {t("Color Relationships")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("Automatically computed harmonies and coordinated colors.")}
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {sections
          .filter((s) => s.colors.length > 0)
          .map((s) => (
            <div key={s.type}>
              <h3 className="text-sm font-bold text-card-foreground">
                {s.title}
              </h3>
              <div className="mt-2 space-y-2">
                {s.colors.map((c) => (
                  <Link
                    key={c.id}
                    to={`/colors/paint/${c.slug}/`}
                    className="group flex items-center gap-2 rounded-lg border border-border bg-card p-2 dark:border-white/5 dark:bg-card transition-all hover:border-brand-purple hover:shadow-sm"
                  >
                    <div
                      className="h-8 w-8 shrink-0 rounded ring-1 ring-black/5"
                      style={{ background: c.hex_code }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground dark:text-primary-foreground">
                        {c.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.hex_code}
                      </p>
                    </div>
                  </Link>
                ))}
                {overrideMap.has(s.type) && (
                  <span className="text-xs font-semibold text-brand-purple">
                    {t("Admin curated")}
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
