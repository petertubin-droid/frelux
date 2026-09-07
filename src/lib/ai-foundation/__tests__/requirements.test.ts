import { describe, it, expect } from 'vitest';
import { resolveRequirements, buildEngineInput } from '../requirements';
import type { AiFact, FreluxContext } from '../types';
import { createFact } from '../trust';

const context: FreluxContext = {
  userId: 'user-1',
  project: null,
  location: {
    region: 'Lagos',
    city: 'Lagos',
    country: 'Nigeria',
    marketProfileAvailable: true,
  },
  calculations: [],
  marketDataAvailable: true,
};

function userFact(key: string, value: number | string, label = key): AiFact {
  return createFact({
    key,
    label,
    value,
    unit: key.includes('length') || key.includes('width') || key === 'height' ? 'm' : undefined,
    origin: 'user_input',
    source: 'test',
    confidence: 1,
  });
}

describe('requirements resolution', () => {
  it('uses stated values first — user_input wins over everything', () => {
    const resolution = resolveRequirements('building_estimate', context, [
      userFact('building_length', 18),
      userFact('building_width', 12),
    ]);
    expect(resolution.resolved.building_length?.value).toBe(18);
    expect(resolution.resolved.building_width?.value).toBe(12);
    expect(resolution.missing).toHaveLength(0);
  });

  it('does not re-ask — fills the rest from smart defaults as visible assumptions', () => {
    const resolution = resolveRequirements('building_estimate', context, [
      userFact('building_length', 18),
      userFact('building_width', 12),
    ]);
    expect(resolution.assumptions.length).toBeGreaterThan(0);
    expect(resolution.assumptions.every((a) => a.origin === 'smart_default')).toBe(true);
    // floors defaulted to 1 (existing estimator default)
    expect(resolution.resolved.number_of_floors?.value).toBe(1);
  });

  it('resolves location from Location Intelligence without asking', () => {
    const resolution = resolveRequirements('building_estimate', context, []);
    expect(resolution.resolved.location?.origin).toBe('location_data');
  });

  it('unconfirmed AI facts need confirmation but resolved values stay blocked', () => {
    const aiFact = createFact({
      key: 'building_length', label: 'Building length', value: 17, unit: 'm',
      origin: 'ai_interpretation', source: 'test', confidence: 0.8,
    });
    const resolution = resolveRequirements('building_estimate', context, [aiFact]);
    // AI fact is not usable → falls back to smart default (15)
    expect(resolution.resolved.building_length?.value).toBe(15);
    expect(resolution.needsConfirmation).toHaveLength(0);
  });

  it('lists ONLY genuinely missing fields for tasks without defaults', () => {
    const resolution = resolveRequirements('painting_estimate', context, []);
    expect(resolution.missing.map((f) => f.key)).toEqual(
      expect.arrayContaining(['length', 'width', 'height']),
    );
  });

  it('stated painting dims resolve; height stays missing', () => {
    const resolution = resolveRequirements('painting_estimate', context, [
      userFact('length', 12),
      userFact('width', 10),
    ]);
    expect(resolution.missing.map((f) => f.key)).toEqual(['height']);
  });

  it('builds the engine input from resolved facts', () => {
    const resolution = resolveRequirements('building_estimate', context, [
      userFact('building_length', 18),
      userFact('building_width', 12),
      userFact('number_of_floors', 2, 'Number of floors'),
      userFact('building_type', 'duplex', 'Building type'),
    ]);
    const input = buildEngineInput(resolution);
    expect(input.building_length).toBe(18);
    expect(input.number_of_floors).toBe(2);
    expect(input.building_type).toBe('duplex');
  });
});
