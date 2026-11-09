import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const DISPLAY_PREFERENCE_KEY = "frelux_display_preferences_v1";
export const DISPLAY_SCALE_OPTIONS = [50, 60, 70, 75, 80, 90, 100, 110, 125] as const;
export type DisplayScale = (typeof DISPLAY_SCALE_OPTIONS)[number];

export interface DisplayPreferences {
  scale: DisplayScale;
  compact: boolean;
  wideView: boolean;
}

const DEFAULT_PREFERENCES: DisplayPreferences = {
  scale: 50,
  compact: true,
  wideView: true,
};

function parsePreferences(value: unknown): DisplayPreferences {
  if (!value || typeof value !== "object") return DEFAULT_PREFERENCES;
  const input = value as Partial<DisplayPreferences>;
  return {
    scale: DISPLAY_SCALE_OPTIONS.includes(input.scale as DisplayScale)
      ? (input.scale as DisplayScale)
      : DEFAULT_PREFERENCES.scale,
    compact:
      typeof input.compact === "boolean"
        ? input.compact
        : DEFAULT_PREFERENCES.compact,
    wideView:
      typeof input.wideView === "boolean"
        ? input.wideView
        : DEFAULT_PREFERENCES.wideView,
  };
}

export function readDisplayPreferences(): DisplayPreferences {
  try {
    const raw = localStorage.getItem(DISPLAY_PREFERENCE_KEY);
    return raw ? parsePreferences(JSON.parse(raw)) : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function applyDisplayPreferences(value: DisplayPreferences) {
  const root = document.documentElement;
  root.style.setProperty("--frelux-display-scale", String(value.scale / 100));
  root.dataset.freluxCompact = String(value.compact);
  root.dataset.freluxWideView = String(value.wideView);
  root.dataset.freluxScale = String(value.scale);
}

interface DisplayPreferencesContextValue extends DisplayPreferences {
  setScale: (scale: DisplayScale) => void;
  setCompact: (compact: boolean) => void;
  setWideView: (wideView: boolean) => void;
  reset: () => void;
}

const DisplayPreferencesContext = createContext<DisplayPreferencesContextValue | null>(null);

export function DisplayPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<DisplayPreferences>(() =>
    readDisplayPreferences(),
  );

  useEffect(() => {
    applyDisplayPreferences(preferences);
    try {
      localStorage.setItem(DISPLAY_PREFERENCE_KEY, JSON.stringify(preferences));
    } catch {
      // Private browsing or a storage policy can disable persistence; the
      // current tab still honors the preference in React state and on <html>.
    }
  }, [preferences]);

  const setScale = useCallback((scale: DisplayScale) => {
    setPreferences((current) => ({ ...current, scale }));
  }, []);
  const setCompact = useCallback((compact: boolean) => {
    setPreferences((current) => ({ ...current, compact }));
  }, []);
  const setWideView = useCallback((wideView: boolean) => {
    setPreferences((current) => ({ ...current, wideView }));
  }, []);
  const reset = useCallback(() => setPreferences(DEFAULT_PREFERENCES), []);

  const value = useMemo(
    () => ({ ...preferences, setScale, setCompact, setWideView, reset }),
    [preferences, reset, setCompact, setScale, setWideView],
  );
  return (
    <DisplayPreferencesContext.Provider value={value}>
      {children}
    </DisplayPreferencesContext.Provider>
  );
}

export function useDisplayPreferences() {
  const value = useContext(DisplayPreferencesContext);
  if (!value) {
    throw new Error("useDisplayPreferences must be used within its provider");
  }
  return value;
}
