/* eslint-disable react-refresh/only-export-components */
/**
 * FRELUX LOCATION INTELLIGENCE, Project Location Context
 *
 * The shared consumption layer. ONE canonical location record flows in
 * from the host surface's existing state (project row, property row, or
 * calculator router state); this provider resolves the regional context
 * ONCE against the existing market-profile system and hands derived
 * display values to every consumer:
 *
 *   ProjectDetail (Construction Intelligence), currency for stat cards,
 *     shopping totals, estimate lists.
 *   Property surfaces (Property Intelligence), regional context display.
 *   Calculators / estimators, currency override when a saved calculator
 *     project carries a location.
 *
 * Nothing here duplicates location state: the record is owned by the
 * host surface; this context only derives from it.
 *
 * Currency chain (honest, no substitution):
 *   1. Project location → active market profile → its currency.
 *   2. No location / unresolved / unsupported market → null override;
 *      callers keep their existing behavior (site settings / MarketProvider
 *      user preference / ₦ default).
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useMarket } from "@/lib/international/market-context";
import type { FreluxLocation } from "./model";
import {
  resolveRegionalContext,
  type RegionalContext,
} from "./regional";

// ============================================================
// Context
// ============================================================

export interface ProjectLocationContextValue {
  /** The canonical record, owned by the host surface, never copied here. */
  location: FreluxLocation | null;
  /** Resolved once against market_profiles. */
  regional: RegionalContext | null;
  regionalLoading: boolean;
  /** True when the project's region has an ACTIVE market profile. */
  isRegionSupported: boolean;
  /**
   * Currency from the project's active regional profile.
   * NULL when no location / unresolved / unsupported, callers then keep
   * their existing currency source. No other region's currency is
   * ever substituted.
   */
  currencyCode: string | null;
  currencySymbol: string | null;
}

const ProjectLocationContext =
  createContext<ProjectLocationContextValue | undefined>(undefined);

export function ProjectLocationProvider({
  location,
  children,
}: {
  location: FreluxLocation | null;
  children: ReactNode;
}) {
  const [regional, setRegional] = useState<RegionalContext | null>(null);
  const [regionalLoading, setRegionalLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!location) {
      setRegional(null);
      setRegionalLoading(false);
      return;
    }
    setRegionalLoading(true);
    resolveRegionalContext(location)
      .then((ctx) => {
        if (active) setRegional(ctx);
      })
      .catch(() => {
        if (active) setRegional(null);
      })
      .finally(() => {
        if (active) setRegionalLoading(false);
      });
    return () => {
      active = false;
    };
  }, [location]);

  const isRegionSupported = regional?.status === "available";

  return (
    <ProjectLocationContext.Provider
      value={{
        location,
        regional,
        regionalLoading,
        isRegionSupported,
        currencyCode: isRegionSupported ? regional!.currency_code ?? null : null,
        currencySymbol: isRegionSupported
          ? regional!.currency_symbol ?? null
          : null,
      }}
    >
      {children}
    </ProjectLocationContext.Provider>
  );
}

export function useProjectLocation(): ProjectLocationContextValue {
  const ctx = useContext(ProjectLocationContext);
  if (!ctx) {
    throw new Error(
      "useProjectLocation must be used within ProjectLocationProvider",
    );
  }
  return ctx;
}

// ============================================================
// Calculator helper, router-state project location
// ============================================================

/**
 * Resolve the currency for a calculator opened from a saved project
 * (user_projects). Returns the active regional profile's currency, or
 * NULL when the project has no location / unresolved / unsupported :
 * so calculators keep their existing settings-based currency untouched.
 *
 * This reuses the exact same regional resolution as every other surface:
 * one location system, zero duplicated state.
 */
export function useProjectLocationCurrency(
  location: FreluxLocation | null | undefined,
): { currencyCode: string | null; currencySymbol: string | null } {
  const [currency, setCurrency] = useState<{
    currencyCode: string | null;
    currencySymbol: string | null;
  }>({ currencyCode: null, currencySymbol: null });

  useEffect(() => {
    let active = true;
    if (!location) {
      setCurrency({ currencyCode: null, currencySymbol: null });
      return;
    }
    resolveRegionalContext(location)
      .then((ctx) => {
        if (!active) return;
        if (ctx.status === "available") {
          setCurrency({
            currencyCode: ctx.currency_code ?? null,
            currencySymbol: ctx.currency_symbol ?? null,
          });
        } else {
          setCurrency({ currencyCode: null, currencySymbol: null });
        }
      })
      .catch(() => {
        if (active) setCurrency({ currencyCode: null, currencySymbol: null });
      });
    return () => {
      active = false;
    };
  }, [location]);

  return currency;
}

// ============================================================
// Market fallback bridge (existing regional-profile system)
// ============================================================

/**
 * Existing user-preference market context (MarketProvider). Surfaced so
 * location-aware surfaces can fall back to the user's chosen market :
 * the same fallback chain the site used before Location Intelligence.
 */
export function useUserMarketFallback(): ReturnType<typeof useMarket> {
  return useMarket();
}
