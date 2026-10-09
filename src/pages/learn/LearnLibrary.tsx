import { useEffect, useState } from "react";
import AdSlot from "@/components/ui/AdSlot";
import { useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, Search, Library } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import ArticleCard from "@/components/learn/ArticleCard";
import Pagination from "@/components/ui/Pagination";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo";
import { getSafeError } from "@/lib/safeError";
import type { DbLearnArticle } from "@/types/database";

type Status = "loading" | "ready" | "error";

/** Articles per page on the full-library listing. Mirrored by the
 *  dynamic sitemap function (netlify/functions/sitemap.js) so every
 *  ?page=N listing URL is always present for crawlers. */
const ARTICLES_PER_PAGE = 20;

export default function LearnLibrary() {
  useSeo({
    title: "All Guides: The Complete FRELUX Learn Library",
    description:
      "Browse every published guide in the FRELUX Learn library: painting, screeding, POP ceiling, tiling, finishing, and construction tutorials.",
    canonicalPath: "/learn/library",
    ogType: "website",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "FRELUX Learn Library",
        description:
          "Complete library of painting, screeding, POP ceiling, tiling, finishing, and construction guides.",
        url: `${SITE_URL}/learn/library`,
      },
    ],
  });

  const [articles, setArticles] = useState<DbLearnArticle[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DbLearnArticle[]>([]);
  const [searching, setSearching] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / ARTICLES_PER_PAGE));

  const goToPage = (p: number) => {
    setSearchParams(p > 1 ? { page: String(p) } : {});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const from = (page - 1) * ARTICLES_PER_PAGE;
        const [pageRes, countRes] = await Promise.all([
          supabase
            .from("learn_articles")
            .select("*")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .range(from, from + ARTICLES_PER_PAGE - 1),
          supabase
            .from("learn_articles")
            .select("id", { count: "exact", head: true })
            .eq("status", "published"),
        ]);
        if (cancelled) return;
        if (pageRes.error) throw pageRes.error;
        setArticles((pageRes.data ?? []) as DbLearnArticle[]);
        if (!countRes.error && countRes.count !== null) {
          setTotal(countRes.count);
        }
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(getSafeError(e, "Failed to load"));
        setStatus("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  // Debounced search across the whole library
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      // Same sanitization as the hub landing: strip % _ , ( ) so
      // arbitrary input can't break or widen the PostgREST filter.
      const q = searchQuery
        .trim()
        .replace(/[%_(),()]/g, " ")
        .slice(0, 80);
      const { data } = await supabase
        .from("learn_articles")
        .select("*")
        .eq("status", "published")
        .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
        .order("published_at", { ascending: false })
        .limit(20);
      setSearchResults((data ?? []) as DbLearnArticle[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (status === "loading")
    return (
      <>
        <PageHeader
          eyebrow="Learn"
          title="All Guides"
          subtitle="The complete FRELUX Learn library, every published guide in one place."
          breadcrumbs={[
            { label: "Learn Hub", path: "/learn" },
            { label: "All Guides" },
          ]}
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
          title="All Guides"
          subtitle="The complete FRELUX Learn library, every published guide in one place."
          breadcrumbs={[
            { label: "Learn Hub", path: "/learn" },
            { label: "All Guides" },
          ]}
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

  const showing = searchQuery.trim() ? searchResults : articles;

  return (
    <>
      <PageHeader
        eyebrow="Learn"
        title="All Guides"
        subtitle="The complete FRELUX Learn library, every published guide in one place."
        breadcrumbs={[
          { label: "Learn Hub", path: "/learn" },
          { label: "All Guides" },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Search + count header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Library className="h-4 w-4 text-brand-purple" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">
                The Full Library
              </h2>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                {searchQuery.trim()
                  ? `${searchResults.length} ${searchResults.length === 1 ? "result" : "results"} for "${searchQuery}"`
                  : total !== null
                    ? `${total} guides, page ${page} of ${totalPages}`
                    : "Browse every published guide"}
              </p>
            </div>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search the library…"
              className="w-full rounded-2xl border border-border bg-white/80 py-3 pl-12 pr-4 text-sm font-medium text-foreground shadow-sm placeholder:text-muted-foreground focus:border-brand-purple/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 dark:border-white/10 dark:bg-background dark:text-primary-foreground dark:placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {searching ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Searching…
          </div>
        ) : showing.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {showing.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-20 text-center dark:border-white/10 dark:bg-white/5">
            <Library
              aria-hidden="true"
              className="mx-auto h-12 w-12 text-muted-foreground/80"
            />
            <p className="mt-5 text-base font-semibold text-muted-foreground dark:text-muted-foreground/80">
              {searchQuery.trim()
                ? "No guides match your search"
                : "No guides yet"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different keyword, or browse the topics on the Learn hub.
            </p>
          </div>
        )}

        {/* Pagination hidden while searching */}
        {!searchQuery.trim() && totalPages > 1 && (
          <div className="mt-10">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </div>
        )}

        <div className="mt-10">
          <AdSlot slotKey="learn_bottom" />
        </div>
      </div>
    </>
  );
}
