/**
 * Where a tool's own FAQ is advertised elsewhere on the site.
 *
 * The point of a spotlight is cross-referral: a reader finishing an article
 * about blockwork should be able to see the foundation calculator's answers
 * without leaving the page and hunting for the tool. Nothing here holds copy of
 * its own. Every question and answer comes from src/config/tool-faqs.ts, so an
 * advertised answer can never drift from the answer on the tool's page.
 *
 * A placement is an ordered rotation. The picker is a pure function of the
 * placement and a seed (the current page's slug, for example), so the same
 * article advertises the same tool on every render, while different articles
 * spread the referral across the catalogue instead of all pointing at one tool.
 *
 * Adding a surface means adding a placement here and mounting
 * <FaqSpotlight placement="..." /> on that page. Nothing else changes.
 */

import { getToolFaqGroup, type FaqCategoryId } from "@/config/tool-faqs";

export type FaqSpotlightPlacement =
  "learn-article" | "learn-library" | "quotes";

export interface FaqSpotlightAd {
  /** Registry slug in src/config/tool-faqs.ts */
  slug: string;
  /** Which of that group's questions to preview, in order. Two reads best. */
  questionIndexes: number[];
}

export interface FaqSpotlightPlacementConfig {
  id: FaqSpotlightPlacement;
  /** Human description of the surface, used by the integrity tests. */
  surface: string;
  ads: FaqSpotlightAd[];
}

export const FAQ_SPOTLIGHT_PLACEMENTS: FaqSpotlightPlacementConfig[] = [
  {
    id: "learn-article",
    surface: "/learn/:articleSlug and the wall finishing articles",
    ads: [
      { slug: "foundation-calculator", questionIndexes: [0, 3] },
      { slug: "retaining-wall-calculator", questionIndexes: [0, 4] },
      { slug: "steel-beam-calculator", questionIndexes: [1, 4] },
      { slug: "build-to-roof-estimator", questionIndexes: [1, 3] },
      { slug: "soffit-gutter-cost-estimator", questionIndexes: [0, 1] },
      { slug: "masonry-calculator", questionIndexes: [0, 2] },
      { slug: "reinforcement", questionIndexes: [0, 1] },
      { slug: "structural-calculator", questionIndexes: [0, 1] },
      { slug: "concrete-takeoff-calculator", questionIndexes: [0, 2] },
      { slug: "mathematical-plan-elevation", questionIndexes: [0, 4] },
      { slug: "earthworks-cut-fill", questionIndexes: [0, 1] },
      { slug: "roof-framing-calculator", questionIndexes: [0, 1] },
      { slug: "temporary-works-calculator", questionIndexes: [0, 1] },
      { slug: "foundation-designer", questionIndexes: [0, 1] },
    ],
  },
  {
    id: "learn-library",
    surface: "/learn and the article library index",
    ads: [
      { slug: "paint-calculator", questionIndexes: [0, 1] },
      { slug: "tile-calculator", questionIndexes: [0, 1] },
      { slug: "doors-windows", questionIndexes: [0, 1] },
      { slug: "quotes", questionIndexes: [0, 4] },
    ],
  },
  {
    id: "quotes",
    surface: "/quotes",
    ads: [
      { slug: "foundation-calculator", questionIndexes: [0, 1] },
      { slug: "build-to-roof-estimator", questionIndexes: [0, 2] },
      { slug: "retaining-wall-calculator", questionIndexes: [0, 1] },
    ],
  },
];

export function getSpotlightPlacement(
  placement: FaqSpotlightPlacement,
): FaqSpotlightPlacementConfig | undefined {
  return FAQ_SPOTLIGHT_PLACEMENTS.find((entry) => entry.id === placement);
}

/** Stable, order-independent hash so a seed always rotates the same way. */
function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100_000_007;
  }
  return hash;
}

/**
 * The ads a given page should show, rotated by its seed. Deterministic, so a
 * page never reshuffles its own referral between renders or between server and
 * client render.
 */
export function pickSpotlights(
  placement: FaqSpotlightPlacement,
  seed = "",
  count = 1,
): FaqSpotlightAd[] {
  const config = getSpotlightPlacement(placement);
  if (!config || config.ads.length === 0 || count <= 0) return [];
  const offset = config.ads.length > 0 ? hashSeed(seed) % config.ads.length : 0;
  const rotated = [...config.ads.slice(offset), ...config.ads.slice(0, offset)];
  return rotated.slice(0, Math.min(count, rotated.length));
}

export interface SpotlightQuestion {
  question: string;
  answer: string;
}

export interface ResolvedSpotlight {
  slug: string;
  name: string;
  route: string;
  category: FaqCategoryId;
  questions: SpotlightQuestion[];
  /** Total questions the tool publishes, for the "all N answers" link text. */
  totalQuestions: number;
}

/**
 * Resolve an ad against the registry. An unknown slug or an out of range index
 * yields nothing rather than a half filled card, so a broken entry shows up as a
 * missing spotlight in tests instead of an empty panel in production.
 */
export function resolveSpotlight(ad: FaqSpotlightAd): ResolvedSpotlight | null {
  const group = getToolFaqGroup(ad.slug);
  if (!group) return null;
  const questions = ad.questionIndexes
    .map((index) => group.questions[index])
    .filter((entry): entry is { q: string; a: string } => Boolean(entry))
    .map((entry) => ({ question: entry.q, answer: entry.a }));
  if (questions.length === 0) return null;
  return {
    slug: group.slug,
    name: group.name,
    route: group.route,
    category: group.category,
    questions,
    totalQuestions: group.questions.length,
  };
}
