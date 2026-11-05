import { describe, it, expect } from "vitest";
import {
  CONSTRUCTION_TOOLS,
  TOOL_CATEGORIES,
  type ToolCategoryId,
} from "@/config/construction-tools";

describe("tool catalogue categories", () => {
  const categoryIds = TOOL_CATEGORIES.map((c) => c.id);

  it("publishes an Interior Decors category", () => {
    const interiors = TOOL_CATEGORIES.find((c) => c.id === "interiors");
    expect(interiors?.label).toBe("Interior Decors");
    expect(interiors?.blurb.length).toBeGreaterThan(20);
  });

  it("files the TV console calculator under Interior Decors", () => {
    const consoleTool = CONSTRUCTION_TOOLS.find((t) => t.slug === "tv-console-calculator");
    expect(consoleTool?.category).toBe("interiors");
    expect(consoleTool?.to).toBe("/tv-console-calculator");
  });

  it("files the window blind calculator under Interior Decors", () => {
    const blinds = CONSTRUCTION_TOOLS.find((t) => t.slug === "window-blinds");
    expect(blinds).toBeDefined();
    expect(blinds?.category).toBe("interiors");
  });

  it("only uses categories that exist", () => {
    const unknown = CONSTRUCTION_TOOLS.filter(
      (tool) => !categoryIds.includes(tool.category),
    ).map((tool) => `${tool.slug} -> ${tool.category}`);
    expect(unknown).toEqual([]);
  });

  it("gives every category at least one tool", () => {
    const empty = TOOL_CATEGORIES.filter(
      (cat) => !CONSTRUCTION_TOOLS.some((tool) => tool.category === cat.id),
    ).map((cat: { id: ToolCategoryId }) => cat.id);
    expect(empty).toEqual([]);
  });

  it("keeps tool slugs unique so routing cannot collide", () => {
    const slugs = CONSTRUCTION_TOOLS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
