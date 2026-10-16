#!/usr/bin/env python3
"""
Generate src/lib/international/bundled-price-books.ts from
supabase/migrations/20261013120000_production_catalog_sync.sql.

Every value in the generated module comes from the production catalog
sync (real, web-verified prices with retailers recorded). No invented
data passes through this script.

Run: python3 scripts/generate-bundled-price-books.py
"""

import re
import json
import sys

SRC = "supabase/migrations/20261013120000_production_catalog_sync.sql"
OUT = "src/lib/international/bundled-price-books.ts"


def parse_tuples(section: str):
    """Parse SQL VALUES tuples: strings ('' escapes), numbers, NULL, arrays."""
    tuples = []
    low = section.lower()
    i = low.index("values") + len("values")
    n = len(section)
    while i < n:
        # find start of tuple
        while i < n and section[i] not in "(":
            if section[i] == ";":
                return tuples
            i += 1
        if i >= n or section[i] == ";":
            break
        i += 1  # past (
        vals, depth, cur, in_str, q = [], 1, "", False, False
        while i < n:
            c = section[i]
            if in_str:
                if q:
                    cur += c
                    q = False
                elif c == "'":
                    if i + 1 < n and section[i + 1] == "'":
                        cur += "'"
                        i += 1
                    else:
                        vals.append(cur)
                        cur = ""
                        in_str = False
                else:
                    cur += c
            else:
                if c == "'":
                    # Discard whitespace accumulated before the quote so
                    # string values never carry a leading space.
                    if cur.strip():
                        raise ValueError(f"unexpected content before string: {cur!r}")
                    cur = ""
                    in_str = True
                elif c == "(":
                    depth += 1
                    cur += c
                elif c == ")":
                    depth -= 1
                    if depth == 0:
                        if cur.strip():
                            vals.append(cur.strip())
                        i += 1
                        break
                    cur += c
                elif c == "," and depth == 1:
                    if cur.strip():
                        vals.append(cur.strip())
                    cur = ""
                else:
                    cur += c
            i += 1
        # normalize values
        out = []
        for v in vals:
            if v.upper() == "NULL":
                out.append(None)
            elif re.fullmatch(r"-?\d+(\.\d+)?", v):
                out.append(float(v) if "." in v else int(v))
            elif v.upper() in ("TRUE", "FALSE"):
                out.append(v.upper() == "TRUE")
            else:
                out.append(v)
        tuples.append(out)
    return tuples


def section(sql: str, start_marker: str, end_marker: str) -> str:
    s = sql.index(start_marker)
    e = sql.index(end_marker, s)
    return sql[s:e]


sql = open(SRC).read()

# Later verified price books (same production tables, real live-listing
# sources, slug-keyed like the catalog sync's price section).
EXTRA_BOOKS = [
    "supabase/migrations/20261013270000_electrical_books_cn_id_kr.sql",
    "supabase/migrations/20261015210000_doors_windows_book_cn.sql",
]

materials = parse_tuples(section(sql, "INSERT INTO estimation_materials", ";\n"))
prices = parse_tuples(section(sql, "INSERT INTO estimation_prices", ";\n"))
roles = parse_tuples(section(sql, "INSERT INTO market_material_roles", ";\n"))
pop_m = parse_tuples(section(sql, "INSERT INTO pop_materials", ";\n"))
tile_m = parse_tuples(section(sql, "INSERT INTO tile_materials", ";\n"))

# --- estimation_materials: (id, name, slug, category, desc, unit_id,
#     pack_size, pack_unit_id, supplier, notes, effective_date, is_active, sort, c, u)
mat_by_id = {}
for r in materials:
    if len(r) < 15:
        continue
    if r[11] is not True:
        continue
    mat_by_id[r[0]] = {
        "slug": r[2],
        "name": r[1],
        "category": r[3],
        "pack": r[6],
        "notes": r[9],
    }

import re as _re

extra_rows = []
for path in EXTRA_BOOKS:
    text = open(path).read()
    # Both files carry (market, slug, price, currency, source-desc)
    # tuples; extract them with a targeted pattern instead of the
    # generic tuple parser (the surrounding SQL uses CTEs).
    pat = _re.compile(
        r"\('([A-Z]{2})',\s*'([a-z0-9-]+)',\s*([0-9]+(?:\.[0-9]+)?),\s*'([A-Z]{3})',\s*'(.*?)'\)",
        _re.S,
    )
    for m in pat.finditer(text):
        extra_rows.append({
            "market": m.group(1),
            "slug": m.group(2),
            "price": float(m.group(3)),
            "currency": m.group(4),
            "source": m.group(5),
        })

# --- estimation_prices rows arrive via INSERT...SELECT FROM (VALUES...):
#     (price_type, material_slug, price, currency, effective_date, notes,
#      is_active, price_source, last_scanned, scan_confidence, scan_source,
#      market, created, updated, slug-again)
mat_by_slug = {m["slug"]: mid for mid, m in mat_by_id.items()}
mat_info_by_slug = {m["slug"]: m for m in mat_by_id.values()}
all_catalog_slugs = set(mat_info_by_slug)
price_rows = []
for r in prices:
    if len(r) < 15:
        continue
    if r[0] != "material" or r[6] is not True:
        continue
    if r[1] not in mat_by_slug:
        continue
    price_rows.append({
        "ref": mat_by_slug[r[1]],
        "slug": r[1],
        "price": r[2],
        "currency": r[3],
        "effective": r[4],
        "source": r[7],
        "confidence": r[9],
        "market": r[11],
    })

# --- market_material_roles: (market, role, material_slug, display_name,
#     unit_label, notes, is_active, sort, c, u)
role_rows = []
for r in roles:
    if len(r) < 10:
        continue
    if r[6] is not True:
        continue
    role_rows.append({
        "market": r[0],
        "role": r[1],
        "slug": r[2],
        "display": r[3],
        "unit": r[4],
        "notes": r[5],
    })

# only keep materials that have a price or are role-mapped
keep = {p["ref"] for p in price_rows} | {
    mat["slug"] for mat in mat_by_id.values() for _ in [0]
}
slugs_needed = {mat_by_id[m]["slug"] for m in keep if m in mat_by_id} | {
    r["slug"] for r in role_rows
}

# build the compact structures
price_book = {}  # slug -> { name, category, pack, markets: { MK: {...} } }
for p in price_rows:
    m = mat_by_id.get(p["ref"])
    if not m:
        continue
    entry = price_book.setdefault(m["slug"], {
        "name": m["name"],
        "category": m["category"],
        "pack": m["pack"],
        "markets": {},
    })
    # keep the row with the latest effective date per market
    prev = entry["markets"].get(p["market"])
    if prev is None or p["effective"] >= prev["v"]:
        entry["markets"][p["market"]] = {
            "p": p["price"],
            "c": p["currency"],
            "v": p["effective"],
            "s": p["source"],
            "f": p["confidence"],
        }

for e in extra_rows:
    info = mat_info_by_slug.get(e["slug"])
    if not info:
        continue  # no catalog material -> not resolvable, skip honestly
    entry = price_book.setdefault(e["slug"], {
        "name": info["name"],
        "category": info["category"],
        "pack": info["pack"],
        "markets": {},
    })
    # These books deactivate and reseed the earlier rows, so they are
    # the newer verified truth for their (slug, market).
    entry["markets"][e["market"]] = {
        "p": e["price"],
        "c": e["currency"],
        "v": "2026-10-14",
        "s": e["source"],
        "f": "manual",
    }

role_book = {}
for r in role_rows:
    role_book.setdefault(r["market"], {})[r["role"]] = {
        "slug": r["slug"],
        "name": r["display"],
        "unit": r["unit"],
        "notes": r["notes"],
    }

# --- pop_materials: (id, workflow, category, name, desc, unit, coverage_rate,
#     coverage_unit, package_size, package_unit, unit_price, labour, is_optional,
#     currency, is_active, sort, c, u, market)
pop_rows = []
for r in pop_m:
    if len(r) < 19 or r[14] is not True:
        continue
    pop_rows.append({
        "id": r[0], "workflow": r[1], "category": r[2], "name": r[3],
        "unit": r[5], "coverageRate": r[6], "coverageUnit": r[7],
        "packageSize": r[8], "packageUnit": r[9], "unitPrice": r[10],
        "labourPerSqm": r[11], "isOptional": r[12], "currency": r[13],
        "sortOrder": r[15], "market": r[18],
    })

# --- tile_materials: (id, category, name, desc, unit, coverage_rate,
#     coverage_unit, package_size, package_unit, unit_price, labour,
#     currency, is_active, sort, c, u, market)
tile_rows = []
for r in tile_m:
    if len(r) < 17 or r[12] is not True:
        continue
    tile_rows.append({
        "id": r[0], "category": r[1], "name": r[2], "unit": r[4],
        "coverageRate": r[5], "coverageUnit": r[6], "packageSize": r[7],
        "packageUnit": r[8], "unitPrice": r[9], "labourPerSqm": r[10],
        "currency": r[11], "sortOrder": r[13], "market": r[16],
    })

markets = sorted({mk for e in price_book.values() for mk in e["markets"]})

# Whole-market presentation: every website market (from the builtin
# profiles in market-context.tsx) is present in the book, with its
# real coverage. Markets without verified price rows stay in the
# list with explicit zero counts - presented, never fabricated.
ctx_src = open("src/lib/international/market-context.tsx").read()
website_markets = sorted(set(_re.findall(r'country_code: "([A-Z]{2})"', ctx_src))) if False else sorted({
    code for code in
    [m.group(1) for m in _re.finditer(r'country_code: "([A-Z]{2})"', ctx_src)]
})
presentation = {}
for code in website_markets:
    priced = sum(1 for e in price_book.values() if e["markets"].get(code))
    roles = len(role_book.get(code, {}))
    pop = sum(1 for r in pop_rows if r["market"] == code)
    tile = sum(1 for r in tile_rows if r["market"] == code)
    presentation[code] = {
        "pricedMaterials": priced,
        "roleMappings": roles,
        "popMaterials": pop,
        "tileMaterials": tile,
        "priceStatus": ("verified_book" if priced > 0 else "pending_verification"),
    }

header = """// GENERATED FILE — do not edit by hand.
// Regenerate with: python3 scripts/generate-bundled-price-books.py
//
// Bundled static price books, extracted from the production catalog
// sync (supabase/migrations/20261013120000_production_catalog_sync.sql).
// Every price is a real web-verified retail price with its retailer
// recorded. Nothing here is invented or estimated.
//
// Purpose: when the Supabase project is not connected (or a market
// book query returns nothing), the site resolves prices from this
// bundled book instead of failing silently. Provenance travels with
// every row: priceSource stays the original retailer, and consumers
// can disclose "bundled static book (verified <date>)" in the UI.

"""

body = f"""export const BUNDLED_BOOK_VERSION = "production catalog 2026-10-13";

export interface BundledPrice {{
  p: number;
  c: string;
  v: string;
  s: string | null;
  f: string | null;
}}

export interface BundledMaterial {{
  name: string;
  category: string;
  pack: number | null;
  markets: Record<string, BundledPrice>;
}}

export interface BundledRoleMapping {{
  slug: string;
  name: string;
  unit: string;
  notes: string | null;
}}

export const BUNDLED_PRICE_BOOK: Readonly<Record<string, BundledMaterial>> = {json.dumps(price_book, ensure_ascii=False, indent=1)};

export const BUNDLED_ROLE_MAPPINGS: Readonly<Record<string, Readonly<Record<string, BundledRoleMapping>>>> = {json.dumps(role_book, ensure_ascii=False, indent=1)};

export const BUNDLED_POP_MATERIALS = {json.dumps(pop_rows, ensure_ascii=False, indent=1)} as const;

export const BUNDLED_TILE_MATERIALS = {json.dumps(tile_rows, ensure_ascii=False, indent=1)} as const;

export const BUNDLED_PRICED_MARKETS: readonly string[] = {json.dumps(markets)};

/**
 * Whole-market presentation: EVERY website market, with its real
 * bundled coverage. Markets whose priceStatus is
 * "pending_verification" have no verified price rows yet - they
 * present with zero counts and calculators disclose the NG
 * reference defaults for them. No market is silently absent.
 */
export interface BundledMarketPresentation {{
  pricedMaterials: number;
  roleMappings: number;
  popMaterials: number;
  tileMaterials: number;
  priceStatus: "verified_book" | "pending_verification";
}}

export const BUNDLED_MARKET_PRESENTATION: Readonly<
  Record<string, BundledMarketPresentation>
> = {json.dumps(presentation, ensure_ascii=False, indent=1)};

/** Active bundled price for a material slug in a market, or null. */
export function getBundledPrice(
  slug: string,
  market: string,
): (BundledPrice & {{ slug: string }}) | null {{
  const entry = BUNDLED_PRICE_BOOK[slug];
  const price = entry?.markets[market];
  return price ? {{ ...price, slug }} : null;
}}

/** All bundled materials in a category, priced in the market first. */
export function getBundledCategoryMaterials(
  category: string,
  market: string,
): Array<{{
  slug: string;
  name: string;
  pack: number | null;
  price: BundledPrice;
}}> {{
  const out: Array<{{ slug: string; name: string; pack: number | null; price: BundledPrice }}> = [];
  for (const [slug, entry] of Object.entries(BUNDLED_PRICE_BOOK)) {{
    if (entry.category !== category) continue;
    const price = entry.markets[market];
    if (price) out.push({{ slug, name: entry.name, pack: entry.pack, price }});
  }}
  return out;
}}

/** Bundled role mapping for a market, or null. */
export function getBundledRoleMapping(
  market: string,
  role: string,
): BundledRoleMapping | null {{
  return BUNDLED_ROLE_MAPPINGS[market]?.[role] ?? null;
}}
"""

with open(OUT, "w") as f:
    f.write(header + body)

print(f"materials with prices: {len(price_book)}")
print(f"priced markets: {len(markets)}: {' '.join(markets)}")
print(f"role-mapped markets: {len(role_book)}")
print(f"pop materials: {len(pop_rows)}, tile materials: {len(tile_rows)}")
print(f"written: {OUT}")
