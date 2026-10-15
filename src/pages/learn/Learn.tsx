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
  Globe2,
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
      {/* Editorial hero doubles as the page header so the page has one clear introduction. */}
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-10">
        <div className="relative isolate overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(ellipse_at_82%_10%,rgba(124,92,246,0.17),transparent_35%),linear-gradient(135deg,#f8faff_0%,#ffffff_54%,#f3f0ff_100%)] p-6 shadow-sm dark:border-white/10 dark:bg-[radial-gradient(ellipse_at_82%_10%,rgba(124,92,246,0.2),transparent_35%),linear-gradient(135deg,#11121a_0%,#171824_54%,#1b1830_100%)] sm:p-10 lg:p-14">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            aria-hidden="true"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:gap-14">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-white/70 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-purple shadow-sm dark:bg-white/5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-purple" />
                FRELUX Field Notes
              </div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-brand-purple">
                {totalPublished !== null
                  ? `${totalPublished}+ Expert Articles`
                  : "Expert Articles"}
              </div>
              <h1 className="font-display text-4xl font-bold leading-[1.06] tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-[3.6rem]">
                Knowledge for the{" "}
                <span className="bg-gradient-to-r from-primary via-[#8a63f6] to-[#bd79d8] bg-clip-text text-transparent">
                  built world.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                Clear, practical guidance for construction professionals
                navigating materials, methods, and project decisions.
              </p>
              <div className="relative mt-7 max-w-xl">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles, guides, tutorials…"
                  aria-label="Search construction articles"
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 py-4 pl-12 pr-4 text-sm font-medium text-foreground shadow-lg shadow-slate-900/[0.04] outline-none transition focus:border-brand-purple/50 focus:ring-4 focus:ring-brand-purple/10 dark:border-white/10 dark:bg-slate-950/70 dark:text-primary-foreground dark:placeholder:text-muted-foreground"
                />
              </div>
              {searchQuery.trim() && (
                <div className="mt-3 max-w-xl overflow-hidden rounded-2xl border border-border bg-card text-left shadow-xl dark:border-white/10 dark:bg-background">
                  {searching ? (
                    <div className="p-5 text-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
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
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <span>Materials</span>
                <span className="text-primary/60">/</span>
                <span>Methods</span>
                <span className="text-primary/60">/</span>
                <span>Practice</span>
              </div>
            </div>
            <div
              className="relative mx-auto hidden aspect-square w-full max-w-[390px] items-center justify-center lg:flex"
              aria-hidden="true"
            >
              <div className="absolute inset-[8%] rounded-full border border-primary/10" />
              <div className="absolute inset-[19%] rounded-full border border-primary/15" />
              <div className="absolute inset-[30%] rounded-full border border-primary/20" />
              <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_36%_32%,rgba(255,255,255,0.95),rgba(124,92,246,0.12)_43%,rgba(48,34,100,0.07)_72%,transparent_73%)] shadow-[inset_-22px_-20px_52px_rgba(94,66,190,0.13),0_30px_80px_rgba(80,62,150,0.12)] dark:bg-[radial-gradient(circle_at_36%_32%,rgba(255,255,255,0.16),rgba(124,92,246,0.2)_43%,rgba(10,10,18,0.5)_72%,transparent_73%)]" />
              <div className="absolute left-[6%] top-[24%] h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_7px_rgba(124,92,246,0.12)]" />
              <div className="absolute right-[14%] top-[36%] h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_0_6px_rgba(217,70,239,0.12)]" />
              <div className="absolute bottom-[17%] left-[31%] h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_0_6px_rgba(96,165,250,0.12)]" />
              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/80 bg-white/80 text-primary shadow-xl shadow-primary/10 backdrop-blur dark:border-white/10 dark:bg-slate-900/80">
                <Globe2 className="h-11 w-11" strokeWidth={1.35} />
              </div>
              <div className="absolute bottom-[4%] right-0 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/85">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  A wider lens
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Ideas for a connected industry
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        {/* Topic directory: browse real active disciplines */}
        {topicCards.length > 0 && (
          <section className="mb-16">
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
                    className="group flex flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-purple/30 hover:shadow-xl hover:shadow-primary/[0.06] dark:border-white/10 dark:bg-card"
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
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-orange/10">
                <Award className="h-4 w-4 text-accent-orange" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">
                  Editor’s Picks
                </h2>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Selected practical guidance for the work ahead
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((article, index) => (
                <Link
                  key={article.id}
                  to={`/learn/${article.slug}/`}
                  className={`group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-purple/25 hover:shadow-xl hover:shadow-primary/[0.06] dark:border-white/10 dark:bg-card ${index === 0 ? "sm:col-span-2" : ""}`}
                >
                  {article.cover_image_url ? (
                    <div
                      className={`relative overflow-hidden ${index === 0 ? "aspect-[16/8]" : "aspect-[16/10]"}`}
                    >
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
                    <div
                      className={`relative flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_70%_25%,rgba(255,255,255,0.9),transparent_20%),linear-gradient(135deg,hsl(var(--primary)/.12),hsl(var(--muted)))] dark:bg-[radial-gradient(circle_at_70%_25%,rgba(255,255,255,0.12),transparent_20%),linear-gradient(135deg,hsl(var(--primary)/.2),hsl(var(--muted)))] ${index === 0 ? "aspect-[16/8]" : "aspect-[16/10]"}`}
                    >
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-orange shadow-sm">
                        <Award className="h-3 w-3" /> Featured
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex flex-1 flex-col ${index === 0 ? "p-6 sm:p-7" : "p-5"}`}
                  >
                    <span className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-purple">
                      {article.category_slug.replace(/-/g, " ")}
                    </span>
                    <h3
                      className={`font-display font-bold leading-snug text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground ${index === 0 ? "text-xl sm:text-2xl" : "text-base"}`}
                    >
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2 dark:text-muted-foreground">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5 text-xs text-muted-foreground">
                      {article.author && (
                        <span className="font-medium text-foreground/75 dark:text-white/75">
                          {article.author}
                        </span>
                      )}
                      {article.read_time_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />{" "}
                          {article.read_time_minutes} min read
                        </span>
                      )}
                      {article.published_at && (
                        <span>
                          {new Date(article.published_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
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
                    Latest from FRELUX
                  </h2>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    New ideas, methods, and practical know-how
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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          <AdSlot slotKey="adsense_learn" providerSlug="google_adsense" />
        </div>
      </div>

      <AskAiWidget />
    </>
  );
}
