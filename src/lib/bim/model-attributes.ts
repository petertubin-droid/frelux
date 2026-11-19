/**
 * Pillar 3: accuracy attributes read from declared IFC property sets.
 *
 * The takeoff already knows how much of something there is. This module
 * answers the other half of an accurate estimate: WHICH specification the
 * quantity belongs to (fire rating, external exposure, load bearing, U-value).
 *
 * Scope discipline:
 *  - Every attribute is `null` when the model does not declare it. Nothing is
 *    defaulted, inferred from the class name, or guessed from a nearby value.
 *  - Values are reported exactly as the file states them (e.g. "2 HR",
 *    "FD60"), never normalised into a rating the file did not claim.
 *  - `reviewFlags` describes what a human must confirm before a price is
 *    applied. It is not a price and never substitutes for one.
 */

import type { IfcElementProperty, IfcModelElement } from "./ifc-model-loader";

export interface ElementAccuracyAttributes {
  /** declared fire rating, verbatim (e.g. "FD60", "2 HR") */
  fireRating: string | null;
  /** declared external exposure */
  isExternal: boolean | null;
  /** declared structural role */
  loadBearing: boolean | null;
  /** declared thermal transmittance, W/m2K, as stated */
  thermalTransmittance: number | null;
  /** declared acoustic rating, verbatim (e.g. "Rw 35") */
  acousticRating: string | null;
  /** declared security rating, verbatim */
  securityRating: string | null;
  /** declared product reference / type mark (e.g. "FD60-SS") */
  reference: string | null;
  /** declared finish, verbatim */
  finish: string | null;
  /** declared glazed fraction of the opening, 0..1 as stated */
  glazingAreaFraction: number | null;
}

export const EMPTY_ATTRIBUTES: ElementAccuracyAttributes = {
  fireRating: null,
  isExternal: null,
  loadBearing: null,
  thermalTransmittance: null,
  acousticRating: null,
  securityRating: null,
  reference: null,
  finish: null,
  glazingAreaFraction: null,
};

/** Property names we read, mapped to the attribute they fill. */
const PROPERTY_ALIASES: Record<
  keyof ElementAccuracyAttributes,
  readonly string[]
> = {
  fireRating: ["firerating"],
  isExternal: ["isexternal"],
  loadBearing: ["loadbearing"],
  thermalTransmittance: ["thermaltransmittance", "uvalue"],
  acousticRating: ["acousticrating", "soundrating"],
  securityRating: ["securityrating"],
  reference: [
    "reference",
    "referencenumber",
    "typemark",
    "manufacturertypename",
  ],
  finish: ["finish", "surfacefinish", "finishmaterial"],
  glazingAreaFraction: ["glazingareafraction"],
};

function asString(v: string | number | boolean): string | null {
  if (typeof v === "string") return v.trim() === "" ? null : v;
  if (typeof v === "number") return String(v);
  return null;
}

function asNumber(v: string | number | boolean): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asBoolean(v: string | number | boolean): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "t" || s === "yes") return true;
    if (s === "false" || s === "f" || s === "no") return false;
  }
  return null;
}

function findProperty(
  properties: readonly IfcElementProperty[],
  aliases: readonly string[],
): string | number | boolean | null {
  for (const alias of aliases) {
    const hit = properties.find((p) => p.name.toLowerCase() === alias);
    if (hit) return hit.value;
  }
  return null;
}

/**
 * Read the accuracy attributes an element declares. Absent properties stay
 * null; the caller can distinguish "not declared" from "declared false".
 */
export function readAccuracyAttributes(
  element: Pick<IfcModelElement, "properties">,
): ElementAccuracyAttributes {
  const properties = element.properties ?? [];
  if (properties.length === 0) return { ...EMPTY_ATTRIBUTES };

  const raw = (key: keyof ElementAccuracyAttributes) =>
    findProperty(properties, PROPERTY_ALIASES[key]);

  const out: ElementAccuracyAttributes = {
    fireRating: asString(raw("fireRating") ?? ""),
    isExternal: asBoolean(raw("isExternal") ?? ""),
    loadBearing: asBoolean(raw("loadBearing") ?? ""),
    thermalTransmittance: asNumber(raw("thermalTransmittance") ?? ""),
    acousticRating: asString(raw("acousticRating") ?? ""),
    securityRating: asString(raw("securityRating") ?? ""),
    reference: asString(raw("reference") ?? ""),
    finish: asString(raw("finish") ?? ""),
    glazingAreaFraction: asNumber(raw("glazingAreaFraction") ?? ""),
  };

  // asString("") returns null, so unset keys are already null.
  return out;
}

const OPENING_CLASSES = new Set(["IFCDOOR", "IFCWINDOW", "IFCCURTAINWALL"]);

/**
 * What a human must confirm before this line's price is trustworthy. These
 * are questions about specification, not about quantity: the takeoff already
 * knows how much, and these say which rate applies.
 */
export function accuracyReviewFlags(
  ifcClass: string,
  attributes: ElementAccuracyAttributes,
): string[] {
  const flags: string[] = [];
  const isOpening = OPENING_CLASSES.has(ifcClass);

  if (attributes.fireRating) {
    flags.push(
      isOpening
        ? `Fire rating declared (${attributes.fireRating}): price against a certified fire-rated unit of that rating, not a standard door or window rate.`
        : `Fire rating declared (${attributes.fireRating}): confirm the rate covers the declared fire resistance.`,
    );
  } else if (isOpening) {
    flags.push(
      "No fire rating declared: confirm whether a standard or fire-rated unit applies before pricing.",
    );
  }

  if (attributes.isExternal === true) {
    flags.push(
      "Declared external: use the external-grade rate (weathering, thermal and finish specification differ from internal).",
    );
  }

  if (attributes.loadBearing === true) {
    flags.push(
      "Declared load bearing: structural rate and engineer sign-off apply.",
    );
  }

  if (attributes.thermalTransmittance !== null) {
    flags.push(
      `Declared U-value ${attributes.thermalTransmittance}: select a unit meeting it; the price book is not filtered by U-value.`,
    );
  }

  if (attributes.securityRating) {
    flags.push(
      `Security rating declared (${attributes.securityRating}): price a unit certified to that rating.`,
    );
  }

  if (attributes.finish) {
    flags.push(
      `Finish declared (${attributes.finish}): confirm the finish allowance is included in the rate.`,
    );
  }

  return flags;
}

/** Accuracy-relevant properties the model did NOT declare, for honest gaps. */
export function declaredAttributeGaps(
  attributes: ElementAccuracyAttributes,
): Array<keyof ElementAccuracyAttributes> {
  return (
    Object.keys(attributes) as Array<keyof ElementAccuracyAttributes>
  ).filter((k) => attributes[k] === null);
}
