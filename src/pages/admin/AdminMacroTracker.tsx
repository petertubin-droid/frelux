/**
 * AdminMacroTracker — System A: The Fluctuation Filter Control Room
 *
 * Dedicated admin view to monitor regional commodity indices, central bank inflation
 * feeds, configure elasticity rules across 20+ countries, and simulate price shocks.
 */

import React, { useState, useEffect } from "react";
import {
  Activity,
  Sliders,
  TrendingUp,
  RefreshCw,
  Plus,
  Zap,
  Globe2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
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
import { Input } from "@/components/ui/shadcn/input";
import {
  fetchMarketMacroIndicators,
  fetchMarketElasticityRules,
  simulateMacroImpact,
} from "@/lib/international/macro-tracker";
import type {
  MacroIndicator,
  MacroElasticityRule,
  CommodityCategory,
} from "@/types/hybrid-pricing";

const SUPPORTED_MARKETS = [
  { code: "KE", name: "Kenya", currency: "KES", flag: "🇰🇪" },
  { code: "NG", name: "Nigeria", currency: "NGN", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", currency: "GHS", flag: "🇬🇭" },
  { code: "ZA", name: "South Africa", currency: "ZAR", flag: "🇿🇦" },
  { code: "US", name: "United States", currency: "USD", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
];

export default function AdminMacroTracker() {
  const [selectedMarket, setSelectedMarket] = useState<string>("KE");
  const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
  const [rules, setRules] = useState<MacroElasticityRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Simulation state
  const [simCommodity, setSimCommodity] = useState<CommodityCategory>("steel");
  const [simSpikePct, setSimSpikePct] = useState<number>(6.0);
  const [simResults, setSimResults] = useState<
    {
      name: string;
      category: string;
      basePrice: number;
      adjustedPrice: number;
      delta: number;
      pct: number;
    }[]
  >([]);

  const loadMarketData = async (mkt: string) => {
    setLoading(true);
    try {
      const [fetchedInd, fetchedRules] = await Promise.all([
        fetchMarketMacroIndicators(mkt),
        fetchMarketElasticityRules(mkt),
      ]);
      setIndicators(fetchedInd);
      setRules(fetchedRules);
    } catch {
      setIndicators([]);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData(selectedMarket);
  }, [selectedMarket]);

  useEffect(() => {
    runSimulation();
  }, [selectedMarket, simCommodity, simSpikePct]);

  const runSimulation = () => {
    const sampleItems = [
      { name: "Y12 Rebar (12m Length)", category: "steel", basePrice: 1000 },
      {
        name: "Ready-Mix Concrete (Class 25)",
        category: "concrete",
        basePrice: 12000,
      },
      {
        name: "Standard 9-inch Foundation Block",
        category: "masonry",
        basePrice: 95,
      },
      {
        name: "Box Profile 28G Iron Sheet",
        category: "roofing",
        basePrice: 1450,
      },
      { name: "Silk Vinyl Emulsion 20L", category: "paint", basePrice: 8500 },
    ];

    const sim = simulateMacroImpact({
      marketCode: selectedMarket,
      commodity: simCommodity,
      simulatedSpikePct: simSpikePct,
      sampleItems,
    });
    setSimResults(sim);
  };

  const currentMarketMeta =
    SUPPORTED_MARKETS.find((m) => m.code === selectedMarket) ||
    SUPPORTED_MARKETS[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-indigo-600 text-white hover:bg-indigo-700">
              System A
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              The Fluctuation Filter (Macro Tracker)
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Rule-based inflation & commodity filter protecting platform
            estimation realness across 20+ countries.
          </p>
        </div>

        {/* Market Selector Chips */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          {SUPPORTED_MARKETS.map((mkt) => (
            <button
              key={mkt.code}
              onClick={() => setSelectedMarket(mkt.code)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                selectedMarket === mkt.code
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <span>{mkt.flag}</span>
              <span>{mkt.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Indicators & Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Macro Feeds */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Central Bank & Commodity Baseline Feeds (
                    {currentMarketMeta.name})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Automated tracking of national bureaus, steel mills, and CPI
                    statistics.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMarketData(selectedMarket)}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
                  />
                  Sync Feeds
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {indicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {ind.headline_name}
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-mono"
                        >
                          {ind.indicator_type}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span>Source: {ind.source_name}</span>
                        <span>•</span>
                        <span>Index Value: {ind.current_index_value}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold flex items-center justify-end gap-1 ${
                          ind.pct_change_30d > 0
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        <TrendingUp className="w-4 h-4" />
                        {ind.pct_change_30d > 0 ? "+" : ""}
                        {ind.pct_change_30d}%
                      </div>
                      <div className="text-[11px] text-slate-400">
                        30-day shift
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Elasticity Rules List */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Regional Elasticity Multipliers & Activation Gates
              </CardTitle>
              <CardDescription className="text-xs">
                Defines what percentage of commodity inflation passes through to
                finished project estimates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800 pb-2">
                    <tr>
                      <th className="py-2 font-medium">Material Category</th>
                      <th className="py-2 font-medium">Trigger Commodity</th>
                      <th className="py-2 font-medium">
                        Elasticity Multiplier
                      </th>
                      <th className="py-2 font-medium">Activation Gate</th>
                      <th className="py-2 font-medium">Ceiling Cap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rules.map((rule) => (
                      <tr key={rule.id}>
                        <td className="py-2.5 font-medium capitalize text-slate-900 dark:text-slate-100">
                          {rule.material_category}
                        </td>
                        <td className="py-2.5 text-slate-500 capitalize">
                          {rule.commodity_trigger}
                        </td>
                        <td className="py-2.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {rule.elasticity_multiplier}x
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-400">
                          ≥ {rule.activation_threshold_pct}%
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-400">
                          ± {rule.ceiling_adjustment_pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interactive Fluctuation Simulator */}
        <div>
          <Card className="border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Live Fluctuation Sandbox
                </span>
              </div>
              <CardTitle className="text-base font-semibold">
                Simulate Economic Shocks
              </CardTitle>
              <CardDescription className="text-xs">
                Test how a macro spike in {currentMarketMeta.name} cascades
                through calculator estimates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
        {indicators.length === 0 && !loading && <div role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">No macro indicator is connected for this market. Add a sourced, dated observation before the fluctuation filter can use it.</div>}
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Commodity Trigger
                </label>
                <select
                  aria-label="Commodity Trigger"
                  value={simCommodity}
                  onChange={(e) =>
                    setSimCommodity(e.target.value as CommodityCategory)
                  }
                  className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 font-medium"
                >
                  <option value="steel">Steel Rebar & Coil</option>
                  <option value="cement">Portland Cement</option>
                  <option value="general_inflation">
                    General CPI Inflation
                  </option>
                  <option value="fuel_transport">
                    Diesel & Heavy Transport
                  </option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Spike Percentage:
                  </span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    +{simSpikePct}%
                  </span>
                </div>
                <input
                  aria-label="Spike Percentage"
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={simSpikePct}
                  onChange={(e) => setSimSpikePct(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Simulation Result Items */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-semibold uppercase text-slate-500">
                  Calculated Estimate Adjustments
                </div>
                {simResults.map((res, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {res.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Base: {res.basePrice} {currentMarketMeta.currency}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {res.adjustedPrice} {currentMarketMeta.currency}
                      </div>
                      <div className="text-[10px] text-amber-600 font-semibold">
                        {res.pct > 0 ? `+${res.pct}%` : "0% (Gate active)"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
