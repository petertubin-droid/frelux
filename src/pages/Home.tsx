import Hero from '@/components/home/Hero';
import HowItWorks from '@/components/home/HowItWorks';
import ToolsSection from '@/components/home/ToolsSection';
import ColorPreview from '@/components/home/ColorPreview';
import FeaturesSection from '@/components/home/FeaturesSection';
import TrendingColors from '@/components/home/TrendingColors';
import QuickCalculatorShortcuts from '@/components/ui/QuickCalculatorShortcuts';
import AdSlot from '@/components/ui/AdSlot';
import { WeatherWidget } from '@/components/ui/WeatherWidget';
import { RecentlyUsed } from '@/components/ui/RecentlyUsed';
import { AchievementBadges } from '@/components/ui/AchievementBadges';
import { useSeo } from '@/lib/seo';

export default function Home() {
  useSeo({
    title: 'FRELUX PAINT CALC — Plan Your Perfect Paint Project',
    description:
      'Calculate paint, screeding, POP ceiling, tiles, and finishing materials with real Nigerian market prices. Free calculators and cost estimators for construction projects.',
    canonicalPath: '/',
    ogType: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'FRELUX PAINT CALC',
      applicationCategory: 'HomeAndGardenApplication',
      description:
        'Calculate materials and estimate costs for Nigerian construction and finishing projects. Free paint, screeding, POP ceiling, tile, and finishing calculators.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
    },
  });

  return (
    <>
      {/* Hero — primary CTA "Start Calculating" immediately visible */}
      <Hero />

      {/* Quick access to most important calculators — above the fold */}
      <QuickCalculatorShortcuts />

      {/* Recently used tools — personalized quick access */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <RecentlyUsed />
      </div>

      {/* How FRELUX Works — 3-step process */}
      <HowItWorks />

      {/* All calculators organized by trade category */}
      <ToolsSection />

      {/* Trust signals + secondary CTAs */}
      <FeaturesSection />

      {/* Ad slot */}
      <AdSlot slotKey="home_mid" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" />

      {/* Color inspiration */}
      <TrendingColors />
      <ColorPreview />

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
    </>
  );
}
