import { describe, it, expect } from 'vitest';
import {
  TRADE_LABELS,
  buildLabourLineItem,
  calculateLabourCost,
  type LabourRate,
  type LabourActivityInput,
  type TradeCategory,
} from './labour-engine';

describe('measurement/labour-engine', () => {
  it('TRADE_LABELS has entries for all trades', () => {
    expect(Object.keys(TRADE_LABELS).length).toBeGreaterThan(0);
  });

  it('buildLabourLineItem returns line with 0 total when no rate', () => {
    const input: LabourActivityInput = {
      activity: 'painting',
      trade: 'painting' as TradeCategory,
      quantity: 50,
      unit: 'm²',
    };
    const item = buildLabourLineItem(input, null);
    expect(item.lineTotal).toBe(0);
    expect(item.hasRate).toBe(false);
    expect(item.rateSource).toBe('not_configured');
  });

  it('buildLabourLineItem calculates per_unit rate', () => {
    const input: LabourActivityInput = {
      activity: 'painting',
      trade: 'painting' as TradeCategory,
      quantity: 50,
      unit: 'm²',
    };
    const rate: LabourRate = {
      activity: 'painting',
      trade: 'painting' as TradeCategory,
      rateType: 'per_unit',
      ratePerUnit: 500,
      unit: 'm²',
      currency: 'NGN',
      source: 'default',
      overridden: false,
    };
    const item = buildLabourLineItem(input, rate);
    expect(item.lineTotal).toBe(25000);
    expect(item.hasRate).toBe(true);
  });

  it('buildLabourLineItem calculates lump_sum rate', () => {
    const input: LabourActivityInput = {
      activity: 'screeding',
      trade: 'screeding' as TradeCategory,
      quantity: 1,
      unit: 'job',
    };
    const rate: LabourRate = {
      activity: 'screeding',
      trade: 'screeding' as TradeCategory,
      rateType: 'lump_sum',
      ratePerUnit: 0,
      lumpSumAmount: 50000,
      unit: 'job',
      currency: 'NGN',
      source: 'default',
      overridden: false,
    };
    const item = buildLabourLineItem(input, rate);
    expect(item.lineTotal).toBe(50000);
  });

  it('buildLabourLineItem calculates percentage_of_materials rate', () => {
    const input: LabourActivityInput = {
      activity: 'supervision',
      trade: 'painting' as TradeCategory,
      quantity: 1,
      unit: 'job',
      materialCostForPercentage: 100000,
    };
    const rate: LabourRate = {
      activity: 'supervision',
      trade: 'painting' as TradeCategory,
      rateType: 'percentage_of_materials',
      ratePerUnit: 0,
      percentage: 10,
      unit: 'job',
      currency: 'NGN',
      source: 'default',
      overridden: false,
    };
    const item = buildLabourLineItem(input, rate);
    expect(item.lineTotal).toBe(10000);
  });

  it('calculateLabourCost returns total and line items', () => {
    const activities: LabourActivityInput[] = [
      { activity: 'painting', trade: 'painting' as TradeCategory, quantity: 50, unit: 'm²' },
    ];
    const rates = new Map<string, LabourRate>();
    rates.set('painting', {
      activity: 'painting',
      trade: 'painting' as TradeCategory,
      rateType: 'per_unit',
      ratePerUnit: 500,
      unit: 'm²',
      currency: 'NGN',
      source: 'default',
      overridden: false,
    });
    const result = calculateLabourCost(activities, rates);
    expect(result.totalLabourCost).toBe(25000);
    expect(result.lineItems.length).toBe(1);
    expect(result.confidence).toBe('high');
  });

  it('calculateLabourCost returns review_required when no rates', () => {
    const activities: LabourActivityInput[] = [
      { activity: 'painting', trade: 'painting' as TradeCategory, quantity: 50, unit: 'm²' },
    ];
    const rates = new Map<string, LabourRate>();
    const result = calculateLabourCost(activities, rates);
    expect(result.totalLabourCost).toBe(0);
    expect(result.confidence).toBe('review_required');
  });

  it('calculateLabourCost groups by trade', () => {
    const activities: LabourActivityInput[] = [
      { activity: 'painting', trade: 'painting' as TradeCategory, quantity: 50, unit: 'm²' },
      { activity: 'screeding', trade: 'screeding' as TradeCategory, quantity: 30, unit: 'm²' },
    ];
    const rates = new Map<string, LabourRate>();
    const result = calculateLabourCost(activities, rates);
    expect(result.tradeSubtotals.length).toBe(2);
  });
});
