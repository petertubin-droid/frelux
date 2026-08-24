/**
 * Tests for the Project/Building Engine (Feature 3 — Project/Building Engine)
 */

import { describe, it, expect } from 'vitest';
import {
  createConstructionProject,
  createProjectElement,
  calculateProjectElement,
  calculateConstructionProject,
  projectToMeasurementProject,
  totalAreaByElementType,
  getSpacesByType,
  getSpacesByFinishType,
  getSpaceCount,
  elementSummary,
  finishTypeSummary,
  PROJECT_ELEMENT_TYPE_LABELS,
} from '../project-engine';
import { createSpace } from '../space-engine';

describe('Project Creation', () => {
  it('creates a project with defaults', () => {
    const project = createConstructionProject();
    expect(project.id).toBeDefined();
    expect(project.name).toBe('New Project');
    expect(project.elements).toEqual([]);
    expect(project.status).toBe('draft');
    expect(project.preferredUnit).toBe('feet');
  });

  it('creates a project with name and unit', () => {
    const project = createConstructionProject('3-Bedroom Bungalow', 'meters');
    expect(project.name).toBe('3-Bedroom Bungalow');
    expect(project.preferredUnit).toBe('meters');
  });
});

describe('Project Element', () => {
  it('creates a project element', () => {
    const element = createProjectElement('Bedrooms', 'interior', 'painting', [
      createSpace({ name: 'Master Bedroom', type: 'bedroom', length: 12, width: 12, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint' }),
    ]);
    expect(element.name).toBe('Bedrooms');
    expect(element.elementType).toBe('interior');
    expect(element.primaryCalculator).toBe('painting');
    expect(element.spaces.length).toBe(1);
  });

  it('calculates a project element', () => {
    const element = createProjectElement('Bedrooms', 'interior', 'painting', [
      createSpace({ name: 'Bedroom 1', type: 'bedroom', length: 12, width: 12, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint', quantity: 1 }),
      createSpace({ name: 'Bedroom 2', type: 'bedroom', length: 10, width: 10, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint', quantity: 2 }),
    ]);
    const result = calculateProjectElement(element);
    expect(result.totalAreaM2).toBeGreaterThan(0);
    expect(result.spaceResults.length).toBe(2);
    expect(result.steps.length).toBeGreaterThan(0);
  });
});

describe('Construction Project Calculation', () => {
  it('calculates a multi-element project', () => {
    const project = createConstructionProject('3-Bedroom House', 'feet');
    project.elements = [
      createProjectElement('Interior Walls', 'interior', 'painting', [
        createSpace({ name: 'Master Bedroom', type: 'bedroom', length: 12, width: 12, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint', quantity: 1 }),
        createSpace({ name: 'Other Bedrooms', type: 'bedroom', length: 10, width: 10, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint', quantity: 2 }),
        createSpace({ name: 'Kitchen', type: 'kitchen', length: 10, width: 12, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint', quantity: 1 }),
      ]),
      createProjectElement('Floor Tiling', 'interior', 'tiling', [
        createSpace({ name: 'Living Room Floor', type: 'parlour', length: 15, width: 20, unit: 'feet', surfaceType: 'floor', finishType: 'tiling', quantity: 1 }),
        createSpace({ name: 'Kitchen Floor', type: 'kitchen', length: 10, width: 12, unit: 'feet', surfaceType: 'floor', finishType: 'tiling', quantity: 1 }),
      ]),
      createProjectElement('Front Fence', 'fence', 'screeding', [
        createSpace({ name: 'Front Fence', type: 'other', length: 50, height: 6, unit: 'feet', surfaceType: 'fence', finishType: 'screeding', partitionCount: 5, quantity: 1 }),
      ]),
    ];

    const result = calculateConstructionProject(project);

    expect(result.totalAreaM2).toBeGreaterThan(0);
    expect(result.elementResults.length).toBe(3);
    expect(result.allSpaceResults.length).toBe(6);
    expect(Object.keys(result.areaByFinishType).length).toBe(3); // paint + tiling + screeding
    expect(Object.keys(result.areaByElementType).length).toBe(2); // interior + fence
  });

  it('handles empty project', () => {
    const project = createConstructionProject('Empty', 'feet');
    const result = calculateConstructionProject(project);
    expect(result.totalAreaM2).toBe(0);
    expect(result.elementResults.length).toBe(0);
  });

  it('aggregates area by finish type correctly', () => {
    const project = createConstructionProject('Test', 'feet');
    project.elements = [
      createProjectElement('Paint Spaces', 'interior', 'painting', [
        createSpace({ name: 'Room A', type: 'bedroom', length: 10, width: 10, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint' }),
        createSpace({ name: 'Room B', type: 'bedroom', length: 12, width: 12, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint' }),
      ]),
      createProjectElement('Tile Spaces', 'interior', 'tiling', [
        createSpace({ name: 'Floor A', type: 'kitchen', length: 10, width: 10, unit: 'feet', surfaceType: 'floor', finishType: 'tiling' }),
      ]),
    ];
    const result = calculateConstructionProject(project);

    const paintArea = result.areaByFinishType['paint'];
    const tilingArea = result.areaByFinishType['tiling'];
    expect(paintArea).toBeGreaterThan(0);
    expect(tilingArea).toBeGreaterThan(0);
    expect(paintArea + tilingArea).toBeCloseTo(result.totalAreaM2, 4);
  });

  it('aggregates area by element type correctly', () => {
    const project = createConstructionProject('Test', 'feet');
    project.elements = [
      createProjectElement('Interior', 'interior', 'painting', [
        createSpace({ name: 'Room', type: 'bedroom', length: 10, width: 10, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint' }),
      ]),
      createProjectElement('Fence', 'fence', 'screeding', [
        createSpace({ name: 'Fence', type: 'other', length: 50, height: 6, unit: 'feet', surfaceType: 'fence', finishType: 'screeding', partitionCount: 5 }),
      ]),
    ];
    const result = calculateConstructionProject(project);

    expect(result.areaByElementType['interior']).toBeGreaterThan(0);
    expect(result.areaByElementType['fence']).toBeGreaterThan(0);
  });
});

describe('Bridge to Measurement System', () => {
  it('converts project to measurement project for specific calculator', () => {
    const project = createConstructionProject('Test', 'feet');
    project.elements = [
      createProjectElement('Paint Spaces', 'interior', 'painting', [
        createSpace({ name: 'Room', type: 'bedroom', length: 10, width: 10, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint' }),
      ]),
      createProjectElement('Tile Spaces', 'interior', 'tiling', [
        createSpace({ name: 'Floor', type: 'kitchen', length: 10, width: 10, unit: 'feet', surfaceType: 'floor', finishType: 'tiling' }),
      ]),
    ];

    const paintProject = projectToMeasurementProject(project, 'painting');
    expect(paintProject.calculatorContext).toBe('painting');
    // Only painting elements should be included
    expect(paintProject.sections.length).toBe(1); // bedroom section only

    const tileProject = projectToMeasurementProject(project, 'tiling');
    expect(tileProject.calculatorContext).toBe('tiling');
    expect(tileProject.sections.length).toBe(1); // kitchen section
  });
});

describe('Aggregation Helpers', () => {
  function setupProject() {
    const project = createConstructionProject('Test', 'feet');
    project.elements = [
      createProjectElement('Interior', 'interior', 'painting', [
        createSpace({ name: 'Bedroom 1', type: 'bedroom', length: 12, width: 12, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint' }),
        createSpace({ name: 'Bedroom 2', type: 'bedroom', length: 10, width: 10, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint', quantity: 2 }),
        createSpace({ name: 'Kitchen', type: 'kitchen', length: 10, width: 12, height: 10, unit: 'feet', surfaceType: 'wall', finishType: 'paint' }),
      ]),
      createProjectElement('Exterior', 'exterior', 'painting', [
        createSpace({ name: 'Front Wall', type: 'other', length: 50, height: 10, unit: 'feet', surfaceType: 'exterior', finishType: 'paint' }),
      ]),
      createProjectElement('Fence', 'fence', 'screeding', [
        createSpace({ name: 'Front Fence', type: 'other', length: 50, height: 6, unit: 'feet', surfaceType: 'fence', finishType: 'screeding', partitionCount: 5 }),
      ]),
    ];
    return project;
  }

  it('gets total area by element type', () => {
    const result = calculateConstructionProject(setupProject());
    const interiorArea = totalAreaByElementType(result, 'interior');
    const fenceArea = totalAreaByElementType(result, 'fence');
    expect(interiorArea).toBeGreaterThan(0);
    expect(fenceArea).toBeGreaterThan(0);
  });

  it('gets spaces by type', () => {
    const project = setupProject();
    const bedrooms = getSpacesByType(project, 'bedroom');
    expect(bedrooms.length).toBe(2); // Bedroom 1 + Bedroom 2 (quantity=2 still one space entry)
    const kitchens = getSpacesByType(project, 'kitchen');
    expect(kitchens.length).toBe(1);
  });

  it('gets spaces by finish type', () => {
    const project = setupProject();
    const paintSpaces = getSpacesByFinishType(project, 'paint');
    expect(paintSpaces.length).toBe(4); // 3 interior + 1 exterior
    const screedingSpaces = getSpacesByFinishType(project, 'screeding');
    expect(screedingSpaces.length).toBe(1);
  });

  it('counts all spaces', () => {
    const project = setupProject();
    expect(getSpaceCount(project)).toBe(5);
  });

  it('generates element summary', () => {
    const result = calculateConstructionProject(setupProject());
    const summary = elementSummary(result);
    expect(summary.length).toBe(3);
    expect(summary[0].name).toBe('Interior');
    expect(summary[0].elementType).toBe('interior');
    expect(summary[0].areaM2).toBeGreaterThan(0);
  });

  it('generates finish type summary', () => {
    const result = calculateConstructionProject(setupProject());
    const summary = finishTypeSummary(result);
    expect(summary.length).toBe(2); // paint + screeding
    // Paint should have more area than screeding
    expect(summary[0].areaM2).toBeGreaterThan(summary[1].areaM2);
  });
});

describe('Element Type Labels', () => {
  it('has labels for all element types', () => {
    expect(PROJECT_ELEMENT_TYPE_LABELS.interior).toBe('Interior Spaces');
    expect(PROJECT_ELEMENT_TYPE_LABELS.exterior).toBe('Exterior');
    expect(PROJECT_ELEMENT_TYPE_LABELS.fence).toBe('Fence');
    expect(PROJECT_ELEMENT_TYPE_LABELS.roof).toBe('Roof');
    expect(PROJECT_ELEMENT_TYPE_LABELS.compound).toBe('Compound / Garden');
    expect(PROJECT_ELEMENT_TYPE_LABELS.custom).toBe('Custom Elements');
  });
});
