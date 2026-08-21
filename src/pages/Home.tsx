import Hero from '@/components/home/Hero';
import ChooseProject from '@/components/home/ChooseProject';
import HowItWorks from '@/components/home/HowItWorks';
import ToolsSection from '@/components/home/ToolsSection';
import CommercialReadiness from '@/components/home/CommercialReadiness';
import ColorPreview from '@/components/home/ColorPreview';
import FeaturesSection from '@/components/home/FeaturesSection';
import TrendingColors from '@/components/home/TrendingColors';
import InteractiveEstimatePreview from '@/components/home/InteractiveEstimatePreview';
import TemplatesShowcase from '@/components/home/TemplatesShowcase';
import PWASection from '@/components/home/PWASection';
import FinalCTA from '@/components/home/FinalCTA';
import AdSlot from '@/components/ui/AdSlot';
import { WeatherWidget } from '@/components/ui/WeatherWidget';
import { RecentlyUsed } from '@/components/ui/RecentlyUsed';
import { AchievementBadges } from '@/components/ui/AchievementBadges';
import ProConnectHomeSection from '@/components/pro-connect/ProConnectHomeSection';
import { useState, useEffect, useMemo } from 'react';
import { useSeo } from '@/lib/seo';
import { getPublicTemplates } from '@/lib/templates';

export default function Home() {
  const [featuredSlugs, setFeaturedSlugs] = useState<{ name: string; slug: string; type: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPublicTemplates({ featuredOnly: true });
        setFeaturedSlugs(data.slice(0, 8).map((t) => ({ name: t.name, slug: t.slug ?? '', type: t.calculator_type })));
      } catch {
        // silently fail — structured data is enhancement, not critical
      }
    })();
  }, []);

  const structuredData = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'FRELUX PAINT CALC',
    applicationCategory: 'HomeAndGardenApplication',
    description:
      'Calculate materials and estimate costs for Nigerian construction and finishing projects. Free paint, screeding, POP ceiling, tile, and finishing calculators.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
    ...(featuredSlugs.length > 0
      ? {
          itemListElement: featuredSlugs.map((t, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: t.name,
            url: `https://freluxtools.netlify.app/templates/${t.slug}`,
          })),
        }
      : {}),
  }), [featuredSlugs]);

  useSeo({
    title: 'FRELUX PAINT CALC: Calculate Materials & Estimate Construction Costs',
    description:
      'Know exactly what materials your project needs. Free Nigerian construction calculators for paint, screeding, POP ceiling, tiles, and finishing. Estimate costs with real market prices.',
    canonicalPath: '/',
    ogType: 'website',
    structuredData,
  });

  return (
    <>
      {/* Hero — clear headline + interactive estimate preview */}
      <Hero />

      {/* Choose Your Project — 6 calculator cards immediately below hero */}
      <div className="bg-white dark:bg-brand-navy">
        <ChooseProject />
      </div>

      {/* Recently used tools — personalized quick access */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <RecentlyUsed />
      </div>

      {/* Interactive estimate preview — product demo with real calc engine */}
      <InteractiveEstimatePreview />

      {/* How FRELUX Works — 4-step process */}
      <HowItWorks />

      {/* Commercial readiness — more than calculators */}
      <CommercialReadiness />

      {/* All calculators organized by trade — premium product cards */}
      <ToolsSection />

      {/* FRELUX Pro Connect — find the right professional */}
      <ProConnectHomeSection />

      {/* Trust signals + why FRELUX */}
      <FeaturesSection />

      {/* Ad slot */}
      <AdSlot slotKey="home_mid" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" />

      {/* Saved calculations & templates showcase */}
      <TemplatesShowcase />

      {/* Color inspiration */}
      <TrendingColors />
      <ColorPreview />

      {/* PWA / mobile experience */}
      <PWASection />

      {/* Weather-aware painting scheduler */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <WeatherWidget />
        </div>
      </div>

      {/* Achievement badges — gamification */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AchievementBadges />
      </div>

      {/* Final CTA — strong closing */}
      <FinalCTA />
    </>
  );
}
