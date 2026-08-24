import { useState, useEffect } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { formatNumber } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { logAnalyticsEvent } from '@/lib/queries';
import { useCalcDefaults } from '@/lib/use-calc-defaults';
import { HowCalculatedSection, EstimateDisclaimer, ReportCalculationIssue } from '@/components/calculators';
import CalculatorNearMe from '@/components/calculators/CalculatorNearMe';
import { useSeo } from '@/lib/seo';
import { RelatedTools, CALC_LINKS } from '@/components/seo/SeoSections';
import RelatedToolsLinks from '@/components/ui/RelatedToolsLinks';

// Unified measurement system
import { MeasurementInput, CalculationBreakdown, ValidationErrors } from '@/components/measurement/MeasurementInput';
import {
  useMeasurementProject,
  type ProjectMode,
} from '@/lib/measurement';

export default function ScreedingCalculator() {
  useCalcDefaults('screeding');
  useSeo({
    title: 'Wall Screeding Calculator — How Much Screeding Do I Need?',
    description:
      'Free wall screeding calculator. Enter your room or wall dimensions, doors, and windows to calculate the exact wall area that needs screeding.',
    canonicalPath: '/screeding-calculator',
    ogType: 'website',
    structuredDataArray: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'FRELUX Wall Screeding Calculator',
        applicationCategory: 'BusinessApplication',
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
      }
    ],
  });

  const {
    project,
    validation,
    addMeasurement,
    updateMeasurement,
    removeMeasurement,
    resetWithMode,
    calculate,
  } = useMeasurementProject({
    calculatorContext: 'screeding',
    preferredUnit: 'meters',
    projectMode: 'single_room',
  });

  const [screedingResult, setScreedingResult] = useState<{
    totalAreaM2: number;
    steps: { label: string; formula: string; value: string }[];
  } | null>(null);

  useEffect(() => {
    track('screeding_calculator_opened', {});
    logAnalyticsEvent('screeding_calculator_opened', {});
  }, []);

  function handleCalculate() {
    if (!validation.valid) return;
    const projectResult = calculate();
    setScreedingResult({
      totalAreaM2: projectResult.totalAreaM2,
      steps: projectResult.steps,
    });
    track('screeding_calculation_completed', {
      totalArea: projectResult.totalAreaM2,
      mode: project.projectMode,
    });
    logAnalyticsEvent('screeding_calculation_completed', {
      totalArea: projectResult.totalAreaM2,
      mode: project.projectMode,
    });
  }

  function startOver() {
    resetWithMode(project.projectMode);
    setScreedingResult(null);
  }

  function handleModeChange(mode: ProjectMode) {
    resetWithMode(mode);
    setScreedingResult(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Tool"
        title="Wall Screeding Calculator"
        subtitle="Calculate the exact wall surface area that needs screeding. Enter room dimensions in feet or metres — we handle the conversion."
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Calculators', path: '/calculators' }, { label: 'Screeding Calculator' }] }
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {!screedingResult && (
          <div className="card p-6 sm:p-8 dark:border-white/5 dark:bg-brand-navy-mid space-y-6">
            <MeasurementInput
              project={project}
              context="screeding"
              validation={validation}
              onProjectModeChange={handleModeChange}
              onAddMeasurement={addMeasurement}
              onUpdateMeasurement={updateMeasurement}
              onRemoveMeasurement={removeMeasurement}
            >
              {project.projectMode === 'fence' && (
                <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Fence Screeding</p>
                  Each fence dimension has its own partition count. The area is calculated as:
                  partition length × height × number of partitions. All results are in m².
                </div>
              )}
              {project.projectMode === 'house_building' && (
                <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">House / Building</p>
                  Add each space type separately. Use quantity for identical rooms
                  (e.g., 12×12 ft bedroom × 2). Different dimensions stay as separate measurements.
                </div>
              )}
            </MeasurementInput>

            <button
              type="button"
              onClick={handleCalculate}
              disabled={!validation.valid}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              Calculate Screeding Area
            </button>
          </div>
        )}

        {screedingResult && (
          <div className="card p-6 sm:p-8 dark:border-white/5 dark:bg-brand-navy-mid space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <h2 className="text-lg font-bold text-brand-navy dark:text-white">Screeding Area Result</h2>
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">Total Screeding Area</p>
              <p className="mt-2 text-4xl font-bold text-primary">
                {formatNumber(screedingResult.totalAreaM2, 2)} m²
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Surface area in square metres
              </p>
            </div>

            <CalculationBreakdown steps={screedingResult.steps} />

            <div className="rounded-lg bg-muted/30 border border-border p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Next Step</p>
              This area feeds into the FRELUX screeding material calculation rules,
              which determine material quantity based on coverage rate and package configuration.
            </div>

            <button
              type="button"
              onClick={startOver}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Start Over
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
        <HowCalculatedSection
          title="How Screeding Area Is Calculated"
          steps={[
            { label: 'Enter dimensions', description: 'Input your room length, width, and wall height in feet or metres.' },
            { label: 'Normalise to metres', description: 'Your input is converted to metres using exact international conversion factors (1 ft = 0.3048 m).' },
            { label: 'Calculate wall area', description: 'Wall area = perimeter × height. The perimeter is 2 × (length + width) for a full room.' },
            { label: 'Apply deductions', description: 'Door and window openings are subtracted from the gross wall area.' },
            { label: 'Result in m²', description: 'The final screeding area is always expressed in square metres.' },
          ]}
        />
        <EstimateDisclaimer />
        <ReportCalculationIssue calculatorName="screeding-calculator" />
        <CalculatorNearMe calculatorName="Screeding" />

        <div className="mt-8">
          <RelatedTools current="/screeding-calculator" links={CALC_LINKS} />
        </div>
        <div className="mt-6">
          <RelatedToolsLinks />
        </div>
      </div>
    </>
  );
}
