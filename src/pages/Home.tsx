import Hero from "@/components/home/Hero";
import ChooseProject from "@/components/home/ChooseProject";
import HowItWorks from "@/components/home/HowItWorks";
const ToolsSection = lazy(() => import("@/components/home/ToolsSection"));
const FeaturesSection = lazy(() => import("@/components/home/FeaturesSection"));
const TestimonialsSection = lazy(
  () => import("@/components/home/TestimonialsSection"),
);
const InteractiveEstimatePreview = lazy(
  () => import("@/components/home/InteractiveEstimatePreview"),
);
const AiToolsSection = lazy(() => import("@/components/home/AiToolsSection"));
const FinalCTA = lazy(() => import("@/components/home/FinalCTA"));
import AdSlot from "@/components/ui/AdSlot";
import CrossPromoSlot from "@/components/houseAds/CrossPromoSlot";
import { RecentlyUsed } from "@/components/ui/RecentlyUsed";
import ProConnectHomeSection from "@/components/pro-connect/ProConnectHomeSection";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useSeo } from "@/lib/seo";
import { FaqSection } from "@/components/seo/SeoSections";
import { faqSchema } from "@/lib/structured-data";

const HOME_FAQS = [
  {
    question: "Is FRELUX free to use?",
    answer:
      "Yes. Every calculator, estimator, and guide is free, with no trial or paywall. The platform is supported by advertising in clearly labeled slots, and no calculation or estimate is ever influenced by an advertiser.",
  },
  {
    question: "How accurate are the estimates?",
    answer:
      "Calculators use industry-standard formulas for surface area, coverage rates, waste allowance, and labour, and every estimate shows its full breakdown so you can verify each number. Estimates are guidance, not a guarantee, so confirm final quantities and prices with your supplier or contractor before you commit money.",
  },
  {
    question: "Do I need an account?",
    answer:
      "No. All public tools run directly in your browser without sign-up. Creating a free account only adds extras like saved projects, templates, and client estimates.",
  },
  {
    question: "Can I use FRELUX outside Nigeria?",
    answer:
      "Yes. The calculation methodology works for any project anywhere, and prices are adjustable to your local market. Where we hold verified market data, estimators can load it automatically; everywhere else, you enter your own rates.",
  },
  {
    question: "Can contractors use the estimates with clients?",
    answer:
      "Yes. Estimates and bills of quantities can be exported, printed, or shared with a client through a link, so you can present a transparent, itemized number instead of a single figure.",
  },
  {
    question: "Who writes the guides in the Learn Hub?",
    answer:
      "Guides are written and reviewed by the FRELUX Team, with practical construction detail and honest numbers, and no sponsored content. When prices or products change, guides are reviewed again. You can report an error from any article.",
  },
];

import { getPublicTemplates } from "@/lib/templates";
import { Link } from "react-router-dom";
import { ShoppingBag, Plus } from "lucide-react";
import { SITE_URL } from "@/lib/seo";

// Reserves approximate vertical space for a below-the-fold lazy section
// while its chunk loads, so it doesn't shove later content down when it
// pops in (prevents Cumulative Layout Shift from Suspense fallback={null}).
function SectionSkeleton({ minHeight }: { minHeight: number }) {
  return (
    <div
      style={{ minHeight }}
      className="animate-pulse bg-muted/50 dark:bg-card"
      aria-hidden="true"
    />
  );
}

/**
 * Professional homepage: one story, told in order.
 *
 * What FRELUX is (Hero) → try it immediately (project chooser, live
 * estimate preview) → how it works → everything inside (tools grid) →
 * who it connects (Pro Connect, Marketplace) → why to trust it
 * (features/trust signals) → act (final CTA).
 *
 * Discovery content (templates, colors, commercial readiness, PWA,
 * weather scheduler, achievements) lives on its own pages, where it
 * is deeper and more useful than a homepage strip ever could be.
 */
export default function Home() {
  const [featuredSlugs, setFeaturedSlugs] = useState<
    { name: string; slug: string; type: string }[]
  >([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPublicTemplates({ featuredOnly: true });
        setFeaturedSlugs(
          data.slice(0, 8).map((t) => ({
            name: t.name,
            slug: t.slug ?? "",
            type: t.calculator_type,
          })),
        );
      } catch {
        // silently fail, structured data is enhancement, not critical
      }
    })();
  }, []);

  const structuredData = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FRELUX",
        applicationCategory: "HomeAndGardenApplication",
        description:
          "Calculate materials and estimate costs for construction projects worldwide. Free calculators for every trade, full-building estimating, AI photo estimates, and professional BOQs.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
        ...(featuredSlugs.length > 0
          ? {
              itemListElement: featuredSlugs.map((t, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: t.name,
                url: `${SITE_URL}/templates/${t.slug}`,
              })),
            }
          : {}),
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "FRELUX",
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/calculators?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      faqSchema(HOME_FAQS),
    ],
    [featuredSlugs],
  );

  useSeo({
    title:
      "FRELUX: Construction Calculators, Cost Estimators & AI Building Tools",
    description:
      "Know exactly what your build needs. Free construction calculators and cost estimators for every trade: paint, tiles, structure, solar, and full builds: with AI photo estimating, BOQs, and verified market prices in multiple languages.",
    canonicalPath: "/",
    ogType: "website",
    keywords:
      "paint calculator, construction cost estimator, screeding calculator, POP ceiling calculator, tile calculator, building materials calculator, construction estimating, paint cost estimator, build to roof estimator, Pro Connect",
    structuredDataArray: structuredData,
  });

  return (
    <>
      {/* What FRELUX is: clear headline + primary CTA */}
      <Hero />

      {/* Try it: 6 calculator cards immediately below hero */}
      <section
        id="calculators"
        aria-label="Calculators"
        className="bg-card dark:bg-background"
      >
        <ChooseProject />
      </section>

      {/* Recently used tools, personalized quick access */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <RecentlyUsed />
      </div>

      {/* Proof, not promises: live demo with the real calc engine */}
      <Suspense fallback={<SectionSkeleton minHeight={600} />}>
        <InteractiveEstimatePreview />
      </Suspense>

      {/* AI powered tools: photo counting, natural-language estimating */}
      <Suspense fallback={<SectionSkeleton minHeight={400} />}>
        <AiToolsSection />
      </Suspense>

      {/* Ad slot, placement "home_top" */}
      <AdSlot
        slotKey="home_top"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      />

      {/* How FRELUX Works, 4-step process */}
      <HowItWorks />

      {/* Native banner slot, placement "home_native" */}
      <AdSlot
        slotKey="home_native"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      />

      {/* Everything inside: all calculators organized by trade */}
      <Suspense fallback={<SectionSkeleton minHeight={700} />}>
        <ToolsSection />
      </Suspense>

      {/* Native banner slot, placement "home_native_2" */}
      <AdSlot
        slotKey="home_native_2"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      />

      {/* Who it connects: hire a verified professional */}
      <ProConnectHomeSection />

      {/* Marketplace CTA, post a job and get bids */}
      <section
        aria-label="FRELUX Marketplace"
        className="bg-muted/50 py-16 dark:bg-card sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-brand-purple dark:text-brand-purple-lighter">
              <ShoppingBag aria-hidden="true" className="h-3.5 w-3.5" />
              FRELUX Marketplace
            </div>
            <h2 className="text-2xl font-bold text-foreground dark:text-primary-foreground sm:text-3xl">
              Post a Job & Get Bids from Verified Pros
            </h2>
            <p className="mt-3 text-sm text-muted-foreground dark:text-muted-foreground sm:text-base">
              Run a calculation, post it as a job, and receive competitive bids
              from verified construction professionals in your area.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/marketplace/"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
              >
                <ShoppingBag aria-hidden="true" className="h-4 w-4" /> Browse
                Jobs
              </Link>
              <Link
                to="/marketplace/post/"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-card-foreground transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground/60 dark:hover:border-brand-purple-lighter dark:hover:text-brand-purple-lighter sm:w-auto"
              >
                <Plus aria-hidden="true" className="h-4 w-4" /> Post a Job
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why trust FRELUX: trust signals */}
      <Suspense fallback={<SectionSkeleton minHeight={420} />}>
        <FeaturesSection />
      </Suspense>

      {/* Real user testimonials: renders nothing until admin adds
          genuine quotes to site_testimonials */}
      <Suspense fallback={null}>
        <TestimonialsSection />
      </Suspense>

      {/* Cross-site house promo */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <CrossPromoSlot slotIndex={0} source="home_1" />
      </div>

      {/* Ad slot, placement "home_bottom" */}
      <AdSlot
        slotKey="home_bottom"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      />

      {/* AdSense-dedicated homepage slot: locked to google_adsense only
          (owner directive 2026-10-10). Label "Google". */}
      <AdSlot
        slotKey="adsense_home"
        providerSlug="google_adsense"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      />

      {/* FAQ with structured data */}
      <FaqSection faqs={HOME_FAQS} />

      {/* Final CTA, strong closing */}
      <Suspense fallback={<SectionSkeleton minHeight={320} />}>
        <FinalCTA />
      </Suspense>
    </>
  );
}
