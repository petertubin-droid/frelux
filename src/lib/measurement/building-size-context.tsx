/**
 * The one building every tool measures.
 *
 * A user sizes the building once, then any calculator reads the same numbers
 * instead of retyping them. The stored shape is validated on read: a stale or
 * hand-edited local value is discarded rather than trusted, because a corrupted
 * building would silently change every quantity downstream.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppliedBuilding } from "./building-schedule";

export const BUILDING_SIZE_STORAGE_KEY = "frelux.building-size.v1";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Structural check on a stored building. Anything short of this is dropped. */
export function parseStoredBuilding(raw: string | null): AppliedBuilding | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as Partial<AppliedBuilding>;
  if (typeof candidate.label !== "string") return null;
  if (candidate.unit !== "feet" && candidate.unit !== "meters") return null;
  if (!Array.isArray(candidate.drafts) || candidate.drafts.length === 0)
    return null;
  const schedule = candidate.schedule;
  if (!schedule || !Array.isArray(schedule.rooms) || schedule.rooms.length === 0)
    return null;
  const totals = candidate.totals;
  if (!totals) return null;
  for (const key of [
    "netWallAreaM2",
    "grossWallAreaM2",
    "floorAreaM2",
    "wallRunM",
    "openingsAreaM2",
  ] as const) {
    if (!isFiniteNumber(totals[key])) return null;
  }
  return candidate as AppliedBuilding;
}

interface BuildingSizeValue {
  building: AppliedBuilding | null;
  setBuilding: (building: AppliedBuilding | null) => void;
  clear: () => void;
}

const BuildingSizeContext = createContext<BuildingSizeValue | null>(null);

function readStorage(): AppliedBuilding | null {
  if (typeof window === "undefined") return null;
  try {
    return parseStoredBuilding(window.localStorage.getItem(BUILDING_SIZE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function BuildingSizeProvider({ children }: { children: ReactNode }) {
  const [building, setBuildingState] = useState<AppliedBuilding | null>(() =>
    readStorage(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (building) {
        window.localStorage.setItem(
          BUILDING_SIZE_STORAGE_KEY,
          JSON.stringify(building),
        );
      } else {
        window.localStorage.removeItem(BUILDING_SIZE_STORAGE_KEY);
      }
    } catch {
      // Private mode or a full quota: the session still works in memory.
    }
  }, [building]);

  const setBuilding = useCallback((next: AppliedBuilding | null) => {
    setBuildingState(next);
  }, []);

  const clear = useCallback(() => setBuildingState(null), []);

  const value = useMemo(
    () => ({ building, setBuilding, clear }),
    [building, setBuilding, clear],
  );

  return (
    <BuildingSizeContext.Provider value={value}>
      {children}
    </BuildingSizeContext.Provider>
  );
}

/**
 * Read the shared building. Returns an inert value outside a provider so a tool
 * rendered in isolation keeps working instead of throwing.
 */
export function useBuildingSize(): BuildingSizeValue {
  return (
    useContext(BuildingSizeContext) ?? {
      building: null,
      setBuilding: () => {},
      clear: () => {},
    }
  );
}
