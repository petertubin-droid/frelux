/**
 * FRELUX ROOF VIEW — Tests
 *
 * Feature 2: Roof View
 *
 * Tests:
 *   - Provider registry metadata
 *   - NOT_CONFIGURED default state
 *   - getRoofViewState() state transitions
 *   - Provider type validation
 *   - Location type validation
 *   - Imagery result type validation
 *   - fetchRoofViewImagery returns not_available when no provider
 *   - No fake data is ever produced
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Test the pure logic (provider registry metadata + state helpers) ──
// We test the functions that don't require Supabase separately.

import {
  SUPPORTED_PROVIDERS,
  NOT_CONFIGURED,
  getRoofViewState,
} from '../provider-registry';
import type {
  RoofViewProviderConfig,
  RoofViewProviderType,
  RoofViewState,
  RoofViewLocation,
  RoofViewImageryResult,
} from '../types';

// =========================================================
// Provider Registry Metadata
// =========================================================

describe('Roof View: Provider Registry', () => {
  it('lists all supported provider types', () => {
    expect(SUPPORTED_PROVIDERS).toHaveLength(4);
    const types = SUPPORTED_PROVIDERS.map(p => p.type);
    expect(types).toContain('google_maps');
    expect(types).toContain('mapbox');
    expect(types).toContain('nearmap');
    expect(types).toContain('custom');
  });

  it('each provider has display name and description', () => {
    for (const provider of SUPPORTED_PROVIDERS) {
      expect(provider.display_name).toBeTruthy();
      expect(provider.description).toBeTruthy();
      expect(typeof provider.display_name).toBe('string');
      expect(typeof provider.description).toBe('string');
    }
  });

  it('each provider has a settings schema', () => {
    for (const provider of SUPPORTED_PROVIDERS) {
      expect(provider.settings_schema).toBeDefined();
      expect(typeof provider.settings_schema).toBe('object');
    }
  });

  it('provider settings schemas do not contain actual secret values', () => {
    for (const provider of SUPPORTED_PROVIDERS) {
      const schemaJson = JSON.stringify(provider.settings_schema);
      // Settings schema should not contain actual key values (only field definitions)
      expect(schemaJson).not.toMatch(/AIza[0-9A-Za-z_-]{35}/); // Google API key
      expect(schemaJson).not.toMatch(/pk\.[a-zA-Z0-9]{20,}/); // Mapbox token
      expect(schemaJson).not.toMatch(/sk_[a-zA-Z0-9]{20,}/); // Secret key
      // Descriptions may mention 'API key' or 'token' as requirements — that's fine
    }
  });
});

// =========================================================
// NOT_CONFIGURED Default
// =========================================================

describe('Roof View: NOT_CONFIGURED default', () => {
  it('is disabled by default', () => {
    expect(NOT_CONFIGURED.enabled).toBe(false);
  });

  it('has no API key configured', () => {
    expect(NOT_CONFIGURED.api_key_configured).toBe(false);
  });

  it('has a clear display name', () => {
    expect(NOT_CONFIGURED.display_name).toBe('No Provider Configured');
  });

  it('defaults to google_maps provider type', () => {
    expect(NOT_CONFIGURED.provider_type).toBe('google_maps');
  });
});

// =========================================================
// State Transitions
// =========================================================

describe('Roof View: State Transitions', () => {
  it('returns not_configured when provider is disabled', () => {
    const cfg: RoofViewProviderConfig = {
      provider_type: 'google_maps',
      enabled: false,
      api_key_configured: true,
      display_name: 'Google Maps',
    };
    expect(getRoofViewState(cfg)).toBe('not_configured');
  });

  it('returns not_configured when API key not configured', () => {
    const cfg: RoofViewProviderConfig = {
      provider_type: 'google_maps',
      enabled: true,
      api_key_configured: false,
      display_name: 'Google Maps',
    };
    expect(getRoofViewState(cfg)).toBe('not_configured');
  });

  it('returns not_configured when both disabled and no API key', () => {
    const cfg: RoofViewProviderConfig = {
      provider_type: 'mapbox',
      enabled: false,
      api_key_configured: false,
      display_name: 'Mapbox',
    };
    expect(getRoofViewState(cfg)).toBe('not_configured');
  });

  it('returns configured when enabled and API key is set', () => {
    const cfg: RoofViewProviderConfig = {
      provider_type: 'google_maps',
      enabled: true,
      api_key_configured: true,
      display_name: 'Google Maps Satellite',
    };
    expect(getRoofViewState(cfg)).toBe('configured');
  });

  it('returns configured for any provider type when active', () => {
    const providers: RoofViewProviderType[] = ['google_maps', 'mapbox', 'nearmap', 'custom'];
    for (const p of providers) {
      const cfg: RoofViewProviderConfig = {
        provider_type: p,
        enabled: true,
        api_key_configured: true,
        display_name: p,
      };
      expect(getRoofViewState(cfg)).toBe('configured');
    }
  });
});

// =========================================================
// Type Validation
// =========================================================

describe('Roof View: Type Validation', () => {
  it('RoofViewLocation with address only', () => {
    const loc: RoofViewLocation = { address: '12 Adeola Odeku, Lagos' };
    expect(loc.address).toBeTruthy();
    expect(loc.latitude).toBeUndefined();
  });

  it('RoofViewLocation with coordinates only', () => {
    const loc: RoofViewLocation = { latitude: 6.4474, longitude: 3.4089 };
    expect(loc.latitude).toBe(6.4474);
    expect(loc.longitude).toBe(3.4089);
    expect(loc.address).toBeUndefined();
  });

  it('RoofViewLocation with label', () => {
    const loc: RoofViewLocation = { label: 'Site A', address: 'Lagos' };
    expect(loc.label).toBe('Site A');
  });

  it('RoofViewImageryResult when not available', () => {
    const result: RoofViewImageryResult = {
      available: false,
      error: 'No provider configured',
    };
    expect(result.available).toBe(false);
    expect(result.imagery_url).toBeUndefined();
  });

  it('RoofViewImageryResult when available', () => {
    const result: RoofViewImageryResult = {
      available: true,
      imagery_url: 'https://example.com/satellite.jpg',
      provider: 'google_maps',
      provider_display_name: 'Google Maps Satellite',
      retrieved_at: '2026-08-25T00:00:00Z',
    };
    expect(result.available).toBe(true);
    expect(result.imagery_url).toMatch(/^https:\/\//);
  });

  it('RoofViewState covers all states', () => {
    const states: RoofViewState[] = [
      'not_configured',
      'configured',
      'fetching',
      'available',
      'error',
      'provider_error',
    ];
    expect(states).toHaveLength(6);
  });
});

// =========================================================
// fetchRoofViewImagery — No Fake Data
// =========================================================

describe('Roof View: fetchRoofViewImagery (mocked)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns not_available when no provider is configured', async () => {
    // Mock the supabase client to return no config
    vi.doMock('@/lib/supabase', () => ({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(() => ({
                  data: null,
                  error: null,
                })),
              })),
            })),
          })),
        })),
        functions: {
          invoke: vi.fn(),
        },
      },
    }));

    const { fetchRoofViewImagery } = await import('../provider-registry');
    const result = await fetchRoofViewImagery({ address: 'Lagos' });

    expect(result.available).toBe(false);
    expect(result.imagery_url).toBeUndefined();
    expect(result.error).toBeTruthy();
  });

  it('never fabricates imagery URLs', async () => {
    vi.doMock('@/lib/supabase', () => ({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(() => ({
                  data: null,
                  error: null,
                })),
              })),
            })),
          })),
        })),
        functions: {
          invoke: vi.fn(),
        },
      },
    }));

    const { fetchRoofViewImagery } = await import('../provider-registry');
    const result = await fetchRoofViewImagery({ latitude: 6.4474, longitude: 3.4089 });

    // Must NOT have a fabricated URL
    expect(result.available).toBe(false);
    expect(result.imagery_url).toBeUndefined();
  });
});

// =========================================================
// No Fabricated Data Rule
// =========================================================

describe('Roof View: No Fake Data Rule', () => {
  it('NOT_CONFIGURED never has an imagery URL', () => {
    const json = JSON.stringify(NOT_CONFIGURED);
    expect(json).not.toMatch(/https?:\/\//);
    expect(json).not.toMatch(/imagery/);
    expect(json).not.toMatch(/\.jpg|\.png|\.tif/i);
  });

  it('SUPPORTED_PROVIDERS never contains API keys', () => {
    const json = JSON.stringify(SUPPORTED_PROVIDERS);
    expect(json).not.toMatch(/AIza[0-9A-Za-z_-]{35}/); // Google API key pattern
    expect(json).not.toMatch(/pk\.[a-zA-Z0-9]+/); // Mapbox token pattern
    expect(json).not.toMatch(/sk_[a-zA-Z0-9]+/);
  });
});
