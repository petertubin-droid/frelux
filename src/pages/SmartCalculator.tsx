import HeroTitle from "@/components/ui/HeroTitle";
import { Link } from "react-router-dom";
import { ArrowLeft, Brain } from "lucide-react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { RewardedFeatureGate } from "@/components/rewarded/RewardedFeatureGate";
import { AdvancedCalculator } from "@/components/rewarded/AdvancedCalculator";

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

export default function SmartCalculator() {
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

  return (
    <>
      {seo}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-purple dark:text-muted-foreground"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to home
        </Link>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-brand-purple/20">
            <Brain className="h-7 w-7 text-primary-foreground" />
          </div>
          <HeroTitle
            className="text-3xl text-foreground dark:text-primary-foreground"
            title="Smart Calculator"
          />
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Brain className="h-4 w-4 text-brand-purple" aria-hidden="true" />
            Powered by AI, describe any project, get an instant estimate
          </p>
        </div>

        {/* AI-powered badge banner */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="h-5 w-5 text-brand-purple" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground dark:text-primary-foreground">
              AI-Powered Estimation
            </p>
            <p className="text-xs text-muted-foreground">
              Describe your project in plain English, the AI calculates material
              quantities, costs, and recommendations automatically. Supports
              screeding, painting, tiling, POP ceiling, and custom projects.
            </p>
          </div>
        </div>

        <RewardedFeatureGate
          toolKey="advanced_calculator"
          featureName="Smart Calculator"
          features={ADVANCED_FEATURES}
        >
          {(access) => (
            <AdvancedCalculator
              toolKey="smart"
              contextSummary="Smart Calculator: freeform AI estimation. The user will describe their construction project in natural language; there is no form data yet."
              clientHash={access.clientHash}
            />
          )}
        </RewardedFeatureGate>
      </div>
    </>
  );
}
