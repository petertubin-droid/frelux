import { useEffect, useState } from "react";
import AdSlot from "@/components/ui/AdSlot";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  User,
  ImageOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import type { DbLearnArticle } from "@/types/database";

type Status = "loading" | "ready" | "error" | "notfound";

export default function LearnArticle() {
  const { articleSlug } = useParams<{ articleSlug: string }>();

  const [article, setArticle] = useState<DbLearnArticle | null>(null);
  const [related, setRelated] = useState<DbLearnArticle[]>([]);
  const [recent, setRecent] = useState<DbLearnArticle[]>([]);
  const [prevArticle, setPrevArticle] = useState<DbLearnArticle | null>(null);
  const [nextArticle, setNextArticle] = useState<DbLearnArticle | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  // Build structured data — Article schema + BreadcrumbList for rich results.
  const SITE_URL_ =
    import.meta.env.VITE_SITE_URL ?? "https://freluxtools.netlify.app";
  const articleStructuredData = article
    ? [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.meta_description ?? article.excerpt ?? "",
          author: article.author
            ? { "@type": "Person", name: article.author }
            : { "@type": "Organization", name: "FRELUX PAINT CALC" },
          publisher: {
            "@type": "Organization",
            name: "FRELUX PAINT CALC",
            logo: { "@type": "ImageObject", url: `${SITE_URL_}/logo.png` },
          },
          datePublished: article.published_at ?? article.created_at,
          dateModified: article.updated_at,
          image: article.cover_image_url
            ? [article.cover_image_url]
            : undefined,
          articleBody: article.content.slice(0, 5000),
          wordCount: article.content.split(/\s+/).length,
          keywords: article.meta_keywords ?? undefined,
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${SITE_URL_}/learn/${articleSlug}`,
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Learn",
              item: `${SITE_URL_}/learn`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: article.category_slug.replace(/-/g, " "),
              item: `${SITE_URL_}/learn/category/${article.category_slug}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: article.title,
              item: `${SITE_URL_}/learn/${articleSlug}`,
            },
          ],
        },
      ]
    : undefined;

  useSeo({
    title: article ? (article.meta_title ?? article.title) : "Article",
    description:
      article?.meta_description ??
      article?.excerpt ??
      "FRELUX educational article.",
    canonicalPath: `/learn/${articleSlug}`,
    ogType: "article",
    ogImage: article?.cover_image_url ?? undefined,
    keywords: article?.meta_keywords ?? undefined,
    structuredDataArray: articleStructuredData,
  });

  useEffect(() => {
    if (!articleSlug) return;
    async function load() {
      setStatus("loading");
      const { data, error } = await supabase
        .from("learn_articles")
        .select("*")
        .eq("slug", articleSlug)
        .eq("status", "published")
        .maybeSingle();

      if (error) {
        setStatus("error");
        return;
      }
      if (!data) {
        setStatus("notfound");
        return;
      }
      setArticle(data as DbLearnArticle);
      setStatus("ready");

      // Fetch related articles (same category, excluding current), recently
      // published articles (all categories, excluding current), and prev/next
      // articles for cross-link navigation — all in parallel.
      const currentId = (data as DbLearnArticle).id;
      const currentCategory = (data as DbLearnArticle).category_slug;
      const currentPublishedAt =
        (data as DbLearnArticle).published_at ??
        (data as DbLearnArticle).created_at;

      const [relatedRes, recentRes, prevRes, nextRes] = await Promise.all([
        supabase
          .from("learn_articles")
          .select("*")
          .eq("status", "published")
          .eq("category_slug", currentCategory)
          .neq("id", currentId)
          .order("published_at", { ascending: false })
          .limit(3),
        supabase
          .from("learn_articles")
          .select("*")
          .eq("status", "published")
          .neq("id", currentId)
          .order("published_at", { ascending: false })
          .limit(4),
        supabase
          .from("learn_articles")
          .select("*")
          .eq("status", "published")
          .lt("published_at", currentPublishedAt)
          .order("published_at", { ascending: false })
          .limit(1),
        supabase
          .from("learn_articles")
          .select("*")
          .eq("status", "published")
          .gt("published_at", currentPublishedAt)
          .order("published_at", { ascending: true })
          .limit(1),
      ]);

      setRelated((relatedRes.data ?? []) as DbLearnArticle[]);
      setRecent((recentRes.data ?? []) as DbLearnArticle[]);
      setPrevArticle((prevRes.data?.[0] as DbLearnArticle) ?? null);
      setNextArticle((nextRes.data?.[0] as DbLearnArticle) ?? null);
    }
    load();
  }, [articleSlug]);

  if (status === "loading")
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-sm text-neutral-500">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );

  if (status === "notfound")
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-neutral-300"
        />
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
          This article doesn't exist or hasn't been published yet.
        </p>
        <Link
          to="/learn"
          className="mt-4 inline-block text-sm font-semibold text-brand-purple hover:underline"
        >
          Back to Learn
        </Link>
      </div>
    );

  if (status === "error" || !article)
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-red-400"
        />
        <p className="mt-3 text-sm text-red-600">Failed to load the article.</p>
      </div>
    );

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-neutral-500">
        <Link to="/learn" className="hover:text-brand-purple">
          Learn
        </Link>
        <span>/</span>
        <Link
          to={`/learn/category/${article.category_slug}`}
          className="capitalize hover:text-brand-purple"
        >
          {article.category_slug.replace(/-/g, " ")}
        </Link>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-brand-navy dark:text-white sm:text-4xl">
          {article.title}
        </h1>
        {article.excerpt && (
          <p className="mt-3 text-lg leading-relaxed text-neutral-500 dark:text-neutral-500">
            {article.excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center gap-4 text-xs text-neutral-500">
          {article.author && (
            <span className="flex items-center gap-1">
              <User aria-hidden="true" className="h-3.5 w-3.5" />{" "}
              {article.author}
            </span>
          )}
          {article.read_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {article.read_time_minutes} min
              read
            </span>
          )}
          {article.published_at && (
            <span>
              {new Date(article.published_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </header>

      {/* Cover image */}
      {article.cover_image_url ? (
        <div className="mb-8 overflow-hidden rounded-xl">
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="mb-8 flex items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-16 dark:border-white/5 dark:bg-brand-navy-mid">
          <ImageOff aria-hidden="true" className="h-8 w-8 text-neutral-300" />
        </div>
      )}

      {/* In-article ad — placed after cover image, before content.
           Labeled "Advertisement" per Google Better Ads Standards. */}
      <div className="mb-8">
        <AdSlot slotKey="learn_in_article" hideLabel />
      </div>

      {/* Content */}
      <div className="prose prose-sm max-w-none sm:prose-base">
        <RenderedMarkdown content={article.content} />
      </div>

      {/* Prev/Next navigation */}
      {(prevArticle || nextArticle) && (
        <nav className="mt-10 grid gap-4 border-t border-neutral-200 pt-6 sm:grid-cols-2">
          {prevArticle ? (
            <Link
              to={`/learn/${prevArticle.slug}`}
              className="group flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-brand-navy-mid"
            >
              <ArrowLeft
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-neutral-400 transition-colors group-hover:text-brand-purple"
              />
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  Previous
                </span>
                <p className="truncate text-sm font-bold text-brand-navy dark:text-white group-hover:text-brand-purple">
                  {prevArticle.title}
                </p>
              </div>
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}
          {nextArticle ? (
            <Link
              to={`/learn/${nextArticle.slug}`}
              className="group flex items-center justify-end gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-right transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-brand-navy-mid"
            >
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  Next
                </span>
                <p className="truncate text-sm font-bold text-brand-navy dark:text-white group-hover:text-brand-purple">
                  {nextArticle.title}
                </p>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-neutral-400 transition-colors group-hover:text-brand-purple"
              />
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}
        </nav>
      )}

      {/* Back to category */}
      <div className="mt-6">
        <Link
          to={`/learn/category/${article.category_slug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to{" "}
          {article.category_slug.replace(/-/g, " ")}
        </Link>
      </div>

      {/* Related articles (same category) */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500">
            Related articles
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((a) => (
              <Link
                key={a.id}
                to={`/learn/${a.slug}`}
                className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all hover:-translate-y-1 hover:shadow-lg dark:border-white/5 dark:bg-brand-navy-mid"
              >
                {a.cover_image_url ? (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={a.cover_image_url}
                      alt={a.title}
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
                <div className="p-4">
                  <h3 className="text-sm font-bold leading-snug text-brand-navy dark:text-white group-hover:text-brand-purple">
                    {a.title}
                  </h3>
                  {a.read_time_minutes && (
                    <span className="mt-2 flex items-center gap-1 text-xs text-neutral-500">
                      <Clock className="h-3 w-3" /> {a.read_time_minutes} min
                      read
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recently published (all categories) */}
      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500">
            Recently published
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((a) => (
              <Link
                key={a.id}
                to={`/learn/${a.slug}`}
                className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all hover:-translate-y-1 hover:shadow-lg dark:border-white/5 dark:bg-brand-navy-mid"
              >
                {a.cover_image_url ? (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={a.cover_image_url}
                      alt={a.title}
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
                <div className="p-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-brand-purple">
                    {a.category_slug.replace(/-/g, " ")}
                  </span>
                  <h3 className="mt-1 text-sm font-bold leading-snug text-brand-navy dark:text-white group-hover:text-brand-purple">
                    {a.title}
                  </h3>
                  {a.published_at && (
                    <span className="mt-1 block text-xs text-neutral-500">
                      {new Date(a.published_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bottom ad — label built into AdSlot */}
      <div className="mt-8">
        <AdSlot slotKey="learn_article_bottom" />
      </div>
    </article>
  );
}

// Lightweight markdown renderer — handles headings, paragraphs, lists, code blocks, bold
function RenderedMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre
          key={key++}
          className="overflow-auto rounded-lg bg-neutral-900 p-4 text-sm text-neutral-100"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={key++}
          className="mt-6 text-lg font-bold text-brand-navy dark:text-white"
        >
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={key++}
          className="mt-8 text-xl font-bold text-brand-navy dark:text-white"
        >
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={key++}
          className="mt-8 text-2xl font-bold text-brand-navy dark:text-white"
        >
          {line.slice(2)}
        </h1>,
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      // List items — collect consecutive
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith("- ") || lines[i].startsWith("* "))
      ) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="mt-3 space-y-1.5 pl-6">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200 list-disc"
            >
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    } else if (line.trim() === "") {
      // Skip empty lines
    } else {
      elements.push(
        <p
          key={key++}
          className="mt-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200 sm:text-base"
        >
          {renderInline(line)}
        </p>,
      );
    }
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Handle bold **text** and links [text](url)
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={i}
          className="font-semibold text-brand-navy dark:text-white"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          className="font-semibold text-brand-purple hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
