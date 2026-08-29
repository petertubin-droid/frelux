import { useEffect, useState } from "react";
import AdSlot from "@/components/ui/AdSlot";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ArrowRight,
  ChevronDown,
  Loader2,
  AlertCircle,
  Clock,
  Award,
  ImageOff,
  Search,
  Sparkles,
} from "lucide-react";
import { getIcon } from "@/lib/icon-map";
import PageHeader from "@/components/ui/PageHeader";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import type { DbLearnCategory, DbLearnArticle } from "@/types/database";
import AskAiWidget from "@/components/learn/AskAiWidget";

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
            item: "https://freluxtools.netlify.app/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Learn",
            item: "https://freluxtools.netlify.app/learn",
          },
        ],
      },
    ],
  });

  const [categories, setCategories] = useState<DbLearnCategory[]>([]);
  const [featured, setFeatured] = useState<DbLearnArticle[]>([]);
  const [recent, setRecent] = useState<DbLearnArticle[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DbLearnArticle[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [catRes, featRes, recentRes] = await Promise.all([
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
        ]);

        setCategories((catRes.data ?? []) as DbLearnCategory[]);
        setFeatured((featRes.data ?? []) as DbLearnArticle[]);
        setRecent((recentRes.data ?? []) as DbLearnArticle[]);
        setStatus("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
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
      const { data } = await supabase
        .from("learn_articles")
        .select("*")
        .eq("status", "published")
        .or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%`)
        .order("published_at", { ascending: false })
        .limit(8);
      setSearchResults((data ?? []) as DbLearnArticle[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const parentCategories = categories.filter((c) => !c.parent_slug);
  const childCategories = categories.filter((c) => c.parent_slug);

  function getChildren(parentSlug: string) {
    return childCategories.filter((c) => c.parent_slug === parentSlug);
  }

  function toggleParent(slug: string) {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  if (status === "loading")
    return (
      <>
        <PageHeader
          eyebrow="Education"
          title="Learn"
          subtitle="Guides, tutorials, and expert tips for painting, screeding, POP ceiling, tiling, finishing, and construction."
          breadcrumbs={[{ label: "Learn Hub" }]}
        />
        <div className="flex items-center justify-center gap-2 py-32 text-sm text-neutral-500">
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
        <div className="relative overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-white/10 bg-gradient-to-br from-white via-brand-purple/[0.03] to-brand-purple/[0.06] dark:from-brand-navy-mid dark:via-brand-navy-mid/50 dark:to-brand-navy p-8 sm:p-14">
          {/* Decorative orbs */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-purple/8 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-brand-purple/5 blur-3xl" aria-hidden="true" />
          {/* Top accent line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/30 to-transparent" aria-hidden="true" />

          <div className="relative mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-brand-purple/5 px-4 py-1.5 text-xs font-semibold text-brand-purple">
              <Sparkles className="h-3.5 w-3.5" />
              {recent.length + featured.length}+ Expert Articles
            </div>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-brand-navy dark:text-white sm:text-4xl">
              Master Your Craft with{" "}
              <span className="bg-gradient-to-r from-brand-purple to-brand-purple-lighter bg-clip-text text-transparent">
                Expert Guides
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-500 dark:text-neutral-400">
              In-depth tutorials, practical tips, and professional techniques
              for every aspect of building, finishing, and construction.
            </p>
            {/* Search bar */}
            <div className="mt-8 relative mx-auto max-w-lg">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, guides, tutorials…"
                className="w-full rounded-2xl border border-neutral-200 bg-white/80 py-3.5 pl-12 pr-4 text-sm font-medium text-brand-navy shadow-sm placeholder:text-neutral-400 focus:border-brand-purple/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 dark:border-white/10 dark:bg-brand-navy dark:text-white dark:placeholder:text-neutral-500"
              />
            </div>
            {/* Search results dropdown */}
            {searchQuery.trim() && (
              <div className="mt-3 mx-auto max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-xl dark:border-white/10 dark:bg-brand-navy">
                {searching ? (
                  <div className="p-5 text-center text-sm text-neutral-500">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                    Searching…
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((a) => (
                      <Link
                        key={a.id}
                        to={`/learn/${a.slug}`}
                        className="flex items-start gap-3 px-4 py-3 transition-all hover:bg-brand-purple/5"
                      >
                        {a.cover_image_url && (
                          <img
                            src={a.cover_image_url}
                            alt=""
                            className="h-14 w-20 shrink-0 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-brand-navy dark:text-white">
                            {a.title}
                          </p>
                          <span className="text-xs capitalize text-neutral-500">
                            {a.category_slug.replace(/-/g, " ")}
                          </span>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-neutral-300" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 text-center text-sm text-neutral-500">
                    No articles found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Featured articles */}
        {featured.length > 0 && (
          <section className="mb-14">
            <div className="mb-6 flex items-center gap-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-orange/10">
                <Award className="h-4 w-4 text-accent-orange" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-brand-navy dark:text-white">
                  Featured Articles
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Hand-picked guides our readers love most
                </p>
              </div>
            </div>
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((article) => (
                <Link
                  key={article.id}
                  to={`/learn/${article.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-white/5 dark:bg-brand-navy-mid"
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
                    <div className="relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-neutral-50 to-brand-purple/5 dark:from-white/5 dark:to-brand-purple/10">
                      <ImageOff className="h-7 w-7 text-neutral-300" />
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-orange shadow-sm">
                        <Award className="h-3 w-3" /> Featured
                      </span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-base font-bold leading-snug text-brand-navy transition-colors group-hover:text-brand-purple dark:text-white">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="mt-2 text-sm leading-relaxed text-neutral-500 line-clamp-2 dark:text-neutral-400">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-neutral-400">
                      {article.author && (
                        <span className="font-medium">{article.author}</span>
                      )}
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

        {/* Browse by category — hierarchical */}
        <section className="mb-14">
          <div className="mb-6 flex items-center gap-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10">
              <BookOpen className="h-4 w-4 text-brand-purple" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-brand-navy dark:text-white">
                Browse by Topic
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Explore guides organized by discipline
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {parentCategories.map((cat) => {
              const IconComponent = getIcon(cat.icon);
              const children = getChildren(cat.slug);
              const isExpanded = expandedParents.has(cat.slug);

              if (children.length > 0) {
                return (
                  <div
                    key={cat.id}
                    className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-brand-navy-mid"
                  >
                    <button
                      onClick={() => toggleParent(cat.slug)}
                      className="group flex w-full items-center gap-5 p-6 text-left transition-all hover:bg-brand-purple/[0.03]"
                    >
                      <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple/10 to-brand-purple/5 text-brand-purple transition-transform group-hover:scale-105">
                        <IconComponent className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-base font-bold text-brand-navy dark:text-white">
                          {cat.name}
                        </h3>
                        {cat.description && (
                          <p className="mt-1 text-sm leading-relaxed text-neutral-500 line-clamp-1 dark:text-neutral-400">
                            {cat.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
                          {children.length} topics
                        </span>
                        <ChevronDown
                          className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""} group-hover:text-brand-purple`}
                        />
                      </div>
                    </button>
                    {isExpanded && (
                      <div
                        className="border-t border-neutral-100 dark:border-white/5"
                        style={{ animation: "fadeInDown 0.3s ease-out" }}
                      >
                        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                          {children.map((child) => {
                            const ChildIcon = getIcon(child.icon);
                            return (
                              <Link
                                key={child.id}
                                to={`/learn/category/${child.slug}`}
                                className="group/sub flex items-center gap-3 rounded-xl p-3.5 transition-all hover:bg-brand-purple/5 hover:shadow-sm"
                              >
                                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-purple/5 text-brand-purple/70 transition-colors group-hover/sub:bg-brand-purple/10 group-hover/sub:text-brand-purple">
                                  <ChildIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="truncate text-sm font-semibold text-brand-navy dark:text-white">
                                    {child.name}
                                  </h4>
                                  {child.description && (
                                    <p className="mt-0.5 text-xs leading-snug text-neutral-400 line-clamp-1">
                                      {child.description}
                                    </p>
                                  )}
                                </div>
                                <ArrowRight
                                  aria-hidden="true"
                                  className="h-4 w-4 shrink-0 text-neutral-300 transition-all group-hover/sub:text-brand-purple group-hover/sub:translate-x-0.5"
                                />
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={cat.id}
                  to={`/learn/category/${cat.slug}`}
                  className="group flex items-start gap-5 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-brand-navy-mid"
                >
                  <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple/10 to-brand-purple/5 text-brand-purple transition-transform group-hover:scale-105">
                    <IconComponent className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-base font-bold text-brand-navy dark:text-white">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 line-clamp-2 dark:text-neutral-400">
                        {cat.description}
                      </p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple">
                      Explore topics
                      <ArrowRight
                        aria-hidden="true"
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent articles */}
        {recent.length > 0 && (
          <section>
            <div className="mb-6 flex items-center gap-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10">
                <Clock className="h-4 w-4 text-brand-purple" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-brand-navy dark:text-white">
                  Latest Articles
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Fresh from our editorial desk
                </p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((article) => (
                <Link
                  key={article.id}
                  to={`/learn/${article.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-white/5 dark:bg-brand-navy-mid"
                >
                  {article.cover_image_url ? (
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={article.cover_image_url}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-neutral-50 to-brand-purple/5 dark:from-white/5 dark:to-brand-purple/10">
                      <ImageOff className="h-7 w-7 text-neutral-300" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-purple">
                      {article.category_slug.replace(/-/g, " ")}
                    </span>
                    <h3 className="font-display text-base font-bold leading-snug text-brand-navy transition-colors group-hover:text-brand-purple dark:text-white">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="mt-2 text-sm leading-relaxed text-neutral-500 line-clamp-2 dark:text-neutral-400">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-neutral-400">
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
                            { month: "short", day: "numeric" },
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

        {recent.length === 0 && featured.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-20 text-center dark:border-white/10 dark:bg-white/5">
            <BookOpen
              aria-hidden="true"
              className="mx-auto h-12 w-12 text-neutral-300"
            />
            <p className="mt-5 text-base font-semibold text-neutral-600 dark:text-neutral-300">
              Articles coming soon
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              We're preparing in-depth guides, tutorials, and expert tips.
              Check back shortly.
            </p>
          </div>
        )}

        <div className="mt-10">
          <AdSlot slotKey="learn_bottom" />
        </div>
      </div>

      <style>{`@keyframes fadeInDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <AskAiWidget />
    </>
  );
}
