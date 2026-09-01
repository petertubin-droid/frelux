import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Brain, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { fetchScreedingMixConfig } from "@/lib/queries";
import type { ScreedingMixConfig } from "@/types";
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

const FALLBACK_CONFIG: ScreedingMixConfig = {
  paintCoverageRateM2PerL: 12,
  paintBucketSizeL: 20,
  paintPricePerBucket: 28000,
  cementConsumptionRatioKgPerL: 1.5,
  cementBagSizeKg: 40,
  cementPricePerBag: 9500,
  defaultMixRatio: "2:1",
  labourRatePerSqm: 0,
  wastePercentage: 10,
  taxVatPercentage: 7.5,
  currency: "NGN",
  currencySymbol: "₦",
};

export default function SmartCalculator() {
  const { user } = useAuth();
  const seo = useSeo({
    title: "Smart Calculator — AI-Powered Construction Estimator | FRELUX",
    description:
      "Describe any construction project in plain language and get an AI-powered cost estimate with material quantities, line items, and savings recommendations. Free to use.",
    canonicalPath: "/smart-calculator",
  });

  const [config, setConfig] = useState<ScreedingMixConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchScreedingMixConfig();
      if (data) {
        setConfig({
          paintCoverageRateM2PerL: data.paint_coverage_rate_m2_per_l,
          paintBucketSizeL: data.paint_bucket_size_l,
          paintPricePerBucket: data.paint_price_per_bucket,
          cementConsumptionRatioKgPerL: data.cement_consumption_ratio_kg_per_l,
          cementBagSizeKg: data.cement_bag_size_kg,
          cementPricePerBag: data.cement_price_per_bag,
          defaultMixRatio: data.default_mix_ratio || "2:1",
          labourRatePerSqm: data.labour_rate_per_sqm ?? 0,
          wastePercentage: data.waste_percentage ?? 10,
          taxVatPercentage: data.tax_vat_percentage ?? 7.5,
          currency: data.currency || "NGN",
          currencySymbol: data.currency_symbol || "₦",
        });
      } else {
        setConfig(FALLBACK_CONFIG);
      }
    } catch {
      setConfig(FALLBACK_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return (
    <>
      {seo}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-purple dark:text-neutral-500"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to home
        </Link>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-purple/70 shadow-lg shadow-brand-purple/20">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-brand-navy dark:text-white">
            Smart Calculator
          </h1>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-neutral-500">
            <Brain
              className="h-4 w-4 text-brand-purple"
              aria-hidden="true"
            />
            Powered by AI — describe any project, get an instant estimate
          </p>
        </div>

        {/* AI-powered badge banner */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-transparent p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/10">
            <Brain className="h-5 w-5 text-brand-purple" />
          </div>
          <div>
            <p className="text-sm font-bold text-brand-navy dark:text-white">
              AI-Powered Estimation
            </p>
            <p className="text-xs text-neutral-500">
              Describe your project in plain English — the AI calculates
              material quantities, costs, and recommendations automatically.
              Supports screeding, painting, tiling, POP ceiling, and custom
              projects.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 py-16 dark:border-white/5 dark:bg-white/5">
            <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
            <p className="text-sm text-neutral-500">
              Loading Smart Calculator…
            </p>
          </div>
        ) : config ? (
          <RewardedFeatureGate
            toolKey="advanced_calculator"
            featureName="Smart Calculator"
            features={ADVANCED_FEATURES}
          >
            {(access) => (
              <AdvancedCalculator
                netArea={0}
                config={config}
                clientHash={access.clientHash}
              />
            )}
          </RewardedFeatureGate>
        ) : null}
      </div>
    </>
  );
}
