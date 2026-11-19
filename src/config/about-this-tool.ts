/** Shared, conservative methodology content for catalogued FRELUX tools. */
import { CONSTRUCTION_TOOLS, findToolByRoute } from "@/config/construction-tools";
import { FAQ_ARTICLES } from "@/config/faq-articles";
import { getToolFaqGroupByRoute } from "@/config/tool-faqs";

export interface AboutThisToolConfig {
  slug: string;
  route: string;
  name: string;
  scope: string;
  inputs: string;
  result: string;
  /** Only populate after verifying against the calculator's actual implementation. */
  verifiedFormula?: string;
  verifiedAssumptions?: string[];
  verifiedStandards?: { code: string; name: string; geography: string; use: string }[];
}

/** Route coverage is derived from the existing catalog; it does not add tools. */
export const ABOUT_TOOL_ROUTES = CONSTRUCTION_TOOLS.map((tool) => tool.to);

export function getAboutToolConfig(route: string): AboutThisToolConfig | undefined {
  const tool = findToolByRoute(route);
  if (!tool) return undefined;
  const article = (FAQ_ARTICLES as Record<string, { description?: string; summary?: string }>)[tool.slug];
  return {
    slug: tool.slug,
    route: tool.to,
    name: tool.heading || tool.title,
    scope: article?.description || article?.summary || tool.does,
    inputs: tool.enters,
    result: tool.gets,
  };
}

/** Existing FAQ copy for the same route, kept visible and schema-synchronized. */
export function getAboutToolFaqs(route: string) {
  const tool = findToolByRoute(route);
  const group = getToolFaqGroupByRoute(route) || (tool ? getToolFaqGroupByRoute(tool.to) : undefined);
  return group?.questions.map((item) => ({ question: item.q, answer: item.a })) ?? [];
}
