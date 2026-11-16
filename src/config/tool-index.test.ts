/**
 * The slim index has to say the same thing as the catalogue.
 *
 * The frame imports this file rather than the catalogue so the first request
 * does not carry every tool's body copy, entry prose and search description.
 * That trade is only safe while the two agree: a tool added to the catalogue
 * without regenerating this file would drop out of the tools menu or be read as
 * a marketing page by the layout. Regenerate with: npm run tools:index
 */
import { describe, expect, it } from "vitest";

import {
  CONSTRUCTION_TOOLS,
  TOOL_CATEGORIES,
} from "@/config/construction-tools";
import { NAV_TOOL_GROUPS, TOOL_ROUTES, isToolRoute } from "@/config/tool-index";

const addressOf = (tool: { to?: string; slug: string }) =>
  (tool.to ?? (tool.slug ? `/${tool.slug}` : "")).replace(/\/+$/, "") || "/";

describe("tool index", () => {
  it("lists exactly the catalogued addresses", () => {
    const catalogued = new Set(
      CONSTRUCTION_TOOLS.map(addressOf).filter(Boolean),
    );
    const missing = [...catalogued].filter((route) => !TOOL_ROUTES.has(route));
    const extra = [...TOOL_ROUTES].filter((route) => !catalogued.has(route));
    expect(
      missing,
      `catalogued but absent from TOOL_ROUTES: ${missing.join(", ")}`,
    ).toEqual([]);
    expect(
      extra,
      `in TOOL_ROUTES but not catalogued: ${extra.join(", ")}`,
    ).toEqual([]);
  });

  it("lists the tools the menu lists, with the menu's wording", () => {
    const fromCatalogue = TOOL_CATEGORIES.map((category) => ({
      id: category.id,
      label: category.label,
      tools: CONSTRUCTION_TOOLS.filter(
        (tool) => tool.category === category.id && tool.navVisible,
      )
        .map((tool) => ({
          to: addressOf(tool),
          label: tool.title,
          benefit: tool.benefit ?? "",
        }))
        .sort((a, b) => a.to.localeCompare(b.to)),
    })).filter((group) => group.tools.length > 0);

    const fromIndex = NAV_TOOL_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      tools: [...group.tools].sort((a, b) => a.to.localeCompare(b.to)),
    }));

    expect(
      fromIndex,
      "the tools menu in src/config/tool-index.ts has drifted from the catalogue. Run: npm run tools:index",
    ).toEqual(fromCatalogue);
  });

  it("answers for a tool whatever the trailing slash", () => {
    expect(isToolRoute("/concrete-takeoff-calculator")).toBe(true);
    expect(isToolRoute("/concrete-takeoff-calculator/")).toBe(true);
    expect(isToolRoute("/pricing")).toBe(false);
    expect(isToolRoute("/")).toBe(false);
  });
});
