/**
 * Tests for the Explanation Engine (Feature 8)
 */

import { describe, it, expect } from 'vitest';
import {
  explainSpaceCalculation,
  explainFenceCalculation,
  explainMaterialCalculation,
  explainProjectCalculation,
  explainFromSteps,
  explanationToText,
} from '../explanation-engine';
import { createSpace, calculateSpace } from '../space-engine';
import { createFence, createFenceDimension, calculateFence } from '../fence-engine';
import { createMaterialSpec, calculateMaterialQuantity } from '../material-engine';
import { createConstructionProject, createProjectElement, calculateConstructionProject } from '../project-engine';
import { makeStep } from '../geometry';

describe('Space Calculation Explanation', () => {
  it('explains a room calculation', () => {
    const space = createSpace({
      name: 'Master Bedroom',
      type: 'bedroom',
      length: 12, width: 12, height: 10,
      unit: 'feet',
      surfaceType: 'wall',
      quantity: 2,
    });
    const result = calculateSpace(space);
    const explanation = explainSpaceCalculation(result);

    expect(explanation.subject).toContain('Master Bedroom');
    expect(explanation.resultSummary).toContain('Total area');
    expect(explanation.sections.length).toBeGreaterThan(0);

    // Should have input dimensions section
    const inputSection = explanation.sections.find((s) => s.title === 'Input Dimensions');
    expect(inputSection).toBeDefined();
    expect(inputSection!.steps.length).toBeGreaterThan(0);
  });

  it('explains openings and waste', () => {
    const space = createSpace({
      name: 'Room',
      type: 'bedroom',
      length: 12, width: 12, height: 10,
      unit: 'feet',
      surfaceType: 'wall',
      wasteMarginPercent: 10,
    });
    const result = calculateSpace(space);
    const explanation = explainSpaceCalculation(result);

    const adjustments = explanation.sections.find((s) => s.title === 'Adjustments');
    expect(adjustments).toBeDefined();
    expect(adjustments!.steps.some((s) => s.label.includes('Waste'))).toBe(true);
  });

  it('includes quantity for repeated spaces', () => {
    const space = createSpace({
      name: 'Bedrooms',
      type: 'bedroom',
      length: 12, width: 12, height: 10,
      unit: 'feet',
      quantity: 3,
      surfaceType: 'wall',
    });
    const result = calculateSpace(space);
    const explanation = explainSpaceCalculation(result);

    expect(explanation.resultSummary).toContain('3×');
    const quantitySection = explanation.sections.find((s) => s.title === 'Quantity');
    expect(quantitySection).toBeDefined();
  });
});

describe('Fence Calculation Explanation', () => {
  it('explains a multi-dimension fence', () => {
    const fence = createFence('Perimeter', 'feet');
    fence.dimensions = [
      createFenceDimension({ label: 'Front', length: 50, height: 6, unit: 'feet', partitionCount: 3 }),
      createFenceDimension({ label: 'Side', length: 100, height: 6, unit: 'feet', partitionCount: 4 }),
    ];
    const result = calculateFence(fence);
    const explanation = explainFenceCalculation(result);

    expect(explanation.subject).toContain('Perimeter');
    expect(explanation.resultSummary).toContain('Total fence area');

    // Should have a section for each dimension
    const frontSection = explanation.sections.find((s) => s.title.includes('Front'));
    expect(frontSection).toBeDefined();
    const sideSection = explanation.sections.find((s) => s.title.includes('Side'));
    expect(sideSection).toBeDefined();
  });
});

describe('Material Calculation Explanation', () => {
  it('explains a paint quantity calculation', () => {
    const paint = createMaterialSpec({
      productName: 'Premium Emulsion',
      quantityUnit: 'buckets',
      coverage: { type: 'area', value: 35, coats: 2, unit: 'm2' },
      defaultWastePercent: 5,
    });
    const result = calculateMaterialQuantity(100, paint, 2, 5);
    const explanation = explainMaterialCalculation(result, 'Premium Emulsion');

    expect(explanation.subject).toBe('Material: Premium Emulsion');
    expect(explanation.resultSummary).toContain('Purchase quantity');

    const inputSection = explanation.sections.find((s) => s.title === 'Input');
    expect(inputSection).toBeDefined();
    expect(inputSection!.steps.some((s) => s.label === 'Surface area')).toBe(true);
    expect(inputSection!.steps.some((s) => s.label === 'Coats')).toBe(true);

    const coverageSection = explanation.sections.find((s) => s.title.includes('Coverage'));
    expect(coverageSection).toBeDefined();
  });
});

describe('Project Calculation Explanation', () => {
  it('explains a multi-element project', () => {
    const project = createConstructionProject('3-Bedroom House', 'feet');
    project.elements = [
      createProjectElement('Walls', 'interior', 'painting', [
        createSpace({ name: 'Bedroom', type: 'bedroom', length: 12, width: 12, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint' }),
      ]),
      createProjectElement('Floors', 'interior', 'tiling', [
        createSpace({ name: 'Kitchen', type: 'kitchen', length: 10, width: 12, unit: 'feet', surfaceType: 'floor', finishType: 'tiling' }),
      ]),
    ];
    const result = calculateConstructionProject(project);
    const explanation = explainProjectCalculation(result);

    expect(explanation.subject).toBe('Project: 3-Bedroom House');
    expect(explanation.resultSummary).toContain('Total project area');

    const wallsSection = explanation.sections.find((s) => s.title.includes('Walls'));
    expect(wallsSection).toBeDefined();

    const breakdownSection = explanation.sections.find((s) => s.title.includes('Breakdown'));
    expect(breakdownSection).toBeDefined();
  });
});

describe('Generic Explanation', () => {
  it('explains from raw steps', () => {
    const steps = [
      makeStep('Step 1', 'A + B', '10'),
      makeStep('Step 2', 'Result × 2', '20'),
    ];
    const explanation = explainFromSteps('Test Calculation', 'Final: 20', steps);

    expect(explanation.subject).toBe('Test Calculation');
    expect(explanation.resultSummary).toBe('Final: 20');
    expect(explanation.sections.length).toBe(1);
    expect(explanation.sections[0].steps.length).toBe(2);
  });
});

describe('Text Formatting', () => {
  it('formats explanation as readable text', () => {
    const space = createSpace({
      name: 'Test Room',
      type: 'bedroom',
      length: 10, width: 10, height: 10,
      unit: 'feet',
      surfaceType: 'wall',
    });
    const result = calculateSpace(space);
    const explanation = explainSpaceCalculation(result);
    const text = explanationToText(explanation);

    expect(text).toContain('HOW FRELUX CALCULATED THIS');
    expect(text).toContain('Subject: Test Room');
    expect(text).toContain('Result:');
    expect(text).toContain('▸');
  });

  it('includes notes in text output', () => {
    const explanation = {
      subject: 'Test',
      resultSummary: 'Result: 100',
      sections: [{ title: 'Steps', steps: [] }],
      notes: ['This is a note', 'Another note'],
    };
    const text = explanationToText(explanation);
    expect(text).toContain('Notes:');
    expect(text).toContain('• This is a note');
  });
});
