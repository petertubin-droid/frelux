/**
 * Global UI widget visibility toggles.
 *
 * Controls whether high-profile floating/sticky UI widgets (such as the mobile
 * bottom navigation bar and the floating AI live chat assistant) are active on
 * the public site.
 *
 * Both default to toggled off (false) as configured by site administration.
 * Admin toggles in AdminSettings and AdminAiSettings persist to storage and
 * broadcast state changes across all mounted components.
 */

import { useEffect, useState, useCallback } from "react";

export interface WidgetSettings {
  bottomNavEnabled: boolean;
  liveChatEnabled: boolean;
}

export const WIDGET_SETTINGS_STORAGE_KEY = "frelux_widget_settings_v1";
export const WIDGET_SETTINGS_EVENT = "frelux_widget_settings_change";

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  bottomNavEnabled: false,
  liveChatEnabled: false,
};

/** Read the current widget settings safely from localStorage. */
export function getWidgetSettings(): WidgetSettings {
  if (typeof window === "undefined") return DEFAULT_WIDGET_SETTINGS;
  try {
    const raw = window.localStorage.getItem(WIDGET_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGET_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      bottomNavEnabled:
        typeof parsed.bottomNavEnabled === "boolean"
          ? parsed.bottomNavEnabled
          : DEFAULT_WIDGET_SETTINGS.bottomNavEnabled,
      liveChatEnabled:
        typeof parsed.liveChatEnabled === "boolean"
          ? parsed.liveChatEnabled
          : DEFAULT_WIDGET_SETTINGS.liveChatEnabled,
    };
  } catch {
    return DEFAULT_WIDGET_SETTINGS;
  }
}

/** Update widget settings, persist to localStorage, and broadcast change. */
export function setWidgetSettings(
  patch: Partial<WidgetSettings>,
): WidgetSettings {
  const current = getWidgetSettings();
  const next: WidgetSettings = {
    ...current,
    ...patch,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        WIDGET_SETTINGS_STORAGE_KEY,
        JSON.stringify(next),
      );
      window.dispatchEvent(
        new CustomEvent(WIDGET_SETTINGS_EVENT, { detail: next }),
      );
    } catch {
      // Storage quota or security error
    }
  }
  return next;
}

/** Hook to consume and observe widget visibility settings with reactive updates. */
export function useWidgetSettings() {
  const [settings, setSettings] = useState<WidgetSettings>(getWidgetSettings);

  useEffect(() => {
    // Initial sync
    setSettings(getWidgetSettings());

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<WidgetSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(getWidgetSettings());
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === WIDGET_SETTINGS_STORAGE_KEY) {
        setSettings(getWidgetSettings());
      }
    };

    window.addEventListener(WIDGET_SETTINGS_EVENT, handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(WIDGET_SETTINGS_EVENT, handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const update = useCallback((patch: Partial<WidgetSettings>) => {
    const next = setWidgetSettings(patch);
    setSettings(next);
  }, []);

  return {
    ...settings,
    updateWidgetSettings: update,
  };
}
