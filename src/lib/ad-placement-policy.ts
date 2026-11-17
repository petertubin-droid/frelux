import { isToolRoute } from "@/config/tool-index";

/**
 * Where a page-level advertisement belongs, and where it does not.
 *
 * Tool pages carry their own placements inside the calculator shell, so the
 * layout must not add a second one above them. The paths below are excluded for
 * reasons that are about the page's purpose rather than its traffic:
 *
 *   - Admin and studio consoles are authenticated work surfaces, and ads there
 *     would sit inside someone's tool while they are doing a job.
 *   - Account, project, quote, client and share paths show a person's own
 *     documents, and a shared estimate is read by a client rather than by a
 *     visitor browsing the site.
 *   - Auth and onboarding paths are a single task the person is mid-way through.
 *   - Embed paths are rendered inside someone else's page, where an advert would
 *     be counted against the host rather than against FRELUX.
 *
 * Everything else is public content and takes one placement from the layout.
 */
const EXEMPT_PREFIXES = [
  "/admin",
  "/studio",
  "/dashboard",
  "/account",
  "/profile",
  "/settings",
  "/messages",
  "/projects",
  "/project",
  "/quote",
  "/client",
  "/share",
  "/login",
  "/signup",
  "/register",
  "/onboarding",
  "/invite",
  "/credits",
  "/rewards",
  "/achievements",
  "/feedback",
  "/embed",
  "/api",
] as const;

/** True when a path shows a person's own work, a console or an embedded view. */
export function isAdExemptPath(pathname: string): boolean {
  const path = pathname.toLowerCase();
  return EXEMPT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * True when the public layout should place a content advertisement for this
 * path. Tool pages are excluded because they already carry their own.
 */
export function shouldShowLayoutAd(pathname: string): boolean {
  if (isToolRoute(pathname)) return false;
  return !isAdExemptPath(pathname);
}
