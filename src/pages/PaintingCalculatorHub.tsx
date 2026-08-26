import { useState, lazy, Suspense } from 'react';
import AdSlot from '@/components/ui/AdSlot';
import { useSearchParams } from 'react-router-dom';
import CalculatorTabs from '@/components/ui/CalculatorTabs';
import PageHeader from '@/components/ui/PageHeader';
import { useSeo } from '@/lib/seo';
import { track } from '@/lib/analytics';
import { FaqSection, RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
import RelatedToolsLinks from '@/components/ui/RelatedToolsLinks';
import { EstimateDisclaimer } from '@/components/calculators';

const PaintCalculator = lazy(() => import('@/pages/PaintCalculator'));
const CostEstimator = lazy(() => import('@/pages/CostEstimator'));
const PaintingEstimator = lazy(() => import('@/pages/PaintingEstimator'));

const TABS = [
  { id: 'quantity', label: 'Paint Quantity' },
  { id: 'cost', label: 'Cost Estimate' },
  { id: 'room-estimate', label: 'Room Estimate' },
];

const FAQS = [
  { question: 'How does the FRELUX paint calculator work?', answer: 'Enter your room dimensions, doors, windows, and number of coats. The calculator uses the FRELUX methodology to determine paintable area, applies coverage rates per paint type, and recommends the exact number of containers you need.' },
  { question: 'What is the difference between Paint Quantity, Cost Estimate, and Room Estimate?', answer: 'Paint Quantity tells you how many litres and containers of paint you need. Cost Estimate adds real product pricing for a full material cost breakdown. Room Estimate is a detailed room-by-room painting estimator using the FRELUX Phase 2 engine with production rules, surface conditions, and colour conditions.' },
  { question: 'Does the calculator account for doors and windows?', answer: 'Yes. You can specify the number and dimensions of doors and windows, and they are automatically deducted from the paintable surface area.' },
  { question: 'Can I use this for exterior painting?', answer: 'Yes. Select the "Exterior" project type. The calculator adjusts coverage rates and material recommendations for outdoor surfaces.' },
  { question: 'Are the prices in Nigerian Naira?', answer: 'Yes. The FRELUX Cost Estimator uses real product prices sourced from the Nigerian market. You can also switch currencies for international use.' },
];

export default function PaintingCalculatorHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'quantity';
  const [activeTab, setActiveTab] = useState(initialMode);

  useSeo({
    title: 'Painting Calculator — Paint Quantity, Cost & Room Estimate',
    description:
      'Free FRELUX painting calculator. Calculate paint quantities, estimate painting costs, and get room-by-room painting estimates with real Nigerian material prices.',
    canonicalPath: '/paint-calculator',
    ogType: 'website',
    keywords: 'paint calculator, painting estimator, paint cost estimator, paint quantity, how much paint do I need, painting cost Nigeria',
    structuredDataArray: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'FRELUX Painting Calculator',
        description: 'Calculate paint quantities, estimate painting costs, and get room-by-room painting estimates with real Nigerian material prices.',
        url: 'https://freluxtools.netlify.app/paint-calculator',
        applicationCategory: 'CalculatorApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://freluxtools.netlify.app' },
          { '@type': 'ListItem', 'position': 2, 'name': 'Calculators', 'item': 'https://freluxtools.netlify.app/calculators' },
          { '@type': 'ListItem', 'position': 3, 'name': 'Painting Calculator', 'item': 'https://freluxtools.netlify.app/paint-calculator' }
        ]
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
    ],
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ mode: tabId }, { replace: true });
    track('calculator_tab_change', { calculator: 'painting', mode: tabId });
  };

  return (
    <>
      <PageHeader
        eyebrow="Calculator"
        title="Painting Calculator"
        subtitle="Calculate paint quantities, painting requirements, and estimated costs — all in one place."
        breadcrumbs={[{ label: 'Calculators', path: '/calculators' }, { label: 'Painting Calculator' }]}
      />
      <CalculatorTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} ariaLabel="Painting calculator mode" />

      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="pt-2">
        <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-20 text-center text-neutral-500">Loading…</div>}>
          {activeTab === 'quantity' && <PaintCalculator embedded />}
          {activeTab === 'cost' && <CostEstimator embedded />}
          {activeTab === 'room-estimate' && <PaintingEstimator embedded />}
        </Suspense>
      </div>

      {/* SEO Content */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">About the FRELUX Painting Calculator</h2>
          <p className="text-neutral-600 dark:text-neutral-300">
            The FRELUX Painting Calculator is a comprehensive tool for anyone planning a painting project in Nigeria.
            It consolidates three essential painting calculations into one unified experience:
          </p>
          <ul>
            <li><strong>Paint Quantity</strong> — Calculate exactly how many litres of paint you need based on wall area, doors, windows, and coats.</li>
            <li><strong>Cost Estimate</strong> — Get a full cost breakdown using real product prices for paint, primer, putty, and materials.</li>
            <li><strong>Room Estimate</strong> — A detailed room-by-room painting estimator using the FRELUX Phase 2 engine with production rules, surface conditions, and colour conditions.</li>
          </ul>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">FRELUX Painting Methodology</h3>
          <p className="text-neutral-600 dark:text-neutral-300">
            FRELUX uses a proprietary calculation methodology that accounts for wall surface conditions, colour conditions,
            paint type coverage rates, and waste factors specific to Nigerian construction environments.
            The engine applies admin-configured production rules, mix ratios, and material packaging sizes to produce
            bucket-level accuracy — not just generic m²-per-litre estimates.
          </p>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">Nigerian Construction Context</h3>
          <p className="text-neutral-600 dark:text-neutral-300">
            All calculations are tuned for the Nigerian market with local product prices, standard room dimensions,
            and materials commonly available from Nigerian building material suppliers.
          </p>
        </div>

        <FaqSection faqs={FAQS} />
        <RelatedTools
          links={[
            CALC_LINKS.screedingCalc,
            CALC_LINKS.popCeilingCalc,
            CALC_LINKS.tileCalc,
            CALC_LINKS.finishEstimator,
            CALC_LINKS.buildToRoof,
            CALC_LINKS.aiColor,
          ]}
        />
        <RelatedToolsLinks />
        <AdSlot slotKey="calculator_hub_bottom" className="mt-8" />
        <EstimateDisclaimer />
      </section>
    </>
  );
}
