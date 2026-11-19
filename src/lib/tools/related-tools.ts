/**
 * Neighbouring calculators for a tool page's summary block.
 *
 * Same category first, because those are the calculators a reader of this page
 * is most likely to need next, then the rest of the catalogue to fill the row.
 * The tool's own address is never offered back to it.
 */
import {
  CONSTRUCTION_TOOLS,
  toolOfferedInMarket,
  type Tool,
} from "@/config/construction-tools";
import type { RelatedLink } from "@/components/seo/SeoSections";

export const RELATED_LIMIT = 3;

export function relatedToolsFor(
  tool: Tool,
  limit = RELATED_LIMIT,
  marketCode?: string | null,
): RelatedLink[] {
  const others = CONSTRUCTION_TOOLS.filter(
    (t) => t.to !== tool.to && toolOfferedInMarket(t, marketCode),
  );
  const sameCategory = others.filter((t) => t.category === tool.category);
  const rest = others.filter((t) => t.category !== tool.category);
  return [...sameCategory, ...rest].slice(0, limit).map((t) => ({
    label: t.title,
    path: t.to,
  }));
}
