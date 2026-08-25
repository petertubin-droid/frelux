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

const ScreedingCalculator = lazy(() => import('@/pages/ScreedingCalculator'));
const ScreedingCostEstimator = lazy(() => import('@/pages/ScreedingCostEstimator'));

const TABS = [
  { id: 'quantity', label: 'Screeding Quantity' },
  { id: 'cost', label: 'Cost Estimate' },
];

const FAQS = [
  { q: 'How does the FRELUX screeding calculator work?', a: 'Enter your room or wall dimensions, including doors and windows. The calculator determines the exact wall surface area that needs screeding in m², then calculates material requirements (cement, sand, bonding agents) based on the FRELUX mix configuration.' },
  { q: 'Can I calculate screeding for fences?', a: 'Yes. You can enter fence dimensions in either feet or metres. The calculator converts the surface area to m² for accurate material calculation.' },
  { q: 'What is the difference between Screeding Quantity and Cost Estimate?', a: 'Screeding Quantity calculates the wall surface area and material requirements. Cost Estimate adds real market prices for cement, sand, and bonding agents to give you a full cost breakdown.' },
  { q: 'Does the calculator account for doors and windows?', a: 'Yes. Doors and windows are automatically deducted from the total wall surface area to give you the net screeding area.' },
  { q: 'Are material prices in Nigerian Naira?', a: 'Yes. The FRELUX screeding cost estimator uses real Nigerian market prices for cement, sand, and other screeding materials.' },
];

export default function ScreedingCalculatorHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'quantity';
  const [activeTab, setActiveTab] = useState(initialMode);

  useSeo({
    title: 'Screeding Calculator — Wall Screeding Quantity & Cost',
    description:
      'Free FRELUX screeding calculator. Calculate wall screeding surface area in m², material requirements, and cost estimates with real Nigerian market prices.',
    canonicalPath: '/screeding-calculator',
    ogType: 'website',
    keywords: 'screeding calculator, wall screeding, screeding cost estimator, screeding quantity, screeding material calculator Nigeria',
    structuredDataArray: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'FRELUX Screeding Calculator',
        description: 'Calculate wall screeding surface area in m², material requirements, and cost estimates with real Nigerian market prices.',
        url: 'https://freluxtools.netlify.app/screeding-calculator',
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
          { '@type': 'ListItem', 'position': 3, 'name': 'Screeding Calculator', 'item': 'https://freluxtools.netlify.app/screeding-calculator' }
        ]
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ mode: tabId }, { replace: true });
    track('calculator_tab_change', { calculator: 'screeding', mode: tabId });
  };

  return (
    <>
      <PageHeader
        eyebrow="Calculator"
        title="Screeding Calculator"
        subtitle="Calculate wall screeding quantity, material requirements, and cost — all in one place."
        breadcrumbs={[{ label: 'Calculators', path: '/calculators' }, { label: 'Screeding Calculator' }]}
      />
      <CalculatorTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} ariaLabel="Screeding calculator mode" />

      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="pt-2">
        <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-20 text-center text-neutral-400">Loading…</div>}>
          {activeTab === 'quantity' && <ScreedingCalculator embedded />}
          {activeTab === 'cost' && <ScreedingCostEstimator embedded />}
        </Suspense>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">About the FRELUX Screeding Calculator</h2>
          <p className="text-neutral-600 dark:text-neutral-300">
            The FRELUX Screeding Calculator combines screeding surface area calculation with material cost estimation
            in a single unified tool. Whether you're screeding interior walls or exterior fences, it handles both
            metric and imperial measurements and converts everything to m² for accurate material calculation.
          </p>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">Calculation Modes</h3>
          <ul>
            <li><strong>Screeding Quantity</strong> — Enter room or wall dimensions to calculate the net screeding surface area in m², with doors and windows deducted.</li>
            <li><strong>Cost Estimate</strong> — Get a full material cost breakdown including cement, sand, and bonding agents at real Nigerian market prices.</li>
          </ul>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">FRELUX Screeding Methodology</h3>
          <p className="text-neutral-600 dark:text-neutral-300">
            Screeding quantities are calculated in m² according to established FRELUX rules. The calculator uses
            admin-configured mix ratios and material packaging sizes to produce accurate material quantities —
            not generic m²-per-bag estimates. For fences, the calculator accepts dimensions in feet or metres
            and converts the resulting surface area to m² before applying material calculations.
          </p>
        </div>

        <FaqSection faqs={FAQS} />
        <RelatedTools
          links={[
            CALC_LINKS.paintCalculator,
            CALC_LINKS.popCeilingCalc,
            CALC_LINKS.tileCalc,
            CALC_LINKS.finishEstimator,
            CALC_LINKS.buildToRoof,
          ]}
        />
        <RelatedToolsLinks />
        <AdSlot slotKey="calculator_hub_bottom" className="mt-8" />
        <EstimateDisclaimer />
      </section>
    </>
  );
}
