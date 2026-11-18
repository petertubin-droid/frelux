import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cleanTransportAmount,
  NO_TRANSPORTATION,
  type TransportationChoice,
} from "@/lib/estimation/transportation";

const STORAGE_PREFIX = "frelux:transport:";

function readChoice(key: string): TransportationChoice {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return NO_TRANSPORTATION;
    const parsed = JSON.parse(raw) as Partial<TransportationChoice>;
    return {
      enabled: parsed.enabled === true,
      amount: cleanTransportAmount(parsed.amount),
    };
  } catch {
    return NO_TRANSPORTATION;
  }
}

export interface TransportationControls {
  choice: TransportationChoice;
  setEnabled: (enabled: boolean) => void;
  setAmount: (amount: number) => void;
  reset: () => void;
}

/**
 * The visitor's optional delivery choice for one calculator.
 *
 * Kept in localStorage (like the site's other UI preferences) so a contractor
 * who always charges haulage does not retype it on every estimate, and kept
 * per calculator so a small paint job does not inherit a block delivery fee.
 */
export function useTransportation(key: string): TransportationControls {
  const [choice, setChoice] = useState<TransportationChoice>(() =>
    typeof window === "undefined" ? NO_TRANSPORTATION : readChoice(key),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(choice));
    } catch {
      /* storage full or blocked: the choice still applies to this page */
    }
  }, [choice, key]);

  const setEnabled = useCallback((enabled: boolean) => {
    setChoice((current) => ({ ...current, enabled }));
  }, []);

  const setAmount = useCallback((amount: number) => {
    setChoice((current) => ({
      ...current,
      amount: cleanTransportAmount(amount),
    }));
  }, []);

  const reset = useCallback(() => setChoice(NO_TRANSPORTATION), []);

  return useMemo(
    () => ({ choice, setEnabled, setAmount, reset }),
    [choice, setEnabled, setAmount, reset],
  );
}
