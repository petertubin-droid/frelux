/**
 * FRELUX Automated RFQ & Purchase Order Engine (Market Intelligence Pillar 6)
 *
 * Transforms an approved estimate into itemized Request for Quotations
 * distributed to 3 competing local suppliers in one click, and turns the
 * winning quote into a purchase order aligned with the existing
 * procurement state machine (listed → quote_requested → quoted →
 * approved → purchase_ordered).
 *
 * House rules:
 *   - The RFQ lines are IDENTICAL for every competing supplier so the
 *     returned quotes are directly comparable — no supplier gets a
 *     shorter or differently-rounded basket.
 *   - Three competing suppliers is the standard; fewer configured
 *     suppliers still receive the RFQ but a warning states the reduced
 *     competition. Zero suppliers is a refusal, never a silent no-op.
 *   - Quote lines that do not exist on the RFQ are refused (never
 *     imported into a comparison), and missing lines reduce the
 *     coverage score instead of being guessed at market price.
 *   - The comparison ranks by QUOTED TOTAL among fully-covering quotes;
 *     a partially-covering quote can never win the price comparison by
 *     quietly quoting fewer lines.
 */

import type { RequisitionLine } from "./purchase-orders";

// ─────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────

export interface RfqLine {
  /** Line id shared by every supplier copy — the comparison key. */
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  /** Packaged order quantity when packaging rules applied, else quantity. */
  orderQuantity: number;
  packageSize: number | null;
  /** Estimated unit price from the estimate (context for the supplier). */
  estimatedUnitPrice: number | null;
}

export interface RfqSupplier {
  name: string;
  /** Contact reference (email/phone) — supplied by the caller's supplier list. */
  contact: string | null;
  /** Merchant punchout protocol the supplier speaks, when integrated. */
  punchout: "cxml" | "oci" | null;
}

export interface RfqDocument {
  rfqNumber: string;
  projectRef: string | null;
  title: string;
  lines: RfqLine[];
  deliveryAddress: string;
  /** ISO date quotes are due. */
  responseDeadline: string | null;
  currency: string;
  issuedAt: string;
  notes: string[];
  warnings: string[];
}

export interface RfqPackage {
  rfqNumber: string;
  /** Per-supplier package number: RFQ-xxxx-S1, -S2, ... */
  packageNumber: string;
  supplier: RfqSupplier;
  /** Identical to every other supplier's copy — comparability by design. */
  lines: RfqLine[];
  responseDeadline: string | null;
  deliveryAddress: string;
  currency: string;
  /** Email-ready subject line. */
  emailSubject: string;
  /** Email/WhatsApp-ready body with the itemized table. */
  emailBody: string;
}

export interface RfqDistributionOptions {
  /** Standard is 3 competing suppliers; the engine states any shortfall. */
  competingSuppliers?: number;
  /** Response deadline in days from issuance. Default 7. */
  responseDeadlineDays?: number;
  issuedAt?: string;
}

export interface RfqDistribution {
  ok: boolean;
  rfq: RfqDocument | null;
  packages: RfqPackage[];
  warnings: string[];
  errors: string[];
}

// ─────────────────────────────────────────────
// RFQ generation from estimate lines
// ─────────────────────────────────────────────

let rfqCounter = 0;

/** Deterministic, sortable RFQ number: RFQ-YYYYMMDD-####-seed. */
export function generateRfqNumber(issuedAt: string, seed: string): string {
  const date = issuedAt.slice(0, 10).replace(/-/g, "");
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12);
  rfqCounter += 1;
  return `RFQ-${date}-${String(rfqCounter).padStart(3, "0")}-${slug || "project"}`;
}

export function buildRfqFromEstimate(
  lines: RequisitionLine[],
  opts: {
    projectRef?: string | null;
    title: string;
    deliveryAddress: string;
    currency?: string;
    responseDeadlineDays?: number;
    issuedAt?: string;
    seed?: string;
  },
): { rfq: RfqDocument | null; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const issuedAt = opts.issuedAt ?? new Date().toISOString();
  const notes: string[] = [];

  if (!Array.isArray(lines) || lines.length === 0) {
    errors.push("No estimate lines provided: an RFQ cannot quote nothing.");
    return { rfq: null, errors };
  }
  if (!opts.title?.trim()) errors.push("RFQ title is required.");
  if (!opts.deliveryAddress?.trim()) errors.push("Delivery address is required: suppliers quote delivery into it.");
  if (errors.length > 0) return { rfq: null, errors };

  const rfqLines: RfqLine[] = [];
  for (const l of lines) {
    const orderQty = Number.isFinite(l.orderQuantity) && l.orderQuantity !== null
      ? Number(l.orderQuantity)
      : Number(l.requiredQuantity);
    if (!Number.isFinite(orderQty) || orderQty <= 0) {
      errors.push(
        `Line "${l.name}" has no orderable quantity (required ${l.requiredQuantity}, packaged ${l.orderQuantity}): it was excluded instead of rounded up.`,
      );
      continue;
    }
    rfqLines.push({
      id: l.id,
      name: l.name,
      category: l.category,
      quantity: l.requiredQuantity,
      unit: l.unit,
      orderQuantity: orderQty,
      packageSize: l.packageSize,
      estimatedUnitPrice: l.estimatedUnitPrice,
    });
  }
  if (rfqLines.length === 0) {
    errors.push("No line carried a valid orderable quantity: the RFQ was refused.");
    return { rfq: null, errors };
  }
  if (rfqLines.length < lines.length) {
    warnings.push(
      `${lines.length - rfqLines.length} line(s) without a valid orderable quantity were excluded from the RFQ.`,
    );
  }
  if (lines.some((l) => l.status === "package_size_required")) {
    notes.push(
      "Some lines need a package size confirmation before ordering: they are quoted at required quantity so suppliers state their package terms.",
    );
  }

  const deadlineDays = opts.responseDeadlineDays ?? 7;
  const deadline = new Date(issuedAt);
  deadline.setDate(deadline.getDate() + deadlineDays);

  const rfq: RfqDocument = {
    rfqNumber: generateRfqNumber(issuedAt, opts.seed ?? opts.title),
    projectRef: opts.projectRef ?? null,
    title: opts.title.trim(),
    lines: rfqLines,
    deliveryAddress: opts.deliveryAddress.trim(),
    responseDeadline: deadline.toISOString().slice(0, 10),
    currency: opts.currency ?? "NGN",
    issuedAt,
    notes,
    warnings,
  };
  return { rfq, errors };
}

// ─────────────────────────────────────────────
// One-click distribution to competing suppliers
// ─────────────────────────────────────────────

export function distributeRfqToSuppliers(
  rfq: RfqDocument,
  suppliers: RfqSupplier[],
  opts: RfqDistributionOptions = {},
): RfqDistribution {
  const warnings: string[] = [];
  const errors: string[] = [];
  const packages: RfqPackage[] = [];
  const standard = opts.competingSuppliers ?? 3;

  if (!suppliers || suppliers.length === 0) {
    errors.push(
      "No suppliers configured for this RFQ: nothing was sent and no supplier was invented.",
    );
    return { ok: false, rfq, packages, warnings, errors };
  }

  const seen = new Set<string>();
  const unique: RfqSupplier[] = [];
  for (const s of suppliers) {
    const name = s.name?.trim();
    if (!name) {
      warnings.push("A supplier without a name was excluded from distribution.");
      continue;
    }
    if (seen.has(name.toLowerCase())) {
      warnings.push(`Duplicate supplier "${name}" was excluded: one RFQ copy per supplier.`);
      continue;
    }
    seen.add(name.toLowerCase());
    unique.push({ ...s, name });
  }
  if (unique.length === 0) {
    errors.push("No identifiable suppliers remained after validation: the RFQ was not sent.");
    return { ok: false, rfq, packages, warnings, errors };
  }
  if (unique.length < standard) {
    warnings.push(
      `RFQ distributed to ${unique.length} supplier(s) instead of the standard ${standard} competing suppliers: competition is reduced and quotes may be less sharp. Add suppliers in the marketplace admin to restore the standard.`,
    );
  }

  const deadlineDays = opts.responseDeadlineDays ?? 7;
  const deadline = new Date(rfq.issuedAt);
  deadline.setDate(deadline.getDate() + deadlineDays);
  const deadlineIso = deadline.toISOString().slice(0, 10);

  unique.forEach((supplier, i) => {
    const packageNumber = `${rfq.rfqNumber}-S${i + 1}`;
    const table = rfq.lines
      .map(
        (l) =>
          `${l.orderQuantity} ${l.unit} — ${l.name} (${l.category})${l.packageSize ? `, packaged ${l.packageSize}${l.unit}` : ""}`,
      )
      .join("\n");
    packages.push({
      rfqNumber: rfq.rfqNumber,
      packageNumber,
      supplier,
      lines: rfq.lines,
      responseDeadline: deadlineIso,
      deliveryAddress: rfq.deliveryAddress,
      currency: rfq.currency,
      emailSubject: `${rfq.title} — Request for Quotation (${packageNumber})`,
      emailBody:
        `Dear ${supplier.name},\n\nPlease quote the following items for delivery to ${rfq.deliveryAddress}:\n\n${table}\n\n` +
        `Quote per line (unit price, package terms, availability) in ${rfq.currency} by ${deadlineIso}.\n` +
        `Reference: ${packageNumber}.\n\nRegards,\nFRELUX Procurement`,
    });
  });

  return {
    ok: true,
    rfq,
    packages,
    warnings: [...warnings, ...rfq.warnings],
    errors,
  };
}

// ─────────────────────────────────────────────
// Quote intake + comparison
// ─────────────────────────────────────────────

export interface SupplierQuoteLine {
  rfqLineId: string;
  unitPrice: number;
  /** Supplier's quoted availability, when stated. */
  availableQuantity: number | null;
  note?: string | null;
}

export interface SupplierQuote {
  supplier: string;
  packageNumber: string | null;
  lines: SupplierQuoteLine[];
  receivedAt: string;
}

export interface ValidatedQuote {
  ok: boolean;
  supplier: string;
  lines: SupplierQuoteLine[];
  total: number;
  /** Share of RFQ lines the quote actually covers, 0–1. */
  coverage: number;
  missingLineIds: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Validate a supplier's quote against the RFQ: unknown lines are refused
 * (never imported), missing lines reduce coverage, and the total is the
 * honest sum of quoted lines.
 */
export function validateSupplierQuote(
  rfq: RfqDocument,
  quote: SupplierQuote,
): ValidatedQuote {
  const warnings: string[] = [];
  const errors: string[] = [];
  const rfqLineIds = new Set(rfq.lines.map((l) => l.id));
  const validLines: SupplierQuoteLine[] = [];
  let total = 0;

  if (!quote.supplier?.trim()) {
    errors.push("Quote carries no supplier name: it cannot be attributed and was refused.");
  }

  for (const l of quote.lines ?? []) {
    if (!rfqLineIds.has(l.rfqLineId)) {
      warnings.push(
        `Supplier ${quote.supplier} quoted a line (${l.rfqLineId}) that is not on RFQ ${rfq.rfqNumber}: it was excluded from the comparison.`,
      );
      continue;
    }
    if (!Number.isFinite(l.unitPrice) || l.unitPrice < 0) {
      warnings.push(
        `Supplier ${quote.supplier} quote for line ${l.rfqLineId} has an invalid unit price: it was excluded instead of guessed.`,
      );
      continue;
    }
    if (validLines.some((v) => v.rfqLineId === l.rfqLineId)) {
      warnings.push(
        `Supplier ${quote.supplier} quoted line ${l.rfqLineId} twice: the first quote was kept and the duplicate dropped.`,
      );
      continue;
    }
    validLines.push(l);
    const rfqLine = rfq.lines.find((r) => r.id === l.rfqLineId)!;
    const qty = l.availableQuantity !== null && l.availableQuantity < rfqLine.orderQuantity
      ? l.availableQuantity
      : rfqLine.orderQuantity;
    total = Math.round((total + qty * l.unitPrice) * 100) / 100;
  }

  if (validLines.length === 0) {
    errors.push(
      `Supplier ${quote.supplier} quote contained no valid RFQ line: the quote was refused.`,
    );
  }
  const missing = rfq.lines
    .map((l) => l.id)
    .filter((id) => !validLines.some((v) => v.rfqLineId === id));
  if (missing.length > 0 && validLines.length > 0) {
    warnings.push(
      `Supplier ${quote.supplier} did not quote ${missing.length} of ${rfq.lines.length} lines: coverage is reduced and the total is NOT directly comparable to fuller quotes.`,
    );
  }

  return {
    ok: errors.length === 0,
    supplier: quote.supplier?.trim() ?? "",
    lines: validLines,
    total,
    coverage: rfq.lines.length > 0 ? validLines.length / rfq.lines.length : 0,
    missingLineIds: missing,
    warnings,
    errors,
  };
}

export interface QuoteComparison {
  ok: boolean;
  ranked: Array<{
    supplier: string;
    total: number;
    coverage: number;
    rank: number | null;
  }>;
  /** Cheapest supplier among fully-covering quotes; null when none. */
  bestPriceSupplier: string | null;
  bestPriceTotal: number | null;
  warnings: string[];
}

/**
 * Compare validated quotes. Only fully-covering quotes compete for the
 * price ranking — a partial quote never wins by quoting fewer lines.
 */
export function compareSupplierQuotes(
  rfq: RfqDocument,
  quotes: ValidatedQuote[],
): QuoteComparison {
  const warnings: string[] = [];
  if (!quotes || quotes.length === 0) {
    return {
      ok: false,
      ranked: [],
      bestPriceSupplier: null,
      bestPriceTotal: null,
      warnings: ["No quotes to compare."],
    };
  }

  const full = quotes.filter((q) => q.ok && q.coverage === 1);
  const partial = quotes.filter((q) => q.ok && q.coverage < 1);
  if (partial.length > 0) {
    warnings.push(
      `${partial.length} quote(s) cover only part of the RFQ: they are listed but excluded from the price ranking.`,
    );
  }
  if (full.length === 0) {
    warnings.push(
      "No quote covers every RFQ line: there is no comparable price ranking. Solicit complete quotes before awarding.",
    );
  }

  const sorted = [...full].sort((a, b) => a.total - b.total);
  const rankOf = new Map<string, number>();
  sorted.forEach((q, i) => rankOf.set(q.supplier, i + 1));

  return {
    ok: true,
    ranked: quotes.map((q) => ({
      supplier: q.supplier,
      total: q.total,
      coverage: q.coverage,
      rank: rankOf.get(q.supplier) ?? null,
    })),
    bestPriceSupplier: sorted[0]?.supplier ?? null,
    bestPriceTotal: sorted[0]?.total ?? null,
    warnings,
  };
}

// ─────────────────────────────────────────────
// Purchase order from the winning quote
// ─────────────────────────────────────────────

export interface PurchaseOrderLine {
  rfqLineId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  poNumber: string;
  rfqNumber: string;
  supplier: string;
  lines: PurchaseOrderLine[];
  total: number;
  deliveryAddress: string;
  currency: string;
  issuedAt: string;
  /** Aligned with the procurement state machine's purchase_ordered step. */
  status: "purchase_ordered";
  warnings: string[];
  errors: string[];
}

let poCounter = 0;

/** Deterministic PO number: PO-YYYYMMDD-####-rfqnumber-slug. */
export function generatePoNumber(issuedAt: string, rfqNumber: string): string {
  const date = issuedAt.slice(0, 10).replace(/-/g, "");
  poCounter += 1;
  return `PO-${date}-${String(poCounter).padStart(3, "0")}-${rfqNumber}`;
}

/**
 * Turn a validated winning quote into a purchase order. The quote must
 * cover the RFQ fully — a partial quote is refused for award, because
 * a PO for some lines is a different basket than the one compared.
 */
export function generatePurchaseOrderFromQuote(
  rfq: RfqDocument,
  quote: ValidatedQuote,
  opts: { issuedAt?: string } = {},
): { po: PurchaseOrder | null; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const issuedAt = opts.issuedAt ?? new Date().toISOString();

  if (!quote.ok) {
    errors.push(`Supplier ${quote.supplier}'s quote failed validation: no purchase order can be issued from it.`);
    return { po: null, errors };
  }
  if (quote.coverage < 1) {
    errors.push(
      `Supplier ${quote.supplier}'s quote covers ${Math.round(quote.coverage * 100)}% of the RFQ: a partial quote cannot be awarded as a purchase order. Missing: ${quote.missingLineIds.join(", ")}.`,
    );
    return { po: null, errors };
  }

  const lines: PurchaseOrderLine[] = rfq.lines.map((rl) => {
    const ql = quote.lines.find((q) => q.rfqLineId === rl.id)!;
    const qty =
      ql.availableQuantity !== null && ql.availableQuantity < rl.orderQuantity
        ? ql.availableQuantity
        : rl.orderQuantity;
    if (ql.availableQuantity !== null && ql.availableQuantity < rl.orderQuantity) {
      warnings.push(
        `Line ${rl.name}: supplier quoted availability ${ql.availableQuantity} ${rl.unit} against the ${rl.orderQuantity} ordered: the PO quantity is the supplier's availability and the shortfall is flagged.`,
      );
    }
    return {
      rfqLineId: rl.id,
      name: rl.name,
      quantity: qty,
      unit: rl.unit,
      unitPrice: ql.unitPrice,
      lineTotal: Math.round(qty * ql.unitPrice * 100) / 100,
    };
  });

  const po: PurchaseOrder = {
    poNumber: generatePoNumber(issuedAt, rfq.rfqNumber),
    rfqNumber: rfq.rfqNumber,
    supplier: quote.supplier,
    lines,
    total: Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100,
    deliveryAddress: rfq.deliveryAddress,
    currency: rfq.currency,
    issuedAt,
    status: "purchase_ordered",
    warnings,
    errors: [],
  };
  return { po, errors: [] };
}
