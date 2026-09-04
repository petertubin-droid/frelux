import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMeasurementProject } from "@/lib/measurement/use-measurement-project";

describe("useMeasurementProject", () => {
  it("creates a project with a default section", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    expect(result.current.project.sections).toHaveLength(1);
    expect(result.current.project.sections[0].label).toBe("Measurements");
    expect(result.current.project.projectMode).toBe("single_room");
  });

  it("creates a project with custom section label", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({
        calculatorContext: "painting",
        defaultSectionLabel: "Living Room",
      }),
    );
    expect(result.current.project.sections[0].label).toBe("Living Room");
  });

  it("creates a project with custom mode", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({
        calculatorContext: "painting",
        projectMode: "house_building",
      }),
    );
    expect(result.current.project.projectMode).toBe("house_building");
  });

  it("addSection adds a new section", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    act(() => result.current.addSection("Bedroom"));
    expect(result.current.project.sections).toHaveLength(2);
    expect(result.current.project.sections[1].label).toBe("Bedroom");
  });

  it("addSection returns section id", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    let id: string;
    act(() => {
      id = result.current.addSection("Kitchen");
    });
    expect(id!).toBeTruthy();
  });

  it("removeSection removes by id", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    let sectionId: string;
    act(() => {
      sectionId = result.current.addSection("Garage");
    });
    act(() => result.current.removeSection(sectionId));
    expect(result.current.project.sections).toHaveLength(1);
  });

  it("addMeasurement adds entry to first section", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    act(() => result.current.addMeasurement("Wall 1", { length: 5, width: 3 }));
    expect(result.current.project.sections[0].groups).toHaveLength(1);
    expect(result.current.project.sections[0].groups[0].label).toBe("Wall 1");
  });

  it("addEntry adds to specific section", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    const sectionId = result.current.project.sections[0].id;
    act(() =>
      result.current.addEntry(sectionId, "Ceiling", { length: 4, width: 4 }),
    );
    expect(result.current.project.sections[0].groups).toHaveLength(1);
    expect(result.current.project.sections[0].groups[0].label).toBe("Ceiling");
  });

  it("updateMeasurement updates entry by groupId", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    act(() => result.current.addMeasurement("Wall", { length: 5, width: 3 }));
    const groupId = result.current.project.sections[0].groups[0].id;
    act(() => result.current.updateMeasurement(groupId, { length: 6 }));
    expect(result.current.project.sections[0].groups[0].entry.length).toBe(6);
  });

  it("removeMeasurement removes by groupId", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    act(() => result.current.addMeasurement("Wall 1", { length: 5, width: 3 }));
    act(() => result.current.addMeasurement("Wall 2", { length: 4, width: 3 }));
    const groupId = result.current.project.sections[0].groups[0].id;
    act(() => result.current.removeMeasurement(groupId));
    expect(result.current.project.sections[0].groups).toHaveLength(1);
    expect(result.current.project.sections[0].groups[0].label).toBe("Wall 2");
  });

  it("setProjectMode updates mode", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    act(() => result.current.setProjectMode("fence"));
    expect(result.current.project.projectMode).toBe("fence");
  });

  it("setPreferredUnit updates unit", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    act(() => result.current.setPreferredUnit("feet"));
    expect(result.current.project.preferredUnit).toBe("feet");
  });

  it("reset clears project to default", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    act(() => result.current.addMeasurement("Wall", { length: 5, width: 3 }));
    act(() => result.current.reset());
    expect(result.current.project.sections[0].groups).toHaveLength(0);
    expect(result.current.result).toBeNull();
  });

  it("resetWithMode sets fence mode with correct label", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    act(() => result.current.resetWithMode("fence"));
    expect(result.current.project.projectMode).toBe("fence");
    expect(result.current.project.sections[0].label).toBe("Fence Dimensions");
  });

  it("resetWithMode sets house_building mode with correct label", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    act(() => result.current.resetWithMode("house_building"));
    expect(result.current.project.sections[0].label).toBe("Building Spaces");
  });

  it("resetWithMode sets exterior mode with correct label", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    act(() => result.current.resetWithMode("exterior"));
    expect(result.current.project.sections[0].label).toBe("Exterior Surfaces");
  });

  it("calculate sets result", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    act(() => result.current.addMeasurement("Wall", { length: 5, width: 3 }));
    act(() => result.current.calculate());
    expect(result.current.result).not.toBeNull();
  });

  it("validation is available", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    expect(result.current.validation).toBeDefined();
  });

  it("allowedUnits is available", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    expect(result.current.allowedUnits).toBeDefined();
    expect(Array.isArray(result.current.allowedUnits)).toBe(true);
  });

  it("activeSection is the first section", () => {
    const { result } = renderHook(() =>
      useMeasurementProject({ calculatorContext: "painting" }),
    );
    expect(result.current.activeSection).toBeDefined();
    expect(result.current.activeSection?.label).toBe("Measurements");
  });
});
