/**
 * SEO metadata for the FAQ article pages.
 *
 * Every /faq/:slug page needs a title and description that say what the page
 * answers, without repeating the next page's wording. Titles are built from the
 * tool name so the phrase a person searches for leads, and descriptions come
 * from the article's own opening sentence, trimmed at a word boundary, so the
 * meta tag and the page cannot drift apart.
 */

import type { FaqArticle } from "@/config/faq-articles";
import type { FaqCategoryId } from "@/config/tool-faqs";

export interface FaqSeoTarget {
  slug: string;
  name: string;
  route: string;
  category: FaqCategoryId;
}

export interface FaqSeo {
  title: string;
  description: string;
  keywords: string;
}

/** Titles that must lead with a search phrase rather than the tool name alone. */
const TITLE_OVERRIDES: Record<string, string> = {
  "paint-calculator": "Paint calculator: how much paint and primer",
  screeding: "Screeding calculator: material per square metre",
  "pop-ceiling-calculator": "POP ceiling calculator: cost and materials",
  "tile-calculator": "Tile calculator: how many tiles and boxes",
  foundation: "Foundation concrete: footing and blockwork",
  reinforcement: "Rebar calculator: bar length and weight",
  "retaining-wall": "Retaining wall calculator: concrete and block",
  "soffit-gutter": "Gutter and soffit calculator: fascia and pipe",
  "conduit-wiring": "Conduit and wiring calculator: pipes and cable",
  "steel-beam": "Steel beam weight calculator: kilograms",
  "build-to-roof-estimator": "Build to roof: cost from foundation up",
  "engine:structural-calculator":
    "Concrete and rebar takeoff: volumes and bars",
};

const CATEGORY_PHRASES: Record<string, string> = {
  finishes: "finishing materials",
  structure: "structural materials",
  services: "building services",
  project: "labour, programme and cash flow",
  sitework: "groundwork and site clearance",
  commercial: "quoting, records and reference",
  components: "components and fixtures",
  ai: "measurement with extraction",
};

const MAX_TITLE = 62;
const MAX_DESCRIPTION = 158;

function trimTo(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  const body = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(
    /[.,;:]$/,
    "",
  );
  return `${body}`;
}

/** First sentence, which is where the article states what the page answers. */
function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
}

export function faqSeoFor(target: FaqSeoTarget, article: FaqArticle): FaqSeo {
  const override =
    TITLE_OVERRIDES[target.slug] ??
    TITLE_OVERRIDES[`engine:${target.slug}`] ??
    null;
  const title = trimTo(override ?? target.name, MAX_TITLE);

  const opening = firstSentence(article.description);
  const fallback = `${article.summary} ${opening}`;
  const description = trimTo(
    opening.length >= 90 ? opening : fallback,
    MAX_DESCRIPTION,
  );

  const subject = CATEGORY_PHRASES[target.category] ?? "construction materials";
  const keywords = [
    target.name.toLowerCase(),
    title.toLowerCase(),
    subject,
    "construction calculator",
    "quantity estimate",
    "metric and imperial",
    "Nigeria",
    "Ghana",
    "Kenya",
    "South Africa",
    "United Kingdom",
    "United States",
  ].join(", ");

  return { title, description, keywords };
}
