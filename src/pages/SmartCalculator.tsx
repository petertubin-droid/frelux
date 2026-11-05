import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { Link } from "react-router-dom";
import { ArrowLeft, Brain } from "lucide-react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { RewardedFeatureGate } from "@/components/rewarded/RewardedFeatureGate";
import { AdvancedCalculator } from "@/components/rewarded/AdvancedCalculator";
import { useLanguage } from "@/lib/i18n";
import AdSlot from "@/components/ui/AdSlot";

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
  const { t } = useLanguage();
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
      <PageHeader
        variant="tool"
        backTo="/"
        backLabel={t("Back to home")}
        eyebrow={t("Describe a project")}
        title={t("Smart Calculator")}
        subtitle={t(
          "Say what you are building in plain words. The assistant reads the project and fills the calculators, and every quantity still comes from the deterministic engine.",
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

        {/* Ad slot, placement "calculator_mid" */}
        <AdSlot slotKey="calculator_mid" className="mt-8" />
        {/* Native banner slot, placement "calculator_native" */}
        <AdSlot slotKey="calculator_native" className="mt-8" />
      </Container>
    </>
  );
}
