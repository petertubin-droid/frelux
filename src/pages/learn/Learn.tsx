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
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-brand-purple/5 via-transparent to-brand-purple/5 p-6 dark:border-white/10 sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-brand-navy dark:text-white sm:text-3xl">
              Master Your Craft with Expert Guides
            </h2>
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              {recent.length + featured.length}+ in-depth articles covering
              every aspect of building, finishing, and construction
            </p>
            {/* Search bar */}
            <div className="mt-6 relative mx-auto max-w-lg">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles…"
                className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm text-brand-navy placeholder:text-neutral-400 focus:border-brand-purple/50 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 dark:border-white/10 dark:bg-brand-navy-mid dark:text-white"
              />
            </div>
            {/* Search results dropdown */}
            {searchQuery.trim() && (
              <div className="mt-3 mx-auto max-w-lg rounded-xl border border-neutral-200 bg-white text-left shadow-lg dark:border-white/10 dark:bg-brand-navy-mid">
                {searching ? (
                  <div className="p-4 text-center text-sm text-neutral-500">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" />{" "}
                    Searching…
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((a) => (
                      <Link
                        key={a.id}
                        to={`/learn/${a.slug}`}
                        className="flex items-start gap-3 px-4 py-2.5 transition-all hover:bg-brand-purple/5"
                      >
                        {a.cover_image_url && (
                          <img
                            src={a.cover_image_url}
                            alt=""
                            className="h-12 w-16 shrink-0 rounded-md object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-brand-navy dark:text-white">
                            {a.title}
                          </p>
                          <span className="text-xs text-neutral-500">
                            {a.category_slug.replace(/-/g, " ")}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-neutral-500">
                    No articles found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Featured articles */}
        {featured.length > 0 && (
          <section className="mb-12">
            <div className="mb-4 flex items-center gap-2">
              <Award className="h-4 w-4 text-accent-orange" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">
                Featured
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((article) => (
                <Link
                  key={article.id}
                  to={`/learn/${article.slug}`}
                  className="group overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  {article.cover_image_url ? (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={article.cover_image_url}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/9] items-center justify-center bg-neutral-50 dark:bg-white/5">
                      <ImageOff
                        aria-hidden="true"
                        className="h-6 w-6 text-neutral-300"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2">
                      <Award
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-accent-orange"
                      />
                      <span className="text-xs font-semibold uppercase tracking-widest text-accent-orange">
                        Featured
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-brand-navy dark:text-white">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
                      {article.author && <span>{article.author}</span>}
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
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand-purple" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">
              Browse by topic
            </h2>
          </div>
          <div className="space-y-3">
            {parentCategories.map((cat) => {
              const IconComponent = getIcon(cat.icon);
              const children = getChildren(cat.slug);
              const isExpanded = expandedParents.has(cat.slug);

              if (children.length > 0) {
                return (
                  <div
                    key={cat.id}
                    className="rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid overflow-hidden transition-all hover:border-brand-purple/30"
                  >
                    <button
                      onClick={() => toggleParent(cat.slug)}
                      className="group flex w-full items-center gap-4 p-5 text-left transition-all hover:bg-brand-purple/5"
                    >
                      <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-brand-navy dark:text-white">
                          {cat.name}
                        </h3>
                        {cat.description && (
                          <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-1">
                            {cat.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500 dark:bg-white/10">
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
                        <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
                          {children.map((child) => {
                            const ChildIcon = getIcon(child.icon);
                            return (
                              <Link
                                key={child.id}
                                to={`/learn/category/${child.slug}`}
                                className="group/sub flex items-center gap-3 rounded-lg p-3 transition-all hover:bg-brand-purple/5 hover:scale-[1.02]"
                              >
                                <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-purple/5 text-brand-purple/70 group-hover/sub:text-brand-purple">
                                  <ChildIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-semibold text-brand-navy dark:text-white truncate">
                                    {child.name}
                                  </h4>
                                  {child.description && (
                                    <p className="mt-0.5 text-[10px] leading-snug text-neutral-400 line-clamp-1">
                                      {child.description}
                                    </p>
                                  )}
                                </div>
                                <ArrowRight
                                  aria-hidden="true"
                                  className="h-3 w-3 text-neutral-300 transition-all group-hover/sub:text-brand-purple group-hover/sub:translate-x-0.5"
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
                  className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-5 transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md"
                >
                  <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-brand-navy dark:text-white">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple">
                      Explore{" "}
                      <ArrowRight
                        aria-hidden="true"
                        className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
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
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-purple" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">
                Latest articles
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((article) => (
                <Link
                  key={article.id}
                  to={`/learn/${article.slug}`}
                  className="group overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  {article.cover_image_url ? (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={article.cover_image_url}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/9] items-center justify-center bg-neutral-50 dark:bg-white/5">
                      <ImageOff
                        aria-hidden="true"
                        className="h-6 w-6 text-neutral-300"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-brand-purple">
                      {article.category_slug.replace(/-/g, " ")}
                    </span>
                    <h3 className="mt-2 text-base font-bold text-brand-navy dark:text-white">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
                      {article.author && <span>{article.author}</span>}
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

        {recent.length === 0 && featured.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-16 text-center">
            <BookOpen
              aria-hidden="true"
              className="mx-auto h-10 w-10 text-neutral-300"
            />
            <p className="mt-4 text-sm font-semibold text-neutral-600">
              Articles coming soon
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              We're preparing guides, tutorials, and tips. Check back shortly.
            </p>
          </div>
        )}

        <div className="mt-8">
          <AdSlot slotKey="learn_bottom" />
        </div>
      </div>

      <style>{`@keyframes fadeInDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <AskAiWidget />
    </>
  );
}
