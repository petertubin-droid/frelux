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
  const [status, setStatus] = useState<Status>("loading");

  useSeo({
    title: category ? `${category.name}: Learn` : "Learn Category",
    description:
      category?.description ?? "Browse educational articles from FRELUX.",
    canonicalPath: `/learn/category/${categorySlug}`,
    ogType: "website",
  });

  useEffect(() => {
    if (!categorySlug) return;
    async function load() {
      setStatus("loading");
      const [catRes, artRes] = await Promise.all([
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
      ]);

      if (!catRes.data) {
        setStatus("notfound");
        return;
      }
      setCategory(catRes.data as DbLearnCategory);
      setArticles((artRes.data ?? []) as DbLearnArticle[]);
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
        <div className="mb-8 flex items-center gap-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
            <IconComponent className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-navy dark:text-white">
              {category.name}
            </h2>
            {category.description && (
              <p className="text-sm text-neutral-500 dark:text-neutral-500">
                {category.description}
              </p>
            )}
          </div>
        </div>

        {articles.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
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
                  <h3 className="text-base font-bold text-brand-navy dark:text-white">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-500 line-clamp-2">
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
        ) : (
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
        )}

        <div className="mt-10">
          <Link
            to="/learn"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All topics
          </Link>
        </div>
        <AdSlot slotKey="learn_category_bottom" className="mt-8" />
      </div>
    </>
  );
}
