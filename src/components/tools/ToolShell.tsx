/**
 * The frame every catalogued calculator is served inside.
 *
 * A tool page supplies only its form and its results. The shell takes the rest
 * from the catalogue and the FAQ registry: the page heading, the line under it,
 * the label above it, the title and description used for search, the question
 * set that belongs to this address, the neighbouring calculators, the estimate
 * disclaimer and the breadcrumb trail in both its visible and marked-up form.
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

import { useSeoOfferCurrency } from "@/lib/international/market-context";
import { SITE_URL } from "@/lib/site-config";

import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";
import ToolFaqs from "@/components/seo/ToolFaqs";
import { RelatedTools } from "@/components/seo/SeoSections";
import type { RelatedLink } from "@/components/seo/SeoSections";
import PageHeader from "@/components/ui/PageHeader";
import { TOOL_CATEGORIES, findToolByRoute } from "@/config/construction-tools";
import { getToolFaqGroupByRoute } from "@/config/tool-faqs";
import { relatedToolsFor } from "@/lib/tools/related-tools";
import { stripLocaleFromPathname, useLanguage } from "@/lib/i18n";
import { useBreadcrumbJsonLd, useSeo } from "@/lib/seo";

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
  /** Overrides the catalogue title, for a page whose heading has to differ. */
  title?: string;
  /** Buttons or links that belong beside the heading, such as share or reset. */
  actions?: ReactNode;
  /** Extra SEO markup the tool owns, such as HowTo structured data. */
  structuredData?: object;
  /** Further blocks, such as the steps of a documented procedure. */
  structuredDataArray?: object[];
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
  /** Override the category label shown above the heading. */
  eyebrow?: string;
}

export default function ToolShell({
  children,
  route,
  title,
  subtitle,
  eyebrow,
  actions,
  structuredData,
  structuredDataArray,
  showFaq = true,
  showRelated = true,
  relatedLinks,
  disclaimerText,
  hideDisclaimer = false,
}: ToolShellProps) {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const offerCurrency = useSeoOfferCurrency();
  const address = route ?? stripLocaleFromPathname(pathname);
  const tool = findToolByRoute(address);
  const faqGroup = showFaq ? getToolFaqGroupByRoute(address) : undefined;
  const links = useMemo(
    () => relatedLinks ?? (tool ? relatedToolsFor(tool) : []),
    [relatedLinks, tool],
  );

  // Every catalogued tool is the same kind of thing: a free web calculator that
  // answers a named question. Declaring it once here means a newly catalogued
  // tool carries the markup without anyone remembering to write it, and no page
  // can describe itself as something else. A page that needs a different or
  // additional type still passes its own.
  const toolMarkup = useMemo(
    () =>
      tool
        ? {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: `FRELUX ${tool.heading ?? tool.title}`,
            description: tool.seoDescription ?? tool.does,
            url: `${SITE_URL}${tool.to}`,
            applicationCategory: "CalculatorApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: offerCurrency,
            },
          }
        : undefined,
    [tool, offerCurrency],
  );

  useSeo(
    tool
      ? {
          title: tool.seoTitle ?? tool.title,
          description: tool.seoDescription ?? tool.does,
          canonicalPath: tool.to,
          structuredData: structuredData ?? toolMarkup,
          structuredDataArray,
        }
      : null,
  );

  const categoryLabel = tool
    ? TOOL_CATEGORIES.find((c) => c.id === tool.category)?.label
    : undefined;

  const heading = tool ? t(title ?? tool.heading ?? tool.title) : "";
  const categoryPath = tool ? `/tools/${tool.category}` : "";

  // One crumb trail, and the structured data describes that same trail. Pages
  // used to pass their own heading crumbs and a different JSON-LD trail, so the
  // markup could disagree with the page it described. The last crumb is the
  // page itself: shown as text, and given its own address only in the markup.
  // The category crumb is kept because it is the only route back up to the
  // neighbouring tools from a page this deep in the catalogue.
  const trail = tool
    ? [
        { label: t("Home"), path: "/" },
        { label: t("Construction Tools"), path: "/construction-tools" },
        { label: t(categoryLabel ?? ""), path: categoryPath },
        { label: heading },
      ]
    : [];
  const crumbs = trail.map(({ label, path }) =>
    path ? { label, path } : { label },
  );
  // The hook supplies Home itself, so the marked-up trail continues from there.
  useBreadcrumbJsonLd(
    trail.slice(1).map((c) => ({ name: c.label, path: c.path ?? tool!.to })),
  );

  return (
    <>
      {tool ? (
        <PageHeader
          variant="tool"
          eyebrow={t(eyebrow ?? tool.eyebrow ?? categoryLabel ?? "")}
          title={heading}
          subtitle={t(subtitle ?? tool.lede ?? tool.does)}
          actions={actions}
          breadcrumbs={crumbs}
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
