/**
 * Project city selection for Nigerian pricing.
 *
 * Kept out of the component file so the picker stays a pure component (and fast
 * refresh keeps working). The choice is per browser and read explicitly by the
 * calculator that renders the selector.
 */
import { useCallback, useEffect, useState } from "react";
import { useMarket } from "@/lib/international/market-context";
import { LAUNCH_CITIES, fetchCities } from "@/lib/price-index/queries";
import type { MarketCity } from "@/lib/price-index/types";

export const CITY_STORAGE_KEY = "frelux_project_city";
const CITY_EVENT = "frelux:project-city";

export function readProjectCity(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useProjectCity(): {
  citySlug: string | null;
  setCitySlug: (slug: string | null) => void;
  cities: MarketCity[];
} {
  const { marketCode } = useMarket();
  const [citySlug, setSlug] = useState<string | null>(() => readProjectCity());
  const [cities, setCities] = useState<MarketCity[]>(
    LAUNCH_CITIES as MarketCity[],
  );

  useEffect(() => {
    if (marketCode !== "NG") return;
    let cancelled = false;
    fetchCities()
      .then((result) => {
        if (!cancelled && result.cities.length) setCities(result.cities);
      })
      .catch(() => {
        /* keep the bundled city list: pricing still works offline */
      });
    return () => {
      cancelled = true;
    };
  }, [marketCode]);

  useEffect(() => {
    const handler = () => setSlug(readProjectCity());
    window.addEventListener(CITY_EVENT, handler);
    return () => window.removeEventListener(CITY_EVENT, handler);
  }, []);

  const setCitySlug = useCallback((slug: string | null) => {
    setSlug(slug);
    try {
      if (slug) localStorage.setItem(CITY_STORAGE_KEY, slug);
      else localStorage.removeItem(CITY_STORAGE_KEY);
    } catch {
      /* storage unavailable: the choice still applies to this session */
    }
    window.dispatchEvent(new Event(CITY_EVENT));
  }, []);

  return { citySlug, setCitySlug, cities };
}
