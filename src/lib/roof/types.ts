/**
 * FRELUX ROOF VIEW — Types
 *
 * Type definitions for the roof view / imagery provider system.
 *
 * Architecture:
 *   - Provider interface allows future imagery providers (satellite, aerial, etc.)
 *   - No provider is hardcoded or assumed active
 *   - Manual measurement always works regardless of provider state
 *   - No fake data — if no provider is configured, the UI shows a clear state
 *
 * Feature 2: Roof View
 */

// =========================================================
// Provider Types
// =========================================================

/**
 * Supported imagery provider types.
 * Add new providers here as they become available.
 */
export type RoofViewProviderType =
  | 'google_maps'
  | 'mapbox'
  | 'nearmap'
  | 'custom';

/**
 * Configuration for a roof view imagery provider.
 * Stored in Supabase (site_settings or dedicated table).
 * Admin-configured. Never hardcoded in frontend.
 */
export interface RoofViewProviderConfig {
  provider_type: RoofViewProviderType;
  /** Whether the provider is configured and active */
  enabled: boolean;
  /** API key or endpoint — stored server-side only, never in frontend */
  api_key_configured: boolean;
  /** Display name for the provider */
  display_name: string;
  /** Provider-specific settings (e.g. zoom level, map type) */
  settings?: Record<string, unknown>;
}

// =========================================================
// Location Types
// =========================================================

/**
 * A geographic location for roof view imagery.
 */
export interface RoofViewLocation {
  /** Full address string */
  address?: string;
  /** Latitude */
  latitude?: number;
  /** Longitude */
  longitude?: number;
  /** Optional label (e.g. "Site A") */
  label?: string;
}

// =========================================================
// Imagery Result Types
// =========================================================

/**
 * Result from a roof view imagery request.
 *
 * The imagery_url is only populated when a provider is actually configured
 * and returns a real image. NEVER fabricate this.
 */
export interface RoofViewImageryResult {
  /** Whether imagery was successfully retrieved */
  available: boolean;
  /** URL to the aerial/satellite image (only when provider is active) */
  imagery_url?: string;
  /** Provider that supplied the imagery */
  provider?: RoofViewProviderType;
  /** Provider display name */
  provider_display_name?: string;
  /** When the imagery was captured/retrieved (ISO timestamp) */
  retrieved_at?: string;
  /** Location that was queried */
  location?: RoofViewLocation;
  /** Bounding box of the imagery if available */
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  /** Error message if retrieval failed */
  error?: string;
  /** Whether the provider is configured but the request failed */
  provider_error?: boolean;
}

/**
 * State of the roof view feature for the UI.
 */
export type RoofViewState =
  | 'not_configured'    // No provider configured
  | 'configured'         // Provider configured, ready to use
  | 'fetching'          // Fetching imagery
  | 'available'         // Imagery available
  | 'error'             // Error retrieving imagery
  | 'provider_error';   // Provider configured but request failed

// =========================================================
// DB Types
// =========================================================

/**
 * Database row for roof view provider config.
 * Stored in a dedicated table or site_settings.
 */
export interface DbRoofViewConfig {
  id: string;
  provider_type: RoofViewProviderType;
  enabled: boolean;
  api_key_configured: boolean;
  display_name: string;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
