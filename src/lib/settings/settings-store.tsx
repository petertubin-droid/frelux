import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useMarket } from "@/lib/international/market-context";
import { setStoredUnitSystem } from "@/lib/international/units-display";
import { countryForMarket, type CountryDefaults } from "./countries";
import {
  resolveGlobalSettings,
  sanitizeOverrides,
  type GlobalSettings,
  type SettingsOverrides,
} from "./global-settings";

/**
 * Persistence for the Global Settings Engine.
 *
 * A guest keeps preferences in localStorage, so the first visit already
 * remembers the country and units without any request. A signed-in visitor
 * gets a row in user_settings, and that row is what loads on any device. The
 * account row is written only when something actually changes, never on every
 * render, and localStorage always mirrors the latest value so the first paint
 * after a reload is correct before the network answers.
 */

export const GUEST_SETTINGS_KEY = "frelux_global_settings_v1";
const TABLE = "user_settings";

export function readStoredOverrides(): SettingsOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GUEST_SETTINGS_KEY);
    if (!raw) return {};
    return sanitizeOverrides(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function writeStoredOverrides(overrides: SettingsOverrides): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      GUEST_SETTINGS_KEY,
      JSON.stringify({ ...overrides, version: 1 }),
    );
  } catch {
    // Storage can be full or blocked. Preferences still work for this page view.
  }
}

export function clearStoredOverrides(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_SETTINGS_KEY);
  } catch {
    // ignore
  }
}

/**
 * Settings for code that is not a React component. Components should use
 * useGlobalSettings() so they re-render when the visitor changes something.
 */
export function currentGlobalSettings(): GlobalSettings {
  return resolveGlobalSettings(readStoredOverrides());
}

interface GlobalSettingsContextValue {
  settings: GlobalSettings;
  overrides: SettingsOverrides;
  /** Country this market would suggest, for the reset affordance. */
  suggestedCountry: CountryDefaults | null;
  isGuest: boolean;
  isLoading: boolean;
  savedToAccount: boolean;
  save: (patch: SettingsOverrides) => Promise<{ ok: boolean; error?: string }>;
  reset: (field?: keyof SettingsOverrides) => Promise<void>;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextValue | null>(
  null,
);

function toRow(userId: string, overrides: SettingsOverrides) {
  return {
    user_id: userId,
    country_code: overrides.countryCode ?? null,
    measurement_system: overrides.measurementSystem ?? null,
    currency_code: overrides.currencyCode ?? null,
    language: overrides.language ?? null,
    number_format: overrides.numberFormat ?? null,
    regional: overrides.regional ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { marketCode, setMarket } = useMarket();
  const [overrides, setOverrides] = useState<SettingsOverrides>(() =>
    readStoredOverrides(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [savedToAccount, setSavedToAccount] = useState(false);
  const pushedMarket = useRef<string | null>(null);

  const settings = useMemo(() => resolveGlobalSettings(overrides), [overrides]);

  // Load the account row once per signed-in session.
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setSavedToAccount(false);
      return;
    }
    setIsLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from(TABLE)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (!error && data) {
          const stored = sanitizeOverrides(data);
          setOverrides(stored);
          writeStoredOverrides(stored);
          setSavedToAccount(true);
        } else if (!error && !data) {
          // First sign-in after using the site as a guest: keep those choices.
          const guest = readStoredOverrides();
          if (Object.keys(guest).length > 0) {
            const { error: writeError } = await supabase
              .from(TABLE)
              .upsert(toRow(user.id, guest), {
                onConflict: "user_id",
              });
            if (!cancelled && !writeError) setSavedToAccount(true);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // A chosen country drives the market, so prices, currencies and copy agree.
  useEffect(() => {
    if (!settings.marketCode || settings.marketCode === marketCode) return;
    if (pushedMarket.current === settings.marketCode) return;
    pushedMarket.current = settings.marketCode;
    void setMarket(settings.marketCode);
  }, [settings.marketCode, marketCode, setMarket]);

  // Units shown on every calculator come from one place.
  useEffect(() => {
    setStoredUnitSystem(settings.measurementSystem);
  }, [settings.measurementSystem]);

  // If the visitor switches market elsewhere in the app, follow it here too.
  // The first run is skipped: on mount the stored settings are already the
  // authority, and adopting the ambient market would undo a saved choice
  // before the market switch it triggered has landed.
  const marketSettled = useRef(false);
  useEffect(() => {
    if (!marketSettled.current) {
      marketSettled.current = true;
      return;
    }
    if (pushedMarket.current === marketCode) return;
    const country = countryForMarket(marketCode);
    if (!country) return;
    setOverrides((prev) =>
      prev.countryCode === country.code
        ? prev
        : { ...prev, countryCode: country.code },
    );
  }, [marketCode]);

  const save = useCallback(
    async (patch: SettingsOverrides) => {
      const merged = sanitizeOverrides({ ...overrides, ...patch });
      setOverrides(merged);
      writeStoredOverrides(merged);
      if (!user) {
        setSavedToAccount(false);
        return { ok: true };
      }
      const { error } = await supabase
        .from(TABLE)
        .upsert(toRow(user.id, merged), { onConflict: "user_id" });
      if (error) {
        return {
          ok: false,
          error: "Saved on this device, but your account could not be updated.",
        };
      }
      setSavedToAccount(true);
      return { ok: true };
    },
    [overrides, user],
  );

  const reset = useCallback(
    async (field?: keyof SettingsOverrides) => {
      const next: SettingsOverrides = { ...overrides };
      if (field) {
        delete next[field];
      } else {
        Object.keys(next).forEach(
          (key) => delete next[key as keyof SettingsOverrides],
        );
      }
      const clean = sanitizeOverrides(next);
      setOverrides(clean);
      writeStoredOverrides(clean);
      if (user) {
        const { error } = await supabase
          .from(TABLE)
          .upsert(toRow(user.id, clean), { onConflict: "user_id" });
        if (!error) setSavedToAccount(true);
      }
    },
    [overrides, user],
  );

  const value = useMemo<GlobalSettingsContextValue>(
    () => ({
      settings,
      overrides,
      suggestedCountry: countryForMarket(marketCode),
      isGuest: !user,
      isLoading,
      savedToAccount,
      save,
      reset,
    }),
    [
      settings,
      overrides,
      marketCode,
      isLoading,
      savedToAccount,
      save,
      reset,
      user,
    ],
  );

  return (
    <GlobalSettingsContext.Provider value={value}>
      {children}
    </GlobalSettingsContext.Provider>
  );
}

/**
 * The one hook calculators and pages use. Outside a provider it still returns
 * usable settings from local storage rather than throwing, which keeps tests
 * and non-app surfaces honest.
 */
export function useGlobalSettings(): GlobalSettingsContextValue {
  const ctx = useContext(GlobalSettingsContext);
  if (ctx) return ctx;
  return {
    settings: resolveGlobalSettings(readStoredOverrides()),
    overrides: readStoredOverrides(),
    suggestedCountry: null,
    isGuest: true,
    isLoading: false,
    savedToAccount: false,
    save: async () => ({
      ok: false,
      error: "Settings are not available on this page.",
    }),
    reset: async () => {},
  };
}

export function useSettingsFormatting() {
  const { settings } = useGlobalSettings();
  return settings;
}
