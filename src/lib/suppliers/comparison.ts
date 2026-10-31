/**
 * Supplier comparison.
 *
 * The rule that shapes this module: two listings are only comparable when they
 * describe the same thing. Different brands, specifications or units are shown
 * side by side but marked not comparable, and no "cheapest" claim is made
 * across them. A cheap 32.5 cement bag is not a cheaper 42.5 bag.
 */

import type { SupplierListing, SupplierProfile } from "./types";

export interface ComparableListing {
  listing: SupplierListing;
  supplier: Pick<
    SupplierProfile,
    | "id"
    | "company_name"
    | "city"
    | "neighbourhood"
    | "verification_level"
    | "public_slug"
  >;
  /** Unit price plus the supplier's delivery fee spread over the compared quantity. */
  landedUnitPrice: number | null;
  deliveryFeeKnown: boolean;
  daysSincePriceUpdate: number | null;
}

export interface ComparisonGroup {
  /** material_slug (or a normalised product name when the slug is missing). */
  key: string;
  label: string;
  /** All listings offered for this product, regardless of specification. */
  listings: ComparableListing[];
  /** Sub-groups of genuinely identical specification + unit. */
  specGroups: ComparisonSpecGroup[];
  comparable: boolean;
  note: string;
}

export interface ComparisonSpecGroup {
  signature: string;
  brand: string | null;
  specification: string | null;
  unit: string;
  listings: ComparableListing[];
  cheapestSupplierId: string | null;
  /** True only when every member is the same spec and unit. */
  comparable: boolean;
}

function clean(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function listingSignature(
  listing: Pick<
    SupplierListing,
    "material_slug" | "brand" | "brand_name" | "specification" | "unit"
  >,
): string {
  const brand = clean(listing.brand ?? listing.brand_name);
  const spec = clean(listing.specification);
  const unit = clean(listing.unit);
  return `${brand}|${spec}|${unit}`;
}

export function daysSinceUpdate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

/**
 * Delivery is charged per order, so spreading it across the requested quantity
 * is the only honest way to compare landed cost. When a supplier quotes
 * delivery instead of stating it, the landed price is unknown, not zero.
 */
export function landedUnitPrice(
  listing: Pick<
    SupplierListing,
    "unit_price" | "delivery_available" | "delivery_fee"
  >,
  quantity: number,
): { value: number | null; deliveryKnown: boolean } {
  const unitPrice = Number(listing.unit_price);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0)
    return { value: null, deliveryKnown: false };
  if (quantity <= 0)
    return { value: null, deliveryKnown: listing.delivery_fee !== null };
  if (listing.delivery_available === false)
    return { value: unitPrice, deliveryKnown: true };
  if (listing.delivery_fee === null || listing.delivery_fee === undefined) {
    // Delivery available but the fee is quoted per order: landed cost unknown.
    return { value: null, deliveryKnown: false };
  }
  return {
    value: unitPrice + Number(listing.delivery_fee) / quantity,
    deliveryKnown: true,
  };
}

export function toComparable(
  listing: SupplierListing,
  supplier: ComparableListing["supplier"],
  quantity: number,
): ComparableListing {
  const landed = landedUnitPrice(listing, quantity);
  return {
    listing,
    supplier,
    landedUnitPrice: landed.value,
    deliveryFeeKnown: landed.deliveryKnown,
    daysSincePriceUpdate: daysSinceUpdate(
      listing.price_updated_at ?? listing.last_updated_at,
    ),
  };
}

function groupKey(listing: SupplierListing): string {
  return (
    listing.material_slug ||
    clean(listing.product_name) ||
    listing.material_category
  );
}

export function buildComparison(
  rows: { listing: SupplierListing; supplier: ComparableListing["supplier"] }[],
  quantity = 1,
): ComparisonGroup[] {
  const groups = new Map<
    string,
    { label: string; entries: ComparableListing[] }
  >();

  for (const row of rows) {
    const key = groupKey(row.listing);
    const entry = toComparable(row.listing, row.supplier, quantity);
    const existing = groups.get(key);
    if (existing) existing.entries.push(entry);
    else groups.set(key, { label: row.listing.product_name, entries: [entry] });
  }

  const result: ComparisonGroup[] = [];
  for (const [key, group] of groups) {
    const bySignature = new Map<string, ComparableListing[]>();
    for (const entry of group.entries) {
      const sig = listingSignature(entry.listing);
      bySignature.set(sig, [...(bySignature.get(sig) ?? []), entry]);
    }

    const specGroups: ComparisonSpecGroup[] = [...bySignature.entries()].map(
      ([signature, entries]) => {
        const first = entries[0].listing;
        const priced = entries.filter((e) => e.landedUnitPrice !== null);
        const cheapest =
          priced.length > 0
            ? priced.reduce((best, cur) =>
                cur.landedUnitPrice! < best.landedUnitPrice! ? cur : best,
              )
            : null;
        return {
          signature,
          brand: first.brand ?? first.brand_name ?? null,
          specification: first.specification ?? null,
          unit: first.unit,
          listings: [...entries].sort(
            (a, b) =>
              (a.landedUnitPrice ?? Number.POSITIVE_INFINITY) -
              (b.landedUnitPrice ?? Number.POSITIVE_INFINITY),
          ),
          cheapestSupplierId:
            priced.length > 1 && cheapest ? cheapest.supplier.id : null,
          comparable: true,
        };
      },
    );

    const comparable = specGroups.length === 1;
    result.push({
      key,
      label: group.label,
      listings: group.entries,
      specGroups: specGroups.sort(
        (a, b) => b.listings.length - a.listings.length,
      ),
      comparable,
      note: comparable
        ? "All offers here state the same brand, specification and unit."
        : "These offers differ in brand, specification or unit, so they are shown separately and not ranked against each other.",
    });
  }

  return result.sort((a, b) => a.label.localeCompare(b.label));
}

/** Compact comparison rows for a quote table: the same honesty, in text. */
export function quoteComparisonNote(
  quotes: {
    supplier_id: string;
    total: number;
    currency: string;
    lead_time_days: number | null;
    valid_until: string | null;
    lines: { description: string; unit: string; quantity: number }[];
  }[],
): string[] {
  const notes: string[] = [];
  if (quotes.length < 2) return notes;

  const currencies = new Set(quotes.map((q) => q.currency));
  if (currencies.size > 1)
    notes.push(
      "Quotations are in different currencies; convert before comparing totals.",
    );

  const lineShapes = new Set(
    quotes.map((q) =>
      q.lines
        .map((l) => `${clean(l.description)}|${clean(l.unit)}`)
        .sort()
        .join(";"),
    ),
  );
  if (lineShapes.size > 1) {
    notes.push(
      "Suppliers quoted different line breakdowns or units, so totals are not like-for-like. Compare line by line.",
    );
  }

  const expiring = quotes
    .filter((q) => q.valid_until)
    .map((q) => ({ q, days: daysSinceUpdate(q.valid_until) }))
    .filter((entry) => entry.days !== null);
  if (
    expiring.some(
      (entry) =>
        entry.days !== null &&
        new Date(entry.q.valid_until!).getTime() < Date.now(),
    )
  ) {
    notes.push(
      "At least one quotation has passed its validity date and should be re-confirmed.",
    );
  }

  return notes;
}
