/**
 * FRELUX ROOF VIEW — Provider Registry
 *
 * Registry of supported imagery providers.
 *
 * This module:
 *   - Lists providers that COULD be connected
 *   - Checks whether any provider is currently configured (via Supabase)
 *   - NEVER fabricates imagery or provider availability
 *   - Returns a clear "not_configured" state when no provider is active
 *
 * The frontend calls getRoofViewConfig() to check status.
 * Actual imagery retrieval happens via an Edge Function (server-side).
 *
 * Feature 2: Roof View
 */

import { supabase } from '@/lib/supabase';
import type {
  RoofViewProviderConfig,
  RoofViewProviderType,
  RoofViewState,
  RoofViewLocation,
  RoofViewImageryResult,
  DbRoofViewConfig,
} from './types';

// =========================================================
// Provider Definitions (metadata only — no API keys)
// =========================================================

interface ProviderMeta {
  type: RoofViewProviderType;
  display_name: string;
  description: string;
  /** Settings schema for admin configuration */
  settings_schema: Record<string, { type: string; label: string; default?: unknown }>;
}

/**
 * All providers FRELUX could connect to.
 * This is metadata only — it does NOT mean any provider is active.
 */
export const SUPPORTED_PROVIDERS: ProviderMeta[] = [
  {
    type: 'google_maps',
    display_name: 'Google Maps Satellite',
    description: 'Google Maps Static API satellite imagery. Requires a Google Maps API key with Static Maps enabled.',
    settings_schema: {
      zoom: { type: 'number', label: 'Zoom level', default: 20 },
      maptype: { type: 'string', label: 'Map type', default: 'satellite' },
      size: { type: 'string', label: 'Image size', default: '1200x1200' },
    },
  },
  {
    type: 'mapbox',
    display_name: 'Mapbox Satellite',
    description: 'Mapbox Static Tiles API satellite imagery. Requires a Mapbox access token.',
    settings_schema: {
      zoom: { type: 'number', label: 'Zoom level', default: 20 },
      size: { type: 'string', label: 'Image size', default: '1200x1200' },
      high_resolution: { type: 'boolean', label: 'High resolution (@2x)', default: true },
    },
  },
  {
    type: 'nearmap',
    display_name: 'Nearmap',
    description: 'Nearmap high-resolution aerial imagery. Requires a Nearmap API key.',
    settings_schema: {
      resolution: { type: 'string', label: 'Resolution', default: 'high' },
    },
  },
  {
    type: 'custom',
    display_name: 'Custom Provider',
    description: 'A custom imagery provider with a configurable API endpoint.',
    settings_schema: {
      endpoint_url: { type: 'string', label: 'API endpoint URL' },
      api_key_header: { type: 'string', label: 'API key header name', default: 'Authorization' },
    },
  },
];

// =========================================================
// Config Detection
// =========================================================

/**
 * Cache for provider config (prevents repeated Supabase calls within a session).
 */
let cachedConfig: RoofViewProviderConfig | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Default "not configured" state.
 * This is what FRELUX returns when no imagery provider has been set up.
 */
export const NOT_CONFIGURED: RoofViewProviderConfig = {
  provider_type: 'google_maps',
  enabled: false,
  api_key_configured: false,
  display_name: 'No Provider Configured',
};

/**
 * Check whether a roof view imagery provider is configured.
 *
 * Calls Supabase to check the roof_view_config table (or site_settings).
 * Returns the provider config, or a "not configured" default.
 *
 * NEVER fabricates a configured state.
 */
export async function getRoofViewConfig(): Promise<RoofViewProviderConfig> {
  // Check cache
  if (cachedConfig && Date.now() < cacheExpiry) {
    return cachedConfig;
  }

  try {
    const { data, error } = await supabase
      .from('roof_view_config')
      .select('*')
      .eq('enabled', true)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      cachedConfig = NOT_CONFIGURED;
      cacheExpiry = Date.now() + CACHE_TTL_MS;
      return NOT_CONFIGURED;
    }

    const row = data as DbRoofViewConfig;
    const config: RoofViewProviderConfig = {
      provider_type: row.provider_type,
      enabled: row.enabled,
      api_key_configured: row.api_key_configured,
      display_name: row.display_name,
      settings: row.settings ?? undefined,
    };

    cachedConfig = config;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return config;
  } catch {
    // Supabase not available (e.g. offline, not deployed) — return not configured
    cachedConfig = NOT_CONFIGURED;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return NOT_CONFIGURED;
  }
}

/**
 * Get the current roof view state from a provider config.
 */
export function getRoofViewState(config: RoofViewProviderConfig): RoofViewState {
  if (!config.enabled || !config.api_key_configured) {
    return 'not_configured';
  }
  return 'configured';
}

/**
 * Clear the config cache (useful after admin changes).
 */
export function clearRoofViewConfigCache(): void {
  cachedConfig = null;
  cacheExpiry = 0;
}

// =========================================================
// Imagery Fetch (calls Edge Function — server-side only)
// =========================================================

/**
 * Fetch roof view imagery for a location.
 *
 * This calls the 'roof-view-imagery' Edge Function which:
 *   1. Checks the provider config server-side
 *   2. Calls the imagery provider's API with the stored API key
 *   3. Returns the imagery URL
 *
 * If no provider is configured, returns available: false.
 * NEVER fabricates imagery.
 */
export async function fetchRoofViewImagery(
  location: RoofViewLocation,
): Promise<RoofViewImageryResult> {
  const config = await getRoofViewConfig();

  if (!config.enabled || !config.api_key_configured) {
    return {
      available: false,
      error: 'No imagery provider is configured. Roof View requires an admin-configured provider.',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('roof-view-imagery', {
      body: {
        location,
        provider_type: config.provider_type,
      },
    });

    if (error) {
      return {
        available: false,
        provider: config.provider_type,
        provider_display_name: config.display_name,
        error: error.message || 'Failed to retrieve imagery.',
        provider_error: true,
      };
    }

    if (!data || !data.available) {
      return {
        available: false,
        provider: config.provider_type,
        provider_display_name: config.display_name,
        error: data?.error || 'No imagery available for this location.',
        provider_error: true,
      };
    }

    return {
      available: true,
      imagery_url: data.imagery_url,
      provider: config.provider_type,
      provider_display_name: config.display_name,
      retrieved_at: data.retrieved_at || new Date().toISOString(),
      location,
      bounds: data.bounds,
    };
  } catch (err) {
    // Edge function not deployed — return error, don't fabricate
    return {
      available: false,
      provider: config.provider_type,
      provider_display_name: config.display_name,
      error: 'Imagery service is not available. The roof-view-imagery function may not be deployed.',
      provider_error: true,
    };
  }
}
