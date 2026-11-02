/**
 * FRELUX Bank-Submittable BOQ (Wave 1.2, paid tier)
 *
 * Formal Bill of Quantities layout for construction-loan
 * applications: company block, project block, itemised
 * unit-rate schedule, grand summary and a terms page.
 *
 * Market rules (i18n mandate):
 *  - Currency: always the quote's own ISO code (never a default).
 *  - Tax naming: per-market (VAT / MwSt / TVA / GST / IVA / PPN /
 *    消費税 / 부가세 / 增值税 / Sales Tax), resolved from the
 *    project's country. Bilingual where the market expects it.
 *  - No invented values: missing company details render as blank
 *    fill-in lines, never placeholders posing as data.
 */

import { formatByCode } from "@/lib/international/currency-format";
import { SITE_URL } from "@/lib/seo";
import type { BoqInput, BoqResult } from "@/lib/estimation/boq-engine";
import { boqTaxLabel } from "@/lib/estimation/boq-tax-label";

export interface BankBoqOptions {
  /** ISO 3166-1 alpha-2 market of the project (drives tax naming). */
  countryCode?: string | null;
  /** Contractor/company details for the company block. Blank renders as fill-in lines. */
  companyName?: string | null;
  companyAddress?: string | null;
  companyRegistration?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  /** Revision stamp, e.g. "v2". */
  revision?: number;
  /** Preparer name for the declaration line. */
  preparedBy?: string | null;
}

function line(label: string, value?: string | null): string {
  const v = value?.trim();
  return `<tr><td class="lbl">${label}</td><td>${v ? v : '<span class="fill">&nbsp;</span>'}</td></tr>`;
}

export function boqToBankHtml(
  input: BoqInput,
  result: BoqResult,
  quoteRef: string,
  opts: BankBoqOptions = {},
): string {
  const t = result.totals!;
  const tax = boqTaxLabel(opts.countryCode);
  const cur = input.currency || "XXX";
  const money = (n: number) => formatByCode(n || 0, cur, { decimals: 0 });
  const rev = opts.revision && opts.revision > 1 ? ` — Revision v${opts.revision}` : "";

  const rows = result.line_totals
    .map(
      (l, i) =>
        `<tr><td class="num">${i + 1}</td><td>${l.item.description}<br/><small class="src">Ref: ${l.item.source_estimate_ref}</small></td><td class="num">${l.item.quantity.toLocaleString()} ${l.item.unit}</td><td class="num">${money(l.item.unit_cost)}</td><td class="num"><b>${money(l.line_total)}</b></td></tr>`,
    )
    .join("");

  const optRow = (label: string, rate: number | null, amount: number | null) =>
    rate === null || amount === null
      ? ""
      : `<tr class="sum"><td colspan="4">${label} (${rate}%)</td><td class="num">${money(amount)}</td></tr>`;

  const block = (title: string, rowsHtml: string) => `
    <table class="block">
      <tr><th colspan="2">${title}</th></tr>
      ${rowsHtml}
    </table>`;

  const companyBlock = block(
    "A. APPLICANT / CONTRACTING COMPANY",
    line("Company name", opts.companyName) +
      line("Registered address", opts.companyAddress) +
      line("Registration no.", opts.companyRegistration) +
      line("Phone", opts.companyPhone) +
      line("Email", opts.companyEmail),
  );

  const projectBlock = block(
    "B. PROJECT DETAILS",
    line("Project title", input.title) +
      line("Project location", input.project_location) +
      line("Client", input.client_name) +
      (input.client_contact ? line("Client contact", input.client_contact) : "") +
      line("BOQ reference", `${quoteRef}${rev ? ` (${rev})` : ""}`) +
      line("Currency", cur) +
      line("Date", new Date().toISOString().slice(0, 10)),
  );

  return `<!DOCTYPE html><html><head><title>Bill of Quantities ${quoteRef} — ${input.title}</title><style>
    body{font-family:Georgia,'Times New Roman',serif;padding:36px;color:#111;max-width:860px;margin:0 auto}
    .doc-head{text-align:center;border-bottom:3px double #111;padding-bottom:16px;margin-bottom:22px}
    .doc-head h1{font-size:22px;margin:0;letter-spacing:2px}
    .doc-head h2{font-size:14px;margin:6px 0 0;font-weight:600}
    .doc-head .ref{font-size:11px;color:#555;margin-top:6px}
    table.block{width:100%;border-collapse:collapse;font-size:12px;margin:0 0 18px}
    table.block th{background:#111;color:#fff;text-align:left;padding:8px 10px;font-size:11px;letter-spacing:1px}
    table.block td{border:1px solid #999;padding:7px 10px;vertical-align:top}
    table.block td.lbl{width:180px;background:#f2f2f2;font-weight:600}
    .fill{border-bottom:1px dotted #999;display:inline-block;min-width:100%}
    table.sched{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0 18px}
    table.sched th{border:1px solid #111;background:#e8e8e8;padding:8px 9px;text-align:left;font-size:11px;letter-spacing:.5px}
    table.sched td{border:1px solid #999;padding:7px 9px;vertical-align:top}
    td.num{text-align:right;white-space:nowrap}
    .src{color:#777}
    tr.sum td{background:#f7f7f7}
    tr.grand td{background:#111;color:#fff;font-weight:700;font-size:13px}
    h3.sec{font-size:12px;letter-spacing:1.5px;border-bottom:2px solid #111;padding-bottom:4px;margin:26px 0 8px}
    .terms{font-size:11px;line-height:1.7;color:#333}
    .terms li{margin-bottom:6px}
    .sig{display:flex;justify-content:space-between;margin-top:56px;font-size:11px}
    .sig div{width:46%;border-top:1px solid #111;padding-top:6px}
    .note{font-size:10px;color:#777;margin-top:18px;border-top:1px solid #ddd;padding-top:10px}
    @media print{body{padding:14px}}
  </style></head><body>
    <div class="doc-head">
      <h1>BILL OF QUANTITIES</h1>
      <h2>${input.title}${rev}</h2>
      <div class="ref">${quoteRef}${rev ? ` · ${rev}` : ""} · Currency: ${cur}</div>
    </div>
    ${companyBlock}
    ${projectBlock}
    <h3 class="sec">C. PRICED SCHEDULE OF WORKS</h3>
    <table class="sched">
      <tr><th style="width:28px">Item</th><th>Description</th><th>Quantity</th><th>Unit rate (${cur})</th><th>Amount (${cur})</th></tr>
      ${rows}
      <tr class="sum"><td colspan="4">Subtotal</td><td class="num"><b>${money(t.subtotal)}</b></td></tr>
      ${optRow("Contingency allowance", t.contingency_rate, t.contingency_amount)}
      ${optRow(`${tax.long} (${tax.short})`, t.vat_rate, t.vat_amount)}
      <tr class="grand"><td colspan="4">GRAND TOTAL (${cur})</td><td class="num">${money(t.grand_total)}</td></tr>
    </table>
    ${result.warnings.length ? `<p class="note"><b>Notes:</b> ${result.warnings.join(" ")}</p>` : ""}
    <h3 class="sec">D. TERMS &amp; CONDITIONS</h3>
    <ol class="terms">
      <li>This Bill of Quantities is a priced schedule of works prepared for construction-loan assessment purposes.</li>
      <li>Quantities and unit rates are planning estimates generated from FRELUX-verified calculations; every line references its source estimate (shown as "Ref").</li>
      <li>${tax.long} (${tax.short}) is applied only where a database-verified rate applies to this quote; no tax rate is assumed.</li>
      <li>The contingency allowance, where shown, is included per the stated percentage and is separate from the ${tax.short} base.</li>
      <li>All amounts are expressed in ${cur}. ${tax.long} treatment follows the market of the project location.</li>
      <li>Final contract sums are subject to executed contract documents between the named client and contractor.</li>
      <li>This document is valid for loan-application assessment and is not a payment instrument or payment guarantee.</li>
    </ol>
    <div class="sig">
      <div>Prepared by: ${opts.preparedBy?.trim() || ""}<br/><small>(name &amp; position)</small></div>
      <div>Signature &amp; date: <span class="fill">&nbsp;</span></div>
    </div>
    <p class="note">Generated by FRELUX (${SITE_URL}) on ${new Date().toISOString().slice(0, 10)}. Reference ${quoteRef}${rev ? `, ${rev}` : ""}. Amounts in ${cur}; ${tax.long} labelled per project market.</p>
  </body></html>`;
}
