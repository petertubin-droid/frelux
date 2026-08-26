import { useState, useEffect, lazy, Suspense } from 'react';
import AdSlot from '@/components/ui/AdSlot';
import { useSearchParams } from 'react-router-dom';
import CalculatorTabs from '@/components/ui/CalculatorTabs';
import PageHeader from '@/components/ui/PageHeader';
import { useSeo } from '@/lib/seo';
import { track } from '@/lib/analytics';
import { FaqSection, RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
import RelatedToolsLinks from '@/components/ui/RelatedToolsLinks';
import { EstimateDisclaimer } from '@/components/calculators';

const TileCalculator = lazy(() => import('@/pages/TileCalculator'));
const TileCostEstimator = lazy(() => import('@/pages/TileCostEstimator'));

const TABS = [
  { id: 'quantity', label: 'Tile Quantity' },
  { id: 'cost', label: 'Cost Estimate' },
];

const FAQS = [
  { question: 'How does the FRELUX tile calculator work?', answer: 'Enter your floor or wall dimensions and select your tile size. The calculator determines the exact number of tiles needed, accounts for waste, recommends boxes, and calculates adhesive and grout requirements.' },
  { question: 'What is the difference between Tile Quantity and Cost Estimate?', answer: 'Tile Quantity calculates how many tiles, boxes, and bags of adhesive/grout you need. Cost Estimate adds real market prices for tiles, adhesive, grout, and accessories for a complete cost analysis.' },
  { question: 'Can I calculate tiles for both floors and walls?', answer: 'Yes. The calculator works for both floor and wall tiling projects. Just enter the appropriate dimensions and select your tile size.' },
  { question: 'Does the calculator account for waste?', answer: 'Yes. You can set a waste percentage to account for cuts, breakages, and pattern matching. The calculator includes waste tiles in the total recommendation.' },
  { question: 'Are tile prices in Nigerian Naira?', answer: 'Yes. The FRELUX tile cost estimator uses real Nigerian market prices for tiles, adhesive, grout, and accessories.' },
];

export default function TileCalculatorHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'quantity';
  const [activeTab, setActiveTab] = useState(initialMode);

  // Sync URL ?mode= changes to active tab (fixes calculator-to-calculator navigation)
  useEffect(() => {
    const mode = searchParams.get('mode') || 'quantity';
    if (mode !== activeTab) setActiveTab(mode);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useSeo({
    title: 'Tile Calculator — Tile Quantity, Boxes & Cost Estimate',
    description:
      'Free FRELUX tile calculator. Calculate tile quantity, boxes, adhesive, grout, and full installation cost with real Nigerian market prices.',
    canonicalPath: '/tile-calculator',
    ogType: 'website',
    keywords: 'tile calculator, how many tiles do I need, tile quantity calculator, tile cost estimator, floor tile calculator, wall tile calculator Nigeria',
    structuredDataArray: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'FRELUX Tile Calculator',
        description: 'Calculate tile quantity, boxes, adhesive, grout, and full installation cost with real Nigerian market prices.',
        url: 'https://freluxtools.netlify.app/tile-calculator',
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
          { '@type': 'ListItem', 'position': 3, 'name': 'Tile Calculator', 'item': 'https://freluxtools.netlify.app/tile-calculator' }
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
    track('calculator_tab_change', { calculator: 'tile', mode: tabId });
  };

  return (
    <>
      <PageHeader
        eyebrow="Calculator"
        title="Tile Calculator"
        subtitle="Calculate tile quantity, boxes, waste, adhesive, grout, and cost — all in one place."
        breadcrumbs={[{ label: 'Calculators', path: '/calculators' }, { label: 'Tile Calculator' }]}
      />
      <CalculatorTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} ariaLabel="Tile calculator mode" />

      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="pt-2">
        <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-20 text-center text-neutral-500">Loading…</div>}>
          {activeTab === 'quantity' && <TileCalculator embedded />}
          {activeTab === 'cost' && <TileCostEstimator embedded />}
        </Suspense>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">About the FRELUX Tile Calculator</h2>
          <p className="text-neutral-600 dark:text-neutral-300">
            The FRELUX Tile Calculator is a complete tiling project tool that combines tile quantity calculation
            with cost estimation. Whether you're tiling a floor, wall, bathroom, or kitchen, it handles all
            the calculations you need in one place.
          </p>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">Calculation Modes</h3>
          <ul>
            <li><strong>Tile Quantity</strong> — Enter your dimensions and tile size to get exact tile counts, box recommendations, waste calculations, and adhesive/grout requirements.</li>
            <li><strong>Cost Estimate</strong> — Get a full cost analysis with real market prices for tiles, adhesive, grout, and accessories, including labour cost options.</li>
          </ul>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">FRELUX Tiling Methodology</h3>
          <p className="text-neutral-600 dark:text-neutral-300">
            The calculator uses the established FRELUX tile calculation engine with admin-configured tile sizes,
            material requirements, and packaging sizes. It accounts for waste, breakage, pattern matching, and
            provides adhesive and grout quantities based on the surface area and tile type.
          </p>
        </div>

        <FaqSection faqs={FAQS} />
        <RelatedTools
          links={[
            CALC_LINKS.paintCalculator,
            CALC_LINKS.screedingCalc,
            CALC_LINKS.popCeilingCalc,
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
