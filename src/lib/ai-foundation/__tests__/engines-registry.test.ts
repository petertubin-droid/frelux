import { describe, it, expect } from 'vitest';
import {
  executeEngine,
  getEngineDescriptor,
  listEngines,
  EngineNotRegisteredError,
  defaultBuildToRoofInput,
} from '../engines-registry';

describe('authoritative engine registry', () => {
  it('registers only existing FRELUX engines, all authoritative', () => {
    const engines = listEngines();
    expect(engines.length).toBeGreaterThanOrEqual(4);
    for (const e of engines) {
      expect(e.authoritative).toBe(true);
      expect(getEngineDescriptor(e.id)?.id).toBe(e.id);
    }
  });

  it('REFUSES to run an unregistered engine — no AI fallback math', async () => {
    await expect(executeEngine('totally_made_up_engine', {})).rejects.toThrow(EngineNotRegisteredError);
  });

  it('runs the existing Build-to-Roof engine and normalizes its result', async () => {
    const result = await executeEngine('build_to_roof', {
      ...defaultBuildToRoofInput(),
      project_name: 'Test bungalow',
      location: 'Lagos',
      building_length: 15,
      building_width: 10,
      number_of_floors: 1,
    });
    expect(result.ok).toBe(true);
    expect(result.engine).toBe('build_to_roof');
    expect(result.quantities.length).toBeGreaterThan(0);
    expect(result.costs).not.toBeNull();
    expect(result.costs!.total).toBeGreaterThan(0);
    // Full raw result preserved for deep-linking into existing UIs.
    const raw = result.raw as { grand_total: number; stages: unknown[] };
    expect(raw.grand_total).toBe(result.costs!.total);
    expect(raw.stages.length).toBeGreaterThan(0);
  });

  it('uses the engine constants for prices/labour/wastage (engine owns config)', async () => {
    const result = await executeEngine('build_to_roof', {
      building_length: 12,
      building_width: 9,
    });
    expect(result.ok).toBe(true);
  });

  it('runs the roof geometry engine with the authoritative signature', async () => {
    const result = await executeEngine('roof_geometry', {
      building_length: 10,
      building_width: 8,
      roof_type: 'gable',
      roof_pitch_degrees: 25,
      roof_overhang: 0.6,
    });
    expect(result.ok).toBe(true);
    const roofArea = result.quantities.find((q) => q.label === 'Roof area');
    expect(roofArea).toBeDefined();
    expect(roofArea!.quantity).toBeGreaterThan(80); // 10x8 → >80m² with pitch
  });

  it('runs the painting wall-area engine: perimeter × height', async () => {
    const result = await executeEngine('painting_wall_area', {
      length: 5,
      width: 4,
      height: 3,
    });
    expect(result.ok).toBe(true);
    expect(result.quantities[0].quantity).toBeCloseTo(54, 1); // 2(5+4)×3
  });

  it('runs the tyrolene partition-area engine', async () => {
    const result = await executeEngine('tyrolene_partition_area', {
      width: 3,
      height: 2.5,
    });
    expect(result.ok).toBe(true);
    expect(result.quantities[0].quantity).toBeCloseTo(7.5, 3);
  });

  it('returns an error result (not a guess) when engine input is invalid', async () => {
    const result = await executeEngine('painting_wall_area', {
      length: 'not-a-number',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});
