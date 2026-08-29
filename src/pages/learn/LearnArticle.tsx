import { useEffect, useState, useRef, useMemo } from "react";
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
  ChevronDown,
  Share2,
  Copy,
  Check,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import type { DbLearnArticle, DbLearnArticleFaq } from "@/types/database";

type Status = "loading" | "ready" | "error" | "notfound";

export default function LearnArticle() {
  const { articleSlug } = useParams<{ articleSlug: string }>();

  const [article, setArticle] = useState<DbLearnArticle | null>(null);
  const [faqs, setFaqs] = useState<DbLearnArticleFaq[]>([]);
  const [related, setRelated] = useState<DbLearnArticle[]>([]);
  const [recent, setRecent] = useState<DbLearnArticle[]>([]);
  const [prevArticle, setPrevArticle] = useState<DbLearnArticle | null>(null);
  const [nextArticle, setNextArticle] = useState<DbLearnArticle | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [readingProgress, setReadingProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState<string>("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  // Build structured data — Article schema + BreadcrumbList + FAQPage for rich results.
  const SITE_URL_ =
    import.meta.env.VITE_SITE_URL ?? "https://freluxtools.netlify.app";

  const articleStructuredData = useMemo(() => {
    if (!article) return undefined;
    const schemas: Record<string, unknown>[] = [
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
        image: article.cover_image_url ? [article.cover_image_url] : undefined,
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
    ];
    // Add FAQPage schema if FAQs exist
    if (faqs.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      });
    }
    return schemas;
  }, [article, faqs, articleSlug, SITE_URL_]);

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
      const art = data as DbLearnArticle;
      setArticle(art);
      setStatus("ready");

      const currentId = art.id;
      const currentCategory = art.category_slug;
      const currentPublishedAt = art.published_at ?? art.created_at;

      const [relatedRes, recentRes, prevRes, nextRes, faqRes] =
        await Promise.all([
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
          supabase
            .from("learn_article_faqs")
            .select("*")
            .eq("article_id", currentId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);

      setRelated((relatedRes.data ?? []) as DbLearnArticle[]);
      setRecent((recentRes.data ?? []) as DbLearnArticle[]);
      setPrevArticle((prevRes.data?.[0] as DbLearnArticle) ?? null);
      setNextArticle((nextRes.data?.[0] as DbLearnArticle) ?? null);
      setFaqs((faqRes.data ?? []) as DbLearnArticleFaq[]);
    }
    load();
  }, [articleSlug]);

  // Reading progress + active heading tracking
  useEffect(() => {
    if (status !== "ready") return;

    function handleScroll() {
      if (!articleRef.current) return;
      const rect = articleRef.current.getBoundingClientRect();
      const totalHeight = rect.height - window.innerHeight;
      const scrolled = window.scrollY - rect.top;
      if (totalHeight > 0) {
        setReadingProgress(
          Math.min(100, Math.max(0, (scrolled / totalHeight) * 100)),
        );
      }

      // Track active heading
      const headings = articleRef.current.querySelectorAll("h2[id]");
      let current = "";
      headings.forEach((h) => {
        const el = h as HTMLElement;
        if (el.offsetTop - window.scrollY < 120) {
          current = el.id;
        }
      });
      if (current) setActiveHeading(current);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [status]);

  // Extract table of contents from article content
  const tableOfContents = useMemo(() => {
    if (!article) return [];
    const lines = article.content.split("\n");
    const headings: { id: string; text: string; level: number }[] = [];
    for (const line of lines) {
      if (line.startsWith("## ")) {
        const text = line.slice(3);
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        headings.push({ id, text, level: 2 });
      } else if (line.startsWith("### ")) {
        const text = line.slice(4);
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        headings.push({ id, text, level: 3 });
      }
    }
    return headings;
  }, [article]);

  function shareArticle() {
    if (navigator.share) {
      navigator.share({ title: article?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

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

  const readingTime =
    article.read_time_minutes ??
    Math.ceil(article.content.split(/\s+/).length / 200);

  return (
    <>
      {/* Reading progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-transparent">
        <div
          className="h-full bg-brand-purple transition-[width] duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <article
        ref={articleRef}
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12"
      >
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

        <div className="flex gap-8 lg:gap-12">
          {/* Table of contents sidebar (desktop) */}
          {tableOfContents.length > 0 && (
            <aside className="hidden w-56 shrink-0 lg:block">
              <div className="sticky top-8">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
                  <BookOpen className="h-3.5 w-3.5" /> Contents
                </div>
                <nav className="space-y-1">
                  {tableOfContents.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={`block border-l-2 py-1 text-xs transition-all ${
                        activeHeading === h.id
                          ? "border-brand-purple font-semibold text-brand-purple"
                          : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:hover:text-neutral-300"
                      } ${h.level === 3 ? "pl-4" : "pl-2"}`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
                <div className="mt-6">
                  {faqs.length > 0 && (
                    <a
                      href="#faqs"
                      className="block border-l-2 border-transparent py-1 pl-2 text-xs text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:hover:text-neutral-300"
                    >
                      FAQs
                    </a>
                  )}
                </div>
              </div>
            </aside>
          )}

          {/* Main article content */}
          <div className="min-w-0 flex-1">
            {/* Category badge */}
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-purple">
                {article.category_slug.replace(/-/g, " ")}
              </span>
            </div>

            {/* Header */}
            <header className="mb-8">
              <h1 className="text-3xl font-bold leading-tight text-brand-navy dark:text-white sm:text-4xl lg:text-[2.75rem]">
                {article.title}
              </h1>
              {article.excerpt && (
                <p className="mt-4 text-lg leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {article.excerpt}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-4 border-b border-neutral-200 pb-6 dark:border-white/10">
                {article.author && (
                  <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <User aria-hidden="true" className="h-3.5 w-3.5" />{" "}
                    {article.author}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <Clock className="h-3.5 w-3.5" /> {readingTime} min read
                </span>
                {article.published_at && (
                  <span className="text-xs text-neutral-500">
                    {new Date(article.published_at).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "long", day: "numeric" },
                    )}
                  </span>
                )}
                <button
                  onClick={shareArticle}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-all hover:border-brand-purple/30 hover:text-brand-purple dark:border-white/10 dark:text-neutral-400"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied!" : "Share"}
                </button>
              </div>
            </header>

            {/* Cover image */}
            {article.cover_image_url ? (
              <div className="mb-8 overflow-hidden rounded-xl shadow-lg">
                <img
                  src={article.cover_image_url}
                  alt={article.title}
                  className="w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="mb-8 flex items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-16 dark:border-white/5 dark:bg-brand-navy-mid">
                <ImageOff
                  aria-hidden="true"
                  className="h-8 w-8 text-neutral-300"
                />
              </div>
            )}

            {/* In-article ad */}
            <div className="mb-8">
              <AdSlot slotKey="learn_in_article" hideLabel />
            </div>

            {/* Content — premium prose styling */}
            <div
              className="prose prose-sm max-w-none sm:prose-base dark:prose-invert
              prose-headings:scroll-mt-20 prose-headings:font-bold
              prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-xl prose-h2:text-brand-navy dark:prose-h2:text-white
              prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-lg prose-h3:text-brand-navy dark:prose-h3:text-white
              prose-p:mt-4 prose-p:leading-relaxed prose-p:text-neutral-700 dark:prose-p:text-neutral-300
              prose-li:text-neutral-700 dark:prose-li:text-neutral-300
              prose-strong:text-brand-navy dark:prose-strong:text-white
              prose-a:text-brand-purple prose-a:no-underline hover:prose-a:underline
              prose-code:rounded prose-code:bg-neutral-100 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm
              prose-code:before:content-none prose-code:after:content-none
              prose-pre:rounded-lg prose-pre:bg-neutral-900
              prose-blockquote:border-l-brand-purple prose-blockquote:not-italic
            "
            >
              <RenderedMarkdown content={article.content} />
            </div>

            {/* FAQ Section */}
            {faqs.length > 0 && (
              <section id="faqs" className="mt-12 scroll-mt-20">
                <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-6 dark:border-white/10 dark:from-brand-navy-mid dark:to-brand-navy sm:p-8">
                  <h2 className="mb-1 text-xl font-bold text-brand-navy dark:text-white">
                    Frequently Asked Questions
                  </h2>
                  <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
                    Quick answers to common questions about this topic
                  </p>
                  <div className="space-y-3">
                    {faqs.map((faq, idx) => (
                      <div
                        key={faq.id}
                        className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-brand-navy"
                      >
                        <button
                          onClick={() =>
                            setOpenFaq(openFaq === idx ? null : idx)
                          }
                          className="flex w-full items-center justify-between gap-4 p-4 text-left"
                        >
                          <span className="text-sm font-semibold text-brand-navy dark:text-white">
                            {faq.question}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
                              openFaq === idx ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-300 ${
                            openFaq === idx ? "max-h-96" : "max-h-0"
                          }`}
                        >
                          <p className="p-4 pt-0 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* CTA section */}
            <div className="mt-12 rounded-2xl border border-brand-purple/20 bg-brand-purple/5 p-6 text-center sm:p-8">
              <h3 className="text-lg font-bold text-brand-navy dark:text-white">
                Ready to start your project?
              </h3>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                Use FRELUX calculators to estimate materials, plan your budget,
                and get professional results.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  to="/calculators"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-purple/90"
                >
                  Try Our Calculators <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/learn"
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-brand-navy dark:border-white/10 dark:text-white"
                >
                  More Guides
                </Link>
              </div>
            </div>

            {/* Prev/Next navigation */}
            {(prevArticle || nextArticle) && (
              <nav className="mt-10 grid gap-4 border-t border-neutral-200 pt-6 sm:grid-cols-2 dark:border-white/10">
                {prevArticle ? (
                  <Link
                    to={`/learn/${prevArticle.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-brand-navy-mid"
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
                    className="group flex items-center justify-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-right transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-brand-navy-mid"
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

            {/* Related articles */}
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
                            <Clock className="h-3 w-3" /> {a.read_time_minutes}{" "}
                            min read
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recently published */}
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
                            {new Date(a.published_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Bottom ad */}
            <div className="mt-8">
              <AdSlot slotKey="learn_article_bottom" />
            </div>
          </div>
        </div>
      </article>
    </>
  );
}

// Enhanced markdown renderer with heading IDs for TOC
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

    // Headings — with IDs for TOC navigation
    if (line.startsWith("### ")) {
      const text = line.slice(4);
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      elements.push(
        <h3
          key={key++}
          id={id}
          className="mt-6 text-lg font-bold text-brand-navy dark:text-white"
        >
          {renderInline(text)}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      const text = line.slice(3);
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      elements.push(
        <h2
          key={key++}
          id={id}
          className="mt-8 text-xl font-bold text-brand-navy dark:text-white"
        >
          {renderInline(text)}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      const text = line.slice(2);
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      elements.push(
        <h1
          key={key++}
          id={id}
          className="mt-8 text-2xl font-bold text-brand-navy dark:text-white"
        >
          {renderInline(text)}
        </h1>,
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
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
              className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 list-disc marker:text-brand-purple/50"
            >
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    } else if (line.startsWith("| ")) {
      // Simple table support
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(renderTable(tableLines, key++));
      continue;
    } else if (line.trim() === "") {
      // Skip empty lines
    } else {
      elements.push(
        <p
          key={key++}
          className="mt-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 sm:text-base"
        >
          {renderInline(line)}
        </p>,
      );
    }
    i++;
  }

  return <>{elements}</>;
}

function renderTable(lines: string[], key: number): React.ReactNode {
  if (lines.length < 2) return null;
  const parseRow = (line: string) =>
    line
      .split("|")
      .filter((c) => c.trim() !== "")
      .map((c) => c.trim());

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  return (
    <div
      key={key}
      className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-white/10"
    >
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 dark:bg-white/5">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left font-semibold text-brand-navy dark:text-white"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-t border-neutral-200 dark:border-white/10"
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300"
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
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
      const isExternal = linkMatch[2].startsWith("http");
      return (
        <a
          key={i}
          href={linkMatch[2]}
          className="font-semibold text-brand-purple hover:underline"
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
