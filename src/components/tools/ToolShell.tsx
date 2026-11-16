/**
 * The frame every catalogued calculator is served inside.
 *
 * A tool page supplies only its form and its results. The shell takes the rest
 * from the catalogue and the FAQ registry: the title, the description used for
 * search, the heading, the question set that belongs to this address, the
 * neighbouring calculators and the estimate disclaimer.
 *
 * The point is not brevity. Before this, 73 of the 79 catalogued pages carried
 * their own useSeo and PageHeader, 52 carried their own ToolFaqs call and 49
 * their own RelatedTools list, which let a page drift from its catalogue entry.
 * One shipped the window blind questions on the concrete slab takeoff page. A
 * page that renders this shell cannot be wired to another tool's questions,
 * because it is never asked for them.
 */

import { useMemo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";
import ToolFaqs from "@/components/seo/ToolFaqs";
import { RelatedTools, type RelatedLink } from "@/components/seo/SeoSections";
import PageHeader from "@/components/ui/PageHeader";
import {
  CONSTRUCTION_TOOLS,
  TOOL_CATEGORIES,
  findToolByRoute,
  type Tool,
} from "@/config/construction-tools";
import { getToolFaqGroupByRoute } from "@/config/tool-faqs";
import { stripLocaleFromPathname } from "@/lib/i18n";
import { useSeo } from "@/lib/seo";

const RELATED_LIMIT = 3;

/**
 * Neighbouring tools for the summary block. Same category first, because those
 * are the calculators a reader of this page is most likely to need next, then
 * the rest of the catalogue to fill the row. The tool's own address is never
 * offered back to it.
 */
export function relatedToolsFor(tool: Tool, limit = RELATED_LIMIT): RelatedLink[] {
  const others = CONSTRUCTION_TOOLS.filter((t) => t.to !== tool.to);
  const sameCategory = others.filter((t) => t.category === tool.category);
  const rest = others.filter((t) => t.category !== tool.category);
  return [...sameCategory, ...rest].slice(0, limit).map((t) => ({
    label: t.title,
    path: t.to,
  }));
}

export interface ToolShellProps {
  /** The page's form and its results. Everything else comes from the catalogue. */
  children: ReactNode;
  /**
   * Catalogue route. A migrated page states its own address, so the shell
   * presents the same tool wherever the page is rendered, including in a test
   * that mounts it without a router entry. The address is checked against the
   * catalogue and against the route App.tsx serves the page at, so stating it
   * cannot drift. Omitting it falls back to the address being served.
   */
  route?: string;
  /** Overrides the catalogue description under the heading. */
  subtitle?: string;
  /** Buttons or links that belong beside the heading, such as share or reset. */
  actions?: ReactNode;
  /** Extra SEO markup the tool owns, such as HowTo structured data. */
  structuredData?: object;
  /** Suppress the question block where the copy is not yet written. */
  showFaq?: boolean;
  /** Suppress the neighbour row where the page ends in its own navigation. */
  showRelated?: boolean;
  /** Replace the derived neighbour list. */
  relatedLinks?: RelatedLink[];
  /** Wording for the disclaimer, where the tool's own assumptions differ. */
  disclaimerText?: string;
  /** Hide the estimate disclaimer, for tools that quote nothing. */
  hideDisclaimer?: boolean;
}

export default function ToolShell({
  children,
  route,
  subtitle,
  actions,
  structuredData,
  showFaq = true,
  showRelated = true,
  relatedLinks,
  disclaimerText,
  hideDisclaimer = false,
}: ToolShellProps) {
  const { pathname } = useLocation();
  const address = route ?? stripLocaleFromPathname(pathname);
  const tool = findToolByRoute(address);
  const faqGroup = showFaq ? getToolFaqGroupByRoute(address) : undefined;
  const links = useMemo(
    () => relatedLinks ?? (tool ? relatedToolsFor(tool) : []),
    [relatedLinks, tool],
  );

  useSeo(
    tool
      ? {
          title: tool.seoTitle ?? tool.title,
          description: tool.seoDescription ?? tool.does,
          canonicalPath: tool.to,
          structuredData,
        }
      : null,
  );

  const categoryLabel = tool
    ? TOOL_CATEGORIES.find((c) => c.id === tool.category)?.label
    : undefined;

  return (
    <>
      {tool ? (
        <PageHeader
          variant="tool"
          eyebrow={categoryLabel}
          title={tool.title}
          subtitle={subtitle ?? tool.does}
          actions={actions}
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: tool.title },
          ]}
        />
      ) : null}

      {children}

      {faqGroup ? (
        <div className="mt-10">
          <ToolFaqs slug={faqGroup.slug} />
        </div>
      ) : null}

      {showRelated && links.length > 0 ? <RelatedTools links={links} /> : null}

      {hideDisclaimer ? null : <EstimateDisclaimer text={disclaimerText} />}
    </>
  );
}
