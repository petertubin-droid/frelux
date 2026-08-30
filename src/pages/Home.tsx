import Hero from "@/components/home/Hero";
import ChooseProject from "@/components/home/ChooseProject";
import HowItWorks from "@/components/home/HowItWorks";
const ToolsSection = lazy(() => import("@/components/home/ToolsSection"));
const CommercialReadiness = lazy(
  () => import("@/components/home/CommercialReadiness"),
);
const ColorPreview = lazy(() => import("@/components/home/ColorPreview"));
const FeaturesSection = lazy(() => import("@/components/home/FeaturesSection"));
const TrendingColors = lazy(() => import("@/components/home/TrendingColors"));
const InteractiveEstimatePreview = lazy(
  () => import("@/components/home/InteractiveEstimatePreview"),
);
const TemplatesShowcase = lazy(
  () => import("@/components/home/TemplatesShowcase"),
);
const PWASection = lazy(() => import("@/components/home/PWASection"));
const FinalCTA = lazy(() => import("@/components/home/FinalCTA"));
import AdSlot from "@/components/ui/AdSlot";
import { WeatherWidget } from "@/components/ui/WeatherWidget";
import { RecentlyUsed } from "@/components/ui/RecentlyUsed";
import { AchievementBadges } from "@/components/ui/AchievementBadges";
import ProConnectHomeSection from "@/components/pro-connect/ProConnectHomeSection";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useSeo } from "@/lib/seo";
import { getPublicTemplates } from "@/lib/templates";
import { Link } from "react-router-dom";
import { ShoppingBag, Plus } from "lucide-react";

// Reserves approximate vertical space for a below-the-fold lazy section
// while its chunk loads, so it doesn't shove later content down when it
// pops in (prevents Cumulative Layout Shift from Suspense fallback={null}).
function SectionSkeleton({ minHeight }: { minHeight: number }) {
  return (
    <div
      style={{ minHeight }}
      className="animate-pulse bg-neutral-50 dark:bg-brand-navy-mid"
      aria-hidden="true"
    />
  );
}

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
        // silently fail — structured data is enhancement, not critical
      }
    })();
  }, []);

  const structuredData = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FRELUX PAINT CALC",
        applicationCategory: "HomeAndGardenApplication",
        description:
          "Calculate materials and estimate costs for Nigerian construction and finishing projects. Free paint, screeding, POP ceiling, tile, and finishing calculators.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
        ...(featuredSlugs.length > 0
          ? {
              itemListElement: featuredSlugs.map((t, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: t.name,
                url: `https://freluxtools.netlify.app/templates/${t.slug}`,
              })),
            }
          : {}),
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "FRELUX PAINT CALC",
        url: "https://freluxtools.netlify.app",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate:
              "https://freluxtools.netlify.app/calculators?q={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
    [featuredSlugs],
  );

  useSeo({
    title:
      "FRELUX PAINT CALC: Calculate Materials & Estimate Construction Costs",
    description:
      "Know exactly what materials your project needs. Free Nigerian construction calculators for paint, screeding, POP ceiling, tiles, and finishing. Estimate costs with real market prices.",
    canonicalPath: "/",
    ogType: "website",
    keywords:
      "paint calculator Nigeria, construction cost estimator, screeding calculator, POP ceiling calculator, tile calculator, building materials calculator, Nigerian construction, paint cost estimator, build to roof estimator, Pro Connect Nigeria",
    structuredDataArray: structuredData,
  });

  return (
    <>
      {/* Hero — clear headline + interactive estimate preview */}
      <Hero />

      {/* Choose Your Project — 6 calculator cards immediately below hero */}
      <section
        id="calculators"
        aria-label="Calculators"
        className="bg-white dark:bg-brand-navy"
      >
        <ChooseProject />
      </section>

      {/* Recently used tools — personalized quick access */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <RecentlyUsed />
      </div>

      {/* Interactive estimate preview — product demo with real calc engine */}
      <Suspense fallback={<SectionSkeleton minHeight={600} />}>
        <InteractiveEstimatePreview />
      </Suspense>

      {/* How FRELUX Works — 4-step process */}
      <HowItWorks />

      {/* Commercial readiness — more than calculators */}
      <Suspense fallback={<SectionSkeleton minHeight={500} />}>
        <CommercialReadiness />
      </Suspense>

      {/* All calculators organized by trade — premium product cards */}
      <Suspense fallback={<SectionSkeleton minHeight={700} />}>
        <ToolsSection />
      </Suspense>

      {/* FRELUX Pro Connect — find the right professional */}
      <ProConnectHomeSection />

      {/* Marketplace CTA — post a job and get bids */}
      <section
        aria-label="FRELUX Marketplace"
        className="bg-neutral-50 py-16 dark:bg-brand-navy-mid sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-medium text-brand-purple dark:text-brand-purple-lighter">
              <ShoppingBag aria-hidden="true" className="h-3.5 w-3.5" />
              FRELUX Marketplace
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
              Post a Job & Get Bids from Verified Pros
            </h2>
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500 sm:text-base">
              Run a calculation, post it as a job, and receive competitive bids
              from verified construction professionals in your area.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/marketplace"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-purple px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-purple-dark sm:w-auto"
              >
                <ShoppingBag aria-hidden="true" className="h-4 w-4" /> Browse
                Jobs
              </Link>
              <Link
                to="/marketplace/post"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-neutral-200 dark:hover:border-brand-purple-lighter dark:hover:text-brand-purple-lighter sm:w-auto"
              >
                <Plus aria-hidden="true" className="h-4 w-4" /> Post a Job
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals + why FRELUX */}
      <Suspense fallback={<SectionSkeleton minHeight={420} />}>
        <FeaturesSection />
      </Suspense>

      {/* Ad slot */}
      <AdSlot
        slotKey="home_mid"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      />

      {/* Saved calculations & templates showcase */}
      <Suspense fallback={<SectionSkeleton minHeight={500} />}>
        <TemplatesShowcase />
      </Suspense>

      {/* Color inspiration */}
      <Suspense fallback={<SectionSkeleton minHeight={500} />}>
        <TrendingColors />
      </Suspense>
      <Suspense fallback={<SectionSkeleton minHeight={450} />}>
        <ColorPreview />
      </Suspense>

      {/* PWA / mobile experience */}
      <Suspense fallback={<SectionSkeleton minHeight={450} />}>
        <PWASection />
      </Suspense>

      {/* Weather-aware painting scheduler */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* min-height reserves space across the widget's loading/error/success
            states so its own internal transitions don't shift page content */}
        <div className="mx-auto min-h-[300px] max-w-md">
          <WeatherWidget />
        </div>
      </div>

      {/* Achievement badges — gamification */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AchievementBadges />
      </div>

      {/* Final CTA — strong closing */}
      <Suspense fallback={<SectionSkeleton minHeight={320} />}>
        <FinalCTA />
      </Suspense>
    </>
  );
}
