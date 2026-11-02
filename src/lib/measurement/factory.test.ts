import { describe, it, expect } from "vitest";
import {
  generateId,
  createMeasurementEntry,
  createMeasurementGroup,
  createMeasurementSection,
  createMeasurementProject,
} from "./factory";

describe("measurement/factory", () => {
  it("generateId returns unique ids with prefix", () => {
    const id1 = generateId("entry");
    const id2 = generateId("entry");
    expect(id1).not.toBe(id2);
    expect(id1.startsWith("entry_")).toBe(true);
  });

  it("generateId defaults to m prefix", () => {
    const id = generateId();
    expect(id.startsWith("m_")).toBe(true);
  });

  it("createMeasurementEntry sets defaults", () => {
    const entry = createMeasurementEntry();
    expect(entry.length).toBe(0);
    expect(entry.unit).toBe("feet");
    expect(entry.quantity).toBe(1);
    expect(entry.id.startsWith("entry_")).toBe(true);
  });

  it("createMeasurementEntry accepts partial overrides", () => {
    const entry = createMeasurementEntry({ length: 5, unit: "meters" });
    expect(entry.length).toBe(5);
    expect(entry.unit).toBe("meters");
  });

  it("createMeasurementGroup creates group with label and entry", () => {
    const entry = createMeasurementEntry({ length: 4 });
    const group = createMeasurementGroup("Walls", entry);
    expect(group.label).toBe("Walls");
    expect(group.entry).toBe(entry);
    expect(group.id.startsWith("group_")).toBe(true);
  });

  it("createMeasurementSection creates section with groups", () => {
    const entry = createMeasurementEntry();
    const group = createMeasurementGroup("G", entry);
    const section = createMeasurementSection("Room 1", [group]);
    expect(section.label).toBe("Room 1");
    expect(section.groups.length).toBe(1);
    expect(section.id.startsWith("section_")).toBe(true);
  });

  it("createMeasurementSection defaults to empty groups", () => {
    const section = createMeasurementSection("Empty");
    expect(section.groups).toEqual([]);
  });

  it("createMeasurementProject creates project with correct context", () => {
    const project = createMeasurementProject("painting");
    expect(project.calculatorContext).toBe("painting");
    expect(project.projectMode).toBe("single_room");
    expect(project.sections).toEqual([]);
    expect(project.id.startsWith("project_")).toBe(true);
  });

  it("createMeasurementProject respects preferredUnit if allowed", () => {
    const project = createMeasurementProject("painting", "meters");
    expect(project.preferredUnit).toBe("meters");
  });

  it("createMeasurementProject falls back to first allowed unit if preferred not allowed", () => {
    const project = createMeasurementProject(
      "painting",
      "lightyears" as unknown as never,
    );
    // Should fall back to first allowed unit for painting
    expect(project.preferredUnit).not.toBe("lightyears");
  });
});
