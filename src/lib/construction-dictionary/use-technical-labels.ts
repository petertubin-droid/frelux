/**
 * useTechnicalLabels — dictionary-backed label translation for
 * estimation result tables (engine-1A #6 remaining item: wiring
 * label translation into individual estimation result pages).
 *
 * Reuses the existing stack — useLanguage() for the active locale,
 * getTranslationPool() for the per-language terminology pool, and
 * translateTechnicalLabel() for the actual substitution — so pages
 * gain translated material/line labels without a second dictionary
 * or a second translation path.
 *
 * Honesty rules carried from the underlying modules:
 *  - English (or no pool yet) returns the label untouched.
 *  - Safety/regulatory text is NEVER machine-translated; the
 *    translator refuses and the source label is shown as-is.
 *  - Measurements inside labels are protected by the translator.
 */
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { getTranslationPool } from "./translation-pool";
import {
  translateTechnicalLabel,
  type LabelTranslationResult,
  type SafetyRefusal,
} from "./technical-labels";
import type { ConstructionTerm } from "./types";

export interface TechnicalLabels {
  /** Translate a technical label for the active language (English passthrough). */
  t: (label: string) => string;
  /** Active language code. */
  language: string;
  /** True once the terminology pool for the language has loaded. */
  dictionaryReady: boolean;
}

const IDENTITY = (label: string) => label;

export function useTechnicalLabels(): TechnicalLabels {
  const { language } = useLanguage();
  const [terms, setTerms] = useState<ConstructionTerm[]>([]);

  useEffect(() => {
    if (!language || language === "en") {
      setTerms([]);
      return;
    }
    let cancelled = false;
    getTranslationPool(language).then((pool) => {
      if (!cancelled) setTerms(pool.terms);
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const t = useMemo(() => {
    if (!language || language === "en") return IDENTITY;
    return (label: string) => {
      const result: LabelTranslationResult | SafetyRefusal =
        translateTechnicalLabel(label, language, terms);
      if ("refused" in result && result.refused) return label;
      return (result as LabelTranslationResult).translated;
    };
  }, [language, terms]);

  return { t, language, dictionaryReady: terms.length > 0 };
}
