/**
 * PDF Quote Export Utility
 * Generates a printable HTML document and opens the browser's print dialog.
 * The user can save as PDF from the print dialog — no external library needed.
 */

import type { CalculatorResult, CostEstimateResult, CalculatorInput, CostEstimateInput } from '@/types';
import { formatNumber, formatCurrency } from '@/lib/utils';

interface QuoteExportData {
  result: CostEstimateResult;
  input: CostEstimateInput;
  paintTypeName: string;
  company?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    logoUrl?: string | null;
  };
  terms?: string | null;
}

export function exportPdfQuote(data: QuoteExportData): void {
  const { result, input, paintTypeName, company, terms } = data;
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const ref = `FRELUX-${Date.now().toString().slice(-8)}`;

  const rows: string[] = [];
  let idx = 1;

  if (result.paintCost > 0) {
    const qty = result.paintContainerCount > 0 ? `${result.paintContainerCount} container(s)` : `${formatNumber(input.paintLiters, 1)} L`;
    rows.push(row(idx++, `Paint (${paintTypeName})`, qty, result.paintCost, result.currencySymbol));
  }
  if (result.primerCost > 0) rows.push(row(idx++, 'Primer', '1 unit', result.primerCost, result.currencySymbol));
  if (result.fillerCost > 0) rows.push(row(idx++, 'Filler', '1 unit', result.fillerCost, result.currencySymbol));
  if (result.puttyCost > 0) rows.push(row(idx++, 'Putty', '1 unit', result.puttyCost, result.currencySymbol));
  if (result.sandpaperCost > 0) rows.push(row(idx++, 'Sandpaper', '1 unit', result.sandpaperCost, result.currencySymbol));
  if (result.brushesCost > 0) rows.push(row(idx++, 'Brushes', '1 set', result.brushesCost, result.currencySymbol));
  if (result.rollersCost > 0) rows.push(row(idx++, 'Rollers', '1 set', result.rollersCost, result.currencySymbol));
  if (result.otherMaterialsCost > 0) rows.push(row(idx++, 'Other materials', '1 unit', result.otherMaterialsCost, result.currencySymbol));
  if (result.laborCost > 0) rows.push(row(idx++, 'Labour', `${formatNumber(input.paintableArea)} m²`, result.laborCost, result.currencySymbol));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Quote ${ref}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #f5f5f5; padding: 20px; }
  .invoice { max-width: 800px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.08); }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #7C3AED; padding-bottom: 20px; }
  .company { flex: 1; }
  .company-name { font-size: 22px; font-weight: 700; color: #1a1a2e; }
  .company-info { font-size: 13px; color: #666; margin-top: 4px; line-height: 1.5; }
  .logo { max-width: 120px; max-height: 60px; margin-left: 20px; }
  .meta { text-align: right; }
  .meta h1 { font-size: 28px; color: #7C3AED; font-weight: 700; }
  .meta .ref { font-size: 13px; color: #666; margin-top: 4px; }
  .meta .date { font-size: 13px; color: #666; margin-top: 2px; }
  .project-info { display: flex; gap: 30px; margin-bottom: 25px; padding: 15px 20px; background: #f9f8ff; border-radius: 8px; }
  .project-info .item { font-size: 13px; }
  .project-info .item .label { color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .project-info .item .value { font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; padding: 10px 12px; border-bottom: 2px solid #e5e5e5; }
  td { padding: 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  td:last-child, th:last-child { text-align: right; font-weight: 600; }
  .totals { margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
  .totals .row.grand { border-top: 2px solid #1a1a2e; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 700; color: #7C3AED; }
  .terms { margin-top: 30px; padding: 15px 20px; background: #f9f8ff; border-radius: 8px; font-size: 12px; color: #666; line-height: 1.6; }
  .terms h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-bottom: 8px; }
  .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; }
  .footer a { color: #7C3AED; text-decoration: none; }
  @media print {
    body { background: #fff; padding: 0; }
    .invoice { box-shadow: none; border-radius: 0; max-width: 100%; padding: 20px; }
    @page { margin: 1.5cm; }
  }
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div class="company">
      ${company?.logoUrl ? `<img src="${company.logoUrl}" class="logo" alt="logo" />` : ''}
      <div class="company-name">${company?.name ?? 'FRELUX'}</div>
      ${company?.address ? `<div class="company-info">${company.address}</div>` : ''}
      ${company?.phone ? `<div class="company-info">Tel: ${company.phone}</div>` : ''}
      ${company?.email ? `<div class="company-info">Email: ${company.email}</div>` : ''}
    </div>
    <div class="meta">
      <h1>QUOTATION</h1>
      <div class="ref">Ref: ${ref}</div>
      <div class="date">Date: ${date}</div>
    </div>
  </div>

  <div class="project-info">
    <div class="item"><div class="label">Project Type</div><div class="value">${input.projectType}</div></div>
    <div class="item"><div class="label">Paint Type</div><div class="value">${paintTypeName}</div></div>
    <div class="item"><div class="label">Paintable Area</div><div class="value">${formatNumber(input.paintableArea)} m²</div></div>
    <div class="item"><div class="label">Paint Required</div><div class="value">${formatNumber(input.paintLiters, 1)} L</div></div>
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Item</th><th>Quantity</th><th>Amount</th></tr>
    </thead>
    <tbody>
      ${rows.join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Materials</span><span>${formatCurrency(result.total - result.laborCost, result.currencySymbol)}</span></div>
    ${result.laborCost > 0 ? `<div class="row"><span>Labour</span><span>${formatCurrency(result.laborCost, result.currencySymbol)}</span></div>` : ''}
    <div class="row grand"><span>Grand Total</span><span>${formatCurrency(result.total, result.currencySymbol)}</span></div>
  </div>

  ${terms ? `<div class="terms"><h3>Terms & Conditions</h3>${escapeHtml(terms)}</div>` : ''}

  <div class="footer">
    Generated by <a href="https://freluxpaintcalc.com">FRELUX Paint Calculator</a> · ${date}
  </div>
</div>
<script>
  window.onload = function() { window.print(); }
</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function row(num: number, item: string, qty: string, amount: number, symbol: string): string {
  return `<tr><td>${num}</td><td>${item}</td><td>${qty}</td><td>${formatCurrency(amount, symbol)}</td></tr>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}
