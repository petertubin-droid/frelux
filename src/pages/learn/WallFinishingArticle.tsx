import React, { useEffect, useState, useRef, useMemo } from "react";
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
  ExternalLink,
  FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import { ArticleMarkdown } from "@/components/learn/ArticleMarkdown";
import { slugifyHeading } from "@/lib/learn/heading-slug";
import { Button } from "@/components/ui/shadcn/button";
import { WALL_FINISHING_LIBRARY_MARKETS } from "@/lib/wallfinishing/knowledge-library";
import { SITE_URL } from "@/lib/site-config";
import { useLanguage } from "@/lib/i18n";

type Status = "loading" | "ready" | "missing" | "error";

type WallArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  author: string | null;
  published_at: string | null;
  read_time_minutes: number | null;
  cover_image_url: string | null;
  wall_market_code: string;
  wall_topic_id: string;
  wall_language_code: string | null;
  wall_article_theme: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

type WallArticleCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  read_time_minutes: number | null;
  cover_image_url: string | null;
  wall_article_theme: string | null;
};

type Citation = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  published_on: string | null;
  retrieved_at: string;
  claim_scope: string;
};

type Faq = { id: string; question: string; answer: string };

const themeLabels: Record<string, string> = {
  overview: "System overview",
  materials: "Materials and specifications",
  installation: "Installation",
  quality: "Quality checks and defects",
  maintenance: "Maintenance and repair",
};

/**
 * Market wall-finishing article page. Renders with the same premium layout
 * as the Learn article page (reading progress, sticky TOC, premium prose,
 * FAQ accordion, prev/next, related articles) plus the reviewed-guidance
 * elements specific to market editions: theme/market badges, the sources
 * reviewed section, and market-scoped navigation.
 */
export default function WallFinishingArticle() {
  const { t } = useLanguage();
  const { marketCode = "", articleSlug = "" } = useParams<{
    marketCode: string;
    articleSlug: string;
  }>();
  const market = WALL_FINISHING_LIBRARY_MARKETS.find(
    (m) => m.code === marketCode.toUpperCase(),
  );
  const marketName = market?.countryName ?? "Market";

  const [article, setArticle] = useState<WallArticle | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [related, setRelated] = useState<WallArticleCard[]>([]);
  const [prevArticle, setPrevArticle] = useState<WallArticleCard | null>(null);
  const [nextArticle, setNextArticle] = useState<WallArticleCard | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [readingProgress, setReadingProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  const SITE_URL_ = SITE_URL;
  const canonicalPath = `/learn/wall-finishing/${marketCode.toLowerCase()}/${articleSlug}`;

  // Structured data: Article + BreadcrumbList (+ FAQPage when FAQs exist)
  const articleStructuredData = useMemo(() => {
    if (!article) return undefined;
    const schemas: Record<string, unknown>[] = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.excerpt ?? "",
        author: article.author
          ? { "@type": "Person", name: article.author }
          : { "@type": "Organization", name: "FRELUX SMART CALC" },
        publisher: {
          "@type": "Organization",
          name: "FRELUX SMART CALC",
          logo: { "@type": "ImageObject", url: `${SITE_URL_}/logo.png` },
        },
        datePublished: article.published_at ?? undefined,
        image: article.cover_image_url ? [article.cover_image_url] : undefined,
        articleBody: article.content.slice(0, 5000),
        wordCount: article.content.split(/\s+/).length,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${SITE_URL_}${canonicalPath}`,
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
            name: `${marketName} wall finishing library`,
            item: `${SITE_URL_}/learn/wall-finishing/${marketCode.toLowerCase()}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: article.title,
            item: `${SITE_URL_}${canonicalPath}`,
          },
        ],
      },
    ];
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
  }, [article, faqs, canonicalPath, marketName, marketCode, SITE_URL_]);

  useSeo({
    title: article
      ? article.meta_title
        ? `${article.meta_title} | FRELUX`
        : `${article.title} | ${marketName} | FRELUX`
      : "Wall finishing guidance | FRELUX",
    description:
      article?.meta_description ??
      article?.excerpt ??
      `Reviewed wall finishing guidance for ${marketName}.`,
    canonicalPath,
    ogType: "article",
    ogImage: article?.cover_image_url ?? undefined,
    structuredDataArray: articleStructuredData,
  });

  useEffect(() => {
    if (!articleSlug || !market) {
      setStatus("missing");
      return;
    }
    let alive = true;
    async function load() {
      setStatus("loading");
      const { data, error } = await supabase
        .from("learn_articles")
        .select(
          "id,slug,title,excerpt,content,author,published_at,read_time_minutes,cover_image_url,wall_market_code,wall_topic_id,wall_language_code,wall_article_theme,meta_title,meta_description",
        )
        .eq("slug", articleSlug)
        .eq("wall_market_code", market!.code)
        .eq("status", "published")
        .eq("editorial_review_status", "approved")
        .maybeSingle();

      if (!alive) return;
      if (error) {
        setStatus("error");
        return;
      }
      if (!data) {
        setStatus("missing");
        return;
      }
      const row = data as WallArticle;
      setArticle(row);
      setStatus("ready");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("frelux:content-loaded"));
      }

      const currentPublishedAt = row.published_at ?? "";
      const cardSelect =
        "id,slug,title,excerpt,read_time_minutes,cover_image_url,wall_article_theme";

      const [citationsRes, faqRes, prevRes, nextRes, relatedRes] =
        await Promise.all([
          supabase
            .from("learn_wall_finishing_sources")
            .select(
              "id,title,url,publisher,published_on,retrieved_at,claim_scope",
            )
            .eq("topic_id", row.wall_topic_id)
            .eq("review_status", "accepted")
            .order("created_at"),
          supabase
            .from("learn_article_faqs")
            .select("id,question,answer")
            .eq("article_id", row.id)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("learn_articles")
            .select(cardSelect)
            .eq("status", "published")
            .eq("editorial_review_status", "approved")
            .eq("wall_market_code", market!.code)
            .lt("published_at", currentPublishedAt)
            .order("published_at", { ascending: false })
            .limit(1),
          supabase
            .from("learn_articles")
            .select(cardSelect)
            .eq("status", "published")
            .eq("editorial_review_status", "approved")
            .eq("wall_market_code", market!.code)
            .gt("published_at", currentPublishedAt)
            .order("published_at", { ascending: true })
            .limit(1),
          supabase
            .from("learn_articles")
            .select(cardSelect)
            .eq("status", "published")
            .eq("editorial_review_status", "approved")
            .eq("wall_market_code", market!.code)
            .neq("id", row.id)
            .order("published_at", { ascending: false })
            .limit(4),
        ]);

      if (!alive) return;
      setCitations((citationsRes.data ?? []) as Citation[]);
      setFaqs((faqRes.data ?? []) as Faq[]);
      setPrevArticle((prevRes.data?.[0] as WallArticleCard) ?? null);
      setNextArticle((nextRes.data?.[0] as WallArticleCard) ?? null);
      setRelated(((relatedRes.data ?? []) as WallArticleCard[]).slice(0, 3));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("frelux:content-loaded"));
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [articleSlug, market]);

  // Reading progress + active heading tracking (same behavior as LearnArticle)
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

  // Table of contents from the article content (## / ### headings)
  const tableOfContents = useMemo(() => {
    if (!article) return [];
    const headings: { id: string; text: string; level: number }[] = [];
    for (const line of article.content.split("\n")) {
      if (line.startsWith("## ")) {
        headings.push({
          id: slugifyHeading(line.slice(3)),
          text: line.slice(3),
          level: 2,
        });
      } else if (line.startsWith("### ")) {
        headings.push({
          id: slugifyHeading(line.slice(4)),
          text: line.slice(4),
          level: 3,
        });
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

  if (status === "missing")
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-muted-foreground/80"
        />
        <p className="mt-3 text-sm text-muted-foreground">
          {t(
            "This article isn't published and approved for the selected market.",
          )}
        </p>
        <Link
          to={`/learn/wall-finishing/${marketCode.toLowerCase()}/`}
          className="mt-4 inline-block text-sm font-semibold text-brand-purple hover:underline"
        >
          Back to the {marketName} library
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
        <p className="mt-3 text-sm text-red-600">
          {t("The article or its reviewed citations could not be loaded.")}
        </p>
      </div>
    );

  const readingTime =
    article.read_time_minutes ??
    Math.ceil(article.content.split(/\s+/).length / 200);
  const themeLabel =
    themeLabels[article.wall_article_theme ?? ""] ?? "Wall finishing";

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
          <Link
            to="/learn/"
            className="transition-colors hover:text-brand-purple"
          >
            {t("Learn")}
          </Link>
          <span className="text-muted-foreground/80">/</span>
          <Link
            to={`/learn/wall-finishing/${marketCode.toLowerCase()}/`}
            className="capitalize transition-colors hover:text-brand-purple"
          >
            {marketName} wall finishing
          </Link>
        </nav>

        <div className="flex gap-8 lg:gap-12">
          {/* Table of contents sidebar (desktop) */}
          {tableOfContents.length > 0 && (
            <aside className="hidden w-56 shrink-0 lg:block">
              <div className="sticky top-20">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" /> {t("Contents")}
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
                  {citations.length > 0 && (
                    <a
                      href="#sources"
                      className="block border-l-2 border-transparent py-1.5 pl-3 text-xs text-muted-foreground transition-colors hover:border-border hover:text-card-foreground dark:hover:text-muted-foreground/80"
                    >
                      {t("Sources")}
                    </a>
                  )}
                  {faqs.length > 0 && (
                    <a
                      href="#faqs"
                      className="block border-l-2 border-transparent py-1.5 pl-3 text-xs text-muted-foreground transition-colors hover:border-border hover:text-card-foreground dark:hover:text-muted-foreground/80"
                    >
                      {t("FAQs")}
                    </a>
                  )}
                </nav>
              </div>
            </aside>
          )}

          {/* Main article content */}
          <div className="min-w-0 flex-1">
            {/* Theme / market / language badges */}
            <div className="mb-5 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-purple">
                {themeLabel}
              </span>
              <span className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">
                {marketName}
              </span>
              <span className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">
                {article.wall_language_code ?? market?.language ?? "en"}
              </span>
            </div>

            {/* Header */}
            <header className="mb-10">
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground dark:text-primary-foreground sm:text-4xl lg:text-[2.75rem]">
                {article.title}
              </h1>
              {article.excerpt && (
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
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
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </span>
                )}
                <Button
                  variant="ghost"
                  onClick={shareArticle}
                  className="ml-auto flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-brand-purple/30 hover:text-brand-purple dark:border-white/10"
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

            {/* Content, premium prose styling (mirrors the Learn article page) */}
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
              <ArticleMarkdown content={article.content} />
            </div>

            {/* Sources reviewed — the editorial hallmark of market editions */}
            {citations.length > 0 && (
              <section id="sources" className="mt-14 scroll-mt-20">
                <div className="mb-6 flex items-center gap-3">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-brand-purple" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">
                      {t("Sources Reviewed")}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      References accepted for this {marketName} guidance
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {citations.map((c, idx) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/10"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-brand-purple">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-start gap-1.5 text-sm font-semibold text-brand-purple hover:underline"
                          >
                            {c.title}
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          </a>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {c.publisher}
                            {c.published_on ? ` · ${c.published_on}` : ""}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            Scope: {c.claim_scope}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FAQ Section */}
            {faqs.length > 0 && (
              <section id="faqs" className="mt-14 scroll-mt-20">
                <div className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-muted/50 to-card p-7 dark:border-white/10 dark:from-card dark:to-background sm:p-9">
                  <div className="mb-6">
                    <h2 className="font-display text-xl font-bold text-foreground dark:text-primary-foreground">
                      {t("Frequently Asked Questions")}
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {t("Quick answers to common questions about this topic")}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {faqs.map((faq, idx) => (
                      <div
                        key={faq.id}
                        className="overflow-hidden rounded-xl border border-border/80 bg-card transition-all dark:border-white/10 dark:bg-background"
                      >
                        <Button
                          variant="ghost"
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
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative">
                <h3 className="font-display text-xl font-bold text-foreground dark:text-primary-foreground">
                  Ready to start your project?
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Use FRELUX calculators to estimate materials, plan your
                  budget, and get professional results.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    to="/calculators/"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
                  >
                    {t("Try Our Calculators")}{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to={`/learn/wall-finishing/${marketCode.toLowerCase()}/`}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all hover:border-brand-purple/30 hover:shadow-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                  >
                    More {marketName} Guidance
                  </Link>
                </div>
              </div>
            </div>

            {/* Prev/Next navigation within the market edition */}
            {(prevArticle || nextArticle) && (
              <nav className="mt-12 grid gap-4 border-t border-border pt-8 sm:grid-cols-2 dark:border-white/10">
                {prevArticle ? (
                  <Link
                    to={`/learn/wall-finishing/${marketCode.toLowerCase()}/${prevArticle.slug}/`}
                    className="group flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-card"
                  >
                    <ArrowLeft
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-purple"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("Previous")}
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
                    to={`/learn/wall-finishing/${marketCode.toLowerCase()}/${nextArticle.slug}/`}
                    className="group flex items-center justify-end gap-4 rounded-2xl border border-border/80 bg-card p-5 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-card"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("Next")}
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

            {/* Back to market library */}
            <div className="mt-8">
              <Link
                to={`/learn/wall-finishing/${marketCode.toLowerCase()}/`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple transition-colors hover:text-brand-purple-dark hover:underline"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to the{" "}
                {marketName} library
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
                      Related {marketName} Guidance
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {t("More reviewed articles from this market edition")}
                    </p>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
                  {related.map((a) => (
                    <Link
                      key={a.id}
                      to={`/learn/wall-finishing/${marketCode.toLowerCase()}/${a.slug}/`}
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
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {themeLabels[a.wall_article_theme ?? ""] ??
                            "Wall finishing"}
                        </span>
                        <h3 className="mt-1 text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground">
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
          </div>
        </div>
      </article>
    </>
  );
}
