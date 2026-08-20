import Hero from '@/components/home/Hero';
import ToolsSection from '@/components/home/ToolsSection';
import ColorPreview from '@/components/home/ColorPreview';
import FeaturesSection from '@/components/home/FeaturesSection';
import TrendingColors from '@/components/home/TrendingColors';
import QuickCalculatorShortcuts from '@/components/ui/QuickCalculatorShortcuts';
import AdSlot from '@/components/ui/AdSlot';
import { WeatherWidget } from '@/components/ui/WeatherWidget';
import { useSeo } from '@/lib/seo';

export default function Home() {
  useSeo({
    title: 'FRELUX PAINT CALC — Plan Your Perfect Paint Project',
    description:
      'Calculate paint requirements, estimate painting costs, and discover color combinations that transform your space. Free paint calculator, cost estimator, and smart color assistant.',
    canonicalPath: '/',
    ogType: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'FRELUX PAINT CALC',
      applicationCategory: 'HomeAndGardenApplication',
      description:
        'Calculate paint requirements, estimate painting costs, and discover color combinations for your space.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
    },
  });

  return (
    <>
      <Hero />
      <QuickCalculatorShortcuts />
      <ToolsSection />
      <AdSlot slotKey="home_mid" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" />
      <TrendingColors />
      <ColorPreview />

      {/* Weather-aware painting scheduler */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <WeatherWidget />
        </div>
      </div>

      <FeaturesSection />
    </>
  );
}
