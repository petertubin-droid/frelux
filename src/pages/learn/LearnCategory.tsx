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

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Category header banner */}
        <div className="mb-10 flex items-center gap-5 rounded-2xl border border-neutral-200 bg-gradient-to-br from-brand-purple/5 via-transparent to-brand-purple/5 p-6 dark:border-white/10">
          <div className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-purple/10 text-brand-purple">
            <IconComponent className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-navy dark:text-white">
              {category.name}
            </h2>
            {category.description && (
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {category.description}
              </p>
            )}
            <p className="mt-2 text-xs text-neutral-400">
              {articles.length} articles
              {isParent ? ` across ${subcategories.length} topics` : ""}
            </p>
          </div>
        </div>

        {/* Subcategory cards for parent categories */}
        {isParent && (
          <section className="mb-10">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500">
              Topics within {category.name}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subcategories.map((sub) => {
                const SubIcon = getIcon(sub.icon);
                return (
                  <Link
                    key={sub.id}
                    to={`/learn/category/${sub.slug}`}
                    className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-5 transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md"
                  >
                    <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                      <SubIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-brand-navy dark:text-white">
                        {sub.name}
                      </h4>
                      {sub.description && (
                        <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">
                          {sub.description}
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
        )}

        {/* Articles grid */}
        {articles.length > 0 ? (
          <section>
            {isParent && (
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500">
                All articles
              </h3>
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
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
                    {isParent && (
                      <span className="text-xs font-semibold uppercase tracking-widest text-brand-purple/70">
                        {article.category_slug.replace(/-/g, " ")}
                      </span>
                    )}
                    <h3
                      className={`text-base font-bold text-brand-navy dark:text-white ${isParent ? "mt-1" : ""}`}
                    >
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
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple">
                      Read more{" "}
                      <ArrowRight
                        aria-hidden="true"
                        className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          !isParent && (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-16 text-center">
              <BookOpen
                aria-hidden="true"
                className="mx-auto h-10 w-10 text-neutral-300"
              />
              <p className="mt-4 text-sm font-semibold text-neutral-600">
                No articles yet
              </p>
              <p className="mt-1 text-xs text-neutral-500">
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
