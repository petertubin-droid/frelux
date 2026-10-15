import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

export interface EstimatorDraftStoragePayload<T> {
  data: T;
  savedAt: string;
  version?: number;
}

export interface UseEstimatorDraftOptions<T> {
  onRestore?: (saved: T) => void;
  debounceMs?: number;
  showToast?: boolean;
  customToastTitle?: string;
  customToastMessage?: string;
  validateDraft?: (data: unknown) => data is T;
  storagePrefix?: string;
  enabled?: boolean;
}

export interface UseEstimatorDraftResult<T> {
  isRestored: boolean;
  hasSavedDraft: boolean;
  lastSavedAt: string | null;
  saveDraft: (explicitState?: T) => void;
  clearDraft: () => void;
  dismissRestored: () => void;
}

const DEFAULT_PREFIX = "frelux_draft_";
const DEFAULT_DEBOUNCE_MS = 500;

export function useEstimatorDraft<T>(
  formKey: string,
  currentState: T,
  options: UseEstimatorDraftOptions<T> = {},
): UseEstimatorDraftResult<T> {
  const {
    onRestore,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    showToast = true,
    customToastTitle,
    customToastMessage,
    validateDraft,
    storagePrefix = DEFAULT_PREFIX,
    enabled = true,
  } = options;

  let toastApi: ReturnType<typeof useToast> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    toastApi = useToast();
  } catch {
    // If rendered outside ToastProvider (e.g. in some isolated tests), gracefully fallback
    toastApi = null;
  }

  const [isRestored, setIsRestored] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const storageKey = `${storagePrefix}${formKey}`;
  const initialChecked = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(currentState);
  stateRef.current = currentState;

  // 1. Initial draft restoration on mount
  useEffect(() => {
    if (!enabled || initialChecked.current || typeof window === "undefined") {
      return;
    }
    initialChecked.current = true;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed: EstimatorDraftStoragePayload<T> = JSON.parse(raw);
      if (!parsed || !parsed.data) return;

      // Optional runtime validation
      if (validateDraft && !validateDraft(parsed.data)) {
        return;
      }

      setHasSavedDraft(true);
      setLastSavedAt(parsed.savedAt || null);
      setIsRestored(true);

      if (onRestore) {
        onRestore(parsed.data);
      }

      if (showToast && toastApi) {
        toastApi.toast({
          type: "info",
          title: customToastTitle || "Calculation restored",
          message:
            customToastMessage ||
            "We restored your previous calculation. Click 'Start fresh' to reset.",
        });
      }
    } catch (err) {
      console.warn(
        `[useEstimatorDraft] Failed to restore draft for "${formKey}":`,
        err,
      );
    }
  }, [
    enabled,
    formKey,
    storageKey,
    onRestore,
    showToast,
    customToastTitle,
    customToastMessage,
    validateDraft,
    toastApi,
  ]);

  // 2. Debounced auto-save
  useEffect(() => {
    if (!enabled || !initialChecked.current || typeof window === "undefined") {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        const payload: EstimatorDraftStoragePayload<T> = {
          data: currentState,
          savedAt: new Date().toISOString(),
          version: 1,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
        setHasSavedDraft(true);
        setLastSavedAt(payload.savedAt);
      } catch (err) {
        console.warn(
          `[useEstimatorDraft] Failed to auto-save draft for "${formKey}":`,
          err,
        );
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentState, enabled, formKey, storageKey, debounceMs]);

  // 3. Explicit save
  const saveDraft = useCallback(
    (explicitState?: T) => {
      if (typeof window === "undefined") return;
      try {
        const payload: EstimatorDraftStoragePayload<T> = {
          data: explicitState !== undefined ? explicitState : stateRef.current,
          savedAt: new Date().toISOString(),
          version: 1,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
        setHasSavedDraft(true);
        setLastSavedAt(payload.savedAt);
      } catch (err) {
        console.warn(`[useEstimatorDraft] Manual save failed:`, err);
      }
    },
    [storageKey],
  );

  // 4. Clear draft
  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(storageKey);
      setHasSavedDraft(false);
      setIsRestored(false);
      setLastSavedAt(null);
    } catch (err) {
      console.warn(`[useEstimatorDraft] Clear draft failed:`, err);
    }
  }, [storageKey]);

  const dismissRestored = useCallback(() => {
    setIsRestored(false);
  }, []);

  return {
    isRestored,
    hasSavedDraft,
    lastSavedAt,
    saveDraft,
    clearDraft,
    dismissRestored,
  };
}
