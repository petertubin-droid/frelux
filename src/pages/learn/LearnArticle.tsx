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
  Check,
  BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import type {
  DbLearnArticle,
  DbLearnArticleFaq,
  DbLearnArticleInsert,
} from "@/types/database";
import { ArticleInsertBlock } from "@/components/learn/ArticleInserts";
import { Button } from "@/components/ui/shadcn/button";

type Status = "loading" | "ready" | "error" | "notfound";

export default function LearnArticle() {
  const { articleSlug } = useParams<{ articleSlug: string }>();

  const [article, setArticle] = useState<DbLearnArticle | null>(null);
  const [faqs, setFaqs] = useState<DbLearnArticleFaq[]>([]);
  const [inserts, setInserts] = useState<DbLearnArticleInsert[]>([]);
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
          : { "@type": "Organization", name: "FRELUX PROJECT CALC" },
        publisher: {
          "@type": "Organization",
          name: "FRELUX PROJECT CALC",
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

      const [relatedRes, recentRes, prevRes, nextRes, faqRes, insertRes] =
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
          supabase
            .from("learn_article_inserts")
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
      setInserts((insertRes.data ?? []) as DbLearnArticleInsert[]);
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

  // Group in-article inserts by placement
  const { topInserts, bottomInserts, insertsByHeading } = useMemo(() => {
    const top: DbLearnArticleInsert[] = [];
    const bottom: DbLearnArticleInsert[] = [];
    const byHeading: Record<string, DbLearnArticleInsert[]> = {};
    for (const ins of inserts) {
      if (ins.position_type === "top") top.push(ins);
      else if (ins.position_type === "bottom") bottom.push(ins);
      else if (ins.position_type === "after_heading" && ins.position_heading_id) {
        (byHeading[ins.position_heading_id] ??= []).push(ins);
      }
    }
    return { topInserts: top, bottomInserts: bottom, insertsByHeading: byHeading };
  }, [inserts]);

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
      <div className="flex items-center justify-center gap-2 py-32 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );

  if (status === "notfound")
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-muted-foreground/80"
        />
        <p className="mt-3 text-sm text-muted-foreground dark:text-muted-foreground">
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
          className="h-full bg-gradient-to-r from-primary to-primary-lighter transition-[width] duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <article
        ref={articleRef}
        className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14"
      >
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/learn" className="transition-colors hover:text-brand-purple">
            Learn
          </Link>
          <span className="text-muted-foreground/80">/</span>
          <Link
            to={`/learn/category/${article.category_slug}`}
            className="capitalize transition-colors hover:text-brand-purple"
          >
            {article.category_slug.replace(/-/g, " ")}
          </Link>
        </nav>

        <div className="flex gap-8 lg:gap-12">
          {/* Table of contents sidebar (desktop) */}
          {tableOfContents.length > 0 && (
            <aside className="hidden w-56 shrink-0 lg:block">
              <div className="sticky top-8">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" /> Contents
                </div>
                <nav className="space-y-1 border-l border-border dark:border-white/10">
                  {tableOfContents.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={`block border-l-2 py-1.5 text-xs transition-all ${
                        activeHeading === h.id
                          ? "border-brand-purple font-semibold text-brand-purple"
                          : "border-transparent text-muted-foreground hover:border-border hover:text-card-foreground dark:hover:text-muted-foreground/80"
                      } ${h.level === 3 ? "pl-5" : "pl-3"}`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
                {faqs.length > 0 && (
                  <a
                    href="#faqs"
                    className="mt-2 block border-l-2 border-transparent py-1.5 pl-3 text-xs text-muted-foreground transition-colors hover:border-border hover:text-card-foreground dark:hover:text-muted-foreground/80"
                  >
                    FAQs
                  </a>
                )}
              </div>
            </aside>
          )}

          {/* Main article content */}
          <div className="min-w-0 flex-1">
            {/* Category badge */}
            <div className="mb-5">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-purple">
                {article.category_slug.replace(/-/g, " ")}
              </span>
            </div>

            {/* Header */}
            <header className="mb-10">
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground dark:text-primary-foreground sm:text-4xl lg:text-[2.75rem]">
                {article.title}
              </h1>
              {article.excerpt && (
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground dark:text-muted-foreground">
                  {article.excerpt}
                </p>
              )}
              <div className="mt-7 flex flex-wrap items-center gap-5 border-b border-border pb-7 dark:border-white/10">
                {article.author && (
                  <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <User aria-hidden="true" className="h-4 w-4" />{" "}
                    {article.author}
                  </span>
                )}
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" /> {readingTime} min read
                </span>
                {article.published_at && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {new Date(article.published_at).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "long", day: "numeric" },
                    )}
                  </span>
                )}
                <Button variant="default"
                  onClick={shareArticle}
                  className="ml-auto flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-brand-purple/30 hover:hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  {copied ? "Copied!" : "Share"}
                </Button>
              </div>
            </header>

            {/* Cover image */}
            {article.cover_image_url ? (
              <div className="mb-10 overflow-hidden rounded-2xl shadow-lg">
                <img
                  src={article.cover_image_url}
                  alt={article.title}
                  className="w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="mb-10 flex items-center justify-center rounded-2xl border border-dashed border-border bg-gradient-to-br from-muted/50 to-primary/5 py-20 dark:border-white/5 dark:from-card dark:to-background">
                <ImageOff
                  aria-hidden="true"
                  className="h-10 w-10 text-muted-foreground/80"
                />
              </div>
            )}

            {/* Top in-article inserts (Summary etc.) */}
            {topInserts.length > 0 && (
              <div className="mb-10">
                {topInserts.map((ins) => (
                  <ArticleInsertBlock key={ins.id} insert={ins} />
                ))}
              </div>
            )}

            {/* Ad slot — placement "learn_article_top" */}
            <div className="mb-10">
              <AdSlot slotKey="learn_article_top" hideLabel />
            </div>

            {/* Content — premium prose styling */}
            <div
              className="prose prose-sm max-w-none sm:prose-base dark:prose-invert
              prose-headings:scroll-mt-20 prose-headings:font-display
              prose-h2:mt-12 prose-h2:mb-5 prose-h2:text-2xl prose-h2:font-bold prose-h2:text-foreground dark:prose-h2:text-primary-foreground
              prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-lg prose-h3:font-semibold prose-h3:text-foreground dark:prose-h3:text-primary-foreground
              prose-p:mt-5 prose-p:text-base prose-p:leading-[1.75] prose-p:text-card-foreground dark:prose-p:text-muted-foreground/80
              prose-li:text-card-foreground dark:prose-li:text-muted-foreground/80 prose-li:leading-relaxed
              prose-strong:font-semibold prose-strong:text-foreground dark:prose-strong:text-primary-foreground
              prose-a:font-medium prose-a:text-brand-purple prose-a:no-underline hover:prose-a:underline
              prose-code:rounded-md prose-code:bg-muted dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-medium
              prose-code:before:content-none prose-code:after:content-none
              prose-pre:rounded-xl prose-pre:bg-background
              prose-blockquote:border-l-4 prose-blockquote:border-brand-purple prose-blockquote:not-italic prose-blockquote:rounded-r-lg prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:pr-4
              prose-table:rounded-lg prose-table:overflow-hidden
              prose-th:bg-muted/50 dark:prose-th:bg-white/5
              prose-img:rounded-xl
            "
            >
              <RenderedMarkdown
                content={article.content}
                insertsByHeading={insertsByHeading}
              />
            </div>

            {/* Native banner slot — placement "learn_article_native" */}
            <div className="mt-10">
              <AdSlot slotKey="learn_article_native" hideLabel />
            </div>

            {/* Bottom in-article inserts */}
            {bottomInserts.length > 0 && (
              <div className="mt-10">
                {bottomInserts.map((ins) => (
                  <ArticleInsertBlock key={ins.id} insert={ins} />
                ))}
              </div>
            )}

            {/* FAQ Section */}
            {faqs.length > 0 && (
              <section id="faqs" className="mt-14 scroll-mt-20">
                <div className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-muted/50/50 to-card p-7 dark:border-white/10 dark:from-card dark:to-background sm:p-9">
                  <div className="mb-6">
                    <h2 className="font-display text-xl font-bold text-foreground dark:text-primary-foreground">
                      Frequently Asked Questions
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground dark:text-muted-foreground">
                      Quick answers to common questions about this topic
                    </p>
                  </div>
                  <div className="space-y-3">
                    {faqs.map((faq, idx) => (
                      <div
                        key={faq.id}
                        className="overflow-hidden rounded-xl border border-border/80 bg-card transition-all dark:border-white/10 dark:bg-background"
                      >
                        <Button variant="ghost"
                          onClick={() =>
                            setOpenFaq(openFaq === idx ? null : idx)
                          }
                          className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-primary/[0.02]"
                        >
                          <span className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                            {faq.question}
                          </span>
                          <ChevronDown
                            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                              openFaq === idx ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                        <div
                          className={`overflow-hidden transition-all duration-300 ${
                            openFaq === idx ? "max-h-96" : "max-h-0"
                          }`}
                        >
                          <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground/80">
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
            <div className="relative mt-14 overflow-hidden rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center sm:p-10">
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
              <div className="relative">
                <h3 className="font-display text-xl font-bold text-foreground dark:text-primary-foreground">
                  Ready to start your project?
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
                  Use FRELUX calculators to estimate materials, plan your
                  budget, and get professional results.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    to="/calculators"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
                  >
                    Try Our Calculators <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/learn"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all hover:border-brand-purple/30 hover:shadow-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                  >
                    More Guides
                  </Link>
                </div>
              </div>
            </div>

            {/* Prev/Next navigation */}
            {(prevArticle || nextArticle) && (
              <nav className="mt-12 grid gap-4 border-t border-border pt-8 sm:grid-cols-2 dark:border-white/10">
                {prevArticle ? (
                  <Link
                    to={`/learn/${prevArticle.slug}`}
                    className="group flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-card"
                  >
                    <ArrowLeft
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-purple"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Previous
                      </span>
                      <p className="mt-1 truncate text-sm font-bold text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground">
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
                    className="group flex items-center justify-end gap-4 rounded-2xl border border-border/80 bg-card p-5 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-card"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Next
                      </span>
                      <p className="mt-1 truncate text-sm font-bold text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground">
                        {nextArticle.title}
                      </p>
                    </div>
                    <ArrowRight
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-purple"
                    />
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </nav>
            )}

            {/* Back to category */}
            <div className="mt-8">
              <Link
                to={`/learn/category/${article.category_slug}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple transition-colors hover:text-brand-purple-dark hover:underline"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to{" "}
                {article.category_slug.replace(/-/g, " ")}
              </Link>
            </div>

            {/* Related articles */}
            {related.length > 0 && (
              <section className="mt-14">
                <div className="mb-6 flex items-center gap-3">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-4 w-4 text-brand-purple" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">
                      Related Articles
                    </h2>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                      Continue learning about this topic
                    </p>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
                  {related.map((a) => (
                    <Link
                      key={a.id}
                      to={`/learn/${a.slug}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/5 dark:bg-card"
                    >
                      {a.cover_image_url ? (
                        <div className="aspect-[16/10] overflow-hidden">
                          <img
                            src={a.cover_image_url}
                            alt={a.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-muted/50 to-primary/5 dark:from-white/5 dark:to-primary/10">
                          <ImageOff className="h-6 w-6 text-muted-foreground/80" />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground">
                          {a.title}
                        </h3>
                        {a.read_time_minutes && (
                          <span className="mt-auto flex items-center gap-1 pt-3 text-xs text-muted-foreground">
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
              <section className="mt-12">
                <div className="mb-6 flex items-center gap-3">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-4 w-4 text-brand-purple" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">
                      Recently Published
                    </h2>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                      Latest from our editorial desk
                    </p>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {recent.map((a) => (
                    <Link
                      key={a.id}
                      to={`/learn/${a.slug}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/5 dark:bg-card"
                    >
                      {a.cover_image_url ? (
                        <div className="aspect-[16/10] overflow-hidden">
                          <img
                            src={a.cover_image_url}
                            alt={a.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-muted/50 to-primary/5 dark:from-white/5 dark:to-primary/10">
                          <ImageOff className="h-6 w-6 text-muted-foreground/80" />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col p-4">
                        <span className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-brand-purple">
                          {a.category_slug.replace(/-/g, " ")}
                        </span>
                        <h3 className="text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground">
                          {a.title}
                        </h3>
                        {a.published_at && (
                          <span className="mt-auto block pt-3 text-xs text-muted-foreground">
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

            {/* In-article ad + native banner — after FAQ */}
            <div className="mt-10">
              <AdSlot slotKey="learn_in_article" hideLabel />
            </div>
            <div className="mt-10">
              <AdSlot slotKey="learn_article_native_2" hideLabel />
            </div>

            {/* Banner + native banner — after related articles */}
            <div className="mt-10">
              <AdSlot slotKey="learn_article_mid_2" hideLabel />
            </div>
            <div className="mt-10">
              <AdSlot slotKey="learn_article_native_3" hideLabel />
            </div>

            {/* Bottom ad */}
            <div className="mt-10">
              <AdSlot slotKey="learn_article_bottom" />
            </div>
          </div>
        </div>
      </article>
    </>
  );
}

// Enhanced markdown renderer with heading IDs for TOC
function RenderedMarkdown({
  content,
  insertsByHeading,
}: {
  content: string;
  insertsByHeading?: Record<string, DbLearnArticleInsert[]>;
}) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  // In-article inserts placed right after their target heading
  const pushHeadingInserts = (headingId: string) => {
    const inserts = insertsByHeading?.[headingId];
    if (inserts && inserts.length > 0) {
      inserts.forEach((ins) => {
        elements.push(<ArticleInsertBlock key={`ins-${ins.id}`} insert={ins} />);
      });
    }
  };

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
          className="overflow-auto rounded-xl bg-background p-5 text-sm text-muted-foreground/40"
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
          className="mt-8 text-lg font-semibold text-foreground dark:text-primary-foreground"
        >
          {renderInline(text)}
        </h3>,
      );
      pushHeadingInserts(id);
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
          className="mt-12 scroll-mt-20 font-display text-2xl font-bold text-foreground dark:text-primary-foreground"
        >
          {renderInline(text)}
        </h2>,
      );
      pushHeadingInserts(id);
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
          className="mt-12 scroll-mt-20 font-display text-3xl font-bold text-foreground dark:text-primary-foreground"
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
        <ul key={key++} className="mt-5 space-y-2 pl-6">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="text-base leading-relaxed text-card-foreground list-disc marker:text-brand-purple/50 dark:text-muted-foreground/80"
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
          className="mt-5 text-base leading-[1.75] text-card-foreground dark:text-muted-foreground/80"
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
      className="mt-6 overflow-hidden overflow-x-auto rounded-xl border border-border dark:border-white/10"
    >
      <table className="w-full text-sm">
        <thead className="bg-muted/50 dark:bg-white/5">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-5 py-3 text-left font-semibold text-foreground dark:text-primary-foreground"
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
              className="border-t border-border transition-colors hover:bg-muted/50 dark:border-white/10 dark:hover:bg-white/5"
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-5 py-3 text-card-foreground dark:text-muted-foreground/80"
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
          className="font-semibold text-foreground dark:text-primary-foreground"
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
          className="font-medium text-brand-purple hover:underline"
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
