import { describe, it, expect } from 'vitest';
import { buildQuotation, generateQuotationNumber, DEFAULT_QUOTATION_SETTINGS } from '../quotation-engine';
import type { CostEstimate } from '../cost-integration';
import type { LabourCostResult } from '../labour-engine';

function makeCostEstimate(): CostEstimate {
  return {
    lineItems: [
      { id: '1', materialName: 'Cement', category: 'foundation', quantity: 50, quantityUnit: 'bags', unitPrice: 7500, currency: 'NGN', lineTotal: 375000, priceSource: 'market_intelligence', quantitySource: 'calculated', priceFreshness: 'fresh', priceConfidence: 'high', priceOverridden: false, hasPrice: true, explanation: '' },
      { id: '2', materialName: 'Sand', category: 'foundation', quantity: 5, quantityUnit: 'trips', unitPrice: 25000, currency: 'NGN', lineTotal: 125000, priceSource: 'market_intelligence', quantitySource: 'calculated', priceFreshness: 'recent', priceConfidence: 'medium', priceOverridden: false, hasPrice: true, explanation: '' },
    ],
    categories: [{ name: 'foundation', items: [], subtotal: 500000, itemCount: 2, allPriced: true }],
    materialsTotal: 500000,
    labourTotal: 0,
    contingencyPercent: 10,
    contingencyAmount: 50000,
    grandTotal: 550000,
    currency: 'NGN',
    confidence: 'high',
    pricedItemCount: 2,
    unpricedItemCount: 0,
    stalePriceCount: 0,
    overriddenPriceCount: 0,
    priceSourceBreakdown: { market_intelligence: 2, user_override: 0, manual: 0, not_configured: 0 },
    allPriced: true,
    explanation: [],
    issues: [],
  };
}

function makeLabourCost(): LabourCostResult {
  return {
    lineItems: [
      { id: '1', activity: 'Plastering', trade: 'plastering', tradeLabel: 'Plastering', rateType: 'per_unit', ratePerUnit: 500, quantity: 100, unit: 'm²', lineTotal: 50000, currency: 'NGN', rateSource: 'admin_config', rateOverridden: false, hasRate: true, explanation: '' },
    ],
    tradeSubtotals: [{ trade: 'plastering', tradeLabel: 'Plastering', items: [], subtotal: 50000, itemCount: 1 }],
    totalLabourCost: 50000,
    currency: 'NGN',
    confidence: 'high',
    itemCount: 1,
    unpricedCount: 0,
    overriddenCount: 0,
    allPriced: true,
    explanation: [],
  };
}

describe('Feature 22: Quotation & Export Engine', () => {
  it('builds a complete quotation document', () => {
    const quotation = buildQuotation({
      costEstimate: makeCostEstimate(),
      labourCost: makeLabourCost(),
      projectName: 'Test Building',
      clientName: 'John Doe',
    });
    expect(quotation.quotationNumber).toBeTruthy();
    expect(quotation.projectName).toBe('Test Building');
    expect(quotation.clientName).toBe('John Doe');
    expect(quotation.materialsTotal).toBe(500000);
    expect(quotation.labourTotal).toBe(50000);
    expect(quotation.grandTotal).toBeGreaterThan(0);
  });

  it('generates unique quotation numbers', () => {
    const num1 = generateQuotationNumber();
    const num2 = generateQuotationNumber();
    expect(num1).not.toBe(num2);
    expect(num1).toContain('FRELUX');
  });

  it('calculates validity date from settings', () => {
    const quotation = buildQuotation({
      costEstimate: makeCostEstimate(),
      projectName: 'Test',
      dateIssued: '2026-01-01',
      settings: { validityDays: 30 },
    });
    expect(quotation.dateIssued).toBe('2026-01-01');
    expect(quotation.validUntil).toBe('2026-01-31');
  });

  it('includes tax when configured', () => {
    const quotation = buildQuotation({
      costEstimate: makeCostEstimate(),
      labourCost: makeLabourCost(),
      projectName: 'Test',
      settings: { taxPercent: 7.5 },
    });
    const expectedTax = (500000 + 50000 + 50000) * 0.075;
    expect(quotation.taxPercent).toBe(7.5);
    expect(quotation.taxAmount).toBeCloseTo(expectedTax, 2);
    expect(quotation.grandTotal).toBeCloseTo(500000 + 50000 + 50000 + expectedTax, 2);
  });

  it('builds all required sections', () => {
    const quotation = buildQuotation({
      costEstimate: makeCostEstimate(),
      labourCost: makeLabourCost(),
      projectName: 'Test',
    });
    const sectionTypes = quotation.sections.map((s) => s.type);
    expect(sectionTypes).toContain('header');
    expect(sectionTypes).toContain('client_info');
    expect(sectionTypes).toContain('project_info');
    expect(sectionTypes).toContain('materials_breakdown');
    expect(sectionTypes).toContain('labour_breakdown');
    expect(sectionTypes).toContain('cost_summary');
    expect(sectionTypes).toContain('terms');
    expect(sectionTypes).toContain('footer');
  });

  it('includes materials breakdown table', () => {
    const quotation = buildQuotation({
      costEstimate: makeCostEstimate(),
      projectName: 'Test',
    });
    const matSection = quotation.sections.find((s) => s.type === 'materials_breakdown')!;
    expect(matSection.table).toBeTruthy();
    expect(matSection.table!.rows).toHaveLength(2);
    expect(matSection.table!.headers).toContain('Material');
  });

  it('generates share text for WhatsApp/email', () => {
    const quotation = buildQuotation({
      costEstimate: makeCostEstimate(),
      labourCost: makeLabourCost(),
      projectName: 'Villa Project',
      clientName: 'Jane',
    });
    expect(quotation.shareText).toContain('Villa Project');
    expect(quotation.shareText).toContain('Grand Total');
    expect(quotation.shareText).toContain('NGN');
    expect(quotation.shareText).toContain('FRELUX');
  });

  it('uses default settings when none provided', () => {
    const quotation = buildQuotation({
      costEstimate: makeCostEstimate(),
      projectName: 'Test',
    });
    expect(quotation.settings.companyName).toBe(DEFAULT_QUOTATION_SETTINGS.companyName);
    expect(quotation.settings.validityDays).toBe(DEFAULT_QUOTATION_SETTINGS.validityDays);
  });

  it('builds explanation text', () => {
    const quotation = buildQuotation({
      costEstimate: makeCostEstimate(),
      labourCost: makeLabourCost(),
      projectName: 'Test',
    });
    const text = quotation.explanation.join(' ');
    expect(text).toContain('Quotation');
    expect(text).toContain('Materials');
    expect(text).toContain('Labour');
    expect(text).toContain('Grand total');
  });
});


describe('Commercial Pillar 4: jurisdictional tax on proposals', () => {
  it('carries Ontario HST through the document', () => {
    const quote = buildQuotation({
      costEstimate: makeCostEstimate(),
      labourCost: makeLabourCost(),
      clientName: 'Maple Builds Inc.',
      projectName: 'Toronto fit-out',
      settings: { ...DEFAULT_QUOTATION_SETTINGS, canadaProvince: 'ON' },
    });
    expect(quote.canadaTax).toBeDefined();
    expect(quote.canadaTax!.province.province).toBe('ON');
    // Supply base = 500000 materials + 50000 labour; contingency is not a supply.
    expect(quote.canadaTax!.totalTax).toBe(71500); // 13% HST on 550000
    expect(quote.taxAmount).toBe(71500);
    // Grand total = taxable base (600000 incl. contingency) + HST
    expect(quote.grandTotal).toBe(671500);
  });

  it('carries BC GST+PST with materials-only PST', () => {
    const quote = buildQuotation({
      costEstimate: makeCostEstimate(),
      labourCost: makeLabourCost(),
      clientName: 'Coast Works Ltd.',
      projectName: 'Vancouver renovation',
      settings: { ...DEFAULT_QUOTATION_SETTINGS, canadaProvince: 'BC' },
    });
    // GST 5% on 550000 = 27500; PST 7% on materials 500000 = 35000
    expect(quote.canadaTax!.totalTax).toBe(62500);
    expect(quote.taxAmount).toBe(62500);
  });

  it('carries India GST with HSN items and the intra-state split', () => {
    const quote = buildQuotation({
      costEstimate: makeCostEstimate(),
      labourCost: makeLabourCost(),
      clientName: 'Mumbai Infra Pvt Ltd',
      projectName: 'Works contract',
      settings: {
        ...DEFAULT_QUOTATION_SETTINGS,
        indiaSupplierState: 'MH',
        indiaPlaceOfSupplyState: 'MH',
        indiaItems: [
          { hsnCode: '2523', amount: 375000 }, // cement 28%
          { hsnCode: '995459', amount: 50000 }, // works contract 12%
        ],
      },
    });
    expect(quote.indiaGst).toBeDefined();
    expect(quote.indiaGst!.interState).toBe(false);
    // 28% of 375000 = 105000 (CGST 52500 + SGST 52500); 12% of 50000 = 6000
    expect(quote.indiaGst!.totalTax).toBe(111000);
    expect(quote.taxAmount).toBe(111000);
    // Per-HSN rates: no single percentage expresses the tax
    expect(quote.taxPercent).toBeNull();
    expect(quote.grandTotal).toBe(711000); // 600000 taxable base + 111000
  });

  it('switches to IGST when the place of supply is another state', () => {
    const quote = buildQuotation({
      costEstimate: makeCostEstimate(),
      labourCost: makeLabourCost(),
      clientName: 'Delhi Infra Pvt Ltd',
      projectName: 'Inter-state works contract',
      settings: {
        ...DEFAULT_QUOTATION_SETTINGS,
        indiaSupplierState: 'MH',
        indiaPlaceOfSupplyState: 'DL',
        indiaItems: [{ hsnCode: '2523', amount: 375000 }],
      },
    });
    expect(quote.indiaGst!.interState).toBe(true);
    expect(quote.indiaGst!.lines[0].mode).toBe('igst');
    expect(quote.indiaGst!.totalTax).toBe(105000);
  });

  it('exempts labour from US sales tax on a capital improvement', () => {
    const quote = buildQuotation({
      costEstimate: makeCostEstimate(),
      labourCost: makeLabourCost(),
      clientName: 'Empire LLC',
      projectName: 'NYC capital improvement',
      settings: {
        ...DEFAULT_QUOTATION_SETTINGS,
        capitalImprovement: true,
        salesTaxTiers: [
          { kind: 'state', name: 'New York State', ratePct: 4, appliesTo: 'both' },
          { kind: 'city', name: 'NYC', ratePct: 4.5, appliesTo: 'both' },
        ],
      },
    });
    expect(quote.salesTax).toBeDefined();
    expect(quote.salesTax!.lines.every((l) => l.appliesTo === 'materials')).toBe(true);
    // 8.5% on materials only (500000), never on labour
    expect(quote.salesTax!.totalTax).toBe(42500);
    expect(quote.taxAmount).toBe(42500);
  });

  it('does not apply India GST when state codes are missing', () => {
    const quote = buildQuotation({
      costEstimate: makeCostEstimate(),
      labourCost: makeLabourCost(),
      clientName: 'No State Ltd',
      projectName: 'Unspecified supply',
      settings: {
        ...DEFAULT_QUOTATION_SETTINGS,
        indiaItems: [{ hsnCode: '2523', amount: 100000 }],
      },
    });
    expect(quote.indiaGst).toBeUndefined();
  });
});
