/* eslint-disable react-refresh/only-export-components */
/**
 * FRELUX INTERNATIONAL ARCHITECTURE, Market Context Provider
 *
 * React context + hook for accessing the current market context.
 *
 * Defaults to Nigeria if not set or chosen.
 * Persists market and unit choices in localStorage for guests,
 * and synchronizes with Supabase user_market_preferences when authenticated.
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
// STORAGE KEYS & DEFAULTS
// ============================================================

export const DEFAULT_MARKET_CODE = "NG";
export const MARKET_STORAGE_KEY = "frelux_market";
export const LENGTH_UNIT_STORAGE_KEY = "frelux_length_unit";
export const AREA_UNIT_STORAGE_KEY = "frelux_area_unit";

export function isMarketSupported(ctx: ResolvedMarketContext): boolean {
  return ctx.status === "active";
}

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

export const BUILTIN_MARKET_PROFILES: MarketProfile[] = [
  {
    id: "profile-ng",
    country_code: "NG",
    country_name: "Nigeria",
    region: "West Africa",
    currency_code: "NGN",
    currency_symbol: "₦",
    currency_name: "Nigerian Naira",
    default_measurement_system: "mixed",
    supported_length_units: ["meters", "feet", "inches"],
    supported_area_units: ["sqm", "sqft"],
    default_length_unit: "meters",
    default_area_unit: "sqm",
    default_language: "en",
    local_terminology: {
      paint_bucket: "gallon (4 litres)",
      cement_bag: "50kg bag",
      white_cement_bag: "40kg bag",
      screeding_mix: "Plastering Sand + Cement",
      tile_carton: "carton",
      pop_bag: "25kg bag",
    },
    status: "active",
    inherits_from: null,
    profile_version: "1.0.0",
    sort_order: 10,
    is_visible: true,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "profile-us",
    country_code: "US",
    country_name: "United States",
    region: "North America",
    currency_code: "USD",
    currency_symbol: "$",
    currency_name: "US Dollar",
    default_measurement_system: "imperial",
    supported_length_units: ["feet", "inches", "meters"],
    supported_area_units: ["sqft", "sqm"],
    default_length_unit: "feet",
    default_area_unit: "sqft",
    default_language: "en",
    local_terminology: {
      paint_bucket: "1 gal / 5 gal pail",
      cement_bag: "94lb bag",
      white_cement_bag: "94lb bag",
      screeding_mix: "Joint Compound / Sheetrock Skim Coat",
      tile_carton: "box",
      pop_bag: "drywall sheet (4x8)",
    },
    status: "active",
    inherits_from: null,
    profile_version: "1.0.0",
    sort_order: 20,
    is_visible: true,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "profile-gb",
    country_code: "GB",
    country_name: "United Kingdom",
    region: "Europe",
    currency_code: "GBP",
    currency_symbol: "£",
    currency_name: "British Pound",
    default_measurement_system: "metric",
    supported_length_units: ["meters", "feet", "inches"],
    supported_area_units: ["sqm", "sqft"],
    default_length_unit: "meters",
    default_area_unit: "sqm",
    default_language: "en",
    local_terminology: {
      paint_bucket: "5L / 10L tub",
      cement_bag: "25kg bag",
      white_cement_bag: "25kg bag",
      screeding_mix: "Gyproc Easi-Fill / Plaster",
      tile_carton: "box",
      pop_bag: "plasterboard sheet",
    },
    status: "active",
    inherits_from: null,
    profile_version: "1.0.0",
    sort_order: 30,
    is_visible: true,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "profile-ca",
    country_code: "CA",
    country_name: "Canada",
    region: "North America",
    currency_code: "CAD",
    currency_symbol: "C$",
    currency_name: "Canadian Dollar",
    default_measurement_system: "imperial",
    supported_length_units: ["feet", "inches", "meters"],
    supported_area_units: ["sqft", "sqm"],
    default_length_unit: "feet",
    default_area_unit: "sqft",
    default_language: "en",
    local_terminology: {
      paint_bucket: "1 gal / 5 gal pail",
      cement_bag: "40kg / 88lb bag",
      white_cement_bag: "40kg bag",
      screeding_mix: "Drywall Joint Compound",
      tile_carton: "box",
      pop_bag: "drywall sheet",
    },
    status: "active",
    inherits_from: null,
    profile_version: "1.0.0",
    sort_order: 40,
    is_visible: true,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "profile-au",
    country_code: "AU",
    country_name: "Australia",
    region: "Oceania",
    currency_code: "AUD",
    currency_symbol: "A$",
    currency_name: "Australian Dollar",
    default_measurement_system: "metric",
    supported_length_units: ["meters", "feet", "inches"],
    supported_area_units: ["sqm", "sqft"],
    default_length_unit: "meters",
    default_area_unit: "sqm",
    default_language: "en",
    local_terminology: {
      paint_bucket: "4L / 10L tin",
      cement_bag: "20kg bag",
      white_cement_bag: "20kg bag",
      screeding_mix: "Render / Basecoat Plaster",
      tile_carton: "box",
      pop_bag: "plasterboard sheet",
    },
    status: "active",
    inherits_from: null,
    profile_version: "1.0.0",
    sort_order: 50,
    is_visible: true,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "profile-de",
    country_code: "DE",
    country_name: "Germany",
    region: "Europe",
    currency_code: "EUR",
    currency_symbol: "€",
    currency_name: "Euro",
    default_measurement_system: "metric",
    supported_length_units: ["meters", "feet", "inches"],
    supported_area_units: ["sqm", "sqft"],
    default_length_unit: "meters",
    default_area_unit: "sqm",
    default_language: "de",
    local_terminology: {
      paint_bucket: "10L Eimer",
      cement_bag: "25kg Sack",
      white_cement_bag: "25kg Sack",
      screeding_mix: "Spachtelmasse",
      tile_carton: "Karton",
      pop_bag: "Gipskartonplatte",
    },
    status: "active",
    inherits_from: null,
    profile_version: "1.0.0",
    sort_order: 60,
    is_visible: true,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "profile-in",
    country_code: "IN",
    country_name: "India",
    region: "Asia",
    currency_code: "INR",
    currency_symbol: "₹",
    currency_name: "Indian Rupee",
    default_measurement_system: "metric",
    supported_length_units: ["meters", "feet", "inches"],
    supported_area_units: ["sqm", "sqft"],
    default_length_unit: "meters",
    default_area_unit: "sqm",
    default_language: "en",
    local_terminology: {
      paint_bucket: "10L / 20L bucket",
      cement_bag: "50kg bag",
      white_cement_bag: "40kg / 50kg bag",
      screeding_mix: "Birla White WallCare Putty",
      tile_carton: "box",
      pop_bag: "25kg POP bag",
    },
    status: "active",
    inherits_from: null,
    profile_version: "1.0.0",
    sort_order: 70,
    is_visible: true,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "profile-gh",
    country_code: "GH",
    country_name: "Ghana",
    region: "West Africa",
    currency_code: "GHS",
    currency_symbol: "GH₵",
    currency_name: "Ghanaian Cedi",
    default_measurement_system: "metric",
    supported_length_units: ["meters", "feet", "inches"],
    supported_area_units: ["sqm", "sqft"],
    default_length_unit: "meters",
    default_area_unit: "sqm",
    default_language: "en",
    local_terminology: {
      paint_bucket: "gallon (4.5 litres)",
      cement_bag: "42.5kg / 50kg bag",
      white_cement_bag: "40kg bag",
      screeding_mix: "Plastering Sand + Cement",
      tile_carton: "carton",
      pop_bag: "25kg bag",
    },
    status: "active",
    inherits_from: null,
    profile_version: "1.0.0",
    sort_order: 80,
    is_visible: true,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "profile-ke",
    country_code: "KE",
    country_name: "Kenya",
    region: "East Africa",
    currency_code: "KES",
    currency_symbol: "KSh",
    currency_name: "Kenyan Shilling",
    default_measurement_system: "metric",
    supported_length_units: ["meters", "feet", "inches"],
    supported_area_units: ["sqm", "sqft"],
    default_length_unit: "meters",
    default_area_unit: "sqm",
    default_language: "en",
    local_terminology: {
      paint_bucket: "4L / 20L tin",
      cement_bag: "50kg bag",
      white_cement_bag: "40kg bag",
      screeding_mix: "Plaster & Wall Skim",
      tile_carton: "carton",
      pop_bag: "gypsum board sheet",
    },
    status: "active",
    inherits_from: null,
    profile_version: "1.0.0",
    sort_order: 90,
    is_visible: true,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "profile-za",
    country_code: "ZA",
    country_name: "South Africa",
    region: "Southern Africa",
    currency_code: "ZAR",
    currency_symbol: "R",
    currency_name: "South African Rand",
    default_measurement_system: "metric",
    supported_length_units: ["meters", "feet", "inches"],
    supported_area_units: ["sqm", "sqft"],
    default_length_unit: "meters",
    default_area_unit: "sqm",
    default_language: "en",
    local_terminology: {
      paint_bucket: "5L / 20L bucket",
      cement_bag: "50kg bag",
      white_cement_bag: "40kg bag",
      screeding_mix: "Skim Plaster / Cretestone",
      tile_carton: "box",
      pop_bag: "rhinoboard ceiling sheet",
    },
    status: "active",
    inherits_from: null,
    profile_version: "1.0.0",
    sort_order: 100,
    is_visible: true,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function profileToResolvedContext(p: MarketProfile): ResolvedMarketContext {
  return {
    marketCode: p.country_code,
    countryName: p.country_name,
    currencyCode: p.currency_code,
    currencySymbol: p.currency_symbol,
    measurementSystem: p.default_measurement_system,
    defaultLengthUnit: p.default_length_unit as PreferredLengthUnit,
    defaultAreaUnit: p.default_area_unit as PreferredAreaUnit,
    supportedLengthUnits: p.supported_length_units as PreferredLengthUnit[],
    supportedAreaUnits: p.supported_area_units as PreferredAreaUnit[],
    defaultLanguage: p.default_language,
    localTerminology: p.local_terminology || {},
    status: p.status,
    profileVersion: p.profile_version,
  };
}

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
  const [market, setMarketState] = useState<ResolvedMarketContext>(() => {
    try {
      const saved = localStorage.getItem(MARKET_STORAGE_KEY);
      if (saved) {
        const found = BUILTIN_MARKET_PROFILES.find((p) => p.country_code === saved);
        if (found) return profileToResolvedContext(found);
      }
    } catch {
      // storage unavailable
    }
    return NIGERIA_DEFAULTS;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [preferredLengthUnit, setPreferredLengthUnitState] = useState<PreferredLengthUnit>(() => {
    try {
      const saved = localStorage.getItem(LENGTH_UNIT_STORAGE_KEY);
      if (saved === "meters" || saved === "feet" || saved === "inches") return saved;
    } catch {
      // ignore
    }
    return market.defaultLengthUnit;
  });
  const [preferredAreaUnit, setPreferredAreaUnitState] = useState<PreferredAreaUnit>(() => {
    try {
      const saved = localStorage.getItem(AREA_UNIT_STORAGE_KEY);
      if (saved === "sqm" || saved === "sqft") return saved;
    } catch {
      // ignore
    }
    return market.defaultAreaUnit;
  });
  const [availableMarkets, setAvailableMarkets] = useState<MarketProfile[]>(BUILTIN_MARKET_PROFILES);
  const [userMarketCode, setUserMarketCode] = useState<string>(() => market.marketCode);

  // Load available markets from Supabase and merge with built-in profiles
  useEffect(() => {
    let cancelled = false;
    getSupabase()
      .then((supabase) =>
        supabase
          .from("market_profiles")
          .select("*")
          .in("status", ["active", "coming_soon"])
          .eq("is_visible", true)
          .order("sort_order", { ascending: true }),
      )
      .then(({ data }) => {
        if (cancelled || !data || data.length === 0) return;
        const map = new Map<string, MarketProfile>();
        for (const p of BUILTIN_MARKET_PROFILES) {
          map.set(p.country_code, p);
        }
        for (const p of data as unknown as MarketProfile[]) {
          map.set(p.country_code, p);
        }
        const merged = Array.from(map.values()).sort(
          (a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99),
        );
        setAvailableMarkets(merged);
      })
      .catch(() => {
        // Fall back to built-in profiles
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load user preferences + market profile
  const loadMarketContext = useCallback(async () => {
    setIsLoading(true);
    try {
      let marketCode = DEFAULT_MARKET_CODE;
      let prefLength: PreferredLengthUnit = "meters";
      let prefArea: PreferredAreaUnit = "sqm";

      // 1. Check local storage first (works for guests and offline)
      try {
        const savedCode = localStorage.getItem(MARKET_STORAGE_KEY);
        if (savedCode) marketCode = savedCode;
        const savedLength = localStorage.getItem(LENGTH_UNIT_STORAGE_KEY);
        if (savedLength) prefLength = savedLength as PreferredLengthUnit;
        const savedArea = localStorage.getItem(AREA_UNIT_STORAGE_KEY);
        if (savedArea) prefArea = savedArea as PreferredAreaUnit;
      } catch {
        // storage unavailable
      }

      // 2. Check user preferences if logged in
      if (user) {
        try {
          const sb = await getSupabase();
          const { data: pref } = await sb
            .from("user_market_preferences")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (pref) {
            marketCode = pref.market_code || marketCode;
            prefLength = (pref.preferred_length_unit as PreferredLengthUnit) || prefLength;
            prefArea = (pref.preferred_area_unit as PreferredAreaUnit) || prefArea;
          }
        } catch {
          // ignore network/db error
        }
      }

      // 3. Resolve profile from Supabase or built-in
      let resolved: ResolvedMarketContext | null = null;
      try {
        const sb2 = await getSupabase();
        const { data: profile } = await sb2
          .from("market_profiles")
          .select("*")
          .eq("country_code", marketCode)
          .maybeSingle();

        if (profile) {
          resolved = profileToResolvedContext(profile as unknown as MarketProfile);
        }
      } catch {
        // Supabase error: use built-in
      }

      if (!resolved) {
        const builtin = BUILTIN_MARKET_PROFILES.find((p) => p.country_code === marketCode);
        if (builtin) {
          resolved = profileToResolvedContext(builtin);
        } else {
          resolved = NIGERIA_DEFAULTS;
        }
      }

      setMarketState(resolved);
      setUserMarketCode(marketCode);
      setPreferredLengthUnitState(prefLength);
      setPreferredAreaUnitState(prefArea);
    } catch {
      setMarketState(NIGERIA_DEFAULTS);
      setUserMarketCode(DEFAULT_MARKET_CODE);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMarketContext();
  }, [loadMarketContext]);

  // Set market (persists for guests in localStorage and for users in database)
  const setMarket = useCallback(
    async (targetCode: string) => {
      try {
        localStorage.setItem(MARKET_STORAGE_KEY, targetCode);
      } catch {
        // ignore storage errors
      }
      setUserMarketCode(targetCode);

      const targetProfile =
        availableMarkets.find((m) => m.country_code === targetCode) ||
        BUILTIN_MARKET_PROFILES.find((m) => m.country_code === targetCode);

      if (targetProfile) {
        const resolved = profileToResolvedContext(targetProfile);
        setMarketState(resolved);
        setPreferredLengthUnitState(resolved.defaultLengthUnit);
        setPreferredAreaUnitState(resolved.defaultAreaUnit);

        try {
          localStorage.setItem(LENGTH_UNIT_STORAGE_KEY, resolved.defaultLengthUnit);
          localStorage.setItem(AREA_UNIT_STORAGE_KEY, resolved.defaultAreaUnit);
          localStorage.setItem("frelux_currency", resolved.currencyCode);
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(
            new CustomEvent("frelux:market-changed", { detail: { market: targetProfile } }),
          );
        } catch {
          // ignore storage errors
        }
      }

      if (user) {
        try {
          const sb3 = await getSupabase();
          await sb3
            .from("user_market_preferences")
            .upsert(
              { user_id: user.id, market_code: targetCode },
              { onConflict: "user_id" },
            );
        } catch {
          /* ignore, non-critical */
        }
      }
    },
    [user, availableMarkets],
  );

  const setLengthUnit = useCallback(
    async (unit: PreferredLengthUnit) => {
      setPreferredLengthUnitState(unit);
      try {
        localStorage.setItem(LENGTH_UNIT_STORAGE_KEY, unit);
      } catch {
        // ignore
      }
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
      try {
        localStorage.setItem(AREA_UNIT_STORAGE_KEY, unit);
      } catch {
        // ignore
      }
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
      availableMarkets: BUILTIN_MARKET_PROFILES,
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
