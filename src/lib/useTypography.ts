/**
 * Typography hook — reads the active font config from site_settings,
 * loads the required Google Fonts, and applies CSS variables to :root.
 *
 * The CSS variables are consumed by index.css via:
 *   --font-body, --font-headings, --font-nav, --font-btn,
 *   --font-calc-title, --font-calc-result, --font-admin
 *
 * Until the admin configures fonts, the defaults (Inter + Plus Jakarta Sans)
 * match the original index.html <link> tags, so nothing changes visually.
 */

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { isSupabaseConfigured } from './supabase';
import { DEFAULT_TYPOGRAPHY } from './font-library';
import type { TypographyConfig } from '@/types/database';
import { loadTypographyFonts } from './font-loader';

let cachedConfig: TypographyConfig | null = null;

function applyTypography(config: TypographyConfig) {
  const root = document.documentElement;
  root.style.setProperty('--font-body', `'${config.body}', system-ui, sans-serif`);
  root.style.setProperty('--font-headings', `'${config.headings}', system-ui, sans-serif`);
  root.style.setProperty('--font-nav', `'${config.navigation}', system-ui, sans-serif`);
  root.style.setProperty('--font-btn', `'${config.buttons}', system-ui, sans-serif`);
  root.style.setProperty('--font-calc-title', `'${config.calculatorTitles}', system-ui, sans-serif`);
  root.style.setProperty('--font-calc-result', `'${config.calculatorResults}', system-ui, sans-serif`);
  root.style.setProperty('--font-admin', `'${config.admin}', system-ui, sans-serif`);
}

export function useTypography() {
  const [config, setConfig] = useState<TypographyConfig>(cachedConfig ?? DEFAULT_TYPOGRAPHY);
  const [loaded, setLoaded] = useState<boolean>(!!cachedConfig);

  useEffect(() => {
    if (cachedConfig) {
      applyTypography(cachedConfig);
      loadTypographyFonts(cachedConfig);
      setLoaded(true);
      return;
    }

    if (!isSupabaseConfigured) {
      applyTypography(DEFAULT_TYPOGRAPHY);
      setLoaded(true);
      return;
    }

    supabase
      .from('site_settings')
      .select('typography_config')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const tc = data?.typography_config as TypographyConfig | null;
        const resolved = tc && typeof tc === 'object' && tc.body
          ? { ...DEFAULT_TYPOGRAPHY, ...tc }
          : DEFAULT_TYPOGRAPHY;
        cachedConfig = resolved;
        applyTypography(resolved);
        loadTypographyFonts(resolved);
        setConfig(resolved);
        setLoaded(true);
      });
  }, []);

  return { config, loaded };
}

/**
 * Apply a temporary typography config for preview (admin panel).
 * Does not persist to the database.
 */
export function previewTypography(config: TypographyConfig) {
  applyTypography(config);
  loadTypographyFonts(config);
}

/**
 * Reset preview back to the cached/persisted config.
 */
export function resetPreview() {
  const config = cachedConfig ?? DEFAULT_TYPOGRAPHY;
  applyTypography(config);
}
