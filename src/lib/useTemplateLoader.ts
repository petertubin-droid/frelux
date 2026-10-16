import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isSupabaseConfigured, getSupabase } from "./supabase-lazy";
import { FALLBACK_TEMPLATES } from "./template-data";
import { useMarket } from "@/lib/international/market-context";
import { convertTemplateInputForMarket } from "@/lib/templates-global";
import type { DbCalculatorTemplate } from "@/types/database";

/**
 * Reads ?template=<id> from the URL and loads the matching template.
 * Works for both public and private templates (RLS controls access)
 * and for the static fallback templates when Supabase is not
 * configured (static/offline mode).
 *
 * The returned template's input_data is converted to the visitor's
 * market room unit (feet for imperial markets, meters for metric
 * markets), so the calculator opens pre-filled with familiar units.
 */
export function useTemplateLoader() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { market } = useMarket();
  const [templateData, setTemplateData] = useState<DbCalculatorTemplate | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId) return;

    setLoading(true);
    (async () => {
      let data: DbCalculatorTemplate | null = null;

      if (isSupabaseConfigured) {
        const supabase = await getSupabase();
        const { data: row, error } = await supabase
          .from("calculator_templates")
          .select("*")
          .eq("id", templateId)
          .single();
        if (!error && row) data = row as DbCalculatorTemplate;
      } else {
        // Static mode: resolve from the curated fallback catalog.
        data = FALLBACK_TEMPLATES.find((t) => t.id === templateId) ?? null;
      }

      setTemplateData((prev) => {
        // Re-convert the same template when the market changes.
        const source = data ?? prev;
        if (!source) return null;
        return {
          ...source,
          input_data: convertTemplateInputForMarket(source, market),
        };
      });
      setLoading(false);

      // Clean the URL so a refresh doesn't re-trigger the load
      searchParams.delete("template");
      setSearchParams(searchParams, { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams, market.marketCode]);

  // Keep the converted input in sync when the market changes while a
  // template is already loaded (the calculator re-applies input_data
  // on change).
  useEffect(() => {
    setTemplateData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        input_data: convertTemplateInputForMarket(prev, market),
      };
    });
  }, [market]);

  return { templateData, loading };
}
