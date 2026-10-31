// Waste allowances for construction materials.
//
// A quantity takeoff is the physical amount of material the work needs. Buying
// happens at the merchant: tiles break on the cutter, paint stays in the roller,
// cement bags split. This module converts a base quantity into the quantity to
// purchase, and it refuses to add the allowance twice.
//
// Formula: final = base x (1 + percent / 100), then rounded up to whole packages
// where the material is bought in packages.

export const WASTE_MIN_PERCENT = 0;
export const WASTE_MAX_PERCENT = 25;

export type WasteMaterialKey =
  | "tiles"
  | "paint"
  | "screeding"
  | "cement"
  | "sand"
  | "granite"
  | "timber"
  | "roofing"
  | "steel"
  | "flooring"
  | "plumbing"
  | "cable"
  | "conduit";

export interface WasteMaterial {
  key: WasteMaterialKey;
  label: string;
  /** Starting allowance for this material, adjustable per project. */
  defaultPercent: number;
  /** Why this material behaves the way it does. */
  reason: string;
}

export const WASTE_MATERIALS: readonly WasteMaterial[] = [
  {
    key: "tiles",
    label: "Tiles",
    defaultPercent: 10,
    reason: "Cuts at edges, breakage in transit and on the cutter",
  },
  {
    key: "paint",
    label: "Paint",
    defaultPercent: 5,
    reason: "Roller and brush retention, plus touch ups",
  },
  {
    key: "screeding",
    label: "Screeding materials",
    defaultPercent: 8,
    reason: "Uneven substrates and mortar left in the mixer",
  },
  {
    key: "cement",
    label: "Cement",
    defaultPercent: 5,
    reason: "Torn bags and spillage on site",
  },
  {
    key: "sand",
    label: "Sand",
    defaultPercent: 10,
    reason: "Shrinkage when bulk delivered loose",
  },
  {
    key: "granite",
    label: "Granite",
    defaultPercent: 5,
    reason: "Handling chips on exposed aggregate",
  },
  {
    key: "timber",
    label: "Timber",
    defaultPercent: 10,
    reason: "Cross cutting and warped lengths rejected",
  },
  {
    key: "roofing",
    label: "Roofing sheets",
    defaultPercent: 10,
    reason: "Lap allowances and sheets damaged by wind",
  },
  {
    key: "steel",
    label: "Steel reinforcement",
    defaultPercent: 3,
    reason: "Laps and cutting to length, low breakage",
  },
  {
    key: "flooring",
    label: "Flooring materials",
    defaultPercent: 10,
    reason: "Staggered layout and room-by-room cuts",
  },
  {
    key: "cable",
    label: "Cable",
    defaultPercent: 5,
    reason:
      "Offcuts at every pull and termination, plus the tail you cannot pull back once it is clipped.",
  },
  {
    key: "conduit",
    label: "Conduit",
    defaultPercent: 5,
    reason:
      "Bends, cuts and lengths damaged while chasing a wall, none of which can be reused.",
  },
  {
    key: "plumbing",
    label: "Plumbing materials",
    defaultPercent: 5,
    reason: "Fittings broken during jointing and testing",
  },
];

const MATERIAL_INDEX = new Map(WASTE_MATERIALS.map((m) => [m.key, m]));

export interface WastePreset {
  percent: number;
  label: string;
  description: string;
}

export const WASTE_PRESETS: readonly WastePreset[] = [
  { percent: 0, label: "None", description: "No additional allowance" },
  { percent: 5, label: "Low", description: "Clean, simple layouts" },
  { percent: 10, label: "Standard", description: "The usual allowance" },
  { percent: 15, label: "Higher", description: "Awkward rooms and detail" },
  { percent: 20, label: "Complex", description: "Many cuts and small areas" },
  { percent: 25, label: "High", description: "Custom, high-waste work" },
];

export function wasteMaterial(key: WasteMaterialKey): WasteMaterial {
  return MATERIAL_INDEX.get(key) ?? WASTE_MATERIALS[0];
}

/** Keeps a slider or typed value inside the supported range. */
export function clampWastePercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(WASTE_MAX_PERCENT, Math.max(WASTE_MIN_PERCENT, percent));
}

/** The preset a percentage sits on, or null between presets. */
export function presetFor(percent: number): WastePreset | null {
  return WASTE_PRESETS.find((p) => p.percent === percent) ?? null;
}

export function presetLabel(percent: number): string {
  return presetFor(percent)?.label ?? `${percent}% custom`;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface WasteSettings {
  /** Off means base quantities are used as they are. */
  enabled: boolean;
  /** Per-material overrides, in percent. */
  perMaterial: Partial<Record<WasteMaterialKey, number>>;
}

export const WASTE_SETTINGS_KEY = "frelux_waste_settings_v1";

/**
 * Settings with no per-material overrides. An absent entry means "use the
 * catalogue recommendation", which is what lets a page keep its own starting
 * margin until the user actually chooses one.
 */
export function defaultWasteSettings(): WasteSettings {
  return { enabled: true, perMaterial: {} };
}

/** The catalogue recommendation for a material. */
export function materialDefaultPercent(material: WasteMaterialKey): number {
  return wasteMaterial(material).defaultPercent;
}

/**
 * A page's starting margin: the user's own choice if they have made one for
 * this material, otherwise whatever that page has always used.
 */
export function startingWastePercent(
  settings: WasteSettings,
  material: WasteMaterialKey,
  pageFallback: number,
): number {
  // The master switch means no allowance anywhere, not just in the control.
  if (!settings.enabled) return 0;
  const stored = settings.perMaterial[material];
  if (typeof stored === "number" && Number.isFinite(stored))
    return clampWastePercent(stored);
  return clampWastePercent(pageFallback);
}

/** The percentage to use for a material, honouring the enable switch. */
export function resolveWastePercent(
  settings: WasteSettings,
  material: WasteMaterialKey,
): number {
  if (!settings.enabled) return 0;
  const override = settings.perMaterial[material];
  if (typeof override === "number" && Number.isFinite(override))
    return clampWastePercent(override);
  return wasteMaterial(material).defaultPercent;
}

/** Reads saved settings, falling back to the material defaults. */
export function loadWasteSettings(
  storage?: Pick<Storage, "getItem">,
): WasteSettings {
  const defaults = defaultWasteSettings();
  const store =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return defaults;
  try {
    const raw = store.getItem(WASTE_SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<WasteSettings>;
    const perMaterial: Partial<Record<WasteMaterialKey, number>> = {};
    if (parsed.perMaterial && typeof parsed.perMaterial === "object") {
      (Object.keys(parsed.perMaterial) as WasteMaterialKey[]).forEach((key) => {
        const value = parsed.perMaterial?.[key];
        if (typeof value === "number" && Number.isFinite(value))
          perMaterial[key] = clampWastePercent(value);
      });
    }
    return { enabled: parsed.enabled !== false, perMaterial };
  } catch {
    return defaults;
  }
}

export function saveWasteSettings(
  settings: WasteSettings,
  storage?: Pick<Storage, "setItem">,
): void {
  const store =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return;
  try {
    store.setItem(WASTE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // A full or blocked quota must not stop a calculation.
  }
}

// ---------------------------------------------------------------------------
// Applying the allowance
// ---------------------------------------------------------------------------

export interface WasteBreakdown {
  /** Whether an allowance was actually added. */
  applied: boolean;
  /** The physical quantity the work needs. */
  base: number;
  /** Percentage actually applied, after clamping and the enable switch. */
  percent: number;
  /** Extra quantity the allowance buys. */
  additional: number;
  /** Quantity to purchase, before package rounding. */
  final: number;
  /** Whole packages when a package size was given. */
  packages: number | null;
  /** Quantity to order, after rounding up to whole packages. */
  orderQuantity: number;
  /** True when package rounding pushed the quantity up. */
  roundedUp: boolean;
  /** Set when the request was refused rather than computed. */
  refused?: "already-applied" | "invalid-base";
}

function round(value: number, dp = 6): number {
  const factor = 10 ** dp;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export interface ApplyWasteOptions {
  /** Package size in the material's own unit, for bagged or boxed goods. */
  packageSize?: number | null;
  /**
   * True when the quantity handed in already has an allowance in it. The engine
   * then refuses to add a second one; adding waste twice quietly inflates every
   * order and is the exact failure this flag exists to stop.
   */
  alreadyIncludesWaste?: boolean;
}

/**
 * Applies a waste allowance to a base quantity.
 *
 * A refused application is returned as an object, never as a silent zero, so a
 * caller can see why nothing was added.
 */
export function applyWaste(
  base: number,
  percent: number,
  options: ApplyWasteOptions = {},
): WasteBreakdown {
  const empty = (refused?: WasteBreakdown["refused"]): WasteBreakdown => ({
    applied: false,
    base: Number.isFinite(base) ? base : 0,
    percent: 0,
    additional: 0,
    final: Number.isFinite(base) ? base : 0,
    packages: null,
    orderQuantity: Number.isFinite(base) ? base : 0,
    roundedUp: false,
    refused,
  });

  if (options.alreadyIncludesWaste) return empty("already-applied");
  if (!Number.isFinite(base) || base < 0) return empty("invalid-base");

  const applied = clampWastePercent(percent);
  const final = round(base * (1 + applied / 100));
  const additional = round(final - base);
  const packageSize = options.packageSize;

  if (packageSize && Number.isFinite(packageSize) && packageSize > 0) {
    const packages = Math.max(1, Math.ceil(round(final / packageSize, 9)));
    const orderQuantity = round(packages * packageSize);
    return {
      applied: applied > 0,
      base,
      percent: applied,
      additional,
      final,
      packages,
      orderQuantity,
      roundedUp: orderQuantity > final + 1e-9,
    };
  }

  return {
    applied: applied > 0,
    base,
    percent: applied,
    additional,
    final,
    packages: null,
    orderQuantity: final,
    roundedUp: false,
  };
}

/** Convenience: resolve the percentage for a material, then apply it. */
export function applyMaterialWaste(
  base: number,
  material: WasteMaterialKey,
  settings: WasteSettings,
  options: ApplyWasteOptions = {},
): WasteBreakdown {
  return applyWaste(base, resolveWastePercent(settings, material), options);
}

export interface WasteRow {
  label: string;
  value: string;
}

function formatQuantity(value: number, unit: string): string {
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return unit ? `${text} ${unit}` : text;
}

/**
 * The four rows every calculator shows: base, allowance, extra, and what to
 * order. Unit strings come from the caller, which knows the material.
 */
export function wasteRows(breakdown: WasteBreakdown, unit = ""): WasteRow[] {
  const rows: WasteRow[] = [
    { label: "Base quantity", value: formatQuantity(breakdown.base, unit) },
    { label: "Waste allowance", value: `${breakdown.percent}%` },
    {
      label: "Additional quantity",
      value: formatQuantity(breakdown.additional, unit),
    },
    {
      label: breakdown.packages ? "Recommended order" : "Final quantity",
      value: breakdown.packages
        ? `${formatQuantity(breakdown.orderQuantity, unit)} (${breakdown.packages} ${breakdown.packages === 1 ? "package" : "packages"})`
        : formatQuantity(breakdown.orderQuantity, unit),
    },
  ];
  return rows;
}

/** One line for a quote or report: the arithmetic, spelled out. */
export function wasteSummary(breakdown: WasteBreakdown, unit = ""): string {
  if (!breakdown.applied)
    return `No waste allowance applied. ${formatQuantity(breakdown.base, unit)} as calculated.`;
  const extra = formatQuantity(breakdown.additional, unit);
  const total = formatQuantity(breakdown.orderQuantity, unit);
  const packages = breakdown.packages
    ? ` (${breakdown.packages} packages)`
    : "";
  return `Base ${formatQuantity(breakdown.base, unit)} plus ${breakdown.percent}% waste (${extra}) gives ${total}${packages}.`;
}
