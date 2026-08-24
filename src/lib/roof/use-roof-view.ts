/**
 * FRELUX ROOF VIEW — React Hook
 *
 * useRoofView — manages the roof view state for the Building-to-Roof Estimator.
 *
 * Feature 2: Roof View
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getRoofViewConfig,
  getRoofViewState,
  fetchRoofViewImagery,
  clearRoofViewConfigCache,
} from './provider-registry';
import type {
  RoofViewProviderConfig,
  RoofViewState,
  RoofViewLocation,
  RoofViewImageryResult,
} from './types';

export interface UseRoofViewReturn {
  /** Current roof view state */
  state: RoofViewState;
  /** Provider config (or null if not loaded) */
  config: RoofViewProviderConfig | null;
  /** Imagery result (or null if not fetched) */
  imagery: RoofViewImageryResult | null;
  /** Loading state for config check */
  loadingConfig: boolean;
  /** Loading state for imagery fetch */
  loadingImagery: boolean;
  /** Fetch imagery for a location */
  fetchImagery: (location: RoofViewLocation) => Promise<void>;
  /** Reset imagery state */
  resetImagery: () => void;
  /** Refresh config (e.g. after admin changes) */
  refreshConfig: () => Promise<void>;
}

/**
 * Hook for managing roof view imagery state.
 *
 * On mount, checks whether an imagery provider is configured.
 * If configured, allows fetching imagery for a location.
 * If not configured, shows a clear "not configured" state.
 */
export function useRoofView(): UseRoofViewReturn {
  const [config, setConfig] = useState<RoofViewProviderConfig | null>(null);
  const [state, setState] = useState<RoofViewState>('not_configured');
  const [imagery, setImagery] = useState<RoofViewImageryResult | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingImagery, setLoadingImagery] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkConfig() {
      setLoadingConfig(true);
      const cfg = await getRoofViewConfig();
      if (!mounted) return;
      setConfig(cfg);
      setState(getRoofViewState(cfg));
      setLoadingConfig(false);
    }

    checkConfig();

    return () => {
      mounted = false;
    };
  }, []);

  const fetchImagery = useCallback(async (location: RoofViewLocation) => {
    setLoadingImagery(true);
    setState('fetching');
    setImagery(null);

    const result = await fetchRoofViewImagery(location);

    if (result.available) {
      setState('available');
      setImagery(result);
    } else if (result.provider_error) {
      setState('provider_error');
      setImagery(result);
    } else {
      setState('error');
      setImagery(result);
    }

    setLoadingImagery(false);
  }, []);

  const resetImagery = useCallback(() => {
    setImagery(null);
    if (config) {
      setState(getRoofViewState(config));
    } else {
      setState('not_configured');
    }
  }, [config]);

  const refreshConfig = useCallback(async () => {
    clearRoofViewConfigCache();
    setLoadingConfig(true);
    const cfg = await getRoofViewConfig();
    setConfig(cfg);
    setState(getRoofViewState(cfg));
    setLoadingConfig(false);
  }, []);

  return {
    state,
    config,
    imagery,
    loadingConfig,
    loadingImagery,
    fetchImagery,
    resetImagery,
    refreshConfig,
  };
}
