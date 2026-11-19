/**
 * Catalogue matching for the weekly price scan.
 *
 * Kept in its own module so it can be unit tested without running the scan.
 * The rule is like-for-like only: pack signatures must be identical and the
 * names must overlap, because a 4 L can must never answer a 20 L bucket and a
 * timber insert must never answer a timber price per metre.
 */

// ---------------------------------------------------------------- matching
// A catalogue feed lists products, not FRELUX materials, so a match has to be
// earned. The rule is like-for-like only: the pack signature in the material
// name (25 kg, 20 L, 50 mm, 1 m x 50 m) must equal the product's, and the words
// have to overlap. Nothing is converted between pack sizes, because a wrong
// conversion is worse than no price.
const SIZE_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*(kg|g|lb|lbs|litre|litres|l|ml|mm|cm|m2|m²|m|ft|pcs|piece|pieces|roll|rolls|bag|bags|bucket|buckets)\b/gi;

const normaliseUnit = (unit) => {
  const u = unit.toLowerCase();
  if (u === "litre" || u === "litres") return "l";
  if (u === "m²") return "m2";
  if (u === "lb" || u === "lbs") return "lb";
  if (u === "piece" || u === "pieces") return "pcs";
  if (u === "rolls") return "roll";
  if (u === "bags") return "bag";
  if (u === "buckets") return "bucket";
  return u;
};

export function sizeSignature(text) {
  const out = [];
  for (const m of String(text || "").matchAll(SIZE_PATTERN)) {
    out.push(`${Number(m[1].replace(",", "."))}${normaliseUnit(m[2])}`);
  }
  return out.sort();
}

const STOPWORDS = new Set([
  "and",
  "with",
  "the",
  "for",
  "per",
  "new",
  "type",
  "grade",
  "standard",
]);

export function matchWords(text) {
  const stripped = String(text || "").replace(
    new RegExp(SIZE_PATTERN.source, "gi"),
    " ",
  );
  return stripped
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Scores a catalogue product against a material name.
 * Returns 0 with a reason when the pack signature differs, because a 4 L can
 * must never answer a 20 L bucket.
 */
export function scoreMatch(materialName, productName) {
  const materialSizes = sizeSignature(materialName);
  const productSizes = sizeSignature(productName);
  if (materialSizes.length) {
    if (materialSizes.join("|") !== productSizes.join("|")) {
      return { score: 0, reason: "pack size differs" };
    }
  }
  const wanted = matchWords(materialName);
  if (!wanted.length) return { score: 0, reason: "no material words" };
  // A single generic word is never a match on its own; it needs a pack size to
  // anchor it, otherwise "timber" would price a timber insert.
  if (wanted.length === 1 && !materialSizes.length) {
    return { score: 0, reason: "generic single word" };
  }
  const have = new Set(matchWords(productName));
  const hits = wanted.filter((w) => have.has(w)).length;
  // One generic word is not a match: "timber" must not price a timber insert.
  if (wanted.length > 1 && hits < 2)
    return { score: 0, reason: "too few shared words" };
  const overlap = hits / wanted.length;
  if (overlap < 0.8) return { score: 0, reason: "name overlap too low" };
  return { score: Number((0.5 + 0.5 * overlap).toFixed(2)), reason: null };
}

export const parseCatalogue = (platform, json) => {
  if (platform === "shopify") {
    const products = json?.products || [];
    return products.flatMap((p) =>
      (p.variants || []).map((v) => ({
        name: `${p.title} ${v.title || ""}`.trim(),
        price: Number(v.price),
      })),
    );
  }
  // WooCommerce Store API quotes prices in MINOR units (2500 means 25.00) and
  // states the exponent in currency_minor_unit. A variable product has no
  // single price, so its price_range minimum is the honest figure.
  const products = Array.isArray(json) ? json : json?.products || [];
  return products.map((p) => {
    const prices = p?.prices || {};
    const minor = Number.isFinite(Number(prices.currency_minor_unit))
      ? Number(prices.currency_minor_unit)
      : 2;
    const raw =
      prices.price_range?.min_amount ?? prices.price ?? p?.price ?? NaN;
    const value = Number(raw);
    return {
      name: p.name || "",
      price: Number.isFinite(value) ? value / Math.pow(10, minor) : NaN,
    };
  });
};
