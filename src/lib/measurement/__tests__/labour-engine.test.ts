import { describe, it, expect } from 'vitest';
import {
  buildLabourLineItem,
  calculateLabourCost,
  generateDefaultLabourActivities,
  type LabourActivityInput,
  type LabourRate,
} from '../labour-engine';

describe('Feature 19: Labour Engine', () => {
  describe('buildLabourLineItem', () => {
    it('builds per-unit rate line item', () => {
      const input: LabourActivityInput = { activity: 'Plastering', trade: 'plastering' as const, quantity: 100, unit: 'm²' };
      const rate: LabourRate = { activity: 'Plastering', trade: 'plastering' as const, rateType: 'per_unit' as const, ratePerUnit: 500, unit: 'm²', currency: 'NGN', source: 'admin_config' as const, overridden: false };
      const item = buildLabourLineItem(input, rate);
      expect(item.lineTotal).toBe(50000);
      expect(item.hasRate).toBe(true);
    });

    it('builds lump sum line item', () => {
      const input: LabourActivityInput = { activity: 'Site setup', trade: 'site_preparation' as const, quantity: 1, unit: 'project' };
      const rate: LabourRate = { activity: 'Site setup', trade: 'site_preparation' as const, rateType: 'lump_sum' as const, ratePerUnit: 0, unit: 'project', lumpSumAmount: 50000, currency: 'NGN', source: 'admin_config' as const, overridden: false };
      const item = buildLabourLineItem(input, rate);
      expect(item.lineTotal).toBe(50000);
    });

    it('builds percentage-of-materials line item', () => {
      const input: LabourActivityInput = { activity: 'Electrical', trade: 'electrical' as const, quantity: 1, unit: 'project', materialCostForPercentage: 200000 };
      const rate: LabourRate = { activity: 'Electrical', trade: 'electrical' as const, rateType: 'percentage_of_materials', ratePerUnit: 0, unit: 'project', percentage: 15, currency: 'NGN', source: 'admin_config' as const, overridden: false };
      const item = buildLabourLineItem(input, rate);
      expect(item.lineTotal).toBe(30000);
    });

    it('handles missing rate', () => {
      const input: LabourActivityInput = { activity: 'Plastering', trade: 'plastering' as const, quantity: 100, unit: 'm²' };
      const item = buildLabourLineItem(input, null);
      expect(item.hasRate).toBe(false);
      expect(item.lineTotal).toBe(0);
    });
  });

  describe('calculateLabourCost', () => {
    it('calculates total with trade subtotals', () => {
      const activities: LabourActivityInput[] = [
        { activity: 'Plastering', trade: 'plastering' as const, quantity: 100, unit: 'm²' },
        { activity: 'Block laying', trade: 'masonry' as const, quantity: 200, unit: 'm²' },
      ];
      const rates = new Map<string, LabourRate>([
        { activity: 'Plastering', trade: 'plastering' as const, rateType: 'per_unit' as const, ratePerUnit: 500, unit: 'm²', currency: 'NGN', source: 'admin_config' as const, overridden: false },
        { activity: 'Block laying', trade: 'masonry' as const, rateType: 'per_unit' as const, ratePerUnit: 800, unit: 'm²', currency: 'NGN', source: 'admin_config' as const, overridden: false },
      ].map((r): [string, LabourRate] => [r.activity, r]));

      const result = calculateLabourCost(activities, rates);
      expect(result.totalLabourCost).toBe(100 * 500 + 200 * 800);
      expect(result.tradeSubtotals).toHaveLength(2);
      expect(result.allPriced).toBe(true);
      expect(result.confidence).toBe('high');
    });

    it('flags missing rates', () => {
      const activities: LabourActivityInput[] = [
        { activity: 'Plastering', trade: 'plastering' as const, quantity: 100, unit: 'm²' },
        { activity: 'Unknown', trade: 'other' as const, quantity: 10, unit: 'm²' },
      ];
      const rates = new Map<string, LabourRate>([
        { activity: 'Plastering', trade: 'plastering' as const, rateType: 'per_unit' as const, ratePerUnit: 500, unit: 'm²', currency: 'NGN', source: 'admin_config' as const, overridden: false },
      ].map((r): [string, LabourRate] => [r.activity, r]));

      const result = calculateLabourCost(activities, rates);
      expect(result.unpricedCount).toBe(1);
      expect(result.confidence).toBe('review_required');
    });

    it('handles empty inputs', () => {
      const result = calculateLabourCost([], new Map());
      expect(result.totalLabourCost).toBe(0);
      expect(result.itemCount).toBe(0);
    });
  });

  describe('generateDefaultLabourActivities', () => {
    it('generates activities from project scope', () => {
      const activities = generateDefaultLabourActivities({
        foundationVolumeM3: 50,
        blockWallAreaM2: 200,
        roofAreaM2: 100,
        plasterAreaM2: 300,
        paintAreaM2: 300,
        generalLabourDays: 5,
      });
      expect(activities.length).toBeGreaterThan(5);
      expect(activities.some((a) => a.activity === 'Excavation')).toBe(true);
      expect(activities.some((a) => a.activity === 'Block laying')).toBe(true);
      expect(activities.some((a) => a.activity === 'Roofing installation')).toBe(true);
    });

    it('returns empty for empty scope', () => {
      const activities = generateDefaultLabourActivities({});
      expect(activities).toHaveLength(0);
    });
  });
});
