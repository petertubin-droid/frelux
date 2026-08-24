/**
 * Tests for Configurable Waste (Feature 12)
 */

import { describe, it, expect } from 'vitest';
import {
  createWasteConfig,
  resolveWaste,
  resolveWasteFromRule,
  applyResolvedWaste,
  setGlobalDefaultWaste,
  setCountryWaste,
  setMarketWaste,
  setUserWaste,
  createNigeriaWasteConfig,
  wasteResolutionToText,
  WASTE_SOURCE_LABELS,
} from '../waste-config';
import { createRule } from '../rule-registry';

describe('Waste Config Creation', () => {
  it('creates a config with defaults', () => {
    const config = createWasteConfig();
    expect(config.globalDefault).toBe(10);
    expect(config.byCountry).toEqual({});
    expect(config.byMarket).toEqual({});
    expect(config.userOverride).toBeUndefined();
  });

  it('creates a config with custom values', () => {
    const config = createWasteConfig({
      globalDefault: 5,
      byCountry: { NG: 10 },
      byMarket: { 'NG-PH': 12 },
      userOverride: 15,
    });
    expect(config.globalDefault).toBe(5);
    expect(config.byCountry.NG).toBe(10);
    expect(config.byMarket['NG-PH']).toBe(12);
    expect(config.userOverride).toBe(15);
  });

  it('creates Nigeria waste config', () => {
    const config = createNigeriaWasteConfig();
    expect(config.globalDefault).toBe(10);
    expect(config.byCountry.NG).toBe(10);
  });
});

describe('Waste Resolution Priority', () => {
  it('user override has highest priority', () => {
    const config = createWasteConfig({
      globalDefault: 10,
      byCountry: { NG: 8 },
      byMarket: { 'NG-PH': 9 },
    });
    const resolution = resolveWaste(config, 'NG', 'NG-PH', 15);
    expect(resolution.wastePercent).toBe(15);
    expect(resolution.source).toBe('user');
    expect(resolution.isOverride).toBe(true);
  });

  it('market rule overrides country and global', () => {
    const config = createWasteConfig({
      globalDefault: 10,
      byCountry: { NG: 8 },
      byMarket: { 'NG-PH': 9 },
    });
    const resolution = resolveWaste(config, 'NG', 'NG-PH');
    expect(resolution.wastePercent).toBe(9);
    expect(resolution.source).toBe('market');
  });

  it('country rule overrides global', () => {
    const config = createWasteConfig({
      globalDefault: 10,
      byCountry: { NG: 7 },
    });
    const resolution = resolveWaste(config, 'NG');
    expect(resolution.wastePercent).toBe(7);
    expect(resolution.source).toBe('country');
  });

  it('global default when no specific rule', () => {
    const config = createWasteConfig({ globalDefault: 10 });
    const resolution = resolveWaste(config);
    expect(resolution.wastePercent).toBe(10);
    expect(resolution.source).toBe('global_default');
  });

  it('global default when country has no rule', () => {
    const config = createWasteConfig({
      globalDefault: 12,
      byCountry: { GH: 8 }, // Ghana has a rule, Nigeria doesn't
    });
    const resolution = resolveWaste(config, 'NG');
    expect(resolution.wastePercent).toBe(12);
    expect(resolution.source).toBe('global_default');
  });

  it('user override of 0 is valid', () => {
    const config = createWasteConfig({ globalDefault: 10 });
    const resolution = resolveWaste(config, 'NG', undefined, 0);
    expect(resolution.wastePercent).toBe(0);
    expect(resolution.source).toBe('user');
  });

  it('resolution includes explanation', () => {
    const config = createWasteConfig({ globalDefault: 10 });
    const resolution = resolveWaste(config);
    expect(resolution.explanation).toContain('10%');
    expect(resolution.explanation).toContain('Global default');
  });
});

describe('Waste from Rule', () => {
  it('uses rule waste parameter', () => {
    const rule = createRule({
      ruleName: 'Nigeria Painting',
      parameters: { defaultWastePercent: 5 },
    });
    const resolution = resolveWasteFromRule(rule);
    expect(resolution.wastePercent).toBe(5);
    expect(resolution.source).toBe('rule');
    expect(resolution.ruleId).toBe(rule.ruleId);
  });

  it('user override wins over rule', () => {
    const rule = createRule({
      parameters: { defaultWastePercent: 5 },
    });
    const resolution = resolveWasteFromRule(rule, 15);
    expect(resolution.wastePercent).toBe(15);
    expect(resolution.source).toBe('user');
  });

  it('falls back to global default when rule has no waste param', () => {
    const rule = createRule({ parameters: {} });
    const resolution = resolveWasteFromRule(rule);
    expect(resolution.wastePercent).toBe(10);
    expect(resolution.source).toBe('global_default');
  });
});

describe('Waste Application', () => {
  it('applies resolved waste to base quantity', () => {
    const resolution = resolveWaste(createWasteConfig({ globalDefault: 10 }));
    const result = applyResolvedWaste(100, resolution);
    expect(result.quantity).toBeCloseTo(110, 4);
    expect(result.resolution.wastePercent).toBe(10);
  });

  it('applies 0% waste correctly', () => {
    const resolution = resolveWaste(createWasteConfig(), undefined, undefined, 0);
    const result = applyResolvedWaste(100, resolution);
    expect(result.quantity).toBe(100);
  });
});

describe('Config Updates', () => {
  it('sets global default', () => {
    const config = setGlobalDefaultWaste(createWasteConfig(), 15);
    expect(config.globalDefault).toBe(15);
  });

  it('sets country waste', () => {
    const config = setCountryWaste(createWasteConfig(), 'GH', 8);
    expect(config.byCountry.GH).toBe(8);
  });

  it('sets market waste', () => {
    const config = setMarketWaste(createWasteConfig(), 'NG-PH', 12);
    expect(config.byMarket['NG-PH']).toBe(12);
  });

  it('sets user override', () => {
    const config = setUserWaste(createWasteConfig(), 20);
    expect(config.userOverride).toBe(20);
  });

  it('clears user override', () => {
    const config = setUserWaste(createWasteConfig({ userOverride: 20 }), undefined);
    expect(config.userOverride).toBeUndefined();
  });
});

describe('Formatting', () => {
  it('formats resolution as text', () => {
    const resolution = resolveWaste(createWasteConfig({ globalDefault: 10 }));
    const text = wasteResolutionToText(resolution);
    expect(text).toContain('10%');
    expect(text).toContain('Global Default');
  });

  it('has labels for all sources', () => {
    expect(WASTE_SOURCE_LABELS.user).toBe('User Input');
    expect(WASTE_SOURCE_LABELS.market).toBe('Market Rule');
    expect(WASTE_SOURCE_LABELS.country).toBe('Country Rule');
    expect(WASTE_SOURCE_LABELS.global_default).toBe('Global Default');
    expect(WASTE_SOURCE_LABELS.rule).toBe('Calculation Rule');
  });
});
