import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from './supabase';
import type { DbCalculatorTemplate } from '@/types/database';

/**
 * Reads ?template=<id> from the URL and loads the matching template.
 * Works for both public and private templates (RLS controls access).
 * Returns the template data so the calculator can pre-fill its inputs.
 */
export function useTemplateLoader() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [templateData, setTemplateData] = useState<DbCalculatorTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const templateId = searchParams.get('template');
    if (!templateId || !isSupabaseConfigured) return;

    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('calculator_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!error && data) {
        setTemplateData(data as DbCalculatorTemplate);
      }
      setLoading(false);

      // Clean the URL so a refresh doesn't re-trigger the load
      searchParams.delete('template');
      setSearchParams(searchParams, { replace: true });
    })();
  }, [searchParams, setSearchParams]);

  return { templateData, loading };
}
