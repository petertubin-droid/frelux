import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, AlertCircle, Share2, Clock } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { fetchSharedResource, fetchSharedProject } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import { readableTextColor } from "@/lib/colors";
import { formatByCode } from "@/lib/international/currency-format";
import { marketCurrencyCode } from "@/lib/subscription-pricing";
import { useLanguage } from "@/lib/i18n";
import type {
  DbShareableLink,
  DbUserProject,
  DbPaintColor,
} from "@/types/database";

/** Fields a share link may show. Everything else on the project stays private. */
const SHARED_FIELDS = [
  "total_cost",
  "area",
  "volume",
  "quantities",
  "market_code",
  "unit_system",
  "summary",
  "materials",
] as const;

type SharedField = (typeof SHARED_FIELDS)[number];

/** "total cost" becomes "Total cost", so a raw key never reaches the client. */
function humaniseLabel(key: string): string {
  const words = key.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function isPrimitive(value: unknown): boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function primitiveText(value: unknown): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : "N/A";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value).trim();
  return text === "" ? "N/A" : text;
}

/**
 * A shared project is read by a client, so a stored object is shown as labelled
 * rows. It used to be printed with JSON.stringify, which put braces, quotes and
 * nested punctuation in front of the person receiving the estimate.
 */
function SummaryValue({
  value,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
}) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">Not recorded</span>;
  }
  if (isPrimitive(value)) return <span>{primitiveText(value)}</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground">None recorded</span>;
    }
    if (value.every(isPrimitive)) {
      const shown = value.slice(0, 8).map(primitiveText).join(", ");
      const rest = value.length - 8;
      return (
        <span>
          {shown}
          {rest > 0 ? ` and ${rest} more` : ""}
        </span>
      );
    }
    const rows = value.slice(0, depth >= 1 ? 6 : 20);
    return (
      <ul className="mt-1 space-y-1">
        {rows.map((entry, index) => (
          <li key={index} className="text-sm">
            {isPrimitive(entry) ? (
              primitiveText(entry)
            ) : (
              <NestedEntries value={entry} depth={depth + 1} />
            )}
          </li>
        ))}
        {value.length > rows.length && (
          <li className="text-xs text-muted-foreground">
            and {value.length - rows.length} more
          </li>
        )}
      </ul>
    );
  }

  if (typeof value === "object") {
    return <NestedEntries value={value} depth={depth + 1} />;
  }

  return <span className="text-muted-foreground">Not recorded</span>;
}

/** Nested key/value rows, capped so a deep payload cannot fill the page. */
function NestedEntries({ value, depth }: { value: unknown; depth: number }) {
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return <span className="text-muted-foreground">None recorded</span>;
  }
  if (depth > 2) {
    return (
      <span className="text-muted-foreground">{entries.length} values</span>
    );
  }
  return (
    <dl className="mt-1 grid gap-1">
      {entries.slice(0, 20).map(([key, entry]) => (
        <div key={key} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-2">
          <dt className="truncate text-xs text-muted-foreground">
            {humaniseLabel(key)}
          </dt>
          <dd className="text-sm text-foreground">
            <SummaryValue value={entry} depth={depth} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function SharedProject() {
  const { t, language } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<DbShareableLink | null>(null);
  const [project, setProject] = useState<DbUserProject | null>(null);
  const [colors, setColors] = useState<DbPaintColor[]>([]);

  useSeo({
    title: "Shared Project",
    description:
      "A shared FRELUX project, colors, calculations, and estimates.",
    noIndex: true,
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: linkData, error: linkError } =
        await fetchSharedResource(id);
      if (linkError || !linkData) {
        setError("This share link is invalid or has expired.");
        setLoading(false);
        return;
      }
      setLink(linkData);

      if (linkData.resource_type === "project") {
        const { data: proj, error: projError } = await fetchSharedProject(
          linkData.id,
          linkData.resource_id,
        );
        if (proj) {
          setProject(proj as DbUserProject);
          const savedColors = (proj as unknown as Record<string, unknown>)
            .saved_colors as { color_id?: string }[] | undefined;
          if (savedColors && savedColors.length > 0) {
            const colorIds = savedColors
              .map((c) => c.color_id)
              .filter(Boolean) as string[];
            const { data: colData } = await supabase
              .from("paint_colors")
              .select("*")
              .in("id", colorIds);
            setColors((colData ?? []) as DbPaintColor[]);
          }
        } else if (projError) {
          setError(
            "Unable to load project data. The project may be private or deleted.",
          );
        }
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        Loading shared project...
      </div>
    );

  if (error || !link) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-muted-foreground/80"
        />
        <p className="mt-3 text-sm font-semibold text-muted-foreground">
          {error ?? "Share link not found."}
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("Go to homepage")}
        </Link>
      </div>
    );
  }

  const projectData = project
    ? (project as unknown as Record<string, unknown>)
    : null;

  const currencyCode = marketCurrencyCode(
    (projectData?.market_code as string | undefined) ?? null,
  );

  // Only fields that carry a value: an all-empty project would otherwise print
  // a bordered card with a heading and nothing under it.
  const sharedEntries: Array<[SharedField, unknown]> = projectData
    ? SHARED_FIELDS.filter((key) => {
        if (!(key in projectData)) return false;
        const value = projectData[key];
        if (value === null || value === undefined) return false;
        if (typeof value === "string") return value.trim() !== "";
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "object") return Object.keys(value).length > 0;
        return true;
      }).map((key) => [key, projectData[key]] as [SharedField, unknown])
    : [];

  const created = project?.created_at
    ? new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(
        new Date(project.created_at),
      )
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Shared"
        title={project?.name ?? "Shared Project"}
        subtitle={project?.description ?? undefined}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-accent-blue/20 bg-accent-blue/5 p-3 text-sm text-muted-foreground print:hidden">
          <Share2
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue"
          />
          {t(
            "This is a shared project. The owner can revoke access at any time.",
          )}
        </div>

        {project && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-brand-purple">
                {project.project_type.replace(/_/g, " ")}
              </span>
              {created && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock aria-hidden="true" className="h-3 w-3" />
                  {t("Created")} {created}
                </span>
              )}
            </div>

            {colors.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-foreground">
                  {t("Colors")}
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {colors.map((c) => (
                    <Link
                      key={c.id}
                      to={`/colors/paint/${c.slug}/`}
                      className="group overflow-hidden rounded-lg border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div
                        className="aspect-square"
                        style={{ background: c.hex_code }}
                      >
                        <span
                          className="flex h-full items-center justify-center text-xs font-bold uppercase"
                          style={{ color: readableTextColor(c.hex_code) }}
                        >
                          {c.hex_code}
                        </span>
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {c.name}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {sharedEntries.length > 0 && (
              <section className="rounded-xl border border-border bg-muted/50 p-5">
                <h2 className="text-sm font-bold text-foreground">
                  {t("Project Estimation Summary")}
                </h2>
                <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                  {sharedEntries.map(([key, value]) => (
                    <div key={key} className="min-w-0">
                      <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {humaniseLabel(key)}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-foreground">
                        {key === "total_cost" && typeof value === "number" ? (
                          formatByCode(value, currencyCode)
                        ) : (
                          <SummaryValue value={value} />
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        )}

        <div className="mt-8 border-t border-border pt-6 text-center print:hidden">
          <Link
            to="/"
            className="text-sm font-semibold text-brand-purple hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("Create your own project at FRELUX")}
          </Link>
        </div>
      </div>
    </>
  );
}
