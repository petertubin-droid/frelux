import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import {
  fetchMarketMacroIndicators,
  fetchMarketElasticityRules,
  DEFAULT_MACRO_INDICATORS,
  DEFAULT_ELASTICITY_RULES,
} from "@/lib/international/macro-tracker";
import type {
  MacroIndicator,
  MacroElasticityRule,
} from "@/types/hybrid-pricing";

interface MacroTrackerCardProps {
  marketCode: string;
  countryName?: string;
  onRefresh?: () => void;
  className?: string;
}

export const MacroTrackerCard: React.FC<MacroTrackerCardProps> = ({
  marketCode,
  countryName = "Target Market",
  onRefresh,
  className = "",
}) => {
  const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
  const [rules, setRules] = useState<MacroElasticityRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedIndicators, fetchedRules] = await Promise.all([
        fetchMarketMacroIndicators(marketCode),
        fetchMarketElasticityRules(marketCode),
      ]);
      setIndicators(
        fetchedIndicators.length > 0
          ? fetchedIndicators
          : DEFAULT_MACRO_INDICATORS[marketCode.toUpperCase()] || [],
      );
      setRules(
        fetchedRules.length > 0 ? fetchedRules : DEFAULT_ELASTICITY_RULES,
      );
    } catch {
      setIndicators(DEFAULT_MACRO_INDICATORS[marketCode.toUpperCase()] || []);
      setRules(DEFAULT_ELASTICITY_RULES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [marketCode]);

  return (
    <Card
      className={`border-slate-200/80 dark:border-slate-800 shadow-sm ${className}`}
    >
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                The Fluctuation Filter
                <Badge
                  variant="outline"
                  className="text-xs uppercase font-mono font-medium"
                >
                  {marketCode} • {countryName}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Macro-economic commodity indices & rule-based elasticity
                adjustment
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              loadData();
              onRefresh?.();
            }}
            disabled={loading}
            className="h-8 px-2 text-xs text-slate-600 dark:text-slate-400"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
            />
            Sync
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
            Regional Commodity & Inflation Feeds
          </h4>
          {indicators.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No macro indices registered for this market yet. Standard price
              book in effect.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {indicators.map((ind) => {
                const isSpike = Math.abs(ind.pct_change_30d) >= 3.0;
                const isPositive = ind.pct_change_30d > 0;
                return (
                  <div
                    key={ind.id}
                    className="p-3 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                        {ind.headline_name}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 flex items-center gap-0.5 ${
                          isSpike
                            ? isPositive
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5" />
                        )}
                        {isPositive ? "+" : ""}
                        {ind.pct_change_30d.toFixed(2)}% (30d)
                      </Badge>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Index: {ind.current_index_value}</span>
                      <span className="truncate max-w-[140px] text-[10px] text-slate-400">
                        {ind.source_name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Elasticity Filter Rules
            </h4>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Automated Passthrough
            </span>
          </div>

          <div className="space-y-1.5">
            {rules.slice(0, 3).map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50/80 dark:bg-slate-900/30 text-xs text-slate-700 dark:text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize text-slate-900 dark:text-slate-100">
                    {rule.material_category}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    tied to {rule.commodity_trigger}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {rule.elasticity_multiplier}x
                  </span>
                  <span className="text-slate-400">
                    threshold: {rule.activation_threshold_pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
