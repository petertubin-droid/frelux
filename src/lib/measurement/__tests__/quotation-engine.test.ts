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
