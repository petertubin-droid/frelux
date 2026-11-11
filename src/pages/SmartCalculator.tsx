import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";
import CalculatorResetButton from "@/components/calculators/CalculatorResetButton";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";
import { QuoteShareButton } from "@/components/calculators/QuoteShareButton";
import { methodologyText } from "@/lib/calculatorMethodology";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import { useEffect, useMemo, useState } from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  Eraser,
} from "lucide-react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { RewardedFeatureGate } from "@/components/rewarded/RewardedFeatureGate";
import { AdvancedCalculator } from "@/components/rewarded/AdvancedCalculator";
import { useLanguage } from "@/lib/i18n";
import AdSlot from "@/components/ui/AdSlot";
import {
  buildProjectContext,
  readProject,
} from "@/lib/smart-calculator/project-intent";

const ADVANCED_FEATURES = [
  "AI-powered estimation for any project type",
  "Describe your project in natural language",
  "Automatic material quantity calculation",
  "Line-item cost breakdown",
  "Save, duplicate and compare estimates",
  "Export professional PDF quotations",
  "Cost-saving recommendations",
  "Tax/VAT calculator",
];

const STORAGE_KEY = "frelux_smart_project_description";

/** The shortest description that can name work and a size. Anything shorter
 *  cannot be read, and asking a paid model about it would be guesswork. */
const MIN_DESCRIPTION = 12;

const EXAMPLES = [
  "Paint a 4.5 m by 6 m bedroom, two coats, white emulsion",
  "Screed a 20 m2 living room at 50 mm",
  "POP ceiling for three rooms, 12 ft by 15 ft each",
  "Build a 3 bedroom bungalow, 15 m by 10 m",
];

function readSavedDescription(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function SmartCalculator() {
  const { t } = useLanguage();
  const [description, setDescription] = useState(readSavedDescription);

  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    {
      name: "Smart Calculator: AI-Powered Construction Estimator | FRELUX",
      path: "/smart-calculator",
    },
  ]);
  const seo = useSeo({
    title: "Smart Calculator: AI-Powered Construction Estimator | FRELUX",
    description:
      "Describe any construction project in plain language and get an AI-powered cost estimate with material quantities, line items, and savings recommendations. Free to use.",
    canonicalPath: "/smart-calculator",
  });

  const trimmed = description.trim();
  const usable = trimmed.length >= MIN_DESCRIPTION;

  // The reading is local and instant: it decides which calculator the project
  // belongs in before any paid call happens.
  const reading = useMemo(
    () => (usable ? readProject(trimmed) : null),
    [trimmed, usable],
  );
  const aiContext = useMemo(
    () => (usable ? buildProjectContext(trimmed) : ""),
    [trimmed, usable],
  );

  /** Start over blanks the described project, including the saved draft, so a
   *  reload does not bring back a job the visitor just cleared. */
  const resetInputs = () => setDescription("");

  const buildShareQuote = () =>
    reading
      ? {
          title: "FRELUX Smart Calculator Reading",
          metaRows: [
            ["Project type", reading.intent?.label ?? "not identified"],
            ["Calculator", reading.intent?.path ?? ""],
          ] as Array<[string, string]>,
          lines: reading.summaryLines.map((line) => ({
            label: line,
            quantity: "",
          })),
          totals: [],
          warnings: reading.missing.length
            ? [`Not stated yet: ${reading.missing.join(", ")}`]
            : [],
        }
      : null;

  useEffect(() => {
    try {
      if (trimmed) window.localStorage.setItem(STORAGE_KEY, trimmed);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable in private modes; the page still works.
    }
  }, [trimmed]);

  return (
    <>
      {seo}
      <PageHeader
        variant="tool"
        backTo="/"
        backLabel={t("Back to home")}
        eyebrow={t("Describe a project")}
        title={t("Smart Calculator")}
        subtitle={t(
          "Say what you are building in plain words. The assistant reads the project, names the right calculator and carries your measurements across, and every quantity still comes from the deterministic engine.",
        )}
      />

      <Container className="max-w-4xl pb-12 pt-8">
        {/* AI-powered badge banner */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="h-5 w-5 text-brand-purple" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground dark:text-primary-foreground">
              {t("AI-Powered Estimation")}
            </p>
            <p className="text-xs text-muted-foreground">
              Describe your project in plain English, the AI calculates material
              quantities, costs, and recommendations automatically. Supports
              screeding, painting, tiling, POP ceiling, and custom projects.
            </p>
          </div>
        </div>

        {/* Step 1. The description is the first thing on the page, because it
            is the only input this calculator has. */}
        <section
          aria-labelledby="smart-description-heading"
          className="rounded-2xl border border-border bg-card p-6 shadow-card"
        >
          <h2
            id="smart-description-heading"
            className="text-lg font-bold text-foreground"
          >
            {t("Your project")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Include the work, the size and the number of coats, layers or rooms where you know them. Measurements in metres or feet are both read.",
            )}
          </p>
          <label htmlFor="smart-description" className="sr-only">
            {t("Describe your project")}
          </label>
          <textarea
            id="smart-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder={t(
              "Example: paint a 4.5 m by 6 m bedroom, two coats of white emulsion",
            )}
            className="mt-3 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setDescription(example)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {example}
              </button>
            ))}
            {description && (
              <button
                type="button"
                onClick={() => setDescription("")}
                className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Eraser className="h-3 w-3" />
                {t("Clear")}
              </button>
            )}
          </div>
          {!usable && trimmed.length > 0 && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              {t(
                "Add a little more detail: what the work is and roughly how big it is.",
              )}
            </p>
          )}
        </section>

        {/* Step 2. What the description was read as, before any AI call. */}
        {reading && (
          <section
            aria-labelledby="smart-reading-heading"
            className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card"
          >
            <h2
              id="smart-reading-heading"
              className="flex items-center gap-2 text-lg font-bold text-foreground"
            >
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              {t("What that reads as")}
            </h2>

            {reading.intent ? (
              <div className="mt-3 rounded-xl border border-border/60 bg-muted/40 p-4">
                <p className="text-sm text-foreground">
                  {t("This work belongs in the")}{" "}
                  <strong>{reading.intent.label}</strong>.{" "}
                  {t(
                    "Open it with your measurements to get quantities: this page does not invent them.",
                  )}
                </p>
                <Link
                  to={reading.intent.path}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                >
                  {t("Open")} {reading.intent.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {t(
                  "No calculator matched that description yet. Name the work, for example painting, tiling, screeding, POP ceiling, roofing, wiring or blockwork.",
                )}
              </p>
            )}

            {reading.summaryLines.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm text-foreground">
                {reading.summaryLines.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}

            {reading.missing.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("Not stated yet")}: {reading.missing.join(", ")}.
              </p>
            )}
          </section>
        )}

        {/* Step 3. The paid AI panel, kept below the reading and only mounted
            once there is a real description to analyse. */}
        {usable ? (
          <div className="mt-6">
            <RewardedFeatureGate
              toolKey="advanced_calculator"
              featureName="Smart Calculator"
              features={ADVANCED_FEATURES}
            >
              {(access) => (
                <AdvancedCalculator
                  toolKey="smart"
                  contextSummary={aiContext}
                  clientHash={access.clientHash}
                />
              )}
            </RewardedFeatureGate>
          </div>
        ) : (
          <section className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 p-6">
            <h2 className="text-sm font-bold text-foreground">
              {t("Cost breakdown unlocks with a description")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Write what you are building above. Until then there is nothing to analyse, and a cost shown here would be guesswork.",
              )}
            </p>
            <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
              {ADVANCED_FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8">
          <Link
            to="/calculators"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("Browse every calculator")}
          </Link>
        </div>

        <div className="mt-6 space-y-3">
          <QuoteShareButton
            build={buildShareQuote}
            kind="Smart Calculator Reading"
            link="/smart-calculator"
          />
          <CalculatorResetButton onReset={resetInputs} />
          <HowCalculatedSection
            methodologyText={methodologyText("smart-calc")}
          />
        </div>

        {/* Ad slot, placement "calculator_mid" */}
        <AdSlot slotKey="calculator_mid" className="mt-8" />
        {/* Native banner slot, placement "calculator_native" */}
        <AdSlot slotKey="calculator_native" className="mt-8" />
      </Container>
      <div className="mt-10">
        <RelatedTools
          links={[
            CALC_LINKS.buildToRoof,
            CALC_LINKS.imageEstimator,
            CALC_LINKS.structuralCalc,
          ]}
        />
      </div>

      <EstimateDisclaimer />
    </>
  );
}
