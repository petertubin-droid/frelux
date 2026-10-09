import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, Search, BookOpen } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo";
import { getSafeError } from "@/lib/safeError";
import type { DbGlossaryTerm } from "@/types/database";

type Status = "loading" | "ready" | "error";

const CATEGORY_LABELS: Record<string, string> = {
  materials: "Materials",
  finishes: "Finishes",
  techniques: "Techniques",
  tools: "Tools & Equipment",
  measurement: "Measurements & Units",
  structure: "Structure",
  planning: "Planning & Contracts",
  general: "General",
};

function label(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

export default function Glossary() {
  useSeo({
    title: "Construction Glossary: Plain-Language Building Terms Explained",
    description:
      "A plain-language glossary of construction, painting and finishing terms: primers, screeds, coverage rates, bills of quantities and more, explained without jargon.",
    canonicalPath: "/glossary",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      name: "FRELUX Construction Glossary",
      description:
        "Plain-language definitions of common construction, painting and finishing terms.",
      url: `${SITE_URL}/glossary`,
    },
  });

  const [terms, setTerms] = useState<DbGlossaryTerm[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from("construction_glossary")
          .select("*")
          .eq("is_active", true)
          .order("term", { ascending: true });
        if (cancelled) return;
        if (err) throw err;
        setTerms((data ?? []) as DbGlossaryTerm[]);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(getSafeError(e, "Failed to load"));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(terms.map((t) => t.category))).sort(),
    [terms],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return terms.filter(
      (t) =>
        (category === "all" || t.category === category) &&
        (!q ||
          t.term.toLowerCase().includes(q) ||
          t.definition.toLowerCase().includes(q)),
    );
  }, [terms, category, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, DbGlossaryTerm[]>();
    for (const t of visible) {
      if (!groups.has(t.category)) groups.set(t.category, []);
      groups.get(t.category)!.push(t);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [visible]);

  if (status === "loading")
    return (
      <>
        <PageHeader
          eyebrow="Learn"
          title="Construction Glossary"
          subtitle="Building and painting terms explained in plain language."
          breadcrumbs={[{ label: "Glossary" }]}
        />
        <div className="flex items-center justify-center gap-2 py-32 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{" "}
          Loading…
        </div>
      </>
    );

  if (status === "error")
    return (
      <>
        <PageHeader
          eyebrow="Learn"
          title="Construction Glossary"
          subtitle="Building and painting terms explained in plain language."
          breadcrumbs={[{ label: "Glossary" }]}
        />
        <div className="mx-auto max-w-md py-20 text-center">
          <AlertCircle
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-red-400"
          />
          <p className="mt-3 text-sm text-red-600">{error}</p>
        </div>
      </>
    );

  return (
    <>
      <PageHeader
        eyebrow="Learn"
        title="Construction Glossary"
        subtitle="Every building and finishing term you will meet on a paint or construction project, explained without jargon."
        breadcrumbs={[{ label: "Glossary" }]}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Search + category filter */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a term, for example screed or coverage…"
              className="w-full rounded-2xl border border-border bg-card py-3.5 pl-12 pr-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-brand-purple/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 dark:border-white/10 dark:bg-card dark:text-primary-foreground"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["all", ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  category === c
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:border-brand-purple/40 hover:text-foreground dark:border-white/10 dark:bg-card"
                }`}
              >
                {c === "all" ? `All ${terms.length} terms` : label(c)}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-16 text-center dark:border-white/10 dark:bg-white/5">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No terms match that search. Try a different word.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(([cat, items]) => (
              <section key={cat} id={cat}>
                <h2 className="mb-4 font-display text-base font-bold text-foreground dark:text-primary-foreground">
                  {label(cat)}
                </h2>
                <dl className="space-y-6">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm dark:border-white/5 dark:bg-card"
                    >
                      <dt
                        id={t.slug}
                        className="font-display text-sm font-bold text-foreground dark:text-primary-foreground"
                      >
                        {t.term}
                      </dt>
                      <dd className="mt-2 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
                        {t.definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}

        <div className="mt-10">
          <AdSlot slotKey="home_bottom" />
        </div>
      </div>
    </>
  );
}
