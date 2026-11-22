/**
 * AdminMacroTracker — System A: The Fluctuation Filter Control Room
 *
 * Dedicated admin view to monitor regional commodity indices, central bank inflation
 * feeds, configure elasticity rules across 20+ countries, and simulate price shocks.
 * Full CRUD over indicators and elasticity rules with live Supabase persistence.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Sliders,
  TrendingUp,
  RefreshCw,
  Plus,
  Zap,
  Globe2,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
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
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";
import {
  fetchMarketMacroIndicators,
  fetchMarketElasticityRules,
  createMacroIndicator,
  updateMacroIndicator,
  deleteMacroIndicator,
  upsertElasticityRule,
  deleteElasticityRule,
  simulateMacroImpact,
  DEFAULT_MACRO_INDICATORS,
} from "@/lib/international/macro-tracker";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import type {
  MacroIndicator,
  MacroElasticityRule,
  CommodityCategory,
} from "@/types/hybrid-pricing";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { AdminModal } from "@/components/admin/AdminModal";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminUi";

const PRIMARY_CHIPS = [
  { code: "KE", name: "Kenya", currency: "KES", flag: "🇰🇪" },
  { code: "NG", name: "Nigeria", currency: "NGN", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", currency: "GHS", flag: "🇬🇭" },
  { code: "ZA", name: "South Africa", currency: "ZAR", flag: "🇿🇦" },
  { code: "US", name: "United States", currency: "USD", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
  { code: "CA", name: "Canada", currency: "CAD", flag: "🇨🇦" },
  { code: "AU", name: "Australia", currency: "AUD", flag: "🇦🇺" },
];

const COMMODITY_TYPES: { value: CommodityCategory; label: string }[] = [
  { value: "steel", label: "Steel Rebar & Coil" },
  { value: "cement", label: "Portland Cement" },
  { value: "general_inflation", label: "General CPI Inflation" },
  { value: "fuel_transport", label: "Diesel & Heavy Transport" },
  { value: "timber", label: "Structural Timber" },
  { value: "sand_gravel", label: "Aggregates & Sand" },
  { value: "roofing_sheet", label: "Roofing Sheets" },
];

export default function AdminMacroTracker() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedMarket, setSelectedMarket] = useState<string>("KE");
  const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
  const [rules, setRules] = useState<MacroElasticityRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFixtureFallback, setIsFixtureFallback] = useState<boolean>(false);
  const [liveMaterials, setLiveMaterials] = useState<
    { name: string; category: string; basePrice: number }[]
  >([]);

  // Modal states
  const [indicatorModalOpen, setIndicatorModalOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] =
    useState<MacroIndicator | null>(null);
  const [indicatorForm, setIndicatorForm] = useState({
    indicator_type: "steel" as CommodityCategory,
    headline_name: "",
    current_index_value: "100.0",
    baseline_index_value: "100.0",
    pct_change_30d: "0.0",
    pct_change_90d: "0.0",
    pct_change_yoy: "0.0",
    source_name: "",
    source_url: "",
  });

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MacroElasticityRule | null>(
    null,
  );
  const [ruleForm, setRuleForm] = useState({
    material_category: "steel",
    commodity_trigger: "steel",
    elasticity_multiplier: "1.0",
    activation_threshold_pct: "3.0",
    ceiling_adjustment_pct: "25.0",
    is_active: true,
    notes: "",
  });

  const [saving, setSaving] = useState(false);

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

  // Flattened country list
  const allCountries = useMemo(() => {
    return COUNTRY_OPTIONS.flatMap((g) => g.countries);
  }, []);

  const currentMarketMeta = useMemo(() => {
    const found = allCountries.find((m) => m.code === selectedMarket);
    if (found) return found;
    const chip = PRIMARY_CHIPS.find((m) => m.code === selectedMarket);
    if (chip)
      return { code: chip.code, name: chip.name, currency: chip.currency };
    return { code: selectedMarket, name: selectedMarket, currency: "USD" };
  }, [allCountries, selectedMarket]);

  const loadMarketData = async (mkt: string) => {
    setLoading(true);
    try {
      const [fetchedInd, fetchedRules] = await Promise.all([
        fetchMarketMacroIndicators(mkt),
        fetchMarketElasticityRules(mkt),
      ]);
      // Fall back to verified defaults if DB returned no rows for primary markets
      if (fetchedInd.length === 0 && DEFAULT_MACRO_INDICATORS[mkt]) {
        setIndicators(DEFAULT_MACRO_INDICATORS[mkt]);
        setIsFixtureFallback(true);
      } else {
        setIndicators(fetchedInd);
        setIsFixtureFallback(false);
      }
      setRules(fetchedRules);

      try {
        const { data: priceRows } = await supabase
          .from("estimation_prices")
          .select("price, ref_id")
          .eq("market", mkt)
          .eq("price_type", "material")
          .eq("is_active", true)
          .order("effective_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(10);

        if (priceRows && priceRows.length > 0) {
          const refIds = priceRows.map((r) => r.ref_id);
          const { data: matRows } = await supabase
            .from("estimation_materials")
            .select("id, name, category")
            .in("id", refIds);

          const matMap = new Map((matRows || []).map((m) => [m.id, m]));
          const mapped = priceRows
            .map((p) => {
              const m = matMap.get(p.ref_id);
              if (!m) return null;
              return {
                name: m.name,
                category: m.category || "general",
                basePrice: Number(p.price) || 0,
              };
            })
            .filter(
              (x): x is { name: string; category: string; basePrice: number } =>
                Boolean(x && x.basePrice > 0),
            );

          setLiveMaterials(mapped);
        } else {
          setLiveMaterials([]);
        }
      } catch {
        setLiveMaterials([]);
      }
    } catch {
      setIndicators(DEFAULT_MACRO_INDICATORS[mkt] || []);
      setIsFixtureFallback(true);
      setRules([]);
      setLiveMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData(selectedMarket);
  }, [selectedMarket]);

  useEffect(() => {
    runSimulation();
  }, [selectedMarket, simCommodity, simSpikePct, liveMaterials]);

  const runSimulation = () => {
    const itemsToSimulate = liveMaterials;
    const sim = simulateMacroImpact({
      marketCode: selectedMarket,
      commodity: simCommodity,
      simulatedSpikePct: simSpikePct,
      sampleItems: itemsToSimulate,
    });
    setSimResults(sim);
  };

  // Open modal for new indicator
  const openNewIndicator = () => {
    setEditingIndicator(null);
    setIndicatorForm({
      indicator_type: "steel",
      headline_name: "",
      current_index_value: "100.0",
      baseline_index_value: "100.0",
      pct_change_30d: "5.0",
      pct_change_90d: "7.0",
      pct_change_yoy: "12.0",
      source_name: "",
      source_url: "",
    });
    setIndicatorModalOpen(true);
  };

  // Open modal to edit indicator
  const openEditIndicator = (ind: MacroIndicator) => {
    setEditingIndicator(ind);
    setIndicatorForm({
      indicator_type: ind.indicator_type as CommodityCategory,
      headline_name: ind.headline_name,
      current_index_value: String(ind.current_index_value),
      baseline_index_value: String(ind.baseline_index_value),
      pct_change_30d: String(ind.pct_change_30d),
      pct_change_90d: String(ind.pct_change_90d),
      pct_change_yoy: String(ind.pct_change_yoy),
      source_name: ind.source_name,
      source_url: ind.source_url || "",
    });
    setIndicatorModalOpen(true);
  };

  // Save indicator
  const handleSaveIndicator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !indicatorForm.headline_name.trim() ||
      !indicatorForm.source_name.trim()
    ) {
      toast({ type: "error", title: "Headline and source name are required" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        market_code: selectedMarket,
        country_name: currentMarketMeta.name,
        currency: currentMarketMeta.currency,
        indicator_type: indicatorForm.indicator_type,
        headline_name: indicatorForm.headline_name.trim(),
        current_index_value: Number(indicatorForm.current_index_value) || 100,
        baseline_index_value: Number(indicatorForm.baseline_index_value) || 100,
        pct_change_30d: Number(indicatorForm.pct_change_30d) || 0,
        pct_change_90d: Number(indicatorForm.pct_change_90d) || 0,
        pct_change_yoy: Number(indicatorForm.pct_change_yoy) || 0,
        source_name: indicatorForm.source_name.trim(),
        source_url: indicatorForm.source_url.trim() || undefined,
        published_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      };

      if (editingIndicator) {
        const { error } = await updateMacroIndicator(
          editingIndicator.id,
          payload,
        );
        if (error) throw error;
        toast({
          type: "success",
          title: "Macro indicator updated successfully",
        });
      } else {
        const { error } = await createMacroIndicator(payload);
        if (error) throw error;
        toast({
          type: "success",
          title: "Macro indicator created successfully",
        });
      }

      setIndicatorModalOpen(false);
      await loadMarketData(selectedMarket);
    } catch (err: unknown) {
      toast({
        type: "error",
        title:
          (err instanceof Error ? err.message : String(err)) ||
          "Failed to save indicator",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete indicator
  const handleDeleteIndicator = async (id: string) => {
    if (!confirm("Are you sure you want to delete this macro indicator?"))
      return;
    try {
      const { ok, error } = await deleteMacroIndicator(id);
      if (!ok && error) throw error;
      toast({ type: "success", title: "Indicator removed" });
      setIndicators((prev) => prev.filter((i) => i.id !== id));
    } catch (err: unknown) {
      toast({
        type: "error",
        title:
          (err instanceof Error ? err.message : String(err)) ||
          "Could not delete indicator",
      });
    }
  };

  // Open modal for new rule
  const openNewRule = () => {
    setEditingRule(null);
    setRuleForm({
      material_category: "steel",
      commodity_trigger: "steel",
      elasticity_multiplier: "1.0",
      activation_threshold_pct: "3.0",
      ceiling_adjustment_pct: "25.0",
      is_active: true,
      notes: "",
    });
    setRuleModalOpen(true);
  };

  // Open modal to edit rule
  const openEditRule = (rule: MacroElasticityRule) => {
    setEditingRule(rule);
    setRuleForm({
      material_category: rule.material_category,
      commodity_trigger: rule.commodity_trigger,
      elasticity_multiplier: String(rule.elasticity_multiplier),
      activation_threshold_pct: String(rule.activation_threshold_pct),
      ceiling_adjustment_pct: String(rule.ceiling_adjustment_pct),
      is_active: rule.is_active,
      notes: rule.notes || "",
    });
    setRuleModalOpen(true);
  };

  // Save rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.material_category.trim()) {
      toast({ type: "error", title: "Material category is required" });
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<MacroElasticityRule> = {
        ...(editingRule ? { id: editingRule.id } : {}),
        market_code: selectedMarket,
        material_category: ruleForm.material_category.trim().toLowerCase(),
        commodity_trigger: ruleForm.commodity_trigger as CommodityCategory,
        elasticity_multiplier: Number(ruleForm.elasticity_multiplier) || 1.0,
        activation_threshold_pct:
          Number(ruleForm.activation_threshold_pct) || 3.0,
        ceiling_adjustment_pct: Number(ruleForm.ceiling_adjustment_pct) || 25.0,
        is_active: ruleForm.is_active,
        notes: ruleForm.notes.trim() || undefined,
      };

      const { error } = await upsertElasticityRule(payload);
      if (error) throw error;

      toast({ type: "success", title: "Elasticity rule saved successfully" });
      setRuleModalOpen(false);
      await loadMarketData(selectedMarket);
    } catch (err: unknown) {
      toast({
        type: "error",
        title:
          (err instanceof Error ? err.message : String(err)) ||
          "Failed to save rule",
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle rule active
  const handleToggleRule = async (rule: MacroElasticityRule) => {
    try {
      const { error } = await upsertElasticityRule({
        ...rule,
        is_active: !rule.is_active,
      });
      if (error) throw error;
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, is_active: !r.is_active } : r,
        ),
      );
      toast({
        type: "success",
        title: `Rule ${rule.is_active ? "disabled" : "activated"}`,
      });
    } catch (err: unknown) {
      toast({
        type: "error",
        title:
          (err instanceof Error ? err.message : String(err)) ||
          "Could not toggle rule",
      });
    }
  };

  // Delete rule
  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this elasticity rule?"))
      return;
    try {
      const { ok, error } = await deleteElasticityRule(id);
      if (!ok && error) throw error;
      toast({ type: "success", title: "Rule removed" });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      toast({
        type: "error",
        title:
          (err instanceof Error ? err.message : String(err)) ||
          "Could not delete rule",
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="min-w-0">
          <AdminPageHeader
            eyebrow={t("System A")}
            title={t("The Fluctuation Filter (Macro Tracker)")}
            description="Rule-based inflation and commodity filter protecting platform estimation realness across 30+ countries."
          />
        </div>

        {/* Market Selector Chips & Global Country Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
            {PRIMARY_CHIPS.map((mkt) => (
              <button
                key={mkt.code}
                onClick={() => setSelectedMarket(mkt.code)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
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

          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-200"
            aria-label="All Countries"
          >
            {COUNTRY_OPTIONS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code} - {c.currency})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Indicators & Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Macro Feeds & Elasticity Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Central Bank & Baseline Feeds */}
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadMarketData(selectedMarket)}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
                    />
                    {t("Sync Feeds")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={openNewIndicator}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {t("Add Indicator")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isFixtureFallback && indicators.length > 0 && !loading && (
                <div className="mb-3.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>
                    <strong>Reference Baseline Fixtures:</strong> Displaying
                    static baseline fixtures from codebase. No custom database
                    records are registered for {currentMarketMeta.name} yet.
                    Click &ldquo;Add Indicator&rdquo; to persist live
                    indicators.
                  </span>
                </div>
              )}
              {indicators.length === 0 && !loading ? (
                <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center text-xs text-muted-foreground">
                  No indicators registered for {currentMarketMeta.name}. Click
                  &ldquo;Add Indicator&rdquo; to configure one.
                </div>
              ) : (
                <div className="space-y-3">
                  {indicators.map((ind) => (
                    <div
                      key={ind.id}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span className="truncate">{ind.headline_name}</span>
                          <Badge
                            variant="outline"
                            className="text-xs uppercase font-mono"
                          >
                            {ind.indicator_type}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Source: {ind.source_name}</span>
                          {ind.source_url && (
                            <a
                              href={ind.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                            >
                              <span>link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <span>•</span>
                          <span>Index Value: {ind.current_index_value}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
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
                          <div className="text-xs text-slate-400">
                            30-day shift
                          </div>
                        </div>
                        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-3">
                          <button
                            onClick={() => openEditIndicator(ind)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                            title="Edit Indicator"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteIndicator(ind.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Delete Indicator"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Elasticity Rules List */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    {t("Regional Elasticity Multipliers & Activation Gates")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Defines what percentage of commodity inflation passes
                    through to finished project estimates.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={openNewRule}
                  variant="outline"
                  className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {t("Add Rule")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-xs text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800 pb-2">
                    <tr>
                      <th className="py-2 font-medium">{t("Category")}</th>
                      <th className="py-2 font-medium">{t("Trigger")}</th>
                      <th className="py-2 font-medium">{t("Multiplier")}</th>
                      <th className="py-2 font-medium">{t("Gate")}</th>
                      <th className="py-2 font-medium">{t("Cap")}</th>
                      <th className="py-2 font-medium">{t("Status")}</th>
                      <th className="py-2 font-medium text-right">
                        {t("Actions")}
                      </th>
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
                          &ge; {rule.activation_threshold_pct}%
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-400">
                          &plusmn; {rule.ceiling_adjustment_pct}%
                        </td>
                        <td className="py-2.5">
                          <button
                            onClick={() => handleToggleRule(rule)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              rule.is_active
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            }`}
                          >
                            {rule.is_active ? "Active" : "Disabled"}
                          </button>
                        </td>
                        <td className="py-2.5 text-right space-x-1">
                          <button
                            onClick={() => openEditRule(rule)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            title="Edit Rule"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
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
                  {t("Live Fluctuation Sandbox")}
                </span>
              </div>
              <CardTitle className="text-base font-semibold">
                {t("Simulate Economic Shocks")}
              </CardTitle>
              <CardDescription className="text-xs">
                Test how a macro spike in {currentMarketMeta.name} cascades
                through calculator estimates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {indicators.length === 0 && !loading && (
                <div
                  role="status"
                  className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
                >
                  No macro indicator is connected for this market. Add a sourced
                  observation before the fluctuation filter can use it.
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  {t("Commodity Trigger")}
                </label>
                <select
                  aria-label={t("Commodity Trigger")}
                  value={simCommodity}
                  onChange={(e) =>
                    setSimCommodity(e.target.value as CommodityCategory)
                  }
                  className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 font-medium"
                >
                  {COMMODITY_TYPES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
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
                  aria-label={t("Spike Percentage")}
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
                <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
                  <span>{t("Calculated Estimate Adjustments")}</span>
                  <span className="text-[10px] font-normal lowercase tracking-normal text-slate-400">
                    {liveMaterials.length > 0
                      ? `${liveMaterials.length} pricebook materials`
                      : "no market price data"}
                  </span>
                </div>
                {simResults.length === 0 && (
                  <p role="status" className="text-xs text-muted-foreground">
                    No active material prices are available for{" "}
                    {currentMarketMeta.name}. Add market-specific prices in the
                    material pricebook to run this simulation.
                  </p>
                )}
                {simResults.map((res, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {res.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        Base: {res.basePrice} {currentMarketMeta.currency}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {res.adjustedPrice} {currentMarketMeta.currency}
                      </div>
                      <div className="text-xs text-amber-600 font-semibold">
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

      {/* Indicator Modal */}
      {indicatorModalOpen && (
        <AdminModal
          title={
            editingIndicator ? "Edit Macro Indicator" : "Add Macro Indicator"
          }
          onClose={() => setIndicatorModalOpen(false)}
        >
          <form onSubmit={handleSaveIndicator} className="space-y-4 text-xs">
            <AdminField label="Commodity / Indicator Type" required>
              <AdminSelect
                value={indicatorForm.indicator_type}
                onChange={(e) =>
                  setIndicatorForm((f) => ({
                    ...f,
                    indicator_type: e.target.value as CommodityCategory,
                  }))
                }
              >
                {COMMODITY_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <AdminField label="Headline Name" required>
              <AdminInput
                placeholder="e.g. KNBS Wholesale Rebar Index"
                value={indicatorForm.headline_name}
                onChange={(e) =>
                  setIndicatorForm((f) => ({
                    ...f,
                    headline_name: e.target.value,
                  }))
                }
              />
            </AdminField>

            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Current Value" required>
                <AdminInput
                  type="number"
                  step="0.01"
                  value={indicatorForm.current_index_value}
                  onChange={(e) =>
                    setIndicatorForm((f) => ({
                      ...f,
                      current_index_value: e.target.value,
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Baseline Value" required>
                <AdminInput
                  type="number"
                  step="0.01"
                  value={indicatorForm.baseline_index_value}
                  onChange={(e) =>
                    setIndicatorForm((f) => ({
                      ...f,
                      baseline_index_value: e.target.value,
                    }))
                  }
                />
              </AdminField>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <AdminField label="30d Shift %">
                <AdminInput
                  type="number"
                  step="0.01"
                  value={indicatorForm.pct_change_30d}
                  onChange={(e) =>
                    setIndicatorForm((f) => ({
                      ...f,
                      pct_change_30d: e.target.value,
                    }))
                  }
                />
              </AdminField>
              <AdminField label="90d Shift %">
                <AdminInput
                  type="number"
                  step="0.01"
                  value={indicatorForm.pct_change_90d}
                  onChange={(e) =>
                    setIndicatorForm((f) => ({
                      ...f,
                      pct_change_90d: e.target.value,
                    }))
                  }
                />
              </AdminField>
              <AdminField label="YoY Shift %">
                <AdminInput
                  type="number"
                  step="0.01"
                  value={indicatorForm.pct_change_yoy}
                  onChange={(e) =>
                    setIndicatorForm((f) => ({
                      ...f,
                      pct_change_yoy: e.target.value,
                    }))
                  }
                />
              </AdminField>
            </div>

            <AdminField label="Source Agency / Publisher" required>
              <AdminInput
                placeholder="e.g. Kenya National Bureau of Statistics (KNBS)"
                value={indicatorForm.source_name}
                onChange={(e) =>
                  setIndicatorForm((f) => ({
                    ...f,
                    source_name: e.target.value,
                  }))
                }
              />
            </AdminField>

            <AdminField label="Source Reference URL">
              <AdminInput
                type="url"
                placeholder="https://..."
                value={indicatorForm.source_url}
                onChange={(e) =>
                  setIndicatorForm((f) => ({
                    ...f,
                    source_url: e.target.value,
                  }))
                }
              />
            </AdminField>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIndicatorModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saving ? "Saving..." : "Save Indicator"}
              </Button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* Elasticity Rule Modal */}
      {ruleModalOpen && (
        <AdminModal
          title={editingRule ? "Edit Elasticity Rule" : "Add Elasticity Rule"}
          onClose={() => setRuleModalOpen(false)}
        >
          <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
            <AdminField
              label="Material Category (e.g. steel, concrete, masonry, paint)"
              required
            >
              <AdminInput
                placeholder="e.g. steel"
                value={ruleForm.material_category}
                onChange={(e) =>
                  setRuleForm((f) => ({
                    ...f,
                    material_category: e.target.value,
                  }))
                }
              />
            </AdminField>

            <AdminField label="Trigger Commodity" required>
              <AdminSelect
                value={ruleForm.commodity_trigger}
                onChange={(e) =>
                  setRuleForm((f) => ({
                    ...f,
                    commodity_trigger: e.target.value,
                  }))
                }
              >
                {COMMODITY_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <div className="grid grid-cols-3 gap-2">
              <AdminField label="Elasticity Multiplier" required>
                <AdminInput
                  type="number"
                  step="0.05"
                  min="0"
                  max="3"
                  value={ruleForm.elasticity_multiplier}
                  onChange={(e) =>
                    setRuleForm((f) => ({
                      ...f,
                      elasticity_multiplier: e.target.value,
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Activation Threshold %" required>
                <AdminInput
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={ruleForm.activation_threshold_pct}
                  onChange={(e) =>
                    setRuleForm((f) => ({
                      ...f,
                      activation_threshold_pct: e.target.value,
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Ceiling Cap %" required>
                <AdminInput
                  type="number"
                  step="1"
                  min="5"
                  max="100"
                  value={ruleForm.ceiling_adjustment_pct}
                  onChange={(e) =>
                    setRuleForm((f) => ({
                      ...f,
                      ceiling_adjustment_pct: e.target.value,
                    }))
                  }
                />
              </AdminField>
            </div>

            <AdminField label="Rule Notes & Rationale">
              <AdminTextarea
                rows={2}
                placeholder="Rationale behind passthrough factor..."
                value={ruleForm.notes}
                onChange={(e) =>
                  setRuleForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </AdminField>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRuleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saving ? "Saving..." : "Save Rule"}
              </Button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
