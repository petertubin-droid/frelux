import { useEffect, useState } from "react";
import {
  emptyPricing,
  priceSystemBoq,
  type PriceableBoqLine,
  type SystemBoqPricing,
} from "./system-boq-pricing";

/**
 * Price a system BOQ for the selected market.
 *
 * The engine returns a fresh array on every render, so the effect keys on the
 * content that can change the answer rather than on array identity. A market
 * with no prices resolves to an empty result, which the UI states plainly
 * instead of showing a total of zero.
 */
export function useSystemBoqPricing(
  boq: PriceableBoqLine[] | undefined,
  market: string | undefined,
  citySlug?: string | null,
): SystemBoqPricing {
  const [pricing, setPricing] = useState<SystemBoqPricing>(emptyPricing());

  const key =
    boq && market
      ? [
          market,
          citySlug ?? "-",
          ...boq.map(
            (b) =>
              `${b.code}:${b.pricingQuantity ?? b.quantity}:${b.priceRole ?? "-"}`,
          ),
        ].join("|")
      : "";

  useEffect(() => {
    if (!boq || !market || boq.length === 0) {
      setPricing(emptyPricing());
      return;
    }
    let cancelled = false;
    setPricing((prev) => ({ ...prev, loading: true }));
    priceSystemBoq(boq, market, citySlug ?? null)
      .then((res) => {
        if (!cancelled) setPricing(res);
      })
      .catch(() => {
        if (!cancelled) setPricing(emptyPricing());
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return pricing;
}
