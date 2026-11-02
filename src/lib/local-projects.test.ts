import { describe, it, expect, beforeEach } from "vitest";
import {
  saveLocalProject,
  getLocalProjects,
  getLocalProjectsByType,
  deleteLocalProject,
  clearLocalProjects,
  hasLocalProjects,
} from "./local-projects";

describe("local-projects", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with no projects", () => {
    expect(getLocalProjects()).toEqual([]);
    expect(hasLocalProjects()).toBe(false);
  });

  it("saves a project to localStorage", () => {
    const p = saveLocalProject("My Room", "paint_calc", { length: 5 });
    expect(p).toBeTruthy();
    expect(p?.name).toBe("My Room");
    expect(p?.type).toBe("paint_calc");
    expect(p?.id).toContain("local_");
    expect(hasLocalProjects()).toBe(true);
  });

  it("retrieves saved projects", () => {
    saveLocalProject("Project A", "paint_calc", {});
    saveLocalProject("Project B", "tile_calc", {});
    expect(getLocalProjects().length).toBe(2);
  });

  it("filters projects by type", () => {
    saveLocalProject("Paint", "paint_calc", {});
    saveLocalProject("Tile", "tile_calc", {});
    saveLocalProject("Paint 2", "paint_calc", {});
    expect(getLocalProjectsByType("paint_calc").length).toBe(2);
    expect(getLocalProjectsByType("tile_calc").length).toBe(1);
  });

  it("deletes a project by id", () => {
    const p = saveLocalProject("To Delete", "paint_calc", {});
    deleteLocalProject(p!.id);
    expect(getLocalProjects().length).toBe(0);
  });

  it("clears all projects", () => {
    saveLocalProject("A", "paint_calc", {});
    saveLocalProject("B", "tile_calc", {});
    clearLocalProjects();
    expect(getLocalProjects()).toEqual([]);
    expect(hasLocalProjects()).toBe(false);
  });

  it("enforces max 20 projects", () => {
    for (let i = 0; i < 25; i++) {
      saveLocalProject(`Project ${i}`, "paint_calc", {});
    }
    expect(getLocalProjects().length).toBe(20);
  });

  it("most recent project is first (LIFO)", () => {
    saveLocalProject("First", "paint_calc", {});
    saveLocalProject("Second", "paint_calc", {});
    const projects = getLocalProjects();
    expect(projects[0].name).toBe("Second");
    expect(projects[1].name).toBe("First");
  });
});
