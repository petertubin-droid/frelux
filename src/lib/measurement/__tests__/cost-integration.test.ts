/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for Feature 18: Cost Integration
 */
import { describe, it, expect } from 'vitest';
import {
  buildCostLineItem,
  buildCostEstimate,
  roofMaterialResultToQuantities,
  materialCalculationsToQuantities,
} from '../cost-integration';
import type { MaterialQuantityInput, MaterialPriceInput } from '../cost-integration';

describe('Feature 18: Cost Integration', () => {
  describe('buildCostLineItem', () => {
    it('builds a line item with price', () => {
      const qty: MaterialQuantityInput = {
        materialName: 'Cement',
        category: 'foundation',
        quantity: 50,
        quantityUnit: 'bags',
        quantitySource: 'calculated',
      };
      const price: MaterialPriceInput = {
        materialName: 'Cement',
        unitPrice: 7500,
        currency: 'NGN',
        source: 'market_intelligence',
        freshness: 'fresh',
        confidence: 'high',
      };

      const item = buildCostLineItem(qty, price);
      expect(item.materialName).toBe('Cement');
      expect(item.quantity).toBe(50);
      expect(item.unitPrice).toBe(7500);
      expect(item.lineTotal).toBe(375000);
      expect(item.hasPrice).toBe(true);
      expect(item.priceSource).toBe('market_intelligence');
      expect(item.priceFreshness).toBe('fresh');
      expect(item.priceConfidence).toBe('high');
    });

    it('builds a line item without price', () => {
      const qty: MaterialQuantityInput = {
        materialName: 'Cement',
        category: 'foundation',
        quantity: 50,
        quantityUnit: 'bags',
        quantitySource: 'calculated',
      };

      const item = buildCostLineItem(qty, null);
      expect(item.hasPrice).toBe(false);
      expect(item.lineTotal).toBe(0);
      expect(item.priceSource).toBe('not_configured');
      expect(item.priceFreshness).toBeNull();
    });

    it('marks user-overridden prices', () => {
      const qty: MaterialQuantityInput = {
        materialName: 'Paint',
        category: 'finishing',
        quantity: 10,
        quantityUnit: 'buckets',
        quantitySource: 'user_verified',
      };
      const price: MaterialPriceInput = {
        materialName: 'Paint',
        unitPrice: 15000,
        currency: 'NGN',
        source: 'user_override',
        overridden: true,
      };

      const item = buildCostLineItem(qty, price);
      expect(item.priceOverridden).toBe(true);
      expect(item.priceSource).toBe('user_override');
    });
  });

  describe('buildCostEstimate', () => {
    it('calculates total from multiple line items', () => {
      const quantities: MaterialQuantityInput[] = [
        { materialName: 'Cement', category: 'foundation', quantity: 50, quantityUnit: 'bags', quantitySource: 'calculated' },
        { materialName: 'Sand', category: 'foundation', quantity: 5, quantityUnit: 'trips', quantitySource: 'calculated' },
      ];
      const prices = new Map<string, MaterialPriceInput>([
        { materialName: 'Cement', unitPrice: 7500, currency: 'NGN', source: 'market_intelligence', freshness: 'fresh', confidence: 'high' },
        { materialName: 'Sand', unitPrice: 25000, currency: 'NGN', source: 'market_intelligence', freshness: 'recent', confidence: 'medium' },
      ].map((p) => [p.materialName, p]));

      const estimate = buildCostEstimate(quantities, prices);
      expect(estimate.lineItems).toHaveLength(2);
      expect(estimate.materialsTotal).toBe(50 * 7500 + 5 * 25000);
      expect(estimate.allPriced).toBe(true);
      expect(estimate.unpricedItemCount).toBe(0);
    });

    it('groups items by category', () => {
      const quantities: MaterialQuantityInput[] = [
        { materialName: 'Cement', category: 'foundation', quantity: 50, quantityUnit: 'bags', quantitySource: 'calculated' },
        { materialName: 'Sand', category: 'foundation', quantity: 5, quantityUnit: 'trips', quantitySource: 'calculated' },
        { materialName: 'Paint', category: 'finishing', quantity: 10, quantityUnit: 'buckets', quantitySource: 'calculated' },
      ];
      const prices = new Map<string, MaterialPriceInput>([
        { materialName: 'Cement', unitPrice: 7500, currency: 'NGN', source: 'market_intelligence' },
        { materialName: 'Sand', unitPrice: 25000, currency: 'NGN', source: 'market_intelligence' },
        { materialName: 'Paint', unitPrice: 15000, currency: 'NGN', source: 'manual' },
      ].map((p) => [p.materialName, p]));

      const estimate = buildCostEstimate(quantities, prices);
      expect(estimate.categories).toHaveLength(2);
      const foundation = estimate.categories.find((c) => c.name === 'foundation')!;
      expect(foundation.items).toHaveLength(2);
      expect(foundation.subtotal).toBe(50 * 7500 + 5 * 25000);
    });

    it('includes labour and contingency in grand total', () => {
      const quantities: MaterialQuantityInput[] = [
        { materialName: 'Cement', category: 'foundation', quantity: 50, quantityUnit: 'bags', quantitySource: 'calculated' },
      ];
      const prices = new Map<string, MaterialPriceInput>([
        { materialName: 'Cement', unitPrice: 7500, currency: 'NGN', source: 'market_intelligence' },
      ].map((p) => [p.materialName, p]));

      const estimate = buildCostEstimate(quantities, prices, {
        labourTotal: 100000,
        contingencyPercent: 10,
      });

      const materials = 50 * 7500; // 375000
      const labour = 100000;
      const contingency = (materials + labour) * 0.1; // 47500
      expect(estimate.materialsTotal).toBe(materials);
      expect(estimate.labourTotal).toBe(labour);
      expect(estimate.contingencyAmount).toBe(contingency);
      expect(estimate.grandTotal).toBe(materials + labour + contingency);
    });

    it('flags unpriced items', () => {
      const quantities: MaterialQuantityInput[] = [
        { materialName: 'Cement', category: 'foundation', quantity: 50, quantityUnit: 'bags', quantitySource: 'calculated' },
        { materialName: 'Unknown Material', category: 'other', quantity: 10, quantityUnit: 'pcs', quantitySource: 'calculated' },
      ];
      const prices = new Map<string, MaterialPriceInput>([
        { materialName: 'Cement', unitPrice: 7500, currency: 'NGN', source: 'market_intelligence' },
      ].map((p) => [p.materialName, p]));

      const estimate = buildCostEstimate(quantities, prices);
      expect(estimate.unpricedItemCount).toBe(1);
      expect(estimate.allPriced).toBe(false);
      expect(estimate.confidence).toBe('review_required');
      expect(estimate.issues.some((i) => i.severity === 'error')).toBe(true);
    });

    it('flags stale prices', () => {
      const quantities: MaterialQuantityInput[] = [
        { materialName: 'Cement', category: 'foundation', quantity: 50, quantityUnit: 'bags', quantitySource: 'calculated' },
      ];
      const prices = new Map<string, MaterialPriceInput>([
        { materialName: 'Cement', unitPrice: 7500, currency: 'NGN', source: 'market_intelligence', freshness: 'stale', confidence: 'low' },
      ].map((p) => [p.materialName, p]));

      const estimate = buildCostEstimate(quantities, prices);
      expect(estimate.stalePriceCount).toBe(1);
      expect(estimate.confidence).toBe('low');
      expect(estimate.issues.some((i) => i.severity === 'warning')).toBe(true);
    });

    it('tracks price source breakdown', () => {
      const quantities: MaterialQuantityInput[] = [
        { materialName: 'A', category: 'cat', quantity: 1, quantityUnit: 'pcs', quantitySource: 'calculated' },
        { materialName: 'B', category: 'cat', quantity: 1, quantityUnit: 'pcs', quantitySource: 'calculated' },
        { materialName: 'C', category: 'cat', quantity: 1, quantityUnit: 'pcs', quantitySource: 'calculated' },
      ];
      const prices = new Map<string, MaterialPriceInput>([
        { materialName: 'A', unitPrice: 100, currency: 'NGN', source: 'market_intelligence' },
        { materialName: 'B', unitPrice: 200, currency: 'NGN', source: 'user_override' },
        // C has no price
      ].map((p) => [p.materialName, p]));

      const estimate = buildCostEstimate(quantities, prices);
      expect(estimate.priceSourceBreakdown.market_intelligence).toBe(1);
      expect(estimate.priceSourceBreakdown.user_override).toBe(1);
      expect(estimate.priceSourceBreakdown.not_configured).toBe(1);
    });

    it('handles empty inputs', () => {
      const estimate = buildCostEstimate([], new Map());
      expect(estimate.lineItems).toHaveLength(0);
      expect(estimate.materialsTotal).toBe(0);
      expect(estimate.grandTotal).toBe(0);
      expect(estimate.allPriced).toBe(true);
    });

    it('builds explanation text', () => {
      const quantities: MaterialQuantityInput[] = [
        { materialName: 'Cement', category: 'foundation', quantity: 50, quantityUnit: 'bags', quantitySource: 'calculated' },
      ];
      const prices = new Map<string, MaterialPriceInput>([
        { materialName: 'Cement', unitPrice: 7500, currency: 'NGN', source: 'market_intelligence' },
      ].map((p) => [p.materialName, p]));

      const estimate = buildCostEstimate(quantities, prices, { labourTotal: 50000, contingencyPercent: 5 });
      const text = estimate.explanation.join(' ');
      expect(text).toContain('Materials total');
      expect(text).toContain('Labour total');
      expect(text).toContain('Contingency');
      expect(text).toContain('Grand total');
      expect(text).toContain('Confidence');
    });
  });

  describe('roofMaterialResultToQuantities', () => {
    it('converts roof material result to quantities', () => {
      // We'll mock a minimal roof result
      const roofResult = {
        sections: [{
          sectionId: 's1',
          sectionName: 'Main',
          surfaceAreaM2: 100,
          roofingMaterial: {
            materialId: 'mat_1',
            areaM2: 100,
            coats: 1,
            effectiveCoverageM2: 1.5,
            baseQuantity: 66.67,
            wastePercent: 10,
            quantityWithWaste: 73.33,
            purchaseQuantity: 74,
            quantityUnit: 'sheets',
            steps: [],
          },
          screwsNeeded: 740,
          ridgeCapQuantity: 10,
          hipCapQuantity: 14,
          fasciaBoardQuantity: 14,
          explanation: [],
          materialConfigured: true,
        }],
        totalRoofingMaterial: 74,
        totalScrews: 740,
        totalRidgeCaps: 10,
        totalHipCaps: 14,
        totalFasciaBoards: 14,
        materialSpecName: 'Aluminium',
        allConfigured: true,
        explanation: [],
      };

      const quantities = roofMaterialResultToQuantities(roofResult as any);
      expect(quantities).toHaveLength(5);
      expect(quantities[0].materialName).toContain('Roofing');
      expect(quantities[0].quantity).toBe(74);
      expect(quantities[0].category).toBe('roofing');
      expect(quantities[1].materialName).toContain('screws');
      expect(quantities[2].materialName).toContain('Ridge caps');
    });

    it('skips unconfigured sections', () => {
      const roofResult = {
        sections: [{
          sectionId: 's1',
          sectionName: 'Main',
          surfaceAreaM2: 100,
          roofingMaterial: null,
          screwsNeeded: null,
          ridgeCapQuantity: null,
          hipCapQuantity: null,
          fasciaBoardQuantity: null,
          explanation: [],
          materialConfigured: false,
        }],
        totalRoofingMaterial: 0,
        totalScrews: 0,
        totalRidgeCaps: 0,
        totalHipCaps: 0,
        totalFasciaBoards: 0,
        materialSpecName: null,
        allConfigured: false,
        explanation: [],
      };

      const quantities = roofMaterialResultToQuantities(roofResult as any);
      expect(quantities).toHaveLength(0);
    });
  });

  describe('materialCalculationsToQuantities', () => {
    it('converts material calculations to quantities', () => {
      const results = [
        {
          materialName: 'Paint',
          category: 'finishing',
          calculation: {
            materialId: 'm1',
            areaM2: 100,
            coats: 2,
            effectiveCoverageM2: 17.5,
            baseQuantity: 5.71,
            wastePercent: 10,
            quantityWithWaste: 6.28,
            purchaseQuantity: 7,
            quantityUnit: 'buckets',
            steps: [],
          },
        },
      ];

      const quantities = materialCalculationsToQuantities(results as any);
      expect(quantities).toHaveLength(1);
      expect(quantities[0].materialName).toBe('Paint');
      expect(quantities[0].quantity).toBe(7);
      expect(quantities[0].quantityUnit).toBe('buckets');
      expect(quantities[0].quantitySource).toBe('calculated');
    });
  });

  describe('Integration: Material Engine → Cost Estimate', () => {
    it('produces a cost estimate from material quantities and market prices', () => {
      const quantities: MaterialQuantityInput[] = [
        { materialName: 'Cement', category: 'foundation', quantity: 50, quantityUnit: 'bags', quantitySource: 'calculated' },
        { materialName: 'Sand', category: 'foundation', quantity: 5, quantityUnit: 'trips', quantitySource: 'calculated' },
        { materialName: 'Granite', category: 'foundation', quantity: 3, quantityUnit: 'trips', quantitySource: 'calculated' },
        { materialName: 'Paint', category: 'finishing', quantity: 7, quantityUnit: 'buckets', quantitySource: 'user_verified' },
      ];
      const prices = new Map<string, MaterialPriceInput>([
        { materialName: 'Cement', unitPrice: 7500, currency: 'NGN', source: 'market_intelligence', freshness: 'fresh', confidence: 'high' },
        { materialName: 'Sand', unitPrice: 25000, currency: 'NGN', source: 'market_intelligence', freshness: 'recent', confidence: 'medium' },
        { materialName: 'Granite', unitPrice: 45000, currency: 'NGN', source: 'market_intelligence', freshness: 'fresh', confidence: 'high' },
        { materialName: 'Paint', unitPrice: 15000, currency: 'NGN', source: 'user_override', overridden: true },
      ].map((p) => [p.materialName, p]));

      const estimate = buildCostEstimate(quantities, prices, {
        labourTotal: 200000,
        contingencyPercent: 10,
      });

      expect(estimate.lineItems).toHaveLength(4);
      expect(estimate.categories).toHaveLength(2);
      expect(estimate.materialsTotal).toBe(50 * 7500 + 5 * 25000 + 3 * 45000 + 7 * 15000);
      expect(estimate.labourTotal).toBe(200000);
      expect(estimate.allPriced).toBe(true);
      expect(estimate.confidence).toBe('high');
      expect(estimate.grandTotal).toBeGreaterThan(estimate.materialsTotal);
    });
  });
});
