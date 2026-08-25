/**
 * FRELUX MARKET INTELLIGENCE — Product Normalizer
 *
 * Normalizes raw product names from different sources into canonical FRELUX products.
 * Different websites describe the same product differently.
 *
 * This module NEVER invents product data. It only normalizes what exists.
 * Low-confidence matches never overwrite validated products.
 */

import type {
  MatchConfidence,
  _MiProductAlias,
} from '@/types/market-intelligence';

// ============================================================
// PACKAGE SIZE EXTRACTION
// ============================================================

/**
 * Extract package size and unit from a raw product name.
 * Examples:
 *   "Portland Cement 50 KG" → { size: 50, unit: "kg" }
 *   "Premium Paint 20 Litres" → { size: 20, unit: "litres" }
 *   "Tile Carton 1x12" → { size: 1, unit: "carton" }
 */
export function extractPackageInfo(
  rawName: string,
): { size: number | null; unit: string | null; confidence: MatchConfidence | 'unknown' } {
  const lower = rawName.toLowerCase();

  // Weight patterns: 50kg, 50 kg, 50KG
  const kgMatch = lower.match(/(\d+(?:\.\d+)?)\s*(kg|kilogram)/);
  if (kgMatch) {
    return {
      size: parseFloat(kgMatch[1]),
      unit: 'kg',
      confidence: 'high',
    };
  }

  // Volume patterns: 20L, 20 L, 20 litres, 20L
  const litreMatch = lower.match(/(\d+(?:\.\d+)?)\s*(l|litre|liters?|litres?)/);
  if (litreMatch && !lower.match(/\b(?:length|tall|wall)\b/)) {
    return {
      size: parseFloat(litreMatch[1]),
      unit: 'litres',
      confidence: 'high',
    };
  }

  // Carton/pack patterns
  const cartonMatch = lower.match(/(\d+(?:\.\d+)?)\s*(carton|cartons|pack|packs|box|pcs)/);
  if (cartonMatch) {
    return {
      size: parseFloat(cartonMatch[1]),
      unit: 'carton',
      confidence: 'high',
    };
  }

  // Bag pattern (e.g. "bag of cement")
  const bagMatch = lower.match(/(\d+(?:\.\d+)?)\s*bag/);
  if (bagMatch) {
    return {
      size: parseFloat(bagMatch[1]),
      unit: 'bag',
      confidence: 'medium',
    };
  }

  return { size: null, unit: null, confidence: 'unknown' };
}

// ============================================================
// BRAND EXTRACTION
// ============================================================

// Common construction material brands (extendable via admin)
const KNOWN_BRANDS = [
  'Dangote', 'Lafarge', 'Bua', 'Eagle', 'Diamond', 'POP',
  'Dulux', 'Berger', 'Crown', 'Excel', 'Ippex', 'Sikaflex',
  'Capel', 'Sagal', 'Tiger', 'Twiga',
];

export function extractBrand(rawName: string): string | null {
  for (const brand of KNOWN_BRANDS) {
    if (rawName.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }
  return null;
}

// ============================================================
// PRODUCT NAME NORMALIZATION
// ============================================================

/**
 * Normalize a raw product name into a cleaner canonical form.
 * Does NOT invent information — only cleans what exists.
 */
export function normalizeProductName(rawName: string): string {
  return rawName
    .trim()
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    // Standardize casing for units
    .replace(/\bkg\b/i, 'kg')
    .replace(/\bl\b(?=\s|$)/i, 'L')
    .replace(/\blitres?\b/i, 'litres')
    .replace(/\bpacks?\b/i, 'pack')
    .replace(/\bcartons?\b/i, 'carton')
    .replace(/\bbags?\b/i, 'bag')
    // Remove trailing/leading special chars
    .replace(/^[^\w]+|[^\w]+$/g, '')
    .trim();
}

// ============================================================
// CATEGORY CLASSIFICATION
// ============================================================

const CATEGORY_PATTERNS: Record<string, string[]> = {
  cement: ['cement', 'portland', 'bua cement', 'dangote cement', 'lafarge'],
  paint: ['paint', 'emulsion', 'gloss', 'satin', 'primer', 'undercoat'],
  tile: ['tile', 'porcelain', 'ceramic', 'granite', 'marble'],
  screeding: ['screeding', 'plaster', 'screed mix', 'rendering'],
  white_cement: ['white cement'],
  pop: ['pop', 'plaster of paris', 'gypsum'],
  grafitex: ['grafitex', 'grafit'],
  tyrolene: ['tyrolene', 'tyro'],
  block: ['block', 'hollow block'],
  roofing: ['roof', 'roofing', 'shingle'],
};

export function classifyCategory(rawName: string): string | null {
  const lower = rawName.toLowerCase();
  // Check more specific categories first
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some((p) => lower.includes(p))) {
      return category;
    }
  }
  return null;
}

// ============================================================
// MATCH CONFIDENCE SCORING
// ============================================================

/**
 * Calculate match confidence between a raw name and a canonical product.
 * Returns a score 0-100 and a confidence level.
 */
export function calculateMatchConfidence(
  rawName: string,
  canonical: {
    name: string;
    brand?: string | null;
    package_size?: number | null;
    package_unit?: string | null;
    category?: string | null;
  },
): { score: number; confidence: MatchConfidence } {
  let score = 0;
  const maxScore = 100;

  const rawLower = rawName.toLowerCase();
  const canonLower = canonical.name.toLowerCase();

  // Name similarity (Levenshtein-ish — check for key term overlap)
  const rawTerms = new Set(rawLower.split(/\s+/).filter((t) => t.length > 2));
  const canonTerms = new Set(canonLower.split(/\s+/).filter((t) => t.length > 2));
  const commonTerms = [...rawTerms].filter((t) => canonTerms.has(t));
  const nameOverlap = rawTerms.size > 0 ? commonTerms.length / rawTerms.size : 0;
  score += nameOverlap * 40; // up to 40 points

  // Brand match
  if (canonical.brand) {
    const rawBrand = extractBrand(rawName);
    if (rawBrand && rawBrand.toLowerCase() === canonical.brand.toLowerCase()) {
      score += 20;
    } else if (rawBrand) {
      score += 0; // different brand
    }
  }

  // Package size match
  const extracted = extractPackageInfo(rawName);
  if (canonical.package_size && extracted.size) {
    if (extracted.size === canonical.package_size) {
      score += 25;
    } else if (Math.abs(extracted.size - canonical.package_size) / canonical.package_size < 0.05) {
      score += 15; // close match
    }
  }

  // Category match
  if (canonical.category) {
    const rawCategory = classifyCategory(rawName);
    if (rawCategory === canonical.category) {
      score += 15;
    }
  }

  score = Math.min(score, maxScore);

  let confidence: MatchConfidence;
  if (score >= 80) confidence = 'high';
  else if (score >= 50) confidence = 'medium';
  else if (score >= 25) confidence = 'low';
  else confidence = 'review_required';

  return { score, confidence };
}

// ============================================================
// FULL NORMALIZATION
// ============================================================

/**
 * Full normalization of a raw product name.
 * Returns all normalized fields without inventing anything.
 */
export function normalizeProduct(
  rawName: string,
): {
  normalized_name: string;
  normalized_brand: string | null;
  normalized_category: string | null;
  normalized_package_size: number | null;
  normalized_package_unit: string | null;
} {
  return {
    normalized_name: normalizeProductName(rawName),
    normalized_brand: extractBrand(rawName),
    normalized_category: classifyCategory(rawName),
    ...extractPackageInfo(rawName),
  };
}

// ============================================================
// UNIT PRICE CALCULATION
// ============================================================

/**
 * Calculate unit price (per kg or per litre) if the data supports it.
 * NEVER invents — only computes when package info is available.
 */
export function calculateUnitPrice(
  price: number,
  packageSize: number | null,
  packageUnit: string | null,
): {
  per_kg: number | null;
  per_litre: number | null;
  calculable: boolean;
} {
  if (!packageSize || packageSize <= 0) {
    return { per_kg: null, per_litre: null, calculable: false };
  }

  const unit = (packageUnit || '').toLowerCase();

  if (unit === 'kg' || unit === 'kilogram') {
    return {
      per_kg: Math.round((price / packageSize) * 100) / 100,
      per_litre: null,
      calculable: true,
    };
  }

  if (unit === 'litres' || unit === 'litre' || unit === 'l') {
    return {
      per_kg: null,
      per_litre: Math.round((price / packageSize) * 100) / 100,
      calculable: true,
    };
  }

  return { per_kg: null, per_litre: null, calculable: false };
}
