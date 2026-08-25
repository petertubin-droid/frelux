import { useState, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import CalculatorTabs from '@/components/ui/CalculatorTabs';
import PageHeader from '@/components/ui/PageHeader';
import { useSeo } from '@/lib/seo';
import { track } from '@/lib/analytics';
import { FaqSection, RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
import RelatedToolsLinks from '@/components/ui/RelatedToolsLinks';
import { EstimateDisclaimer } from '@/components/calculators';

const PopCeilingCalculator = lazy(() => import('@/pages/PopCeilingCalculator'));
const PopCeilingCostEstimator = lazy(() => import('@/pages/PopCeilingCostEstimator'));

const TABS = [
  { id: 'quantity', label: 'Material Quantity' },
  { id: 'cost', label: 'Cost Estimate' },
];

const FAQS = [
  { q: 'How does the FRELUX POP ceiling calculator work?', a: 'Enter your room dimensions to calculate ceiling area, then the calculator determines POP cement quantities, fibreglass mesh, and other materials needed. It supports both Nigerian and international POP ceiling workflows.' },
  { q: 'What is the difference between Material Quantity and Cost Estimate?', a: 'Material Quantity calculates POP cement, mesh, and material quantities for your ceiling. Cost Estimate adds real market prices for a complete cost breakdown including materials and waste.' },
  { q: 'Does the calculator support different POP ceiling types?', a: 'Yes. The calculator supports multiple POP ceiling workflows including standard Nigerian POP, international workflows, and different design patterns with admin-configured material requirements.' },
  { q: 'Can I save my POP ceiling calculations?', a: 'Yes. You can save calculations to your projects, export as PDF, and share via WhatsApp using the existing FRELUX functionality.' },
  { q: 'Are material prices in Nigerian Naira?', a: 'Yes. The FRELUX POP ceiling cost estimator uses real Nigerian market prices for POP cement, fibreglass mesh, and other materials.' },
];

export default function PopCeilingCalculatorHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'quantity';
  const [activeTab, setActiveTab] = useState(initialMode);

  useSeo({
    title: 'POP Ceiling Calculator — Material Quantity & Cost Estimate',
    description:
      'Free FRELUX POP ceiling calculator. Calculate POP cement, fibreglass mesh, and material quantities. Get a full cost estimate with real Nigerian market prices.',
    canonicalPath: '/pop-ceiling-calculator',
    ogType: 'website',
    keywords: 'POP ceiling calculator, plaster of paris, POP cement, POP ceiling material, POP ceiling cost Nigeria',
    structuredDataArray: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'FRELUX POP Ceiling Calculator',
        description: 'Calculate POP cement, fibreglass mesh, and material quantities. Get a full cost estimate with real Nigerian market prices.',
        url: 'https://freluxtools.netlify.app/pop-ceiling-calculator',
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
          { '@type': 'ListItem', 'position': 3, 'name': 'POP Ceiling Calculator', 'item': 'https://freluxtools.netlify.app/pop-ceiling-calculator' }
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
    track('calculator_tab_change', { calculator: 'pop_ceiling', mode: tabId });
  };

  return (
    <>
      <PageHeader
        eyebrow="Calculator"
        title="POP Ceiling Calculator"
        subtitle="Calculate POP ceiling material quantities, breakdown, and cost — all in one place."
        breadcrumbs={[{ label: 'Calculators', path: '/calculators' }, { label: 'POP Ceiling Calculator' }]}
      />
      <CalculatorTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} ariaLabel="POP ceiling calculator mode" />

      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="pt-2">
        <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-20 text-center text-neutral-400">Loading…</div>}>
          {activeTab === 'quantity' && <PopCeilingCalculator embedded />}
          {activeTab === 'cost' && <PopCeilingCostEstimator embedded />}
        </Suspense>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">About the FRELUX POP Ceiling Calculator</h2>
          <p className="text-neutral-600 dark:text-neutral-300">
            The FRELUX POP Ceiling Calculator is a comprehensive tool for planning plaster of paris (POP) ceiling projects.
            It combines material quantity calculation with cost estimation in one unified experience, supporting both
            Nigerian and international POP ceiling workflows.
          </p>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">Calculation Modes</h3>
          <ul>
            <li><strong>Material Quantity</strong> — Calculate POP cement, fibreglass mesh, and other material quantities based on your ceiling area and chosen workflow.</li>
            <li><strong>Cost Estimate</strong> — Get a full cost breakdown using real market prices for all POP ceiling materials including waste factors.</li>
          </ul>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">FRELUX/Nigerian POP Material Logic</h3>
          <p className="text-neutral-600 dark:text-neutral-300">
            The calculator uses established Nigerian POP material rules with admin-configured workflows, material
            requirements, and packaging sizes. Different ceiling designs and workflows have their own material
            breakdowns that reflect real Nigerian construction practices.
          </p>
        </div>

        <FaqSection faqs={FAQS} />
        <RelatedTools
          links={[
            CALC_LINKS.paintCalculator,
            CALC_LINKS.screedingCalc,
            CALC_LINKS.tileCalc,
            CALC_LINKS.finishEstimator,
            CALC_LINKS.buildToRoof,
          ]}
        />
        <RelatedToolsLinks />
        <EstimateDisclaimer />
      </section>
    </>
  );
}
