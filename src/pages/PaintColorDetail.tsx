import { useEffect, useState } from "react";
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
import { useSeo } from "@/lib/seo";
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

type Status = "loading" | "ready" | "error";

export default function PaintColorDetail() {
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

  useSeo({
    title: color ? `${color.name}: Paint Color` : "Paint Color",
    description: color
      ? `${color.name} (${color.hex_code}). RGB, HSL values, recommended usage, and compatible finishes for this professional paint color.`
      : "View this professional paint color with full color codes and recommendations.",
    canonicalPath: color ? `/colors/paint/${color.slug}` : "/colors",
    ogType: "article",
    noIndex: !color,
    structuredData: color
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: color.name,
          description: `${color.name} (${color.hex_code}). RGB(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b}). Professional paint color.`,
          category:
            families.find((f) => f.id === color.color_family_id)?.name ??
            "Paint Color",
          brand: { "@type": "Brand", name: "FRELUX" },
          additionalProperty: [
            { "@type": "PropertyValue", name: "HEX", value: color.hex_code },
            {
              "@type": "PropertyValue",
              name: "RGB",
              value: `rgb(${color.rgb_r}, ${color.rgb_g}, ${color.rgb_b})`,
            },
            {
              "@type": "PropertyValue",
              name: "HSL",
              value: `hsl(${Math.round(color.hsl_h)}, ${Math.round(color.hsl_s)}%, ${Math.round(color.hsl_l)}%)`,
            },
          ],
        }
      : undefined,
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
          Couldn't load this color.
        </p>
        <Link
          to="/colors"
          className="mt-4 inline-block text-sm font-semibold text-brand-purple hover:underline"
        >
          Back to color library
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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        to="/colors"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-brand-purple"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All colors
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
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
            <button
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
            </button>
          )}
        </div>

        {/* Color info */}
        <div>
          <div className="flex flex-wrap gap-2">
            {family && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-purple">
                {family.name}
              </span>
            )}
            {category && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {category.name}
              </span>
            )}
            {color.is_interior && (
              <span className="rounded-full bg-accent-green/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-green">
                Interior
              </span>
            )}
            {color.is_exterior && (
              <span className="rounded-full bg-accent-cyan/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-cyan">
                Exterior
              </span>
            )}
            {color.is_trending && (
              <span className="rounded-full bg-accent-orange/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-orange">
                Trending
              </span>
            )}
            {color.is_featured && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-purple">
                Featured
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl dark:text-primary-foreground">
            {color.name}
          </h1>

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
                <button
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
                </button>
              </div>
            ))}
          </div>

          {/* Recommended usage */}
          {color.recommended_usage.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Recommended usage
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
                Compatible finishes
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
              to="/colors/compare"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
            >
              Compare colors{" "}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Related colors */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
            Similar colors
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
            {related.map((c) => (
              <Link
                key={c.id}
                to={`/colors/paint/${c.slug}`}
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
    </div>
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
        Color Relationships
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Automatically computed harmonies and coordinated colors.
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {sections
          .filter((s) => s.colors.length > 0)
          .map((s) => (
            <div key={s.type}>
              <h3 className="text-sm font-bold text-card-foreground">{s.title}</h3>
              <div className="mt-2 space-y-2">
                {s.colors.map((c) => (
                  <Link
                    key={c.id}
                    to={`/colors/paint/${c.slug}`}
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
                      <p className="text-[10px] text-muted-foreground">
                        {c.hex_code}
                      </p>
                    </div>
                  </Link>
                ))}
                {overrideMap.has(s.type) && (
                  <span className="text-[10px] font-semibold text-brand-purple">
                    Admin curated
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
