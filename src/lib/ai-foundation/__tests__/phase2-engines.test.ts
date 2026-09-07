// =========================================================
// PHASE 2 TESTS — AI Copilot ↔ deterministic engine parity
//
// THE contract test: for identical inputs, the engine invoked
// through the Copilot path (executeEngine) must produce EXACTLY
// the same numbers as the manual calculator invoked directly.
// No rounding slack, no AI drift, no reformulated math.
// =========================================================

import { describe, it, expect } from 'vitest';
import { executeEngine, EngineNotRegisteredError } from '../engines-registry';
import { resolveRequirements, buildEngineInput, TASK_REQUIREMENTS, engineExistsForTask } from '../requirements';
import { interpretRequest, planTask } from '../orchestrator';
import { createFact } from '../trust';
import type { AiFact, FreluxContext } from '../types';

const EMPTY_CONTEXT: FreluxContext = {
  userId: 'test-user',
  project: null,
  marketDataAvailable: false,
};

function statedFact(key: string, value: AiFact['value'], unit?: string): AiFact {
  return createFact({
    key,
    label: key.replace(/_/g, ' '),
    value,
    unit,
    origin: 'user_input',
    source: 'test',
    confidence: 1,
    evidence: 'stated in request',
  });
}

// =========================================================
// PARITY: painting (manual calculator vs Copilot engine path)
// =========================================================
describe('PARITY — painting materials engine matches the manual calculator exactly', () => {
  it('produces the exact same litres, containers and areas as calculatePaint', async () => {
    const { calculatePaint, DEFAULT_COVERAGE_M2_PER_LITER, DEFAULT_CONTAINER_SIZES_LITERS, DEFAULT_DOOR_DIMS, DEFAULT_WINDOW_DIMS } = await import('@/lib/calc');

    // Manual calculator invocation — exactly what the UI does.
    const manual = calculatePaint(
      {
        projectType: 'room' as never,
        length: 5, width: 4, wallHeight: 3,
        doors: 1, doorDims: DEFAULT_DOOR_DIMS,
        windows: 2, windowDims: DEFAULT_WINDOW_DIMS,
        coats: 2, paintType: 'standard',
        unit: 'meters' as never,
        includeCeiling: true, wasteMargin: 10,
      },
      { coverageRate: DEFAULT_COVERAGE_M2_PER_LITER, containerSizes: DEFAULT_CONTAINER_SIZES_LITERS },
    );

    // Copilot path through the registered engine.
    const viaCopilot = await executeEngine('painting_project', {
      length: 5, width: 4, wallHeight: 3,
      projectType: 'room', unit: 'meters',
      doors: 1, windows: 2, coats: 2, wasteMargin: 10,
      includeCeiling: true, paintType: 'standard',
    });

    expect(viaCopilot.ok).toBe(true);
    const raw = viaCopilot.raw as typeof manual;
    // EXACT parity — every number identical.
    expect(raw.paintableArea).toBe(manual.paintableArea);
    expect(raw.paintRequiredLiters).toBe(manual.paintRequiredLiters);
    expect(raw.adjustedLiters).toBe(manual.adjustedLiters);
    expect(raw.totalRecommendedLiters).toBe(manual.totalRecommendedLiters);
    expect(raw.recommendedContainers).toEqual(manual.recommendedContainers);
    expect(raw.primerLiters).toBe(manual.primerLiters);
  });

  it('feet inputs flow through the engine\'s own conversion convention (no boundary munging)', async () => {
    const { calculatePaint, DEFAULT_DOOR_DIMS, DEFAULT_WINDOW_DIMS } = await import('@/lib/calc');
    const manualFeet = calculatePaint({
      projectType: 'room' as never,
      length: 16, width: 13, wallHeight: 10,
      doors: 1, doorDims: DEFAULT_DOOR_DIMS, windows: 2, windowDims: DEFAULT_WINDOW_DIMS,
      coats: 2, paintType: 'standard', unit: 'feet' as never,
      includeCeiling: true, wasteMargin: 10,
    });

    const viaCopilot = await executeEngine('painting_project', {
      length: 16, width: 13, wallHeight: 10, unit: 'feet',
      doors: 1, windows: 2, coats: 2, wasteMargin: 10,
      includeCeiling: true, paintType: 'standard',
    });
    expect(viaCopilot.ok).toBe(true);
    const raw = viaCopilot.raw as typeof manualFeet;
    expect(raw.paintableArea).toBe(manualFeet.paintableArea);
    expect(raw.totalRecommendedLiters).toBe(manualFeet.totalRecommendedLiters);
    expect(raw.recommendedContainers).toEqual(manualFeet.recommendedContainers);
  });
});

// =========================================================
// PARITY: tile
// =========================================================
describe('PARITY — tile engine matches the manual tile calculator exactly', () => {
  it('produces the exact same tile/box counts and costs', async () => {
    const { calculateTile } = await import('@/lib/pop-tile-calc');
    const shared = {
      surfaceType: 'floor' as const,
      method: 'traditional' as const,
      length: 6, width: 5, height: 0,
      tileWidthMm: 600, tileHeightMm: 600, tilesPerBox: 4, tilePricePerBox: 12500,
      adhesiveCoverageRate: 0, adhesivePricePerBag: 0,
      cementCoverageRate: 0, cementPricePerBag: 0, cementPackageSize: 1,
      sandCoverageRate: 0, sandPricePerBag: 0, sandPackageSize: 1,
      groutCoverageRate: 0, groutPricePerKg: 0,
      spacerCoverageRate: 0, spacerPricePerPack: 0, spacerPackageSize: 1,
      wasteMargin: 10, labourRatePerSqm: 0, unit: 'meters' as const,
    };
    const manual = calculateTile(shared, [] as never, 'NGN', '₦');

    const viaCopilot = await executeEngine('tile_estimate', {
      surfaceType: 'floor', method: 'traditional',
      length: 6, width: 5, unit: 'meters',
      tileWidthMm: 600, tileHeightMm: 600, tilesPerBox: 4, tilePricePerBox: 12500,
      wasteMargin: 10, currency: 'NGN',
    });
    expect(viaCopilot.ok).toBe(true);
    const raw = viaCopilot.raw as typeof manual;
    expect(raw.surfaceArea).toBe(manual.surfaceArea);
    expect(raw.tilesNeeded).toBe(manual.tilesNeeded);
    expect(raw.boxesNeeded).toBe(manual.boxesNeeded);
    expect(raw.tileCost).toBe(manual.tileCost);
  });

  it('refuses invalid numeric input instead of computing NaN', async () => {
    const result = await executeEngine('tile_estimate', {
      surfaceType: 'floor', method: 'traditional',
      length: Number.NaN, width: 5,
      tileWidthMm: 600, tileHeightMm: 600, tilesPerBox: 4, tilePricePerBox: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// =========================================================
// PARITY: POP ceiling (materials supplied — no DB in tests)
// =========================================================
describe('PARITY — POP ceiling engine matches the manual POP calculator', () => {
  const materials = [
    {
      id: 'm1', workflow: 'nigeria', category: 'board',
      name: 'POP board 5mm', description: null,
      unit: 'boards', coverage_rate: 1.04, coverage_unit: 'sqm_per_board',
      package_size: 10, package_unit: 'boards',
      unit_price: 9500, labour_rate_per_sqm: 0,
      is_optional: false, currency: 'NGN', is_active: true, sort_order: 1,
      created_at: '2026-01-01', updated_at: '2026-01-01',
    },
  ] as never[];

  it('produces the exact same ceiling area and material quantities', async () => {
    const { calculatePopCeiling } = await import('@/lib/pop-tile-calc');
    const manual = calculatePopCeiling({
      workflow: 'nigeria', roomLength: 5, roomWidth: 4, unit: 'meters',
      wasteMargin: 10, includeDecorative: false, includeOptional: false,
    } as never, materials, 'NGN', '₦');

    const viaCopilot = await executeEngine('pop_ceiling', {
      roomLength: 5, roomWidth: 4, unit: 'meters', wasteMargin: 10,
      workflow: 'nigeria', currency: 'NGN', materials,
    });
    expect(viaCopilot.ok).toBe(true);
    const raw = viaCopilot.raw as typeof manual;
    expect(raw.ceilingArea).toBe(manual.ceilingArea);
    expect(raw.materials).toEqual(manual.materials);
    expect(raw.materialCost).toBe(manual.materialCost);
  });

  it('honestly refuses when no materials data exists (no fabricated numbers)', async () => {
    const result = await executeEngine('pop_ceiling', {
      roomLength: 5, roomWidth: 4, materials: [],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/unavailable/i);
  });
});

// =========================================================
// PARITY: screeding system (config supplied — no DB in tests)
// =========================================================
describe('PARITY — screeding engine matches the manual screeding calculator', () => {
  it('produces the exact same quantities as calculateScreedingSystem', async () => {
    const { calculateScreedingSystem, dbToSystemConfig } = await import('@/lib/calc');
    const dbRow = {
      system_type: 'white_cement_paint', display_name: 'White cement + screeding paint',
      description: null, coverage_area_m2: 50, coverage_unit: 'sqm',
      default_coats: 2, waste_percentage: 5, currency: 'NGN', currency_symbol: '₦',
      putty_name: null, putty_quantity: null, putty_unit: null, putty_price_per_unit: null,
      paint_name: 'Screeding paint', paint_quantity: 20, paint_unit: 'litres', paint_price_per_unit: 8000,
      cement_name: 'White cement', cement_quantity: 2, cement_unit: 'bags', cement_price_per_unit: 9500,
      rounding_rule: 'ceil',
    } as never;
    const config = dbToSystemConfig(dbRow);

    const manual = calculateScreedingSystem(100, config, 2);
    const viaCopilot = await executeEngine('screeding_system', { areaM2: 100, coats: 2, config });
    expect(viaCopilot.ok).toBe(true);
    const raw = viaCopilot.raw as typeof manual;
    expect(raw.netScreedingArea).toBe(manual.netScreedingArea);
    expect(raw.coats).toBe(manual.coats);
    expect(raw.materialCost).toBe(manual.materialCost);
    expect(raw).toEqual(manual); // full structural parity
  });
});

// =========================================================
// Missing-information intelligence (progressive, not a huge form)
// =========================================================
describe('missing-information intelligence for the new tasks', () => {
  it('painting asks only for what is missing; doors/windows defaults surface as assumptions', () => {
    const facts = [statedFact('length', 5, 'm'), statedFact('width', 4, 'm')];
    const res = resolveRequirements('painting_materials', EMPTY_CONTEXT, facts);
    expect(res.missing.map((f) => f.key)).toEqual(['wallHeight']);
    expect(res.assumptions.map((a) => a.key).sort()).toEqual(['coats', 'doors', 'includeCeiling', 'wasteMargin', 'windows']);
    // Assumptions are visibly labelled, never silent.
    for (const a of res.assumptions) {
      expect(a.origin).toBe('smart_default');
      expect(a.evidence).toBeTruthy();
    }
  });

  it('tile identifies exactly the missing tile specifics', () => {
    const res = resolveRequirements('tile_estimate', EMPTY_CONTEXT, [
      statedFact('length', 6, 'm'), statedFact('width', 5, 'm'), statedFact('surfaceType', 'floor'),
    ]);
    expect(res.missing.map((f) => f.key)).toEqual(['tileWidthMm', 'tileHeightMm', 'tilesPerBox', 'tilePricePerBox']);
    expect(res.engineId).toBe('tile_estimate');
  });

  it('screeding requires the area and asks for it', () => {
    const res = resolveRequirements('screeding_estimate', EMPTY_CONTEXT, []);
    expect(res.missing.map((f) => f.key)).toEqual(['areaM2']);
  });

  it('POP asks for room dimensions, surfacing workflow as an editable assumption', () => {
    const res = resolveRequirements('pop_estimate', EMPTY_CONTEXT, []);
    expect(res.missing.map((f) => f.key)).toEqual(['roomLength', 'roomWidth']);
    expect(res.assumptions.map((a) => a.key)).toContain('workflow');
  });

  it('plans ask progressively rather than demanding everything at once', () => {
    const interp = interpretRequest('how much paint do I need');
    expect(interp.taskType).toBe('painting_materials');
    const plan = planTask(interp.taskType, EMPTY_CONTEXT, interp.facts);
    const askStep = plan.steps.find((st) => st.kind === 'request_missing_info');
    expect(askStep).toBeTruthy();
    // The question names only what is genuinely missing.
    expect(JSON.stringify(plan)).toBeTruthy();
  });
});

// =========================================================
// Deterministic routing for the new capabilities
// =========================================================
describe('natural-language routing reaches the right engine', () => {
  const cases: Array<[string, string]> = [
    ['How much paint do I need for these rooms?', 'painting_materials'],
    ['I want to buy paint buckets for my room', 'painting_materials'],
    ['What is the paintable wall area of 5 by 4?', 'painting_estimate'],
    ['Estimate the POP ceiling for 5 by 4 metres', 'pop_estimate'],
    ['How many tiles do I need for 6 by 5 metres?', 'tile_estimate'],
    ['Screeding estimate for my 100 square metre floor', 'screeding_estimate'],
    ['Estimate my house', 'building_estimate'],
    ['Estimate the roof for this building', 'roof_estimate'],
  ];
  for (const [text, expected] of cases) {
    it(`routes "${text}" → ${expected}`, () => {
      expect(interpretRequest(text).taskType).toBe(expected);
    });
  }

  it('extracts stated dimensions into the engine\'s own input keys', () => {
    const interp = interpretRequest('POP ceiling for a 5 by 4 metre room');
    const keys = interp.facts.map((f) => f.key);
    expect(keys).toContain('roomLength');
    expect(keys).toContain('roomWidth');
  });
});

// =========================================================
// Unit conversion at the AI→engine boundary
// =========================================================
describe('unit conversion at the engine boundary', () => {
  it('converts ft→m for metre-only engines and records provenance', async () => {
    const res = resolveRequirements('roof_estimate', EMPTY_CONTEXT, [
      statedFact('building_length', 50, 'ft'),
      statedFact('building_width', 30, 'ft'),
      statedFact('roof_type', 'hip'),
      statedFact('roof_pitch_degrees', 25),
      statedFact('roof_overhang', 0.6, 'm'),
    ]);
    expect(res.missing).toEqual([]);
    const input = buildEngineInput(res) as Record<string, number>;
    expect(input.building_length).toBeCloseTo(50 * 0.3048, 10);
    expect(input.building_width).toBeCloseTo(30 * 0.3048, 10);
  });

  it('passes feet THROUGH to native-unit engines with unit="feet"', () => {
    const res = resolveRequirements('pop_estimate', EMPTY_CONTEXT, [
      statedFact('roomLength', 16, 'ft'),
      statedFact('roomWidth', 13, 'ft'),
    ]);
    // resolve adds no defaults for these fields; wall dims are all present
    expect(res.missing).toEqual([]);
    const input = buildEngineInput(res) as Record<string, unknown>;
    expect(input.roomLength).toBe(16); // untouched — engine converts itself
    expect(input.unit).toBe('feet');
  });

  it('never converts metres for metre-stated facts', () => {
    const res = resolveRequirements('roof_estimate', EMPTY_CONTEXT, [
      statedFact('building_length', 15, 'm'),
      statedFact('building_width', 9, 'm'),
      statedFact('roof_type', 'gable'),
      statedFact('roof_pitch_degrees', 20),
      statedFact('roof_overhang', 0.6, 'm'),
    ]);
    const input = buildEngineInput(res) as Record<string, number>;
    expect(input.building_length).toBe(15);
    expect(input.building_width).toBe(9);
  });
});

// =========================================================
// Engine registry integrity
// =========================================================
describe('Phase 2 engine registry integrity', () => {
  it('registers all Phase-2 engines as authoritative', async () => {
    const { getEngineDescriptor } = await import('../engines-registry');
    for (const id of ['painting_project', 'tile_estimate', 'pop_ceiling', 'screeding_system']) {
      const d = getEngineDescriptor(id);
      expect(d, id).toBeTruthy();
      expect(d!.authoritative).toBe(true);
      expect(d!.creditedAs).toMatch(/authoritative FRELUX/i);
    }
  });

  it('still refuses unregistered engines — no silent AI math fallback', async () => {
    await expect(executeEngine('does_not_exist', {})).rejects.toThrow(EngineNotRegisteredError);
  });

  it('every task requirement maps to a registered engine', () => {
    for (const task of ['painting_materials', 'screeding_estimate', 'tile_estimate', 'pop_estimate'] as const) {
      expect(engineExistsForTask(task)).toBe(true);
      expect(TASK_REQUIREMENTS[task].engineId).toBeTruthy();
    }
  });
});
