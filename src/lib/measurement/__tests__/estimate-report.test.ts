/**
 * Tests for the Estimate Report Engine (Feature 14)
 */

import { describe, it, expect } from 'vitest';
import { buildEstimateReport, reportToText, reportToMarkdown } from '../estimate-report';
import { createConstructionProject, createProjectElement, calculateConstructionProject } from '../project-engine';
import { createSpace } from '../space-engine';
import { buildMaterialSummary } from '../material-summary';
import { createMaterialSpec } from '../material-engine';
import { createRuleVersionReference } from '../rule-versioning';
import { createRule } from '../rule-registry';
import { assessCalculationConfidence } from '../confidence-engine';

function setup() {
  const project = createConstructionProject('Test House', 'feet');
  project.elements = [
    createProjectElement('Walls', 'interior', 'painting', [
      createSpace({ name: 'Bedroom', type: 'bedroom', length: 12, width: 12, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint' }),
    ]),
    createProjectElement('Floors', 'interior', 'tiling', [
      createSpace({ name: 'Kitchen', type: 'kitchen', length: 10, width: 12, unit: 'feet', surfaceType: 'floor', finishType: 'tiling' }),
    ]),
  ];
  const result = calculateConstructionProject(project);

  const paint = createMaterialSpec({ productName: 'Paint', category: 'paint', quantityUnit: 'buckets', coverage: { type: 'area', value: 50, unit: 'm2' } });
  const tiles = createMaterialSpec({ productName: 'Tiles', category: 'tiles', quantityUnit: 'cartons', coverage: { type: 'area', value: 1.44, unit: 'm2' } });
  const summary = buildMaterialSummary('Test House', [
    { material: paint, areaM2: result.areaByFinishType.paint ?? 0, coats: 1, wastePercent: 10, source: 'Walls', finishType: 'paint' },
    { material: tiles, areaM2: result.areaByFinishType.tiling ?? 0, coats: 1, wastePercent: 10, source: 'Floors', finishType: 'tiling' },
  ]);

  const confidence = assessCalculationConfidence(result.allSpaceResults[0]);

  const rule = createRule({ ruleName: 'Test Rule', version: 1 });
  const ruleRef = createRuleVersionReference(rule);

  return { result, summary, confidence, ruleRef };
}

describe('Estimate Report', () => {
  it('builds a report with sections', () => {
    const { result } = setup();
    const report = buildEstimateReport(result);

    expect(report.projectName).toBe('Test House');
    expect(report.sections.length).toBeGreaterThan(3);
    expect(report.reportId).toBeDefined();
    expect(report.generatedAt).toBeDefined();
  });

  it('includes header section', () => {
    const { result } = setup();
    const report = buildEstimateReport(result);
    const header = report.sections.find((s) => s.type === 'header');
    expect(header).toBeDefined();
    expect(header!.title).toBe('FRELUX ESTIMATE REPORT');
    expect(header!.fields.some((f) => f.label === 'Project')).toBe(true);
  });

  it('includes project info section', () => {
    const { result } = setup();
    const report = buildEstimateReport(result);
    const info = report.sections.find((s) => s.type === 'project_info');
    expect(info).toBeDefined();
    expect(info!.fields.some((f) => f.label === 'Total Area')).toBe(true);
    expect(info!.fields.some((f) => f.label === 'Elements')).toBe(true);
  });

  it('includes element breakdown table', () => {
    const { result } = setup();
    const report = buildEstimateReport(result);
    const breakdown = report.sections.find((s) => s.type === 'element_breakdown');
    expect(breakdown).toBeDefined();
    expect(breakdown!.table).toBeDefined();
    expect(breakdown!.table!.headers).toContain('Element');
    expect(breakdown!.table!.rows.length).toBe(2); // Walls, Floors
  });

  it('includes material list when summary provided', () => {
    const { result, summary } = setup();
    const report = buildEstimateReport(result, summary);
    const materialSection = report.sections.find((s) => s.type === 'material_list');
    expect(materialSection).toBeDefined();
    expect(materialSection!.table).toBeDefined();
    expect(materialSection!.table!.rows.length).toBe(2);
  });

  it('excludes material list when no summary', () => {
    const { result } = setup();
    const report = buildEstimateReport(result);
    const materialSection = report.sections.find((s) => s.type === 'material_list');
    expect(materialSection).toBeUndefined();
  });

  it('includes calculation explanation by default', () => {
    const { result } = setup();
    const report = buildEstimateReport(result);
    const explanation = report.sections.find((s) => s.type === 'calculation_explanation');
    expect(explanation).toBeDefined();
    expect(explanation!.text).toBeDefined();
  });

  it('can exclude explanation', () => {
    const { result } = setup();
    const report = buildEstimateReport(result, undefined, undefined, [], { includeExplanation: false });
    const explanation = report.sections.find((s) => s.type === 'calculation_explanation');
    expect(explanation).toBeUndefined();
  });

  it('includes confidence when provided', () => {
    const { result, confidence } = setup();
    const report = buildEstimateReport(result, undefined, confidence);
    const confSection = report.sections.find((s) => s.type === 'confidence_assessment');
    expect(confSection).toBeDefined();
    expect(confSection!.fields.some((f) => f.label === 'Overall')).toBe(true);
  });

  it('includes rule traceability when references provided', () => {
    const { result, ruleRef } = setup();
    const report = buildEstimateReport(result, undefined, undefined, [ruleRef]);
    const traceSection = report.sections.find((s) => s.type === 'rule_traceability');
    expect(traceSection).toBeDefined();
    expect(traceSection!.table).toBeDefined();
    expect(traceSection!.table!.rows.length).toBe(1);
  });

  it('includes metrics', () => {
    const { result } = setup();
    const report = buildEstimateReport(result);
    expect(report.metrics.length).toBeGreaterThan(0);
    expect(report.metrics.some((m) => m.label === 'Total Area')).toBe(true);
  });

  it('includes footer', () => {
    const { result } = setup();
    const report = buildEstimateReport(result);
    const footer = report.sections.find((s) => s.type === 'footer');
    expect(footer).toBeDefined();
    expect(footer!.fields.some((f) => f.label === 'Generated by')).toBe(true);
  });
});

describe('Report Formatting', () => {
  it('formats report as text', () => {
    const { result } = setup();
    const report = buildEstimateReport(result);
    const text = reportToText(report);

    expect(text).toContain('FRELUX ESTIMATE REPORT');
    expect(text).toContain('Test House');
    expect(text).toContain('Project Information');
    expect(text).toContain('Element Breakdown');
  });

  it('formats report as Markdown', () => {
    const { result, summary } = setup();
    const report = buildEstimateReport(result, summary);
    const md = reportToMarkdown(report);

    expect(md).toContain('## FRELUX ESTIMATE REPORT');
    expect(md).toContain('## Project Information');
    expect(md).toContain('|');
    expect(md).toContain('---');
  });
});
