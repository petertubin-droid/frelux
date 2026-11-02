import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Switch } from "@/components/ui/shadcn/switch";
import {
  fetchCrowdsourcedBenchmark,
  slugifyMaterial,
} from "@/lib/international/crowdsourcing-engine";
import type { CrowdsourcedMarketBenchmark } from "@/types/hybrid-pricing";
import { useLanguage } from "@/lib/i18n";

interface ExpenseCrowdsourceCardProps {
  marketCode: string;
  city?: string;
  materialName?: string;
  enteredPrice?: number;
  currency: string;
  optIn: boolean;
  onToggleOptIn: (optIn: boolean) => void;
  className?: string;
}

export const ExpenseCrowdsourceCard: React.FC<ExpenseCrowdsourceCardProps> = ({
  marketCode,
  city = "Local Area",
  materialName = "Portland Cement 50kg",
  enteredPrice = 950,
  currency = "KES",
  optIn,
  onToggleOptIn,
  className = "",
}) => {
  const { t } = useLanguage();
  const [benchmark, setBenchmark] =
    useState<CrowdsourcedMarketBenchmark | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!materialName) return;
    const slug = slugifyMaterial(materialName);
    setLoading(true);
    fetchCrowdsourcedBenchmark({
      marketCode,
      materialSlug: slug,
      city,
    })
      .then((res) => setBenchmark(res))
      .finally(() => setLoading(false));
  }, [marketCode, materialName, city]);

  const diffPct =
    benchmark && enteredPrice > 0
      ? Math.round(
          ((enteredPrice - benchmark.trimmed_mean_price) /
            benchmark.trimmed_mean_price) *
            100,
        )
      : 0;

  return (
    <Card
      className={`border-blue-100 dark:border-blue-950 bg-gradient-to-br from-white to-blue-50/20 dark:from-slate-900 dark:to-blue-950/20 ${className}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                {t("Closed-Loop Price Sharing")}
                <Badge
                  variant="outline"
                  className="text-[10px] text-blue-600 border-blue-200"
                >
                  {t("Self-Healing Data")}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Anonymously share your actual receipt to update local market
                averages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="crowdsource-opt-in"
              className="text-[11px] font-medium text-slate-600 dark:text-slate-300"
            >
              {optIn ? "Opted In" : "Off"}
            </label>
            <Switch
              id="crowdsource-opt-in"
              checked={optIn}
              onCheckedChange={onToggleOptIn}
              aria-label={t("Contribute price anonymously")}
            />
          </div>
        </div>

        {/* Benchmark Intelligence */}
        {benchmark && (
          <div className="p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40 bg-white/80 dark:bg-slate-900/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {benchmark.city || marketCode} Contractor Benchmark:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {benchmark.trimmed_mean_price} {benchmark.currency} /{" "}
                {benchmark.unit}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                {benchmark.sample_size} verified contractor submissions this
                month
              </span>
              {enteredPrice > 0 && (
                <span
                  className={`font-semibold ${
                    diffPct < 0
                      ? "text-emerald-600"
                      : diffPct > 0
                        ? "text-amber-600"
                        : "text-slate-600"
                  }`}
                >
                  {diffPct === 0
                    ? "Spot-on market average"
                    : diffPct < 0
                      ? `${Math.abs(diffPct)}% below average`
                      : `${diffPct}% above average`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <ShieldCheck className="w-3 h-3 text-slate-400" />
          <span>
            100% Anonymized. Your contractor identity, client details, and
            project location are never published.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
