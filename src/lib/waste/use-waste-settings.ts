// React bindings for the waste allowance: one saved setting shared by every
// calculator, kept in step across tabs and components.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  WASTE_MATERIALS,
  applyWaste,
  clampWastePercent,
  defaultWasteSettings,
  loadWasteSettings,
  resolveWastePercent,
  saveWasteSettings,
  materialDefaultPercent,
  startingWastePercent,
  type ApplyWasteOptions,
  type WasteBreakdown,
  type WasteMaterialKey,
  type WasteSettings,
} from "./waste-factor";

const SYNC_EVENT = "frelux-waste-settings";

/**
 * Binds a page's own waste input to the shared store. A page keeps its familiar
 * starting value until the visitor chooses otherwise; after that, their choice
 * follows them to every calculator handling the same material.
 */
export function useWasteBridge(
  material: WasteMaterialKey,
  pageFallback: number,
): { value: number; setValue: (percent: number) => void; recommended: number } {
  const { settings, setMaterialPercent } = useWasteSettings();
  return useMemo(
    () => ({
      value: startingWastePercent(settings, material, pageFallback),
      setValue: (percent: number) => setMaterialPercent(material, percent),
      recommended: materialDefaultPercent(material),
    }),
    [settings, material, pageFallback, setMaterialPercent],
  );
}

export interface WasteSettingsHandle {
  settings: WasteSettings;
  setEnabled: (enabled: boolean) => void;
  setMaterialPercent: (material: WasteMaterialKey, percent: number) => void;
  setAllPercent: (percent: number) => void;
  reset: () => void;
  percentFor: (material: WasteMaterialKey) => number;
  breakdown: (
    base: number,
    material: WasteMaterialKey,
    options?: ApplyWasteOptions,
  ) => WasteBreakdown;
}

export function useWasteSettings(): WasteSettingsHandle {
  const [settings, setSettings] = useState<WasteSettings>(() =>
    loadWasteSettings(),
  );

  const commit = useCallback((next: WasteSettings) => {
    setSettings(next);
    saveWasteSettings(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: next }));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<WasteSettings>).detail;
      setSettings(detail ?? loadWasteSettings());
    };
    const fromStorage = (event: StorageEvent) => {
      if (!event.key || event.key.includes("waste_settings"))
        setSettings(loadWasteSettings());
    };
    window.addEventListener(SYNC_EVENT, sync as EventListener);
    window.addEventListener("storage", fromStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync as EventListener);
      window.removeEventListener("storage", fromStorage);
    };
  }, []);

  const setEnabled = useCallback(
    (enabled: boolean) => commit({ ...settings, enabled }),
    [commit, settings],
  );

  const setMaterialPercent = useCallback(
    (material: WasteMaterialKey, percent: number) =>
      commit({
        ...settings,
        perMaterial: {
          ...settings.perMaterial,
          [material]: clampWastePercent(percent),
        },
      }),
    [commit, settings],
  );

  const setAllPercent = useCallback(
    (percent: number) => {
      const value = clampWastePercent(percent);
      const perMaterial: WasteSettings["perMaterial"] = {};
      (Object.keys(settings.perMaterial) as WasteMaterialKey[]).forEach(
        (key) => {
          perMaterial[key] = value;
        },
      );
      commit({ ...settings, perMaterial });
    },
    [commit, settings],
  );

  const reset = useCallback(() => commit(defaultWasteSettings()), [commit]);

  const percentFor = useCallback(
    (material: WasteMaterialKey) => resolveWastePercent(settings, material),
    [settings],
  );

  const breakdown = useCallback(
    (
      base: number,
      material: WasteMaterialKey,
      options: ApplyWasteOptions = {},
    ) => applyWaste(base, resolveWastePercent(settings, material), options),
    [settings],
  );

  return useMemo(
    () => ({
      settings,
      setEnabled,
      setMaterialPercent,
      setAllPercent,
      reset,
      percentFor,
      breakdown,
    }),
    [
      settings,
      setEnabled,
      setMaterialPercent,
      setAllPercent,
      reset,
      percentFor,
      breakdown,
    ],
  );
}
