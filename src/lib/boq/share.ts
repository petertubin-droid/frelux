/**
 * Shareable quotations.
 *
 * A shared quotation is a snapshot, not a live view: the recipient sees exactly
 * what was shared, at that revision, and later edits cannot change it. Both
 * quote types share, and each states plainly which one it is, because a market
 * survey has no prices and must never read like an offer.
 */

import { formatByCode } from "@/lib/international/currency-format";
import { SITE_URL } from "@/lib/seo";
import type { StandardBoqDocument } from "@/lib/finance/boq-standard";
import type { BoqSurveyState, CompiledBoq } from "./compile";
import type { BoqQuoteMode, BoqStudioDocument } from "./types";

export interface QuoteShareSnapshot {
  schema: 1;
  mode: BoqQuoteMode;
  document: BoqStudioDocument;
  standard: StandardBoqDocument;
  survey: BoqSurveyState;
  shared_at: string;
}

export function buildQuoteShareSnapshot(
  compiled: CompiledBoq,
  sharedAt: string = new Date().toISOString(),
): QuoteShareSnapshot {
  return {
    schema: 1,
    mode: compiled.document.mode,
    document: compiled.document,
    standard: compiled.standard,
    survey: compiled.survey,
    shared_at: sharedAt,
  };
}

export function quoteShareUrl(token: string): string {
  return `${SITE_URL}/quote/${token}`;
}

export function quoteShareHeading(mode: BoqQuoteMode): string {
  return mode === "market_survey" ? "Market survey" : "Quotation";
}

/** File name for an export, so a survey never arrives named like a priced bill. */
export function quoteShareFilename(
  doc: BoqStudioDocument,
  extension: "pdf" | "xlsx",
): string {
  const base = (doc.reference || doc.title || "quote")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = doc.mode === "market_survey" ? "-market-survey" : "";
  return `${base || "quote"}-R${doc.revision}${suffix}.${extension}`;
}

function money(amount: number, currency: string): string {
  return formatByCode(amount, currency || "XXX", { decimals: 2 });
}

/**
 * The message that travels with the link. A priced quotation leads with the
 * total. A market survey leads with what is being asked of the recipient, since
 * there is no total to quote yet.
 */
export function buildQuoteShareMessage(
  snapshot: QuoteShareSnapshot,
  url: string,
): string {
  const doc = snapshot.document;
  const client = doc.client.name ? ` for ${doc.client.name}` : "";
  const lines: string[] = [];

  if (snapshot.mode === "market_survey") {
    lines.push(`FRELUX market survey: ${doc.reference || doc.title}${client}.`);
    lines.push(
      `${snapshot.survey.lines} measured line${snapshot.survey.lines === 1 ? "" : "s"} with quantities and units, no prices.`,
    );
    if (snapshot.survey.complete) {
      lines.push(
        `Rates have been collected on all ${snapshot.survey.lines} lines, giving a market total of ${money(snapshot.survey.market_total, doc.currency)}.`,
      );
    } else {
      lines.push(
        `Rates to be completed in the market on ${snapshot.survey.unpriced_lines} line${snapshot.survey.unpriced_lines === 1 ? "" : "s"}.`,
      );
    }
  } else {
    lines.push(`FRELUX quotation: ${doc.reference || doc.title}${client}.`);
    lines.push(
      `Total ${money(snapshot.standard.summary.netPayableTotal, doc.currency)} including ${snapshot.standard.summary.taxCategory}.`,
    );
  }

  lines.push(url);
  return lines.join("\n");
}

/** Short label for a share panel or a client-facing page. */
export function quoteShareExpiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "No expiry";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "No expiry";
  return `Expires ${date.toISOString().slice(0, 10)}`;
}
