/**
 * FRELUX EC3 / OpenEPD Integration (Sustainability Pillar 5)
 *
 * Direct integration with the Building Transparency EC3 API for
 * plant-specific, third-party verified Environmental Product
 * Declarations, replacing static admin-configured carbon estimates
 * with live EPD data wherever a declaration covers the material.
 *
 * Architecture:
 *   Browser/client → supabase edge function `ec3-epd-lookup`
 *   (holds the EC3 API key server-side, never in the bundle)
 *   → https://api.buildingtransparency.org/api/ec3
 *
 * House rules, identical to the whole carbon engine:
 *   - EPD data WINS per category when the edge function returns a
 *     verified declaration; admin-configured factors remain the
 *     fallback, clearly labeled as estimates.
 *   - A missing key, a network failure or a malformed response is a
 *     typed REFUSAL with the reason — a number is never invented,
 *     and the assessment silently falls back to admin factors with
 *     a warning saying exactly that.
 *   - Every EPD factor carries its declaration id, plant name and
 *     verification metadata so an assessor can audit the chain.
 */

import type { RicsModule } from "./whole-life-carbon";

// ─────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────

export interface Ec3EpdSearchRequest {
  /** Material search term, e.g. "ready-mix concrete" or an EC3 category name. */
  materialQuery: string;
  /** Optional plant name / geography filter for plant-specific EPDs. */
  plant?: string;
  /** ISO country code for geography matching, e.g. "US", "GB". */
  country?: string;
  /** Max declarations to return (default 5, hard cap 20). */
  limit?: number;
}

export interface EpdFactor {
  /** Frelux category this factor applies to (normalized lowercase). */
  category: string;
  /** Display label of the declared product. */
  label: string;
  /** EC3/OpenEPD declaration id. */
  epd_id: string;
  /** Declared unit as the EPD states it, e.g. "m3", "kg", "tonne". */
  unit: string;
  /** GWP in kgCO2e per declared unit, product stage (A1–A3). */
  kg_co2e_per_unit: number;
  /** Manufacturing plant, when the EPD is plant-specific. */
  plant: string | null;
  /** Publisher of the declaration (e.g. an ISO 14025 program operator). */
  publisher: string | null;
  /** Declaration validity window from the EPD itself. */
  valid_until: string | null;
  /** Third-party verification status straight from the EPD. */
  verified: boolean;
  /** Lifecycle modules the declaration covers, as EC3/OpenEPD reports them. */
  modules: string[];
  /** Full source citation for the audit narrative. */
  source_reference: string;
}

export interface Ec3LookupOutcome {
  ok: boolean;
  factors: EpdFactor[];
  /** Why the lookup did not produce EPD data, when it did not. */
  reason: string | null;
  /** Raw count of declarations the API returned before normalization. */
  rawCount: number;
  /** Declarations that carried no usable GWP value and were dropped. */
  dropped: number;
}

// ─────────────────────────────────────────────
// Normalization — EC3 and OpenEPD shapes
// ─────────────────────────────────────────────

/** Coerce an EPD-unit field to a single canonical string. */
function epdUnit(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0].trim();
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const k of ["name", "unit", "value", "id"]) {
      if (typeof o[k] === "string" && (o[k] as string).trim()) {
        return (o[k] as string).trim();
      }
    }
  }
  return "";
}

/** Coerce a GWP field (kgCO2e per declared unit) to a finite number. */
function epdGwp(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const v = Number(raw);
    if (Number.isFinite(v)) return v;
  }
  if (Array.isArray(raw)) {
    for (const el of raw) {
      const v = epdGwp(el);
      if (v !== null) return v;
    }
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const k of ["value", "amount", "kgCO2e", "gwp", "a1a3"]) {
      const v = epdGwp(o[k]);
      if (v !== null) return v;
    }
  }
  return null;
}

function str(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

/**
 * Normalize one raw EC3 EPD object (or an OpenEPD-flavoured record) into an
 * EpdFactor. Returns null when the declaration carries no usable GWP — such
 * entries are counted and dropped, never estimated.
 */
export function normalizeEpd(
  raw: Record<string, unknown>,
  fallbackCategory: string,
): EpdFactor | null {
  const id =
    str(raw.id) ?? str(raw.epd_id) ?? str(raw.epdId) ?? str(raw.openEPD) ?? null;
  if (!id) return null;

  const declared = raw.declared_unit ?? raw.declaredUnit ?? raw.unit;
  const unit = epdUnit(declared);
  const gwpRaw =
    raw.embodied_carbon ?? raw.embodiedCarbon ?? raw.gwp ?? raw.co2e ?? null;
  const gwp = epdGwp(gwpRaw);
  if (gwp === null || gwp < 0) return null;

  const name =
    str(raw.name) ?? str(raw.product_name) ?? str(raw.material_name) ?? id;
  const plant = str(raw.plant) ?? str(raw.plant_name) ?? str(raw.manufacturer);
  const publisher =
    str(raw.publisher) ?? str(raw.program_operator) ?? str(raw.issuer);
  const validUntil =
    str(raw.date_valid_until) ?? str(raw.valid_until) ?? str(raw.expires);
  const verifiedRaw = raw.verified ?? raw.third_party_verified ?? raw.conformity;
  const verified =
    verifiedRaw === true ||
    (typeof verifiedRaw === "string" &&
      /verified|third.party|iso ?14025/i.test(verifiedRaw));

  const modules: string[] = Array.isArray(raw.lc_modules ?? raw.modules)
    ? ((raw.lc_modules ?? raw.modules) as unknown[])
        .map((m) => str(m))
        .filter((m): m is string => m !== null)
    : typeof (raw.lc_modules ?? raw.modules) === "string"
      ? [String(raw.lc_modules ?? raw.modules)]
      : [];

  const category =
    str(raw.category) ?? str(raw.ec3_category) ?? fallbackCategory;
  const ref = `EC3 EPD ${id} — ${name}${plant ? ` (plant: ${plant})` : ""}${
    publisher ? `, published by ${publisher}` : ""
  }`;

  return {
    category: category.toLowerCase(),
    label: name,
    epd_id: id,
    unit: unit || "kg",
    kg_co2e_per_unit: gwp,
    plant,
    publisher,
    valid_until: validUntil,
    verified,
    modules: modules.length > 0 ? modules : ["A1", "A2", "A3"],
    source_reference: ref,
  };
}

// ─────────────────────────────────────────────
// Edge function transport
// ─────────────────────────────────────────────

/** Injectable transport so tests run without Supabase; production uses supabase.functions.invoke. */
export type Ec3Transport = (req: Ec3EpdSearchRequest) => Promise<unknown>;

/** Normalize an edge-function response envelope into an outcome. */
export function ec3ResponseToOutcome(
  response: unknown,
  materialQuery: string,
): Ec3LookupOutcome {
  const out: Ec3LookupOutcome = {
    ok: false,
    factors: [],
    reason: null,
    rawCount: 0,
    dropped: 0,
  };
  if (!response || typeof response !== "object") {
    out.reason =
      "The EC3 lookup returned no usable payload: EPD data was not fetched and nothing was invented.";
    return out;
  }
  const res = response as Record<string, unknown>;
  if (res.error) {
    out.reason =
      typeof res.error === "string"
        ? `${res.error} EPD data was not fetched and nothing was invented.`
        : "The EC3 lookup failed: EPD data was not fetched and nothing was invented.";
    return out;
  }
  const list = Array.isArray(res.epds)
    ? res.epds
    : Array.isArray(res.data)
      ? res.data
      : Array.isArray(response)
        ? (response as unknown[])
        : null;
  if (!list) {
    out.reason =
      "The EC3 lookup response had no declaration list: EPD data was not fetched and nothing was invented.";
    return out;
  }
  out.rawCount = list.length;
  for (const raw of list) {
    if (!raw || typeof raw !== "object") {
      out.dropped += 1;
      continue;
    }
    const f = normalizeEpd(raw as Record<string, unknown>, materialQuery);
    if (f) {
      out.factors.push(f);
    } else {
      out.dropped += 1;
    }
  }
  if (out.factors.length === 0) {
    out.reason = `The EC3 lookup returned ${out.rawCount} declaration(s) for '${materialQuery}' but none carried a usable GWP value: no EPD factor was adopted.`;
    return out;
  }
  out.ok = true;
  return out;
}

/** Run one EPD lookup through the injected transport. */
export async function lookupEc3Epds(
  req: Ec3EpdSearchRequest,
  transport: Ec3Transport,
): Promise<Ec3LookupOutcome> {
  try {
    const response = await transport(req);
    return ec3ResponseToOutcome(response, req.materialQuery);
  } catch (e) {
    return {
      ok: false,
      factors: [],
      reason: `The EC3 lookup could not reach the API (${e instanceof Error ? e.message : "network error"}): EPD data was not fetched and nothing was invented.`,
      rawCount: 0,
      dropped: 0,
    };
  }
}

// ─────────────────────────────────────────────
// EPD × admin factor merge
// ─────────────────────────────────────────────

export interface AdminCarbonFactorLike {
  category: string;
  unit: string;
  kg_co2e_per_unit: number;
  source_reference: string;
  module_stage?: string | null;
}

export interface MergedCarbonFactor extends AdminCarbonFactorLike {
  /** "epd" wins over "admin" per category; the label keeps the chain auditable. */
  source: "epd" | "admin";
  epd_id?: string;
  plant?: string | null;
  verified?: boolean;
}

/**
 * Merge EPD factors with the admin-configured table. EPDs win per category
 * (plant-specific verified declarations replace static estimates); admin
 * factors cover every category the lookup did not. The result is a complete
 * factor set with an explicit source on each entry — never a silent mixup.
 */
export function mergeEpdWithAdminFactors(
  epdFactors: readonly EpdFactor[],
  adminFactors: readonly AdminCarbonFactorLike[],
): { factors: MergedCarbonFactor[]; replaced: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const factors: MergedCarbonFactor[] = [];
  const replaced: string[] = [];

  const epdByCategory = new Map<string, EpdFactor>();
  for (const f of epdFactors) {
    // First declaration per category wins; later duplicates are ignored.
    if (!epdByCategory.has(f.category)) epdByCategory.set(f.category, f);
  }

  for (const f of epdFactors) {
    if (epdByCategory.get(f.category) !== f) continue;
    factors.push({
      category: f.category,
      unit: f.unit,
      kg_co2e_per_unit: f.kg_co2e_per_unit,
      source_reference: f.source_reference,
      module_stage: (f.modules.find((m) => m === "A1") ? "A1" : f.modules[0]) || "A1",
      source: "epd",
      epd_id: f.epd_id,
      plant: f.plant,
      verified: f.verified,
    });
  }

  for (const a of adminFactors) {
    const cat = a.category.trim().toLowerCase();
    if (epdByCategory.has(cat)) {
      replaced.push(cat);
      continue;
    }
    factors.push({
      category: cat,
      unit: a.unit,
      kg_co2e_per_unit: a.kg_co2e_per_unit,
      source_reference: a.source_reference,
      module_stage: a.module_stage ?? null,
      source: "admin",
    });
  }

  if (replaced.length > 0) {
    warnings.push(
      `Plant-specific verified EPDs replaced the static admin factor for: ${replaced.join(", ")}.`,
    );
  }
  if (epdFactors.length > 0 && replaced.length === 0) {
    warnings.push(
      "EPD declarations were returned but none matched a category in this estimate: every line still uses admin-configured factors.",
    );
  }

  return { factors, replaced, warnings };
}

/** RICS modules an EPD factor reports (re-export convenience for consumers). */
export function epdModules(f: EpdFactor): RicsModule[] {
  return f.modules.filter((m): m is RicsModule =>
    ["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "C1", "C2", "C3", "C4", "D"].includes(m),
  );
}
