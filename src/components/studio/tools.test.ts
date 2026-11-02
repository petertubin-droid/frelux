import { describe, it, expect } from "vitest";
import { TOOLS, TOOL_CATEGORIES, getTool, getToolType } from "./tools";

describe("studio/tools", () => {
  it("TOOLS array has entries", () => {
    expect(TOOLS.length).toBeGreaterThan(0);
  });

  it("each tool has required fields", () => {
    for (const tool of TOOLS) {
      expect(tool.slug).toBeTruthy();
      expect(tool.label).toBeTruthy();
      expect(tool.category).toBeTruthy();
    }
  });

  it("TOOL_CATEGORIES lists categories", () => {
    expect(TOOL_CATEGORIES.length).toBeGreaterThan(0);
    expect(TOOL_CATEGORIES).toContain("AI Generation");
  });

  it("getTool returns tool by slug", () => {
    const chat = getTool("chat");
    expect(chat).toBeTruthy();
    expect(chat?.slug).toBe("chat");
  });

  it("getTool returns undefined for unknown slug", () => {
    expect(getTool("nonexistent")).toBeUndefined();
  });

  it("getToolType returns slug as StudioToolType", () => {
    expect(getToolType("chat")).toBe("chat");
  });
});
