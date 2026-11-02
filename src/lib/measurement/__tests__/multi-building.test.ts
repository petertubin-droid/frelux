/**
 * Tests for Feature 15: Multi-Building Projects
 */
import { describe, it, expect } from 'vitest';
import {
  createBuilding,
  createMultiBuildingProject,
  addBuilding,
  renameBuilding,
  removeBuilding,
  updateBuilding,
  getBuilding,
  calculateBuilding,
  calculateMultiBuildingProject,
  buildingSummary,
  duplicateBuildingResult,
  multiBuildingProjectToConstructionProject,
  totalAreaByBuildingType,
  getBuildingSpaces,
  BUILDING_TYPE_LABELS,
  addElementToBuilding,
} from '../multi-building';
import { createSpace } from '../space-engine';
import { createProjectElement } from '../project-engine';
import type { ProjectElement } from '../project-engine';

function makePaintSpace(name: string, length: number, width: number): ReturnType<typeof createSpace> {
  return createSpace({
    name,
    type: 'bedroom',
    length,
    width,
    height: 10,
    unit: 'feet',
    finishType: 'paint',
    surfaceType: 'wall',
  });
}

function makeTestElement(name: string, spaces: ReturnType<typeof createSpace>[]): ProjectElement {
  return createProjectElement(name, 'interior', 'painting', spaces);
}

describe('Feature 15: Multi-Building Projects', () => {
  describe('Factory functions', () => {
    it('creates a building with defaults', () => {
      const b = createBuilding('Main House');
      expect(b.name).toBe('Main House');
      expect(b.buildingType).toBe('main_house');
      expect(b.elements).toEqual([]);
      expect(b.roofSpec).toBeNull();
      expect(b.numberOfFloors).toBe(1);
    });

    it('creates a building with custom type and floors', () => {
      const b = createBuilding("Boys' Quarters", 'boys_quarters', 2);
      expect(b.buildingType).toBe('boys_quarters');
      expect(b.numberOfFloors).toBe(2);
    });

    it('creates a multi-building project', () => {
      const p = createMultiBuildingProject('Family Compound');
      expect(p.name).toBe('Family Compound');
      expect(p.buildings).toEqual([]);
      expect(p.status).toBe('draft');
      expect(p.preferredUnit).toBe('feet');
    });
  });

  describe('Building operations', () => {
    it('adds a building to a project', () => {
      const p = createMultiBuildingProject('Test');
      const b = createBuilding('Main House');
      const updated = addBuilding(p, b);
      expect(updated.buildings).toHaveLength(1);
      expect(updated.buildings[0].name).toBe('Main House');
    });

    it('renames a building', () => {
      const p = createMultiBuildingProject('Test');
      const b = createBuilding('Main House');
      const p2 = addBuilding(p, b);
      const p3 = renameBuilding(p2, b.id, 'Family House');
      expect(p3.buildings[0].name).toBe('Family House');
    });

    it('removes a building', () => {
      const p = createMultiBuildingProject('Test');
      const b1 = createBuilding('Main House');
      const b2 = createBuilding('Garage');
      const p2 = addBuilding(addBuilding(p, b1), b2);
      const p3 = removeBuilding(p2, b1.id);
      expect(p3.buildings).toHaveLength(1);
      expect(p3.buildings[0].name).toBe('Garage');
    });

    it('updates a building', () => {
      const p = createMultiBuildingProject('Test');
      const b = createBuilding('Main House');
      const p2 = addBuilding(p, b);
      const p3 = updateBuilding(p2, b.id, { numberOfFloors: 3, notes: 'Extended' });
      expect(p3.buildings[0].numberOfFloors).toBe(3);
      expect(p3.buildings[0].notes).toBe('Extended');
    });

    it('gets a building by ID', () => {
      const p = createMultiBuildingProject('Test');
      const b = createBuilding('Main House');
      const p2 = addBuilding(p, b);
      const found = getBuilding(p2, b.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('Main House');
    });

    it('returns undefined for non-existent building', () => {
      const p = createMultiBuildingProject('Test');
      expect(getBuilding(p, 'nonexistent')).toBeUndefined();
    });

    it('adds an element to a building', () => {
      const p = createMultiBuildingProject('Test');
      const b = createBuilding('Main House');
      const p2 = addBuilding(p, b);
      const elem = createProjectElement('Bedrooms', 'interior', 'painting', []);
      const p3 = addElementToBuilding(p2, b.id, elem);
      expect(p3.buildings[0].elements).toHaveLength(1);
    });
  });

  describe('Building calculation', () => {
    it('calculates a building with elements', () => {
      const space = makePaintSpace('Bedroom 1', 12, 12);
      const element = makeTestElement('Bedrooms', [space]);
      const building = createBuilding('Main House');
      building.elements = [element];

      const result = calculateBuilding(building);
      expect(result.buildingName).toBe('Main House');
      expect(result.elementResults).toHaveLength(1);
      expect(result.totalAreaM2).toBeGreaterThan(0);
      expect(result.steps.length).toBeGreaterThan(0);
    });

    it('calculates a building with no elements', () => {
      const building = createBuilding('Empty House');
      const result = calculateBuilding(building);
      expect(result.totalAreaM2).toBe(0);
      expect(result.elementResults).toHaveLength(0);
    });

    it('aggregates area by element type and finish type', () => {
      const bedroom = makePaintSpace('Bedroom', 10, 10);
      const element = makeTestElement('Interior', [bedroom]);
      const building = createBuilding('Main House');
      building.elements = [element];

      const result = calculateBuilding(building);
      expect(Object.keys(result.areaByElementType)).toContain('interior');
      expect(Object.keys(result.areaByFinishType)).toContain('paint');
    });

    it('collects all space results', () => {
      const space = makePaintSpace('Bedroom', 12, 12);
      const element = makeTestElement('Interior', [space]);
      const building = createBuilding('Main House');
      building.elements = [element];

      const result = calculateBuilding(building);
      expect(result.allSpaceResults).toHaveLength(1);
      expect(result.allSpaceResults[0].name).toBe('Bedroom');
    });
  });

  describe('Multi-building project calculation', () => {
    it('calculates a project with multiple buildings', () => {
      const space1 = makePaintSpace('Bedroom', 12, 12);
      const space2 = makePaintSpace('Store Room', 6, 6);

      const building1 = createBuilding('Main House', 'main_house');
      building1.elements = [makeTestElement('Interior', [space1])];

      const building2 = createBuilding('Store', 'store');
      building2.elements = [makeTestElement('Interior', [space2])];

      const project = createMultiBuildingProject('Compound');
      const p2 = addBuilding(addBuilding(project, building1), building2);

      const result = calculateMultiBuildingProject(p2);
      expect(result.buildingCount).toBe(2);
      expect(result.buildingResults).toHaveLength(2);
      expect(result.totalAreaM2).toBeGreaterThan(0);
      expect(result.areaByBuildingType).toHaveProperty('main_house');
      expect(result.areaByBuildingType).toHaveProperty('store');
    });

    it('handles empty project', () => {
      const project = createMultiBuildingProject('Empty');
      const result = calculateMultiBuildingProject(project);
      expect(result.buildingCount).toBe(0);
      expect(result.totalAreaM2).toBe(0);
      expect(result.buildingResults).toHaveLength(0);
    });

    it('does not multiply one building across all buildings', () => {
      const space1 = makePaintSpace('Bedroom', 10, 10);
      const space2 = makePaintSpace('Kitchen', 15, 15);

      const building1 = createBuilding('Building A');
      building1.elements = [makeTestElement('Interior', [space1])];

      const building2 = createBuilding('Building B');
      building2.elements = [makeTestElement('Interior', [space2])];

      const project = createMultiBuildingProject('Test');
      const p2 = addBuilding(addBuilding(project, building1), building2);

      const result = calculateMultiBuildingProject(p2);
      const area1 = result.buildingResults[0].totalAreaM2;
      const area2 = result.buildingResults[1].totalAreaM2;
      // Different spaces → different areas
      expect(area1).not.toBe(area2);
      expect(result.totalAreaM2).toBeCloseTo(area1 + area2, 5);
    });

    it('aggregates area across buildings by element type', () => {
      const space1 = makePaintSpace('Bedroom', 12, 12);
      const space2 = makePaintSpace('Kitchen', 10, 10);

      const building1 = createBuilding('Main House');
      building1.elements = [makeTestElement('Interior', [space1])];
      const building2 = createBuilding('Guest House');
      building2.elements = [makeTestElement('Interior', [space2])];

      const project = createMultiBuildingProject('Estate');
      const p2 = addBuilding(addBuilding(project, building1), building2);
      const result = calculateMultiBuildingProject(p2);

      expect(result.areaByElementType).toHaveProperty('interior');
      // Both buildings have interior elements, so total should be sum
      const totalInterior = result.areaByElementType['interior'];
      const b1Interior = result.buildingResults[0].totalAreaM2;
      const b2Interior = result.buildingResults[1].totalAreaM2;
      expect(totalInterior).toBeCloseTo(b1Interior + b2Interior, 5);
    });
  });

  describe('Aggregation helpers', () => {
    it('returns building summary', () => {
      const space = makePaintSpace('Bedroom', 10, 10);
      const building = createBuilding('Main House');
      building.elements = [makeTestElement('Interior', [space])];

      const project = createMultiBuildingProject('Test');
      const p2 = addBuilding(project, building);
      const result = calculateMultiBuildingProject(p2);
      const summary = buildingSummary(result);
      expect(summary).toHaveLength(1);
      expect(summary[0].name).toBe('Main House');
      expect(summary[0].areaM2).toBeGreaterThan(0);
    });

    it('duplicates building results only when explicitly called', () => {
      const space = makePaintSpace('Bedroom', 10, 10);
      const building = createBuilding('Main House');
      building.elements = [makeTestElement('Interior', [space])];
      const result = calculateBuilding(building);

      const copies = duplicateBuildingResult(result, 3);
      expect(copies).toHaveLength(3);
      expect(copies[0].buildingName).toContain('Copy 1');
      expect(copies[1].buildingName).toContain('Copy 2');
      // copies returns 1 when copies <= 1
      expect(duplicateBuildingResult(result, 1)).toHaveLength(1);
    });

    it('converts to ConstructionProject for backward compat', () => {
      const space = makePaintSpace('Bedroom', 12, 12);
      const building1 = createBuilding('Main House');
      building1.elements = [makeTestElement('Interior', [space])];

      const project = createMultiBuildingProject('Compound');
      const p2 = addBuilding(project, building1);

      const cp = multiBuildingProjectToConstructionProject(p2);
      expect(cp.name).toBe('Compound');
      expect(cp.elements).toHaveLength(1);
      expect(cp.elements[0].name).toContain('Main House');
    });

    it('gets total area by building type', () => {
      const space = makePaintSpace('Bedroom', 10, 10);
      const building = createBuilding('Main House', 'main_house');
      building.elements = [makeTestElement('Interior', [space])];

      const project = createMultiBuildingProject('Test');
      const p2 = addBuilding(project, building);
      const result = calculateMultiBuildingProject(p2);

      expect(totalAreaByBuildingType(result, 'main_house')).toBeGreaterThan(0);
      expect(totalAreaByBuildingType(result, 'garage')).toBe(0);
    });

    it('gets building spaces', () => {
      const space = makePaintSpace('Bedroom', 10, 10);
      const element = makeTestElement('Interior', [space]);
      const building = createBuilding('Main House');
      building.elements = [element];
      const spaces = getBuildingSpaces(building);
      expect(spaces).toHaveLength(1);
      expect(spaces[0].name).toBe('Bedroom');
    });
  });

  describe('Building type labels', () => {
    it('has labels for all building types', () => {
      expect(BUILDING_TYPE_LABELS.main_house).toBe('Main House');
      expect(BUILDING_TYPE_LABELS.boys_quarters).toBe("Boys' Quarters");
      expect(BUILDING_TYPE_LABELS.garage).toBe('Garage');
      expect(BUILDING_TYPE_LABELS.other).toBe('Other Building');
    });
  });

  describe('Immutability', () => {
    it('addBuilding does not mutate original project', () => {
      const p = createMultiBuildingProject('Test');
      const b = createBuilding('Main House');
      addBuilding(p, b);
      expect(p.buildings).toHaveLength(0);
    });

    it('renameBuilding does not mutate original project', () => {
      const p = createMultiBuildingProject('Test');
      const b = createBuilding('Main House');
      const p2 = addBuilding(p, b);
      renameBuilding(p2, b.id, 'Renamed');
      expect(p2.buildings[0].name).toBe('Main House');
    });

    it('removeBuilding does not mutate original project', () => {
      const p = createMultiBuildingProject('Test');
      const b1 = createBuilding('A');
      const b2 = createBuilding('B');
      const p2 = addBuilding(addBuilding(p, b1), b2);
      removeBuilding(p2, b1.id);
      expect(p2.buildings).toHaveLength(2);
    });
  });
});
