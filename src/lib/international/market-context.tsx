/* eslint-disable react-refresh/only-export-components */
/**
 * FRELUX INTERNATIONAL ARCHITECTURE — Market Context Provider
 *
 * React context + hook for accessing the current market context.
 *
 * This is purely additive. If no market is selected, it defaults to Nigeria.
 * Existing calculators that don't use this context are unaffected.
 *
 * Flow:
 *   1. Check user_market_preferences table (if logged in)
 *   2. Fall back to Nigeria defaults
 *   3. Provide resolved market context + unit preferences to components
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getSupabase } from "@/lib/supabase-lazy";
import { useAuth } from "@/lib/auth";
import type {
  MarketProfile,
  ResolvedMarketContext,
  PreferredLengthUnit,
  PreferredAreaUnit,
} from "@/types/international";

// ============================================================
// DEFAULTS (Nigeria — preserving existing behavior)
// ============================================================

export const DEFAULT_MARKET_CODE = "NG";

export const NIGERIA_DEFAULTS: ResolvedMarketContext = {
  marketCode: "NG",
  countryName: "Nigeria",
  currencyCode: "NGN",
  currencySymbol: "₦",
  measurementSystem: "mixed",
  defaultLengthUnit: "meters",
  defaultAreaUnit: "sqm",
  supportedLengthUnits: ["meters", "feet", "inches"],
  supportedAreaUnits: ["sqm", "sqft"],
  defaultLanguage: "en",
  localTerminology: {
    paint_bucket: "gallon (4 litres)",
    cement_bag: "50kg bag",
    white_cement_bag: "40kg bag",
    screeding_mix: "Plastering Sand + Cement",
    tile_carton: "carton",
    pop_bag: "25kg bag",
  },
  status: "active",
  profileVersion: "1.0.0",
};

// ============================================================
// CONTEXT TYPE
// ============================================================

interface MarketContextValue {
  market: ResolvedMarketContext;
  marketCode: string;
  isLoading: boolean;
  isNigeria: boolean;

  // Unit preferences
  preferredLengthUnit: PreferredLengthUnit;
  preferredAreaUnit: PreferredAreaUnit;

  // Available markets (for selector)
  availableMarkets: MarketProfile[];

  // Actions
  setMarket: (marketCode: string) => Promise<void>;
  setLengthUnit: (unit: PreferredLengthUnit) => Promise<void>;
  setAreaUnit: (unit: PreferredAreaUnit) => Promise<void>;
  refresh: () => Promise<void>;
}

const MarketContext = createContext<MarketContextValue | undefined>(undefined);

// ============================================================
// PROVIDER
// ============================================================

export function MarketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [market, setMarketState] =
    useState<ResolvedMarketContext>(NIGERIA_DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [preferredLengthUnit, setPreferredLengthUnitState] =
    useState<PreferredLengthUnit>("meters");
  const [preferredAreaUnit, setPreferredAreaUnitState] =
    useState<PreferredAreaUnit>("sqm");
  const [availableMarkets, setAvailableMarkets] = useState<MarketProfile[]>([]);
  const [userMarketCode, setUserMarketCode] =
    useState<string>(DEFAULT_MARKET_CODE);

  // Load available markets (visible ones for the selector)
  useEffect(() => {
    getSupabase().then((supabase) =>
      supabase
      .from("market_profiles")
      .select("*")
      .in("status", ["active", "coming_soon"])
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
    ).then(({ data }) => {
        if (data) setAvailableMarkets(data as unknown as MarketProfile[]);
      });
  }, []);

  // Load user preferences + market profile
  const loadMarketContext = useCallback(async () => {
    setIsLoading(true);
    try {
      let marketCode = DEFAULT_MARKET_CODE;
      let prefLength: PreferredLengthUnit = "meters";
      let prefArea: PreferredAreaUnit = "sqm";

      // Check user preferences if logged in
      if (user) {
        const sb = await getSupabase();
        const { data: pref } = await sb
          .from("user_market_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (pref) {
          marketCode = pref.market_code || DEFAULT_MARKET_CODE;
          prefLength = pref.preferred_length_unit as PreferredLengthUnit;
          prefArea = pref.preferred_area_unit as PreferredAreaUnit;
        }
      }

      // Load market profile
      const sb2 = await getSupabase();
      const { data: profile } = await sb2
        .from("market_profiles")
        .select("*")
        .eq("country_code", marketCode)
        .maybeSingle();

      if (profile) {
        const p = profile as unknown as MarketProfile;
        setMarketState({
          marketCode: p.country_code,
          countryName: p.country_name,
          currencyCode: p.currency_code,
          currencySymbol: p.currency_symbol,
          measurementSystem: p.default_measurement_system,
          defaultLengthUnit: p.default_length_unit as PreferredLengthUnit,
          defaultAreaUnit: p.default_area_unit as PreferredAreaUnit,
          supportedLengthUnits:
            p.supported_length_units as PreferredLengthUnit[],
          supportedAreaUnits: p.supported_area_units as PreferredAreaUnit[],
          defaultLanguage: p.default_language,
          localTerminology: p.local_terminology || {},
          status: p.status,
          profileVersion: p.profile_version,
        });
      } else {
        setMarketState(NIGERIA_DEFAULTS);
      }

      setUserMarketCode(marketCode);
      setPreferredLengthUnitState(prefLength);
      setPreferredAreaUnitState(prefArea);
    } catch {
      // On any error, fall back to Nigeria defaults
      setMarketState(NIGERIA_DEFAULTS);
      setUserMarketCode(DEFAULT_MARKET_CODE);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMarketContext();
  }, [loadMarketContext]);

  // Set market (saves user preference if logged in)
  const setMarket = useCallback(
    async (marketCode: string) => {
      if (!user) return;
      try {
        const sb3 = await getSupabase();
        await sb3
          .from("user_market_preferences")
          .upsert(
            { user_id: user.id, market_code: marketCode },
            { onConflict: "user_id" },
          );
        await loadMarketContext();
      } catch {
        /* ignore — non-critical */
      }
    },
    [user, loadMarketContext],
  );

  const setLengthUnit = useCallback(
    async (unit: PreferredLengthUnit) => {
      setPreferredLengthUnitState(unit);
      if (!user) return;
      try {
        const sb4 = await getSupabase();
        await sb4
          .from("user_market_preferences")
          .upsert(
            { user_id: user.id, preferred_length_unit: unit },
            { onConflict: "user_id" },
          );
      } catch {
        /* ignore */
      }
    },
    [user],
  );

  const setAreaUnit = useCallback(
    async (unit: PreferredAreaUnit) => {
      setPreferredAreaUnitState(unit);
      if (!user) return;
      try {
        const sb5 = await getSupabase();
        await sb5
          .from("user_market_preferences")
          .upsert(
            { user_id: user.id, preferred_area_unit: unit },
            { onConflict: "user_id" },
          );
      } catch {
        /* ignore */
      }
    },
    [user],
  );

  const value: MarketContextValue = {
    market,
    marketCode: userMarketCode,
    isLoading,
    isNigeria: userMarketCode === "NG",
    preferredLengthUnit,
    preferredAreaUnit,
    availableMarkets,
    setMarket,
    setLengthUnit,
    setAreaUnit,
    refresh: loadMarketContext,
  };

  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useMarket(): MarketContextValue {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    // If no provider, return Nigeria defaults (safe fallback)
    return {
      market: NIGERIA_DEFAULTS,
      marketCode: DEFAULT_MARKET_CODE,
      isLoading: false,
      isNigeria: true,
      preferredLengthUnit: "meters",
      preferredAreaUnit: "sqm",
      availableMarkets: [],
      setMarket: async () => {},
      setLengthUnit: async () => {},
      setAreaUnit: async () => {},
      refresh: async () => {},
    };
  }
  return ctx;
}

// ============================================================
// HELPER: Get current currency symbol
// ============================================================

export function useCurrencySymbol(): string {
  const { market } = useMarket();
  return market.currencySymbol;
}

export function useCurrencyCode(): string {
  const { market } = useMarket();
  return market.currencyCode;
}
