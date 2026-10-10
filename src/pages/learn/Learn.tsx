import { useEffect, useState } from "react";
import AdSlot from "@/components/ui/AdSlot";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  Award,
  Search,
  Library,
} from "lucide-react";
import { getIcon } from "@/lib/icon-map";
import PageHeader from "@/components/ui/PageHeader";
import ArticleCard from "@/components/learn/ArticleCard";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import type { DbLearnCategory, DbLearnArticle } from "@/types/database";
import AskAiWidget from "@/components/learn/AskAiWidget";
import { SITE_URL } from "@/lib/seo";
import { getSafeError } from "@/lib/safeError";

type Status = "loading" | "ready" | "error";

export default function Learn() {
  useSeo({
    title: "Learn: Construction & Painting Guides, Tips & Tutorials",
    description:
      "Explore expert guides on painting, screeding, POP ceiling, tiling, finishing, and construction. Learn techniques, get tips, and use our free calculators.",
    canonicalPath: "/learn",
    ogType: "website",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "FRELUX Learn: Construction & Painting Guides",
        description:
          "Educational hub for painting, screeding, POP ceiling, tiling, finishing, and construction guides and tutorials.",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Learn",
            item: `${SITE_URL}/learn`,
          },
        ],
      },
    ],
  });

  const [categories, setCategories] = useState<DbLearnCategory[]>([]);
  const [featured, setFeatured] = useState<DbLearnArticle[]>([]);
  const [recent, setRecent] = useState<DbLearnArticle[]>([]);
  const [totalPublished, setTotalPublished] = useState<number | null>(null);
  const [articleSlugs, setArticleSlugs] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DbLearnArticle[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [catRes, featRes, recentRes, countRes, slugRes] =
          await Promise.all([
            supabase
              .from("learn_categories")
              .select("*")
              .eq("is_active", true)
              .order("sort_order", { ascending: true }),
            supabase
              .from("learn_articles")
              .select("*")
              .eq("status", "published")
              .eq("is_featured", true)
              .order("published_at", { ascending: false })
              .limit(3),
            supabase
              .from("learn_articles")
              .select("*")
              .eq("status", "published")
              .order("published_at", { ascending: false })
              .limit(6),
            supabase
              .from("learn_articles")
              .select("id", { count: "exact", head: true })
              .eq("status", "published"),
            supabase
              .from("learn_articles")
              .select("category_slug")
              .eq("status", "published"),
          ]);

        setCategories((catRes.data ?? []) as DbLearnCategory[]);
        setFeatured((featRes.data ?? []) as DbLearnArticle[]);
        setRecent((recentRes.data ?? []) as DbLearnArticle[]);
        if (countRes.error === null && countRes.count !== null) {
          setTotalPublished(countRes.count);
        }
        setArticleSlugs(
          ((slugRes.data ?? []) as { category_slug: string }[]).map(
            (a) => a.category_slug,
          ),
        );
        setStatus("ready");
      } catch (e) {
        setError(getSafeError(e, "Failed to load"));
        setStatus("error");
      }
    }
    load();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      // Sanitize: % _ are ilike wildcards, , ( ) break the PostgREST
      // or-filter syntax. Strip all of them so arbitrary input can't
      // error or widen the filter.
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
        .limit(8);
      setSearchResults((data ?? []) as DbLearnArticle[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Article counts per category slug, from the published-article sample.
  const countBySlug: Record<string, number> = {};
  for (const s of articleSlugs) countBySlug[s] = (countBySlug[s] ?? 0) + 1;

  // Topic cards: one per discipline. A parent category with a single
  // active child (e.g. "painting" -> "painting-guides") surfaces that
  // child as the destination; top-level categories link directly.
  const topicCards = categories
    .filter((c) => !c.parent_slug)
    .map((parent) => {
      const children = categories.filter((c) => c.parent_slug === parent.slug);
      const target = children.length === 1 ? children[0].slug : parent.slug;
      const count =
        (countBySlug[parent.slug] ?? 0) +
        children.reduce(
          (sum, child) => sum + (countBySlug[child.slug] ?? 0),
          0,
        );
      return { category: parent, target, count };
    });

  if (status === "loading")
    return (
      <>
        <PageHeader
          image="https://images.pexels.com/photos/4458210/pexels-photo-4458210.jpeg?auto=compress&cs=tinysrgb&w=1600"
          eyebrow="Education"
          title="Learn"
          subtitle="Guides, tutorials, and expert tips for painting, screeding, POP ceiling, tiling, finishing, and construction."
          breadcrumbs={[{ label: "Learn Hub" }]}
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
          eyebrow="Education"
          title="Learn"
          subtitle="Guides, tutorials, and expert tips for painting, screeding, POP ceiling, tiling, finishing, and construction."
          breadcrumbs={[{ label: "Learn Hub" }]}
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
        eyebrow="Education"
        title="Learn"
        subtitle="Guides, tutorials, and expert tips for painting, screeding, POP ceiling, tiling, finishing, and construction."
        breadcrumbs={[{ label: "Learn Hub" }]}
      />

      {/* Premium hero section with search */}
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/80 dark:border-white/10 bg-gradient-to-br from-card via-primary/[0.03] to-primary/[0.06] dark:from-card dark:via-card/50 dark:to-background p-8 sm:p-14">
          {/* Decorative orbs */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/8 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-primary/5 blur-3xl"
            aria-hidden="true"
          />
          {/* Top accent line */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-brand-purple">
              {totalPublished !== null
                ? `${totalPublished}+ Expert Articles`
                : "Expert Articles"}
            </div>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground dark:text-primary-foreground sm:text-4xl">
              Master Your Craft with{" "}
              <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent dark:to-primary-lighter">
                Expert Guides
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground dark:text-muted-foreground">
              In-depth tutorials, practical tips, and professional techniques
              for every aspect of building, finishing, and construction.
            </p>
            {/* Search bar */}
            <div className="mt-8 relative mx-auto max-w-lg">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, guides, tutorials…"
                className="w-full rounded-2xl border border-border bg-white/80 py-3.5 pl-12 pr-4 text-sm font-medium text-foreground shadow-sm placeholder:text-muted-foreground focus:border-brand-purple/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 dark:border-white/10 dark:bg-background dark:text-primary-foreground dark:placeholder:text-muted-foreground"
              />
            </div>
            {/* Search results dropdown */}
            {searchQuery.trim() && (
              <div className="mt-3 mx-auto max-w-lg overflow-hidden rounded-2xl border border-border bg-card text-left shadow-xl dark:border-white/10 dark:bg-background">
                {searching ? (
                  <div className="p-5 text-center text-sm text-muted-foreground">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                    Searching…
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((a) => (
                      <Link
                        key={a.id}
                        to={`/learn/${a.slug}/`}
                        className="flex items-start gap-3 px-4 py-3 transition-all hover:bg-primary/5"
                      >
                        {a.cover_image_url && (
                          <img
                            loading="lazy"
                            src={a.cover_image_url}
                            alt=""
                            className="h-14 w-20 shrink-0 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground dark:text-primary-foreground">
                            {a.title}
                          </p>
                          <span className="text-xs capitalize text-muted-foreground">
                            {a.category_slug.replace(/-/g, " ")}
                          </span>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/80" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 text-center text-sm text-muted-foreground">
                    No articles found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Topic directory: every discipline, one clean grid */}
        {topicCards.length > 0 && (
          <section className="mb-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-4 w-4 text-brand-purple" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">
                    Browse by Topic
                  </h2>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Explore guides organized by discipline
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {topicCards.map(({ category, target, count }) => {
                const IconComponent = getIcon(category.icon);
                return (
                  <Link
                    key={category.id}
                    to={`/learn/category/${target}/`}
                    className="group flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-purple/30 hover:shadow-lg dark:border-white/5 dark:bg-card"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-brand-purple transition-transform group-hover:scale-105">
                        <IconComponent className="h-6 w-6" />
                      </div>
                      {count > 0 && (
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground dark:bg-white/10 dark:text-muted-foreground">
                          {count} {count === 1 ? "guide" : "guides"}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 font-display text-base font-bold text-foreground dark:text-primary-foreground">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2 dark:text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple">
                      Explore
                      <ArrowRight
                        aria-hidden="true"
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                      />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Featured articles */}
        {featured.length > 0 && (
          <section className="mb-14">
            <div className="mb-6 flex items-center gap-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-orange/10">
                <Award className="h-4 w-4 text-accent-orange" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">
                  Featured Articles
                </h2>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Hand-picked guides our readers love most
                </p>
              </div>
            </div>
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((article) => (
                <Link
                  key={article.id}
                  to={`/learn/${article.slug}/`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-white/5 dark:bg-card"
                >
                  {article.cover_image_url ? (
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={article.cover_image_url}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-orange shadow-sm backdrop-blur-sm">
                        <Award className="h-3 w-3" /> Featured
                      </span>
                    </div>
                  ) : (
                    <div className="relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-muted/50 to-primary/5 dark:from-white/5 dark:to-primary/10">
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-orange shadow-sm">
                        <Award className="h-3 w-3" /> Featured
                      </span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-base font-bold leading-snug text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2 dark:text-muted-foreground">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-muted-foreground">
                      {article.read_time_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />{" "}
                          {article.read_time_minutes} min read
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent articles */}
        {recent.length > 0 && (
          <section>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-brand-purple" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">
                    Latest Articles
                  </h2>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Fresh from our editorial desk
                  </p>
                </div>
              </div>
              <Link
                to="/learn/library"
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-purple transition-colors hover:text-primary"
              >
                <Library className="h-4 w-4" />
                Browse the full library
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}

        {recent.length === 0 && featured.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-20 text-center dark:border-white/10 dark:bg-white/5">
            <BookOpen
              aria-hidden="true"
              className="mx-auto h-12 w-12 text-muted-foreground/80"
            />
            <p className="mt-5 text-base font-semibold text-muted-foreground dark:text-muted-foreground/80">
              Articles coming soon
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              We're preparing in-depth guides, tutorials, and expert tips. Check
              back shortly.
            </p>
          </div>
        )}

        <div className="mt-10">
          <AdSlot slotKey="learn_sidebar" className="mb-8" />
          {/* Native banner slot, placement "learn_native" */}
          <AdSlot slotKey="learn_native" />
          <AdSlot slotKey="learn_bottom" />
          {/* AdSense-dedicated slot: locked to google_adsense only. */}
          <AdSlot
            slotKey="adsense_learn"
            providerSlug="google_adsense"
          />
        </div>
      </div>

      <AskAiWidget />
    </>
  );
}
