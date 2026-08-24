/**
 * FRELUX MARKET INTELLIGENCE — Provider Registry
 *
 * Manages provider adapters. New providers register here.
 * The price engine uses this registry to select providers by priority.
 *
 * Provider API keys are NEVER stored here — they go in Supabase secrets.
 * This module only manages adapter registration and selection.
 */

import type {
  PriceProviderAdapter,
  MiProvider,
  MiProviderUsage,
  ProviderHealthStatus,
} from '@/types/market-intelligence';

// ============================================================
// REGISTRY
// ============================================================

const adapterRegistry = new Map<string, PriceProviderAdapter>();

/**
 * Register a provider adapter.
 * Called at module initialization time by each provider's adapter file.
 */
export function registerProviderAdapter(adapter: PriceProviderAdapter): void {
  adapterRegistry.set(adapter.name, adapter);
}

/**
 * Get a registered adapter by provider name.
 */
export function getProviderAdapter(name: string): PriceProviderAdapter | undefined {
  return adapterRegistry.get(name);
}

/**
 * Get all registered adapters.
 */
export function getAllAdapters(): PriceProviderAdapter[] {
  return Array.from(adapterRegistry.values());
}

// ============================================================
// PROVIDER SELECTION (by priority + availability)
// ============================================================

/**
 * Select the best available provider from a list of configured DB providers.
 * Uses priority (lower = higher), enabled status, and quota availability.
 */
export function selectProvider(
  dbProviders: MiProvider[],
  usageMap: Map<string, MiProviderUsage | null>,
): { provider: MiProvider; adapter: PriceProviderAdapter } | null {
  // Filter to enabled providers, sorted by priority
  const enabled = dbProviders
    .filter((p) => p.is_enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const provider of enabled) {
    const adapter = getProviderAdapter(provider.provider_name);
    if (!adapter) continue;

    // Check if adapter is configured
    if (!adapter.isConfigured()) continue;

    // Check quota
    const usage = usageMap.get(provider.id) ?? null;
    if (!adapter.hasQuota(usage)) continue;

    return { provider, adapter };
  }

  return null;
}

/**
 * Get fallback providers (in priority order) when the primary fails.
 */
export function getFallbackProviders(
  dbProviders: MiProvider[],
  usageMap: Map<string, MiProviderUsage | null>,
): { provider: MiProvider; adapter: PriceProviderAdapter }[] {
  const enabled = dbProviders
    .filter((p) => p.is_enabled && p.is_fallback)
    .sort((a, b) => a.priority - b.priority);

  const result: { provider: MiProvider; adapter: PriceProviderAdapter }[] = [];
  for (const provider of enabled) {
    const adapter = getProviderAdapter(provider.provider_name);
    if (!adapter || !adapter.isConfigured()) continue;

    const usage = usageMap.get(provider.id) ?? null;
    if (!adapter.hasQuota(usage)) continue;

    result.push({ provider, adapter });
  }

  return result;
}

// ============================================================
// HEALTH CHECK
// ============================================================

export function checkAllProviderHealth(): { name: string; status: ProviderHealthStatus }[] {
  return getAllAdapters().map((adapter) => ({
    name: adapter.name,
    status: adapter.getHealthStatus(),
  }));
}
