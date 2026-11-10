/**
 * The roof a plan reader measured, held for the roof calculators.
 *
 * Kept apart from the measured building because a roof is read from a different
 * document and carries different values: pitch, overhang, ridge. It is a reading,
 * never a material quantity, and it is discarded when it cannot be validated so a
 * half-written value can never reach a rafter span.
 */
import { useSyncExternalStore } from "react";
import type { PlanRoof, RoofShape } from "@/lib/takeoff/plan-measurements";

export const PLAN_ROOF_STORAGE_KEY = "frelux.plan-roof.v1";

const SHAPES: RoofShape[] = ["gable", "hip", "mono_pitch", "flat"];
const EVENT = "frelux:plan-roof";

const listeners = new Set<() => void>();

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Reads a stored roof, returning null for anything that is not a complete one. */
export function parseStoredRoof(raw: string | null): PlanRoof | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as Partial<PlanRoof>;
  if (!isFiniteNumber(candidate.lengthM) || candidate.lengthM <= 0) return null;
  if (!isFiniteNumber(candidate.widthM) || candidate.widthM <= 0) return null;
  if (!isFiniteNumber(candidate.pitchDegrees) || candidate.pitchDegrees < 0) return null;
  if (!isFiniteNumber(candidate.overhangM) || candidate.overhangM < 0) return null;
  if (!isFiniteNumber(candidate.risePer12) || candidate.risePer12 < 0) return null;
  const shape = candidate.shape ?? null;
  if (shape !== null && !SHAPES.includes(shape)) return null;
  return {
    lengthM: candidate.lengthM,
    widthM: candidate.widthM,
    pitchDegrees: candidate.pitchDegrees,
    risePer12: candidate.risePer12,
    overhangM: candidate.overhangM,
    ridgeLengthM: isFiniteNumber(candidate.ridgeLengthM) ? candidate.ridgeLengthM : null,
    shape,
    valleys: isFiniteNumber(candidate.valleys) ? candidate.valleys : 0,
    hips: isFiniteNumber(candidate.hips) ? candidate.hips : 0,
    documentKind: candidate.documentKind ?? "roof_plan",
    needsConfirmation: Array.isArray(candidate.needsConfirmation)
      ? candidate.needsConfirmation.filter((line): line is string => typeof line === "string")
      : [],
  };
}

export function readPlanRoof(): PlanRoof | null {
  if (typeof window === "undefined") return null;
  try {
    return parseStoredRoof(window.localStorage.getItem(PLAN_ROOF_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function savePlanRoof(roof: PlanRoof): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLAN_ROOF_STORAGE_KEY, JSON.stringify(roof));
  } catch {
    // A full or blocked storage means the reading is not kept; the form still
    // received the values, so nothing is lost that the user can see.
  }
  listeners.forEach((listener) => listener());
}

export function clearPlanRoof(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PLAN_ROOF_STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") window.addEventListener(EVENT, listener);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener(EVENT, listener);
  };
}

let snapshot: PlanRoof | null = null;
let snapshotRaw: string | null = null;

/** The measured roof, re-read only when its stored text changes. */
export function usePlanRoof(): PlanRoof | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      const raw =
        typeof window === "undefined" ? null : window.localStorage.getItem(PLAN_ROOF_STORAGE_KEY);
      if (raw !== snapshotRaw) {
        snapshotRaw = raw;
        snapshot = parseStoredRoof(raw);
      }
      return snapshot;
    },
    () => null,
  );
}
