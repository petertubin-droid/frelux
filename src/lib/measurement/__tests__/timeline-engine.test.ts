import { describe, it, expect } from 'vitest';
import { estimateTimeline, DEFAULT_PHASE_TEMPLATES } from '../timeline-engine';

describe('Feature 21: Timeline Engine', () => {
  it('estimates timeline from project scope', () => {
    const scope = new Map<string, number>([
      ['site_preparation', 400],
      ['foundation', 50],
      ['masonry', 200],
      ['roofing', 100],
    ]);
    const result = estimateTimeline(scope);
    expect(result.phases).toHaveLength(DEFAULT_PHASE_TEMPLATES.length);
    expect(result.totalEstimatedDays).toBeGreaterThan(0);
    expect(result.criticalPath.length).toBeGreaterThan(0);
  });

  it('calculates phase durations from productivity rates', () => {
    const scope = new Map<string, number>([['foundation', 50]]);
    const result = estimateTimeline(scope);
    const foundation = result.phases.find((p) => p.name === 'Foundation')!;
    expect(foundation.estimatedDays).toBe(5); // 50m³ ÷ 10/day = 5 days
  });

  it('resolves dependencies in sequence', () => {
    const scope = new Map<string, number>([
      ['site_preparation', 200],
      ['foundation', 50],
      ['masonry', 200],
    ]);
    const result = estimateTimeline(scope);
    const sitePrep = result.phases.find((p) => p.name === 'Site Preparation')!;
    const foundation = result.phases.find((p) => p.name === 'Foundation')!;
    const masonry = result.phases.find((p) => p.name === 'Block Laying')!;

    expect(sitePrep.startDay).toBe(0);
    expect(foundation.startDay).toBe(sitePrep.endDay);
    expect(masonry.startDay).toBe(foundation.endDay);
  });

  it('applies weather buffer', () => {
    const scope = new Map<string, number>([['foundation', 50]]);
    const result = estimateTimeline(scope, DEFAULT_PHASE_TEMPLATES, { weatherBufferPercent: 20 });
    const foundation = result.phases.find((p) => p.name === 'Foundation')!;
    // 50 ÷ 10 = 5 days, +20% = 6 days
    expect(foundation.estimatedDays).toBe(6);
  });

  it('adds contingency days', () => {
    const scope = new Map<string, number>([['foundation', 50]]);
    const baseResult = estimateTimeline(scope);
    const result = estimateTimeline(scope, DEFAULT_PHASE_TEMPLATES, { contingencyDays: 10 });
    expect(result.totalEstimatedDays).toBe(baseResult.totalEstimatedDays + 10);
  });

  it('calculates start and end dates', () => {
    const scope = new Map<string, number>([['foundation', 50]]);
    const result = estimateTimeline(scope, DEFAULT_PHASE_TEMPLATES, { startDate: '2026-01-01' });
    expect(result.startDate).toBe('2026-01-01');
    expect(result.endDate).toBeTruthy();
    // End date should be after start date
    expect(result.endDate! > result.startDate!).toBe(true);
  });

  it('builds milestones for active phases', () => {
    const scope = new Map<string, number>([
      ['site_preparation', 400],
      ['foundation', 50],
    ]);
    const result = estimateTimeline(scope);
    const activeMilestones = result.milestones.filter((m) => m.day > 0);
    expect(activeMilestones.length).toBeGreaterThanOrEqual(2);
  });

  it('handles empty scope', () => {
    const result = estimateTimeline(new Map());
    expect(result.totalEstimatedDays).toBe(0);
    expect(result.phases.every((p) => p.estimatedDays === 0)).toBe(true);
  });

  it('finds critical path correctly', () => {
    const scope = new Map<string, number>([
      ['site_preparation', 200],
      ['foundation', 100],
      ['masonry', 300],
      ['roofing', 100],
      ['plastering', 200],
      ['painting', 200],
    ]);
    const result = estimateTimeline(scope);
    // Critical path should start from Site Preparation
    expect(result.criticalPath[0]).toBe('Site Preparation');
    // Critical path should end at the last phase on the path
    expect(result.criticalPath.length).toBeGreaterThan(1);
  });
});
