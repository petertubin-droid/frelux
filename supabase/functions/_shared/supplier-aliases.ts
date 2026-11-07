// =========================================================
// Supplier name aliases for AU and CA catalogues.
//
// The matcher compares tokens. That works inside one market's own
// vocabulary and fails across markets: an Australian merchant sells
// "Villaboard" and a Canadian one sells "drywall", and neither word
// appears in the FRELUX catalogue. The result was that staged catalogues
// matched nothing and the price book stayed empty.
//
// So the row name is rewritten into canonical terms before scoring. Two
// rules keep this honest:
//   1. An alias is an exact word or phrase replacement, never a guess at
//      a similar word. "Gyprock" means plasterboard; "gib" does not mean
//      anything here.
//   2. A tool or accessory is refused outright. A paint sprayer is not
//      paint, and a screw gun is not a screw. Mapping one to the other is
//      how a catalogue observation becomes a false price.
// =========================================================

/** Terms that mean something else, or mean nothing billable, by market. */
const ALIASES: Record<string, Record<string, string>> = {
  AU: {
    gyprock: "plasterboard",
    "gyprock base coat": "plasterboard joint compound",
    villaboard: "fibre cement sheet",
    blueboard: "fibre cement sheet",
    hardieplank: "fibre cement weatherboard",
    "hardie plank": "fibre cement weatherboard",
    colorbond: "metal roofing sheet",
    "colorbond steel": "metal roofing sheet",
    "yellow tongue": "particleboard flooring",
    mdf: "medium density fibreboard",
    "hoop pine": "hoop pine",
    "marine ply": "marine plywood",
    "form ply": "formwork plywood",
    "structural ply": "structural plywood",
    quad: "timber moulding",
    "dressed pine": "timber",
    "treated pine": "treated timber",
    batten: "timber batten",
    stud: "timber stud",
    "n-grade": "rebar",
    reo: "rebar",
    "concrete mesh": "reinforcing mesh",
    render: "render",
    "render mix": "render",
    "liquid nails": "construction adhesive",
    sarking: "roof sarking",
    "flashing tape": "flashing",
  },
  CA: {
    drywall: "plasterboard",
    sheetrock: "plasterboard",
    gyproc: "plasterboard",
    "type x": "fire rated plasterboard",
    "type x drywall": "fire rated plasterboard",
    osb: "oriented strand board",
    "osb sheathing": "oriented strand board",
    spf: "softwood lumber",
    s4s: "dressed lumber",
    "kiln dried": "kiln dried lumber",
    kd: "kiln dried lumber",
    "pt lumber": "treated lumber",
    "pressure treated": "treated lumber",
    vinyl: "vinyl siding",
    "asphalt shingle": "roofing shingle",
    "ashphalt shingle": "roofing shingle",
    "house wrap": "building paper",
    "sono tube": "concrete form tube",
    sonotube: "concrete form tube",
    rebar: "reinforcing bar",
    "hi-rise": "concrete form",
    "sill gasket": "sill seal",
    tapcon: "concrete screw",
    "dimension lumber": "softwood lumber",
    stud: "softwood lumber stud",
  },
};

/**
 * Words that mean the row is a tool, an accessory or a consumable that is
 * not the material it is named after. Deliberately checked before aliasing:
 * "construction screws" must not become a lumber match through any phrase.
 */
const NON_MATERIAL_TERMS = [
  "screwdriver",
  "drill",
  "drill bit",
  "hammer",
  "wrench",
  "spanner",
  "plier",
  "saw blade",
  "sawhorse",
  "tape measure",
  "chisel",
  "trowel",
  "brush",
  "roller",
  "sprayer",
  "spray gun",
  "nail gun",
  "stapler",
  "tool belt",
  "toolbox",
  "gloves",
  "goggles",
  "mask",
  "earmuffs",
  "hardware",
  "fasteners",
  "construction screws",
  "deck screws",
  "wood screws",
  "nails",
  "brackets",
  "abrasive disc",
  "cutting disc",
  "mixer paddle",
];

/**
 * The rejection terms compiled once. A market scan scores tens of thousands of
 * name pairs, and building two RegExp objects per term per pair was the bulk of
 * the cost that pushed the GB scan past its invocation limit.
 */
const NON_MATERIAL_PATTERNS = NON_MATERIAL_TERMS.map((term) => ({
  term,
  pattern: new RegExp(`(^| )${term.replace(/ /g, " ")}( |$)`),
}));

/** One market's alias phrases, longest first, with patterns built once. */
interface AliasTable {
  phrase: string;
  label: string;
  match: RegExp;
  replace: RegExp;
}

const ALIAS_TABLE_CACHE = new Map<string, AliasTable[]>();

function aliasTableFor(market: string): AliasTable[] {
  const key = market.toUpperCase();
  const cached = ALIAS_TABLE_CACHE.get(key);
  if (cached) return cached;
  const raw = ALIASES[key] ?? {};
  const built = Object.keys(raw)
    .sort((a, b) => b.length - a.length)
    .map((phrase) => {
      const label = raw[phrase];
      return {
        phrase,
        label,
        match: new RegExp(`(^| )${phrase}( |$)`),
        replace: new RegExp(`(^| )${phrase}( |$)`, "g"),
      };
    });
  ALIAS_TABLE_CACHE.set(key, built);
  return built;
}

export type RowVerdict =
  | { kind: "material"; canonical: string; applied: string[] }
  | { kind: "rejected"; reason: string };

/** Lowercase, collapse punctuation, and keep decimals intact. */
function clean(value: string): string {
  return (
    value
      .toLowerCase()
      // Fractions and decimals survive: "1/2 in" is not "1 2 in", and a
      // thickness lost here is a thickness the matcher can no longer check.
      .replace(/[^a-z0-9./ ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Rewrite a supplier product name into canonical terms for its market.
 *
 * Longest phrase first, so "gyprock base coat" becomes the compound it is
 * rather than "plasterboard base coat" by accident.
 */
export function canonicaliseProduct(name: string, market: string): RowVerdict {
  const cleaned = clean(name ?? "");
  if (!cleaned) return { kind: "rejected", reason: "empty product name" };

  for (const { term, pattern } of NON_MATERIAL_PATTERNS) {
    if (pattern.test(cleaned)) {
      return {
        kind: "rejected",
        reason: `not a material (${term})`,
      };
    }
  }

  const applied: string[] = [];
  let canonical = cleaned;
  for (const alias of aliasTableFor(market ?? "")) {
    if (alias.match.test(canonical)) {
      canonical = canonical.replace(alias.replace, ` ${alias.label} `);
      applied.push(`${alias.phrase} → ${alias.label}`);
    }
  }

  return {
    kind: "material",
    canonical: canonical.replace(/\s+/g, " ").trim(),
    applied,
  };
}

/** The market a catalogue row belongs to, from a slug prefix. */
export function marketFromSlug(slug: string): string {
  return (slug ?? "").slice(0, 2).toUpperCase();
}

/** Canonicalise both sides, so an AU product can meet an AU material name. */
export function canonicalisePair(
  rowName: string,
  materialName: string,
  market: string,
): { row: string; material: string; applied: string[] } | null {
  const row = canonicaliseProduct(rowName, market);
  if (row.kind === "rejected") return null;
  const material = canonicaliseProduct(materialName, market);
  if (material.kind === "rejected") return null;
  return {
    row: row.canonical,
    material: material.canonical,
    applied: [...row.applied, ...material.applied],
  };
}
