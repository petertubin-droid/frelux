/**
 * Writes src/config/tool-index.ts from the catalogue.
 *
 * The entry chunk needs two things about the catalogue before anything paints:
 * which addresses are calculators, and what the tools menu contains. Importing
 * the catalogue for those two answers shipped every tool's body copy, entry
 * prose and SEO description to every visitor. This file carries only what the
 * frame renders. Anything that needs a tool's full entry still imports the
 * catalogue. src/config/tool-index.test.ts fails if the two ever disagree.
 */
import { writeFileSync } from "node:fs";

import {
  CONSTRUCTION_TOOLS,
  TOOL_CATEGORIES,
} from "../src/config/construction-tools";

const addr = (to?: string, slug?: string) =>
  (to ?? (slug ? `/${slug}` : "")).replace(/\/+$/, "") || "/";

const routes = [...new Set(CONSTRUCTION_TOOLS.map((t) => addr(t.to, t.slug)))]
  .filter(Boolean)
  .sort();

const groups = TOOL_CATEGORIES.map((cat) => ({
  id: cat.id,
  label: cat.label,
  tools: CONSTRUCTION_TOOLS.filter(
    (t) => t.category === cat.id && t.navVisible,
  ).map((t) => ({
    to: addr(t.to, t.slug),
    label: t.title,
    benefit: t.benefit ?? "",
  })),
})).filter((g) => g.tools.length > 0);

const file = `/**
 * GENERATED FILE. Regenerate with: npm run tools:index
 *
 * The two answers the page frame needs from the tool catalogue before anything
 * paints: which addresses are calculators, and what the tools menu lists. The
 * catalogue itself carries body copy, entry prose and search descriptions that a
 * frame does not need, so importing it here cost every visitor those bytes on
 * the first request. Nothing in this file is written by hand; the test beside it
 * fails when it drifts from src/config/construction-tools.ts.
 */
export interface NavTool {
  to: string;
  label: string;
  benefit: string;
}

export interface NavToolGroup {
  id: string;
  label: string;
  tools: NavTool[];
}

export const TOOL_ROUTES: ReadonlySet<string> = new Set([
${routes.map((r) => `  ${JSON.stringify(r)},`).join("\n")}
]);

export const NAV_TOOL_GROUPS: readonly NavToolGroup[] = [
${groups
  .map(
    (g) => `  {
    id: ${JSON.stringify(g.id)},
    label: ${JSON.stringify(g.label)},
    tools: [
${g.tools
  .map(
    (t) => `      {
        to: ${JSON.stringify(t.to)},
        label: ${JSON.stringify(t.label)},
        benefit: ${JSON.stringify(t.benefit)},
      },`,
  )
  .join("\n")}
    ],
  },`,
  )
  .join("\n")}
];

/** Whether a pathname is a catalogued calculator, ignoring a trailing slash. */
export function isToolRoute(pathname: string): boolean {
  return TOOL_ROUTES.has(pathname.replace(/\\/+$/, "") || "/");
}
`;

writeFileSync("src/config/tool-index.ts", file);
console.log(
  `wrote ${routes.length} routes and ${groups.reduce((n, g) => n + g.tools.length, 0)} menu entries`,
);
