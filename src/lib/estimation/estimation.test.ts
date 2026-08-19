import { describe, it, expect } from 'vitest';
import {
  validateDimensions,
  validateQuantity,
  validateUnit,
  validateProduct,
  validatePrice,
  validatePackSize,
  formatConfigWarning,
} from './validation';
import {
  roundPackQuantity,
  roundPackWithMin,
  calculateLeftover,
} from './pack-sizing';
import {
  createPriceSnapshot,
  calculateLineTotal,
  calculateEstimateTotal,
  formatCurrency,
  isPriceConfigured,
} from './pricing';
import {
  createAdjustmentRecord,
  hasAdjustments,
  getAdjustedItems,
} from './adjustments';

describe('FRELUX Estimation Engine Phase 1', () => {
  // =========================================================
  // Validation Tests
  // =========================================================
  describe('Validation', () => {
    describe('validateDimensions', () => {
      it('rejects negative values, zero, NaN, Infinity', () => {
        // Single numeric input tests
        expect(validateDimensions(-5).valid).toBe(false);
        expect(validateDimensions(0).valid).toBe(false);
        expect(validateDimensions(NaN).valid).toBe(false);
        expect(validateDimensions(Infinity).valid).toBe(false);
        expect(validateDimensions(-Infinity).valid).toBe(false);

        // Object input tests with invalid values
        expect(validateDimensions({ length: -10, width: 5 }).valid).toBe(false);
        expect(validateDimensions({ length: 10, width: 0 }).valid).toBe(false);
        expect(validateDimensions({ length: NaN, width: 5 }).valid).toBe(false);
        expect(validateDimensions({ length: Infinity, width: 5 }).valid).toBe(false);
        expect(validateDimensions(null).valid).toBe(false);
        expect(validateDimensions(undefined).valid).toBe(false);
      });

      it('accepts valid positive values', () => {
        // Single numeric input
        expect(validateDimensions(10).valid).toBe(true);
        expect(validateDimensions(0.5).valid).toBe(true);

        // Object input with valid dimensions
        const result = validateDimensions({ length: 6, width: 4, height: 3 });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('validateQuantity', () => {
      it('rejects negative, zero where invalid, NaN', () => {
        expect(validateQuantity(-10).valid).toBe(false);
        expect(validateQuantity(0).valid).toBe(false); // default allowZero = false
        expect(validateQuantity(0, 'Quantity', false).valid).toBe(false);
        expect(validateQuantity(NaN).valid).toBe(false);
        expect(validateQuantity(Infinity).valid).toBe(false);
        expect(validateQuantity(null).valid).toBe(false);
        expect(validateQuantity(undefined).valid).toBe(false);
        expect(validateQuantity('invalid').valid).toBe(false);
      });

      it('accepts positive quantity and zero when allowZero is true', () => {
        expect(validateQuantity(5).valid).toBe(true);
        expect(validateQuantity(0, 'Quantity', true).valid).toBe(true);
      });
    });

    describe('validateUnit', () => {
      it('rejects unknown units when allowed units list is provided', () => {
        const allowed = ['liters', 'sqm', 'pieces', 'buckets'];
        expect(validateUnit('gallons', allowed).valid).toBe(false);
        expect(validateUnit('invalid_unit', allowed).valid).toBe(false);
      });

      it('rejects empty, null, or whitespace units', () => {
        expect(validateUnit(null).valid).toBe(false);
        expect(validateUnit(undefined).valid).toBe(false);
        expect(validateUnit('').valid).toBe(false);
        expect(validateUnit('   ').valid).toBe(false);
      });

      it('accepts known valid units', () => {
        const allowed = ['liters', 'sqm', 'pieces'];
        expect(validateUnit('liters', allowed).valid).toBe(true);
        expect(validateUnit('sqm', allowed).valid).toBe(true);
        expect(validateUnit('liters').valid).toBe(true); // without allowed list
      });
    });

    describe('validateProduct', () => {
      it('rejects inactive products', () => {
        const inactiveProduct = {
          id: 'prod_1',
          name: 'Emulsion Paint',
          is_active: false,
        };
        const result = validateProduct(inactiveProduct);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('inactive'))).toBe(true);
      });

      it('rejects null, non-objects, or missing required fields', () => {
        expect(validateProduct(null).valid).toBe(false);
        expect(validateProduct(undefined).valid).toBe(false);
        expect(validateProduct({ name: 'Paint' }).valid).toBe(false); // missing id
        expect(validateProduct({ id: 'prod_1' }).valid).toBe(false); // missing name
      });

      it('accepts valid active products', () => {
        const activeProduct = {
          id: 'prod_1',
          name: 'FRELUX Matte Emulsion',
          is_active: true,
        };
        const result = validateProduct(activeProduct);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('validatePrice', () => {
      it('rejects null/undefined/negative prices', () => {
        expect(validatePrice(null).valid).toBe(false);
        expect(validatePrice(undefined).valid).toBe(false);
        expect(validatePrice(-100).valid).toBe(false);
        expect(validatePrice(NaN).valid).toBe(false);
        expect(validatePrice(Infinity).valid).toBe(false);
      });

      it('accepts valid non-negative price values', () => {
        expect(validatePrice(0).valid).toBe(true);
        expect(validatePrice(25000).valid).toBe(true);
        expect(validatePrice(12.5).valid).toBe(true);
      });
    });

    describe('validatePackSize', () => {
      it('rejects zero/negative/null', () => {
        expect(validatePackSize(0).valid).toBe(false);
        expect(validatePackSize(-5).valid).toBe(false);
        expect(validatePackSize(null).valid).toBe(false);
        expect(validatePackSize(undefined).valid).toBe(false);
        expect(validatePackSize(NaN).valid).toBe(false);
      });

      it('accepts valid positive pack sizes', () => {
        expect(validatePackSize(20).valid).toBe(true);
        expect(validatePackSize(4).valid).toBe(true);
        expect(validatePackSize(1).valid).toBe(true);
      });
    });

    describe('formatConfigWarning', () => {
      it('returns the correct message', () => {
        const msg = formatConfigWarning('coverage_rate', 'wall_calculator');
        expect(msg).toBe(
          "This calculation requires additional FRELUX configuration before an accurate estimate can be generated. (Rule 'coverage_rate' for wall_calculator)"
        );
      });
    });
  });

  // =========================================================
  // Pack Sizing Tests
  // =========================================================
  describe('Pack Sizing', () => {
    describe('roundPackQuantity', () => {
      it('with ceil rule rounds up correctly', () => {
        const result = roundPackQuantity(2.3, 1, 'ceil');
        expect(result.pack_count).toBe(3);
        expect(result.practical_purchase_quantity).toBe(3);

        const bucketResult = roundPackQuantity(25, 20, 'ceil');
        expect(bucketResult.pack_count).toBe(2);
        expect(bucketResult.practical_purchase_quantity).toBe(40);
      });

      it('with floor rule rounds down', () => {
        const result = roundPackQuantity(2.8, 1, 'floor');
        expect(result.pack_count).toBe(2);
        expect(result.practical_purchase_quantity).toBe(2);

        const bucketResult = roundPackQuantity(35, 20, 'floor');
        expect(bucketResult.pack_count).toBe(1);
        expect(bucketResult.practical_purchase_quantity).toBe(20);
      });

      it('with round rule uses Math.round', () => {
        const resultLow = roundPackQuantity(2.3, 1, 'round');
        expect(resultLow.pack_count).toBe(2);
        expect(resultLow.practical_purchase_quantity).toBe(2);

        const resultHigh = roundPackQuantity(2.7, 1, 'round');
        expect(resultHigh.pack_count).toBe(3);
        expect(resultHigh.practical_purchase_quantity).toBe(3);
      });

      it('with none returns the theoretical qty', () => {
        const result = roundPackQuantity(2.3, 1, 'none');
        expect(result.practical_purchase_quantity).toBe(2.3);
        expect(result.theoretical_quantity).toBe(2.3);

        const partialResult = roundPackQuantity(25, 20, 'partial_allowed');
        expect(partialResult.practical_purchase_quantity).toBe(25);
      });

      it('full pack purchasing always ceils to nearest pack', () => {
        const result = roundPackQuantity(1.1, 1, 'full_pack');
        expect(result.pack_count).toBe(2);
        expect(result.practical_purchase_quantity).toBe(2);

        const bucketResult = roundPackQuantity(21, 20, 'full_pack');
        expect(bucketResult.pack_count).toBe(2);
        expect(bucketResult.practical_purchase_quantity).toBe(40);
      });

      it('1.2 * 20L bucket -> 2 buckets, not 1.2', () => {
        // 1.2 buckets of 20L = 24L theoretical requirement with 20L pack size
        const theoreticalLiters = 1.2 * 20; // 24L
        const packSize = 20; // 20L bucket
        const result = roundPackQuantity(theoreticalLiters, packSize, 'ceil');

        expect(result.pack_count).toBe(2);
        expect(result.practical_purchase_quantity).toBe(40);
        expect(result.pack_count).not.toBe(1.2);
      });
    });

    describe('roundPackWithMin', () => {
      it('respects minimum quantity', () => {
        // Theoretical 1 pack, but minimum quantity required is 10 packs/units
        const result = roundPackWithMin(1, 5, 10, 'ceil');
        expect(result.practical_purchase_quantity).toBe(10);
        expect(result.pack_count).toBe(2); // 10 / 5 = 2 packs

        // When theoretical exceeds min, base result is maintained
        const resultHigh = roundPackWithMin(15, 5, 10, 'ceil');
        expect(resultHigh.practical_purchase_quantity).toBe(15);
        expect(resultHigh.pack_count).toBe(3);
      });
    });

    describe('calculateLeftover', () => {
      it('returns correct leftover', () => {
        expect(calculateLeftover(24, 40)).toBe(16);
        expect(calculateLeftover(25, 25)).toBe(0);
        expect(calculateLeftover(30, 20)).toBe(0); // No negative leftover
      });
    });
  });

  // =========================================================
  // Pricing Tests
  // =========================================================
  describe('Pricing', () => {
    describe('createPriceSnapshot', () => {
      it('creates a correct snapshot object', () => {
        const snapshot = createPriceSnapshot(25000, 'FRELUX Premium Silk', 20, 'Liters', {
          priceType: 'product',
          refId: 'prod_123',
          currency: 'NGN',
          priceId: 'price_456',
        });

        expect(snapshot).toEqual({
          price_type: 'product',
          ref_id: 'prod_123',
          ref_name: 'FRELUX Premium Silk',
          unit_price: 25000,
          currency: 'NGN',
          pack_size: 20,
          pack_unit: 'Liters',
          effective_date: expect.any(String),
          price_id: 'price_456',
        });
      });
    });

    describe('calculateLineTotal', () => {
      it('multiplies unit price by practical quantity', () => {
        expect(calculateLineTotal(25000, 2)).toBe(50000);
        expect(calculateLineTotal(12.5, 3)).toBe(37.5);
        expect(calculateLineTotal(0, 5)).toBe(0);
        expect(calculateLineTotal(100, 0)).toBe(0);
      });
    });

    describe('calculateEstimateTotal', () => {
      it('sums all line items', () => {
        const lineItems = [
          { total_price: 50000 },
          { total_price: 25000 },
          { total_price: 5000 },
        ];
        expect(calculateEstimateTotal(lineItems)).toBe(80000);
      });

      it('handles empty array or items with total field fallbacks', () => {
        expect(calculateEstimateTotal([])).toBe(0);
        const mixedItems = [
          { total: 1000 },
          { lineTotal: 2000 },
          { total_price: 3000 },
        ];
        expect(calculateEstimateTotal(mixedItems)).toBe(6000);
      });
    });

    describe('formatCurrency', () => {
      it('formats correctly', () => {
        expect(formatCurrency(5000, 'NGN')).toBe('₦5,000');
        expect(formatCurrency(1250, 'USD')).toBe('$1,250');
        expect(formatCurrency(100, 'EUR')).toBe('€100');
        expect(formatCurrency(0, 'NGN')).toBe('₦0');
      });
    });

    describe('isPriceConfigured', () => {
      it('rejects null/undefined/negative', () => {
        expect(isPriceConfigured(null)).toBe(false);
        expect(isPriceConfigured(undefined)).toBe(false);
        expect(isPriceConfigured(-100)).toBe(false);
        expect(isPriceConfigured(NaN)).toBe(false);
        expect(isPriceConfigured('25000')).toBe(false);
      });

      it('accepts zero or positive numeric prices', () => {
        expect(isPriceConfigured(0)).toBe(true);
        expect(isPriceConfigured(25000)).toBe(true);
      });
    });
  });

  // =========================================================
  // Adjustment Tests
  // =========================================================
  describe('Adjustments', () => {
    describe('createAdjustmentRecord', () => {
      it('creates correct record', () => {
        const record = createAdjustmentRecord(
          'est_001',
          'item_002',
          'practical_purchase_qty',
          20,
          25,
          'Client requested extra buffer'
        );

        expect(record).toEqual({
          estimate_id: 'est_001',
          item_id: 'item_002',
          field_name: 'practical_purchase_qty',
          original_value: 20,
          adjusted_value: 25,
          reason: 'Client requested extra buffer',
        });
      });
    });

    describe('hasAdjustments', () => {
      it('detects adjusted items', () => {
        const itemsWithAdjustment = [
          { item_name: 'Item A', adjustment_status: 'none' },
          { item_name: 'Item B', adjustment_status: 'adjusted' },
        ];
        expect(hasAdjustments(itemsWithAdjustment)).toBe(true);

        const itemsWithoutAdjustment = [
          { item_name: 'Item A', adjustment_status: 'none' },
          { item_name: 'Item B', adjustment_status: 'none' },
        ];
        expect(hasAdjustments(itemsWithoutAdjustment)).toBe(false);
        expect(hasAdjustments([])).toBe(false);
      });
    });

    describe('getAdjustedItems', () => {
      it('returns only adjusted items', () => {
        const item1 = { item_name: 'Item A', adjustment_status: 'none' };
        const item2 = { item_name: 'Item B', adjustment_status: 'adjusted' };
        const item3 = { item_name: 'Item C', adjustment_status: 'pending_review' };

        const items = [item1, item2, item3];
        const result = getAdjustedItems(items);

        expect(result).toHaveLength(2);
        expect(result).toEqual([item2, item3]);
      });
    });
  });
});
