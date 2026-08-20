import { describe, it, expect } from 'vitest';
import {
  calculateFinish,
  getDefaultCoats,
  getFinishTypeLabel,
  getFinishTypeDescription,
  round,
  type FinishCalcInput,
  type FinishMaterialConfig,
  type FinishType,
} from './finish-calc';

describe('round helper', () => {
  it('rounds numbers to specified decimal places (default 2)', () => {
    expect(round(66.666666)).toBe(66.67);
    expect(round(10.1234, 2)).toBe(10.12);
    expect(round(10.125, 2)).toBe(10.13);
  });

  it('handles custom decimal precision', () => {
    expect(round(10.12345, 3)).toBe(10.123);
    expect(round(10.12345, 1)).toBe(10.1);
    expect(round(10.12345, 0)).toBe(10);
  });

  it('handles zero and non-finite numbers', () => {
    expect(round(0)).toBe(0);
    expect(round(NaN)).toBe(0);
    expect(round(Infinity)).toBe(0);
    expect(round(-Infinity)).toBe(0);
  });
});

describe('getDefaultCoats', () => {
  it('returns correct default coats for each finish type', () => {
    expect(getDefaultCoats('painting')).toBe(2);
    expect(getDefaultCoats('tyrolene')).toBe(2);
    expect(getDefaultCoats('grafitex')).toBe(3);
  });
});

describe('getFinishTypeLabel', () => {
  it('returns correct display labels for each finish type', () => {
    expect(getFinishTypeLabel('painting')).toBe('Painting');
    expect(getFinishTypeLabel('tyrolene')).toBe('Tyrolene');
    expect(getFinishTypeLabel('grafitex')).toBe('Grafitex');
  });
});

describe('getFinishTypeDescription', () => {
  it('returns non-empty descriptions for each finish type', () => {
    expect(getFinishTypeDescription('painting')).toBeTruthy();
    expect(getFinishTypeDescription('tyrolene')).toBeTruthy();
    expect(getFinishTypeDescription('grafitex')).toBeTruthy();
  });
});

describe('calculateFinish', () => {
  describe('Painting calculation', () => {
    it('calculates quantities, packages, and cost correctly for painting', () => {
      const input: FinishCalcInput = {
        finishType: 'painting',
        area: 100,
        coats: 2,
        wasteMargin: 10,
      };

      const result = calculateFinish(input);

      expect(result.finishType).toBe('painting');
      expect(result.area).toBe(100);
      expect(result.coats).toBe(2);
      expect(result.wasteMargin).toBe(10);
      expect(result.materials).toHaveLength(1);

      const mat = result.materials[0];
      // quantityRequired = (100 × 2) / 10 = 20 L
      expect(mat.quantityRequired).toBe(20);
      // quantityWithWaste = 20 × 1.1 = 22 L
      expect(mat.quantityWithWaste).toBe(22);
      // packagesNeeded = ceil(22 / 20) = 2
      expect(mat.packagesNeeded).toBe(2);
      // cost = 2 × 15000 = 30000
      expect(mat.cost).toBe(30000);

      expect(result.materialCost).toBe(30000);
      // labour = 100 × 2 × 500 = 100000
      expect(result.labourCost).toBe(100000);
      expect(result.totalCost).toBe(130000);
    });

    it('uses default coats when coats parameter is omitted', () => {
      const input: FinishCalcInput = {
        finishType: 'painting',
        area: 100,
        wasteMargin: 10,
      };

      const result = calculateFinish(input);
      expect(result.coats).toBe(2);
      expect(result.materials[0].quantityRequired).toBe(20);
    });
  });

  describe('Tyrolene calculation', () => {
    it('calculates base + texture materials correctly for tyrolene', () => {
      const input: FinishCalcInput = {
        finishType: 'tyrolene',
        area: 50,
        coats: 2,
        wasteMargin: 5,
      };

      const result = calculateFinish(input);

      expect(result.finishType).toBe('tyrolene');
      expect(result.area).toBe(50);
      expect(result.coats).toBe(2);
      expect(result.wasteMargin).toBe(5);
      expect(result.materials).toHaveLength(2);

      const baseMat = result.materials[0];
      expect(baseMat.isBase).toBe(true);
      // quantityRequired = (50 × 2) / 1.5 = 66.67 kg
      expect(baseMat.quantityRequired).toBe(66.67);
      // quantityWithWaste = 66.67 × 1.05 = 70 kg
      expect(baseMat.quantityWithWaste).toBe(70);
      // packagesNeeded = ceil(70 / 25) = 3
      expect(baseMat.packagesNeeded).toBe(3);
      // cost = 3 × 8000 = 24000
      expect(baseMat.cost).toBe(24000);

      const textureMat = result.materials[1];
      expect(textureMat.isFinishing).toBe(true);
      expect(textureMat.quantityRequired).toBe(66.67);
      expect(textureMat.quantityWithWaste).toBe(70);
      expect(textureMat.packagesNeeded).toBe(3);
      expect(textureMat.cost).toBe(24000);

      // Total material cost = 24000 + 24000 = 48000
      expect(result.materialCost).toBe(48000);
      // labour = 50 × 2 × 800 = 80000
      expect(result.labourCost).toBe(80000);
      expect(result.totalCost).toBe(128000);
    });
  });

  describe('Grafitex calculation', () => {
    it('calculates base + finishing coats correctly for grafitex', () => {
      const input: FinishCalcInput = {
        finishType: 'grafitex',
        area: 40,
        coats: 3,
        wasteMargin: 0,
      };

      const result = calculateFinish(input);

      expect(result.finishType).toBe('grafitex');
      expect(result.area).toBe(40);
      expect(result.coats).toBe(3);
      expect(result.wasteMargin).toBe(0);
      expect(result.materials).toHaveLength(2);

      result.materials.forEach((mat) => {
        // quantityRequired = (40 × 3) / 1.2 = 100 kg
        expect(mat.quantityRequired).toBe(100);
        expect(mat.quantityWithWaste).toBe(100);
        // packagesNeeded = ceil(100 / 25) = 4
        expect(mat.packagesNeeded).toBe(4);
        // cost = 4 × 10000 = 40000
        expect(mat.cost).toBe(40000);
      });

      expect(result.materialCost).toBe(80000);
      // labour = 40 × 3 × 600 = 72000
      expect(result.labourCost).toBe(72000);
      expect(result.totalCost).toBe(152000);
    });

    it('uses default coats (3) when coats parameter is omitted for grafitex', () => {
      const input: FinishCalcInput = {
        finishType: 'grafitex',
        area: 40,
      };

      const result = calculateFinish(input);
      expect(result.coats).toBe(3);
    });
  });

  describe('Zero area', () => {
    it('returns all zeros when area is 0', () => {
      const input: FinishCalcInput = {
        finishType: 'painting',
        area: 0,
        coats: 2,
        wasteMargin: 10,
      };

      const result = calculateFinish(input);

      expect(result.area).toBe(0);
      expect(result.materialCost).toBe(0);
      expect(result.labourCost).toBe(0);
      expect(result.totalCost).toBe(0);

      result.materials.forEach((mat) => {
        expect(mat.quantityRequired).toBe(0);
        expect(mat.quantityWithWaste).toBe(0);
        expect(mat.packagesNeeded).toBe(0);
        expect(mat.cost).toBe(0);
      });
    });
  });

  describe('Waste margin clamping', () => {
    it('clamps waste margin > 100% down to 100%', () => {
      const input: FinishCalcInput = {
        finishType: 'painting',
        area: 100,
        coats: 2,
        wasteMargin: 150,
      };

      const result = calculateFinish(input);

      expect(result.wasteMargin).toBe(100);
      const mat = result.materials[0];
      expect(mat.quantityRequired).toBe(20);
      // quantityWithWaste with 100% waste = 20 × 2.0 = 40 L
      expect(mat.quantityWithWaste).toBe(40);
      expect(mat.packagesNeeded).toBe(2);
      expect(mat.cost).toBe(30000);
    });
  });

  describe('Negative inputs', () => {
    it('clamps negative area to 0', () => {
      const input: FinishCalcInput = {
        finishType: 'painting',
        area: -50,
        coats: 2,
        wasteMargin: 10,
      };

      const result = calculateFinish(input);
      expect(result.area).toBe(0);
      expect(result.materialCost).toBe(0);
      expect(result.labourCost).toBe(0);
      expect(result.totalCost).toBe(0);
    });

    it('clamps negative waste margin to 0', () => {
      const input: FinishCalcInput = {
        finishType: 'painting',
        area: 100,
        coats: 2,
        wasteMargin: -15,
      };

      const result = calculateFinish(input);
      expect(result.wasteMargin).toBe(0);
      expect(result.materials[0].quantityWithWaste).toBe(20);
    });

    it('clamps negative coats to 0', () => {
      const input: FinishCalcInput = {
        finishType: 'painting',
        area: 100,
        coats: -2,
        wasteMargin: 10,
      };

      const result = calculateFinish(input);
      expect(result.coats).toBe(0);
      expect(result.materialCost).toBe(0);
      expect(result.labourCost).toBe(0);
    });
  });

  describe('Custom material overrides', () => {
    it('allows passing custom material configurations', () => {
      const customMaterials: FinishMaterialConfig[] = [
        {
          id: 'custom-1',
          name: 'Custom Primer',
          finishType: 'painting',
          coverageRate: 8,
          coverageUnit: 'L',
          packageSize: 10,
          packageUnit: 'L',
          unitPrice: 5000,
          defaultCoats: 1,
          labourRatePerSqm: 300,
          isBase: true,
          isFinishing: false,
          isActive: true,
          sortOrder: 0,
        },
      ];

      const input: FinishCalcInput = {
        finishType: 'painting',
        area: 80,
        coats: 1,
        wasteMargin: 0,
        materials: customMaterials,
      };

      const result = calculateFinish(input);

      expect(result.materials).toHaveLength(1);
      const mat = result.materials[0];
      expect(mat.name).toBe('Custom Primer');
      // quantityRequired = (80 × 1) / 8 = 10 L
      expect(mat.quantityRequired).toBe(10);
      expect(mat.quantityWithWaste).toBe(10);
      expect(mat.packagesNeeded).toBe(1);
      expect(mat.cost).toBe(5000);
      expect(result.materialCost).toBe(5000);
      // labour = 80 × 1 × 300 = 24000
      expect(result.labourCost).toBe(24000);
      expect(result.totalCost).toBe(29000);
    });
  });
});
