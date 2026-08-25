/**
 * Tests for Visual Measurement Summary (Feature 13)
 */

import { describe, it, expect } from 'vitest';
import {
  buildAreaChart,
  buildFinishTypeChart,
  buildMaterialChart,
  buildDetailTable,
  buildMaterialTable,
  buildKeyMetrics,
  buildVisualSummary,
  chartToAscii,
  tableToAscii,
} from '../visual-summary';
import { createConstructionProject, createProjectElement, calculateConstructionProject } from '../project-engine';
import { createSpace } from '../space-engine';
import { buildMaterialSummary } from '../material-summary';
import { createMaterialSpec } from '../material-engine';

function setupProject() {
  const project = createConstructionProject('Test House', 'feet');
  project.elements = [
    createProjectElement('Walls', 'interior', 'painting', [
      createSpace({ name: 'Bedroom', type: 'bedroom', length: 12, width: 12, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint' }),
      createSpace({ name: 'Living Room', type: 'living', length: 15, width: 20, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint' }),
    ]),
    createProjectElement('Floors', 'interior', 'tiling', [
      createSpace({ name: 'Kitchen', type: 'kitchen', length: 10, width: 12, unit: 'feet', surfaceType: 'floor', finishType: 'tiling' }),
    ]),
  ];
  return calculateConstructionProject(project);
}

function setupSummary(result: ReturnType<typeof setupProject>) {
  const paint = createMaterialSpec({ productName: 'Paint', category: 'paint', quantityUnit: 'buckets', coverage: { type: 'area', value: 50, unit: 'm2' } });
  const tiles = createMaterialSpec({ productName: 'Tiles', category: 'tiles', quantityUnit: 'cartons', coverage: { type: 'area', value: 1.44, unit: 'm2' } });
  const _materialMap = new Map([['paint', paint], ['tiling', tiles]]);
  const requirements = [
    { material: paint, areaM2: result.areaByFinishType.paint ?? 0, coats: 1, wastePercent: 10, source: 'Walls', finishType: 'paint' as const },
    { material: tiles, areaM2: result.areaByFinishType.tiling ?? 0, coats: 1, wastePercent: 10, source: 'Floors', finishType: 'tiling' as const },
  ];
  return buildMaterialSummary('Test House', requirements);
}

describe('Area Chart', () => {
  it('builds area chart from project result', () => {
    const result = setupProject();
    const chart = buildAreaChart(result);

    expect(chart.title).toBe('Area by Element');
    expect(chart.bars.length).toBe(2); // Walls, Floors
    expect(chart.bars[0].label).toBe('Walls');
    expect(chart.bars[0].unit).toBe('m²');
    expect(chart.total).toBeGreaterThan(0);
  });

  it('calculates percentages', () => {
    const result = setupProject();
    const chart = buildAreaChart(result);

    const totalPercent = chart.bars.reduce((sum, b) => sum + b.percent, 0);
    expect(totalPercent).toBeCloseTo(100, 0);
  });
});

describe('Finish Type Chart', () => {
  it('builds finish type chart', () => {
    const result = setupProject();
    const chart = buildFinishTypeChart(result);

    expect(chart.title).toBe('Area by Finish Type');
    expect(chart.bars.length).toBeGreaterThanOrEqual(1);
    // Should have paint and tiling
    const labels = chart.bars.map((b) => b.label);
    expect(labels).toContain('paint');
    expect(labels).toContain('tiling');
  });
});

describe('Material Chart', () => {
  it('builds material chart from summary', () => {
    const result = setupProject();
    const summary = setupSummary(result);
    const chart = buildMaterialChart(summary);

    expect(chart.title).toBe('Material Quantities by Category');
    expect(chart.bars.length).toBe(2); // paint and tiles
    expect(chart.bars[0].label).toBe('paint');
    expect(chart.bars[0].unit).toBe('buckets');
  });
});

describe('Detail Table', () => {
  it('builds detail table from project', () => {
    const result = setupProject();
    const table = buildDetailTable(result);

    expect(table.title).toBe('Element Details');
    expect(table.headers).toEqual(['Element', 'Area', 'Spaces']);
    expect(table.rows.length).toBe(2);
    expect(table.footerRow).toBeDefined();
    expect(table.footerRow!.cells[0]).toBe('TOTAL');
  });

  it('builds material table from summary', () => {
    const result = setupProject();
    const summary = setupSummary(result);
    const table = buildMaterialTable(summary);

    expect(table.title).toBe('Material Breakdown');
    expect(table.headers).toEqual(['Material', 'Category', 'Purchase', 'Have', 'Buy']);
    expect(table.rows.length).toBe(2);
    expect(table.footerRow).toBeDefined();
  });
});

describe('Key Metrics', () => {
  it('builds key metrics', () => {
    const result = setupProject();
    const metrics = buildKeyMetrics(result);

    expect(metrics.length).toBeGreaterThanOrEqual(4);
    const labels = metrics.map((m) => m.label);
    expect(labels).toContain('Total Area');
    expect(labels).toContain('Elements');
    expect(labels).toContain('Spaces');
  });

  it('includes material metrics when summary provided', () => {
    const result = setupProject();
    const summary = setupSummary(result);
    const metrics = buildKeyMetrics(result, summary);

    const labels = metrics.map((m) => m.label);
    expect(labels).toContain('Material Lines');
    expect(labels).toContain('Total Material Area');
  });
});

describe('Complete Visual Summary', () => {
  it('builds complete summary', () => {
    const result = setupProject();
    const summary = setupSummary(result);
    const visual = buildVisualSummary(result, summary);

    expect(visual.projectName).toBe('Test House');
    expect(visual.areaChart.bars.length).toBeGreaterThan(0);
    expect(visual.materialChart.bars.length).toBeGreaterThan(0);
    expect(visual.detailTable.rows.length).toBeGreaterThan(0);
    expect(visual.metrics.length).toBeGreaterThan(0);
  });

  it('works without material summary', () => {
    const result = setupProject();
    const visual = buildVisualSummary(result);

    expect(visual.materialChart.bars.length).toBe(0);
    expect(visual.areaChart.bars.length).toBeGreaterThan(0);
  });
});

describe('ASCII Rendering', () => {
  it('renders chart as ASCII', () => {
    const result = setupProject();
    const chart = buildAreaChart(result);
    const ascii = chartToAscii(chart);

    expect(ascii).toContain('Area by Element');
    expect(ascii).toContain('Walls');
    expect(ascii).toContain('█');
    expect(ascii).toContain('%');
  });

  it('renders table as ASCII', () => {
    const result = setupProject();
    const table = buildDetailTable(result);
    const ascii = tableToAscii(table);

    expect(ascii).toContain('Element Details');
    expect(ascii).toContain('Element');
    expect(ascii).toContain('TOTAL');
  });
});
