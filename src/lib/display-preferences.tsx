import {
  applyViewport,
  deviceCssShortEdge,
  deviceCssWidth,
  deviceTakesTouch,
  isPhoneDevice,
  viewportContent,
} from "@/lib/display-viewport";
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
export const DISPLAY_SCALE_OPTIONS = [
  50, 60, 70, 75, 80, 90, 100, 110, 125,
] as const;
export type DisplayScale = (typeof DISPLAY_SCALE_OPTIONS)[number];

export interface DisplayPreferences {
  scale: DisplayScale;
  compact: boolean;
  wideView: boolean;
}

/**
 * Scale for a device with no saved preference.
 *
 * 50% is a desktop choice: it lays a full site out at once on a large screen.
 * On a phone it is unreadable (body text lands near 8px and iOS auto-zooms any
 * field under 16px), so phones start at 80% instead: still wide enough to get
 * the tablet layout, still legible without pinch-zooming. Only the starting
 * point changes; whatever the visitor picks is saved and wins afterwards.
 */
export const DEFAULT_MOBILE_SCALE: DisplayScale = 80;
export const DEFAULT_DESKTOP_SCALE: DisplayScale = 50;

/**
 * The fallback and Reset target when the device is not known to be a phone.
 * Exported because the settings copy, the pre-paint script in index.html and
 * the tests all need to agree with it; three hardcoded copies of "50" is three
 * places to forget.
 */
export const DEFAULT_PREFERENCES: DisplayPreferences = {
  scale: DEFAULT_DESKTOP_SCALE,
  compact: true,
  wideView: true,
};

/** The default for this device, judged the same way the viewport scale is. */
export function defaultScaleForDevice(win: Window = window): DisplayScale {
  const isPhone = isPhoneDevice({
    deviceShortEdge: deviceCssShortEdge(win),
    touch: deviceTakesTouch(win),
  });
  return isPhone ? DEFAULT_MOBILE_SCALE : DEFAULT_DESKTOP_SCALE;
}

/** The defaults this device should start from and reset to. */
export function defaultPreferencesForDevice(
  win: Window = window,
): DisplayPreferences {
  return { ...DEFAULT_PREFERENCES, scale: defaultScaleForDevice(win) };
}

function parsePreferences(
  value: unknown,
  fallback: DisplayPreferences = defaultPreferencesForDevice(),
): DisplayPreferences {
  if (!value || typeof value !== "object") return fallback;
  const input = value as Partial<DisplayPreferences>;
  return {
    scale: DISPLAY_SCALE_OPTIONS.includes(input.scale as DisplayScale)
      ? (input.scale as DisplayScale)
      : fallback.scale,
    compact:
      typeof input.compact === "boolean"
        ? input.compact
        : fallback.compact,
    wideView:
      typeof input.wideView === "boolean"
        ? input.wideView
        : fallback.wideView,
  };
}

export function readDisplayPreferences(
  win: Window = window,
): DisplayPreferences {
  const fallback = defaultPreferencesForDevice(win);
  try {
    const raw = win.localStorage?.getItem(DISPLAY_PREFERENCE_KEY);
    return raw ? parsePreferences(JSON.parse(raw), fallback) : fallback;
  } catch {
    return fallback;
  }
}

function applyDisplayPreferences(value: DisplayPreferences) {
  const root = document.documentElement;
  // Kept as data attributes and a variable for the compact/wide-view CSS and
  // for anything that wants the number; it no longer drives a CSS zoom.
  root.style.setProperty("--frelux-display-scale", String(value.scale / 100));
  root.dataset.freluxCompact = String(value.compact);
  root.dataset.freluxWideView = String(value.wideView);
  root.dataset.freluxScale = String(value.scale);
  // The scale itself is the viewport: the same thing a browser's page zoom
  // changes, so every breakpoint and every width reader follows on every page.
  applyViewport(
    viewportContent({
      deviceWidth: deviceCssWidth(),
      deviceShortEdge: deviceCssShortEdge(),
      touch: deviceTakesTouch(),
      scalePercent: value.scale,
    }).content,
  );
}

interface DisplayPreferencesContextValue extends DisplayPreferences {
  setScale: (scale: DisplayScale) => void;
  setCompact: (compact: boolean) => void;
  setWideView: (wideView: boolean) => void;
  reset: () => void;
}

const DisplayPreferencesContext =
  createContext<DisplayPreferencesContextValue | null>(null);

export function DisplayPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
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

  // The layout width is derived from the device's width, so rotating the phone
  // has to be recomputed: keeping the portrait width after a rotation draws the
  // page edge to edge in portrait and as a narrow strip with a gutter in
  // landscape. Only re-applied when the computed viewport actually changes, so a
  // pinch-zoom (which does not alter the screen dimensions) is left alone.
  useEffect(() => {
    let frame = 0;
    const current = () =>
      viewportContent({
        deviceWidth: deviceCssWidth(),
        deviceShortEdge: deviceCssShortEdge(),
        touch: deviceTakesTouch(),
        scalePercent: preferences.scale,
      }).content;
    const recompute = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyViewport(current());
      });
    };
    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
    };
  }, [preferences.scale]);

  // Another tab, or a back/forward restore, can change what is stored. Without
  // this the panel keeps showing a value the document no longer uses.
  useEffect(() => {
    const sync = () => setPreferences(readDisplayPreferences());
    window.addEventListener("storage", sync);
    window.addEventListener("pageshow", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);

  const setScale = useCallback((scale: DisplayScale) => {
    setPreferences((current) => ({ ...current, scale }));
  }, []);
  const setCompact = useCallback((compact: boolean) => {
    setPreferences((current) => ({ ...current, compact }));
  }, []);
  const setWideView = useCallback((wideView: boolean) => {
    setPreferences((current) => ({ ...current, wideView }));
  }, []);
  // Reset returns to this device's own starting point, not to a desktop number
  // a phone could never read.
  const reset = useCallback(
    () => setPreferences(defaultPreferencesForDevice()),
    [],
  );

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

/**
 * Display preferences, or the defaults when no provider is mounted.
 *
 * Deliberately total rather than throwing (2026-11-09): the settings trigger
 * lives in the shell, and a headless harness or an alternative layout tree that
 * renders the header without the provider must still render. A cosmetic
 * preference is not worth blanking the page for. The dev warning keeps a real
 * wiring mistake visible instead of silently doing nothing.
 */
const FALLBACK_PREFERENCES: DisplayPreferencesContextValue = {
  ...DEFAULT_PREFERENCES,
  setScale: () => undefined,
  setCompact: () => undefined,
  setWideView: () => undefined,
  reset: () => undefined,
};

let warnedMissingProvider = false;

export function useDisplayPreferences() {
  const value = useContext(DisplayPreferencesContext);
  if (!value) {
    if (import.meta.env.DEV && !warnedMissingProvider) {
      warnedMissingProvider = true;
      console.warn(
        "useDisplayPreferences used without DisplayPreferencesProvider; falling back to defaults.",
      );
    }
    return FALLBACK_PREFERENCES;
  }
  return value;
}
