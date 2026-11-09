import { CONSTRUCTION_TOOLS } from "@/config/construction-tools";
import { PREMIUM_ENGINES } from "@/config/premium-engines";

/**
 * Where the market caveat belongs.
 *
 * The caveat exists to qualify a number: local standards, product sizes and
 * prices are unverified, so a structural result needs a local professional.
 * That sentence is meaningful on a page that produces an estimate and
 * meaningless on the homepage, the rewards screen or an article, where it
 * reads as a disclaimer pasted across the brand. It therefore follows the
 * pages that calculate rather than the pages that market.
 *
 * The calculator set is derived from the tool registry, which the tool pages,
 * the navbar and search all read, so a tool added there inherits the caveat
 * without a second list to maintain. Registry entries that exist to inform
 * rather than to calculate are excluded by route below.
 */

/** Registry routes that publish information instead of calculating a result. */
const INFORMATION_ONLY_ROUTES: ReadonlySet<string> = new Set([
  "/code-reference",
  "/construction-sequence",
  "/field-sync",
  "/material-advisor",
  "/material-price-index",
  "/material-prices",
  "/regional-cost-index",
]);

/**
 * Straight registry paths that are themselves calculators, plus the premium
 * engines, which live in their own registry and are not all listed as tools.
 */
export const CALCULATOR_ROUTES: ReadonlySet<string> = new Set([
  ...CONSTRUCTION_TOOLS.map((tool) => tool.to).filter(
    (route) => !INFORMATION_ONLY_ROUTES.has(route),
  ),
  ...PREMIUM_ENGINES.map((engine) => engine.route),
]);

/**
 * `/tools/<slug>` pages that calculate but are opened as a single segment
 * under the tools pillar rather than through a category.
 */
const STANDALONE_TOOL_ROUTES: ReadonlySet<string> = new Set([
  "/tools/visual-finishing-estimator",
]);

/**
 * Calculators that live on their own top-level path and are not in a registry.
 *
 * Added 2026-11-09: the wide-calculator view and the compact spacing both key
 * off `main[data-calculator-page]`, which is decided here. Twenty calculator
 * routes were unregistered, so `/painting-estimator`, `/tile-cost-estimator`,
 * `/boq-studio` and their neighbours never received the wide view they exist
 * for. The suffix rule below is deliberately a rule rather than a list, so a
 * new "<trade>-estimator" page is covered without a second edit.
 *
 * Trackers, studios, quote pages and catalogues are intentionally excluded:
 * they are not a single calculation with a result to read at width.
 */
const SELF_CALCULATING_ROUTES: ReadonlySet<string> = new Set([
  "/boq-studio",
  "/cost-estimator",
]);

const ESTIMATOR_PATH = /(?:^|\/)[a-z0-9-]*(?:estimator|cost-estimator)$/;

/**
 * True when the path renders a calculator or estimator page.
 *
 * `/tools` and `/tools/<category>` are catalogues, so only a third segment
 * identifies a tool page. The path is stripped of a query string, a hash and
 * a trailing slash before matching, because the router resolves all three to
 * the same page.
 */
export function isCalculatorPath(pathname: string): boolean {
  const path = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  if (path === "/") return false;
  if (CALCULATOR_ROUTES.has(path)) return true;
  if (STANDALONE_TOOL_ROUTES.has(path)) return true;

  if (SELF_CALCULATING_ROUTES.has(path)) return true;
  // "/painting-estimator", "/tile-cost-estimator", "/borehole-estimator": pages
  // that carry their own estimate rather than a catalogue of one.
  if (ESTIMATOR_PATH.test(path)) return true;

  const segments = path.split("/").filter(Boolean);
  if (segments[0] !== "tools" || segments.length < 3) return false;
  // A category landing page has two segments; a tool beneath it has three.
  return true;
}
