import { useEffect, useState } from "react";
import AdSlot from "@/components/ui/AdSlot";
import { Link, useParams } from "react-router-dom";
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  ImageOff,
} from "lucide-react";
import { getIcon } from "@/lib/icon-map";
import PageHeader from "@/components/ui/PageHeader";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import type { DbLearnCategory, DbLearnArticle } from "@/types/database";

type Status = "loading" | "ready" | "error" | "notfound";

export default function LearnCategory() {
  const { categorySlug } = useParams<{ categorySlug: string }>();

  const [category, setCategory] = useState<DbLearnCategory | null>(null);
  const [articles, setArticles] = useState<DbLearnArticle[]>([]);
  const [subcategories, setSubcategories] = useState<DbLearnCategory[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const SITE_URL_ =
    import.meta.env.VITE_SITE_URL ?? "https://freluxtools.netlify.app";
  useSeo({
    title: category ? `${category.name}: Learn` : "Learn Category",
    description:
      category?.description ?? "Browse educational articles from FRELUX.",
    canonicalPath: `/learn/category/${categorySlug}`,
    ogType: "website",
    structuredData: category
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: `${SITE_URL_}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Learn",
              item: `${SITE_URL_}/learn`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: category.name,
              item: `${SITE_URL_}/learn/category/${categorySlug}`,
            },
          ],
        }
      : undefined,
  });

  useEffect(() => {
    if (!categorySlug) return;
    async function load() {
      setStatus("loading");
      const [catRes, artRes, subRes] = await Promise.all([
        supabase
          .from("learn_categories")
          .select("*")
          .eq("slug", categorySlug)
          .maybeSingle(),
        supabase
          .from("learn_articles")
          .select("*")
          .eq("category_slug", categorySlug)
          .eq("status", "published")
          .order("published_at", { ascending: false }),
        supabase
          .from("learn_categories")
          .select("*")
          .eq("parent_slug", categorySlug)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (!catRes.data) {
        setStatus("notfound");
        return;
      }

      const cat = catRes.data as DbLearnCategory;
      const subs = (subRes.data ?? []) as DbLearnCategory[];
      setCategory(cat);
      setSubcategories(subs);

      if (subs.length > 0) {
        const childSlugs = subs.map((s) => s.slug);
        const { data: childArticles } = await supabase
          .from("learn_articles")
          .select("*")
          .in("category_slug", childSlugs)
          .eq("status", "published")
          .order("published_at", { ascending: false });
        setArticles((childArticles ?? []) as DbLearnArticle[]);
      } else {
        setArticles((artRes.data ?? []) as DbLearnArticle[]);
      }
      setStatus("ready");
    }
    load();
  }, [categorySlug]);

  if (status === "loading")
    return (
      <>
        <PageHeader
          eyebrow="Learn"
          title="Loading…"
          subtitle=""
          breadcrumbs={[
            { label: "Learn Hub", path: "/learn" },
            { label: "Loading…" },
          ]}
        />
        <div className="flex items-center justify-center gap-2 py-32 text-sm text-neutral-500">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{" "}
          Loading…
        </div>
      </>
    );

  if (status === "notfound" || status === "error" || !category)
    return (
      <>
        <PageHeader
          eyebrow="Learn"
          title="Category not found"
          subtitle=""
          breadcrumbs={[
            { label: "Learn Hub", path: "/learn" },
            { label: "Loading…" },
          ]}
        />
        <div className="mx-auto max-w-md py-20 text-center">
          <AlertCircle
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-neutral-300"
          />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
            This category doesn't exist or has been removed.
          </p>
          <Link
            to="/learn"
            className="mt-4 inline-block text-sm font-semibold text-brand-purple hover:underline"
          >
            Back to Learn
          </Link>
        </div>
      </>
    );

  const IconComponent = getIcon(category.icon);
  const isParent = subcategories.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Learn"
        title={category.name}
        subtitle={category.description ?? ""}
        breadcrumbs={[
          { label: "Learn Hub", path: "/learn" },
          { label: category.name },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Category header banner — premium */}
        <div className="relative mb-12 overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-white/10 bg-gradient-to-br from-white via-brand-purple/[0.03] to-brand-purple/[0.06] dark:from-brand-navy-mid dark:via-brand-navy-mid/50 dark:to-brand-navy p-7 sm:p-10">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-purple/8 blur-3xl" aria-hidden="true" />
          <div className="relative flex items-center gap-6">
            <div className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple/15 to-brand-purple/5 text-brand-purple">
              <IconComponent className="h-10 w-10" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-bold text-brand-navy dark:text-white">
                {category.name}
              </h2>
              {category.description && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {category.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  {articles.length} {articles.length === 1 ? "article" : "articles"}
                </span>
                {isParent && (
                  <span className="flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5" />
                    {subcategories.length} {subcategories.length === 1 ? "topic" : "topics"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subcategory cards for parent categories */}
        {isParent && (
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10">
                <BookOpen className="h-4 w-4 text-brand-purple" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-brand-navy dark:text-white">
                  Topics within {category.name}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Dive deeper into specific areas
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {subcategories.map((sub) => {
                const SubIcon = getIcon(sub.icon);
                return (
                  <Link
                    key={sub.id}
                    to={`/learn/category/${sub.slug}`}
                    className="group flex items-start gap-4 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-brand-navy-mid"
                  >
                    <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple/10 to-brand-purple/5 text-brand-purple transition-transform group-hover:scale-105">
                      <SubIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-display text-sm font-bold text-brand-navy dark:text-white">
                        {sub.name}
                      </h4>
                      {sub.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500 line-clamp-2 dark:text-neutral-400">
                          {sub.description}
                        </p>
                      )}
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple">
                        Explore
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
        )}

        {/* Articles grid */}
        {articles.length > 0 ? (
          <section>
            {isParent && (
              <div className="mb-6 flex items-center gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10">
                  <BookOpen className="h-4 w-4 text-brand-purple" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-brand-navy dark:text-white">
                    All Articles
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Every guide in this category
                  </p>
                </div>
              </div>
            )}
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
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
                    {isParent && (
                      <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-purple">
                        {article.category_slug.replace(/-/g, " ")}
                      </span>
                    )}
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
        ) : (
          !isParent && (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-20 text-center dark:border-white/10 dark:bg-white/5">
              <BookOpen
                aria-hidden="true"
                className="mx-auto h-12 w-12 text-neutral-300"
              />
              <p className="mt-5 text-base font-semibold text-neutral-600 dark:text-neutral-300">
                No articles yet
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Articles in this category are coming soon. Check back shortly.
              </p>
            </div>
          )
        )}

        <div className="mt-10">
          <Link
            to="/learn"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All topics
          </Link>
        </div>
        <div className="mt-8">
          <AdSlot slotKey="learn_category_bottom" />
        </div>
      </div>
    </>
  );
}
