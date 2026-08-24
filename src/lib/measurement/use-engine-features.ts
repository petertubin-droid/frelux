/**
 * FRELUX Engine Features Hook
 *
 * Connects admin-configured engine settings to the user-facing UI.
 * Loads waste configs and engine settings from the database (em_* tables)
 * and provides simple helper functions for explanation, confidence,
 * material summary, already-have, and estimate report display.
 *
 * This hook uses SIMPLE types (strings, numbers) so any calculator page
 * can use it without depending on the internal engine type system.
 *
 * Usage:
 *   const engine = useEngineFeatures({ calculatorType: 'painting' });
 *   engine.wasteResolution.wastePercent   // resolved waste %
 *   engine.buildExplanation(...)         // calculation explanation
 *   engine.assessConfidence(...)         // confidence assessment
 *
 * ADDITIVE — existing calculator logic is not modified.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================================
// TYPES (simple, UI-friendly — not engine-internal types)
// ============================================================

export interface WasteResolution {
  wastePercent: number;
  source: string;
  isOverride: boolean;
}

export interface ExplanationStep {
  description: string;
  value?: string | number;
}

export interface ExplanationResult {
  subject: string;
  resultSummary: string;
  steps: ExplanationStep[];
  notes: string[];
}

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'review_required';

export interface ConfidenceFactor {
  name: string;
  passed: boolean;
  detail: string;
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  factors: ConfidenceFactor[];
  summary: string;
  recommendations: string[];
}

export interface MaterialSummaryEntry {
  materialId: string;
  productName: string;
  totalQuantity: number;
  quantityUnit: string;
  spaceIds: string[];
}

export interface MaterialSummary {
  entries: MaterialSummaryEntry[];
  totalEntries: number;
}

export interface AlreadyHaveResult {
  required: number;
  alreadyHave: number;
  purchase: number;
  hasEnough: boolean;
}

export interface EstimateReportData {
  projectName: string;
  location?: string;
  date: string;
  measurementSystem: string;
  spaces: { name: string; dimensions: string; results: Record<string, unknown> }[];
  materials: MaterialSummaryEntry[];
  unitPrices: { material: string; unitPrice: number; currency: string }[];
  total: number;
  currency: string;
  notes: string[];
}

// ============================================================
// DB Types (minimal — just what we need for loading)
// ============================================================

interface EmWasteConfigRow {
  id: string;
  scope_level: 'global' | 'country' | 'market' | 'category';
  country_code: string | null;
  market_code: string | null;
  category: string | null;
  waste_percent: number;
  is_active: boolean;
}

interface EmEngineSettingRow {
  id: string;
  key: string;
  value: unknown;
  category: string;
  description: string | null;
}

// ============================================================
// OPTIONS
// ============================================================

export interface UseEngineFeaturesOptions {
  calculatorType: string;
  marketCode?: string;
  fallbackWastePercent?: number;
}

// ============================================================
// HOOK
// ============================================================

export function useEngineFeatures(options: UseEngineFeaturesOptions) {
  const { calculatorType, marketCode = 'NG', fallbackWastePercent = 10 } = options;

  const [loading, setLoading] = useState(true);
  const [wasteConfigs, setWasteConfigs] = useState<EmWasteConfigRow[]>([]);
  const [engineSettings, setEngineSettings] = useState<EmEngineSettingRow[]>([]);
  const [userWaste, setUserWaste] = useState<number | undefined>(undefined);

  // Load engine configs from DB
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [wc, es] = await Promise.all([
          supabase
            .from('em_waste_configs')
            .select('id, scope_level, country_code, market_code, category, waste_percent, is_active')
            .eq('is_active', true)
            .order('scope_level', { ascending: true })
            .then(({ data }) => (data ?? []) as unknown as EmWasteConfigRow[]),
          supabase
            .from('em_engine_settings')
            .select('id, key, value, category, description')
            .order('category', { ascending: true })
            .then(({ data }) => (data ?? []) as unknown as EmEngineSettingRow[]),
        ]);

        if (!cancelled) {
          setWasteConfigs(wc);
          setEngineSettings(es);
        }
      } catch {
        // DB not available — use fallbacks
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Resolve waste from DB configs (global → country → market → category)
  const wasteResolution = useMemo<WasteResolution>(() => {
    if (userWaste !== undefined) {
      return { wastePercent: userWaste, source: 'user', isOverride: true };
    }

    if (wasteConfigs.length > 0) {
      // Find most specific matching config
      const sorted = [...wasteConfigs].sort((a, b) => {
        const order = { global: 0, country: 1, market: 2, category: 3 };
        return order[a.scope_level] - order[b.scope_level];
      });

      // Try category-specific first (most specific)
      const categoryMatch = sorted.find(
        (c) => c.scope_level === 'category' && c.category === calculatorType,
      );
      if (categoryMatch) {
        return { wastePercent: categoryMatch.waste_percent, source: 'category', isOverride: false };
      }

      // Try market-specific
      const marketMatch = sorted.find(
        (c) => c.scope_level === 'market' && c.market_code === marketCode,
      );
      if (marketMatch) {
        return { wastePercent: marketMatch.waste_percent, source: 'market', isOverride: false };
      }

      // Try country-specific
      const countryMatch = sorted.find(
        (c) => c.scope_level === 'country' && c.country_code === 'NG',
      );
      if (countryMatch) {
        return { wastePercent: countryMatch.waste_percent, source: 'country', isOverride: false };
      }

      // Global fallback
      const globalMatch = sorted.find((c) => c.scope_level === 'global');
      if (globalMatch) {
        return { wastePercent: globalMatch.waste_percent, source: 'global', isOverride: false };
      }
    }

    return { wastePercent: fallbackWastePercent, source: 'fallback', isOverride: false };
  }, [wasteConfigs, marketCode, calculatorType, userWaste, fallbackWastePercent]);

  // Settings map
  const settingsMap = useMemo(() => {
    const m = new Map<string, unknown>();
    for (const s of engineSettings) m.set(s.key, s.value);
    return m;
  }, [engineSettings]);

  const getSettingValue = useCallback(
    <T,>(key: string, defaultValue: T): T => {
      const v = settingsMap.get(key);
      return v !== undefined ? (v as T) : defaultValue;
    },
    [settingsMap],
  );

  // ── Explanation ──
  const buildExplanation = useCallback(
    (params: {
      subject: string;
      resultSummary: string;
      steps: ExplanationStep[];
      notes?: string[];
    }): ExplanationResult => ({
      subject: params.subject,
      resultSummary: params.resultSummary,
      steps: params.steps,
      notes: [
        ...(params.notes ?? []),
        `Waste allowance: ${wasteResolution.wastePercent}% (${wasteResolution.source})`,
      ],
    }),
    [wasteResolution],
  );

  // ── Confidence ──
  const assessConfidence = useCallback(
    (params: {
      ruleValid: boolean;
      inputComplete: boolean;
      materialSpecComplete: boolean;
      marketPriceAvailable: boolean;
      sourceReliability: 'verified' | 'trusted' | 'unverified' | 'disputed';
      productMatched: boolean;
    }): ConfidenceResult => {
      const factors: ConfidenceFactor[] = [
        { name: 'Rule Validity', passed: params.ruleValid, detail: params.ruleValid ? 'Calculation rule verified' : 'Rule not validated' },
        { name: 'Input Completeness', passed: params.inputComplete, detail: params.inputComplete ? 'All required inputs provided' : 'Some inputs missing' },
        { name: 'Material Spec', passed: params.materialSpecComplete, detail: params.materialSpecComplete ? 'Material specification complete' : 'Material spec incomplete' },
        { name: 'Market Price', passed: params.marketPriceAvailable, detail: params.marketPriceAvailable ? 'Market price available' : 'No market price data' },
        { name: 'Product Matched', passed: params.productMatched, detail: params.productMatched ? 'Product matched to catalog' : 'Product not matched' },
        { name: 'Source Reliability', passed: params.sourceReliability === 'verified' || params.sourceReliability === 'trusted', detail: `Source: ${params.sourceReliability}` },
      ];

      const passedCount = factors.filter((f) => f.passed).length;
      const level: ConfidenceLevel =
        passedCount >= 5 ? 'high' :
        passedCount >= 3 ? 'medium' :
        passedCount >= 1 ? 'low' : 'review_required';

      const recommendations: string[] = [];
      if (!params.marketPriceAvailable) recommendations.push('Configure market prices for cost estimates');
      if (!params.materialSpecComplete) recommendations.push('Complete material specification for accurate quantities');
      if (!params.productMatched) recommendations.push('Match products to catalog for verified pricing');

      return {
        level,
        factors,
        summary: `${passedCount}/${factors.length} factors passed`,
        recommendations,
      };
    },
    [],
  );

  // ── Material Summary ──
  const buildMaterialSummary = useCallback(
    (entries: MaterialSummaryEntry[]): MaterialSummary => ({
      entries,
      totalEntries: entries.length,
    }),
    [],
  );

  // ── Already-Have ──
  const applyAlreadyHave = useCallback(
    (required: number, alreadyHave: number): AlreadyHaveResult => ({
      required,
      alreadyHave,
      purchase: Math.max(0, required - alreadyHave),
      hasEnough: alreadyHave >= required,
    }),
    [],
  );

  // ── Estimate Report ──
  const buildEstimateReport = useCallback(
    (params: {
      projectName: string;
      location?: string;
      measurementSystem?: string;
      spaces?: { name: string; dimensions: string; results: Record<string, unknown> }[];
      materials?: MaterialSummaryEntry[];
      unitPrices?: { material: string; unitPrice: number; currency: string }[];
      notes?: string[];
    }): EstimateReportData => {
      const materials = params.materials ?? [];
      const total = (params.unitPrices ?? []).reduce((sum, p) => {
        const matEntry = materials.find((e) => e.productName === p.material);
        return sum + (matEntry ? matEntry.totalQuantity * p.unitPrice : 0);
      }, 0);

      return {
        projectName: params.projectName,
        location: params.location,
        date: new Date().toISOString(),
        measurementSystem: params.measurementSystem ?? 'metric',
        spaces: params.spaces ?? [],
        materials,
        unitPrices: params.unitPrices ?? [],
        total,
        currency: params.unitPrices?.[0]?.currency ?? 'NGN',
        notes: params.notes ?? [],
      };
    },
    [],
  );

  return {
    loading,
    wasteResolution,
    setUserWaste,
    userWaste,
    settings: settingsMap,
    getSettingValue,
    buildExplanation,
    assessConfidence,
    buildMaterialSummary,
    applyAlreadyHave,
    buildEstimateReport,
    marketCode,
  };
}
