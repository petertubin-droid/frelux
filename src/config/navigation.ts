/**
 * How the menu is organised.
 *
 * The workspaces in `site.ts` are the site's real information architecture, but
 * a flat list of eight of them, each expanding into up to sixty tools, is not a
 * navigation: it is a dump. On a phone that meant scrolling past every trade
 * before reaching the one you wanted, and no signal about where anything lives.
 *
 * This module adds the missing layer: a small number of named groups, each with
 * one plain-language promise of what is inside. The desktop mega-menu and the
 * mobile drawer both read it, so the two can never disagree.
 *
 * Order matters. It follows what a visitor is doing, not internal teams:
 *   1. work out quantities and costs,
 *   2. see what materials, markets and people exist,
 *   3. run the job and learn the trade.
 */

export interface NavGroup {
  /** Stable key; never translated, used for React keys and tests. */
  key: string;
  /** English label; every render site passes it through t(). */
  label: string;
  /** One line describing what the group holds. Passed through t() too. */
  description: string;
}

export const navGroups: NavGroup[] = [
  {
    key: "estimate",
    label: "Estimate & build",
    description: "Quantities, costs and units for the work in front of you",
  },
  {
    key: "explore",
    label: "Explore & trade",
    description: "Material prices, markets, finishes and people to hire",
  },
  {
    key: "manage",
    label: "Manage & learn",
    description: "Your projects, guides and everything you have saved",
  },
];

/**
 * Which group each workspace belongs to, keyed by its English label (the same
 * value used as the translation key). A workspace missing here still renders,
 * appended to its own "More" group, so a new one can never vanish from the menu.
 */
const WORKSPACE_GROUP: Record<string, string> = {
  "Construction Tools": "estimate",
  "Convert & Explore": "estimate",
  "Market Intelligence": "explore",
  Services: "explore",
  "Colors & Design": "explore",
  Projects: "manage",
  Learn: "manage",
};

export function groupKeyForWorkspace(label: string): string | null {
  return WORKSPACE_GROUP[label] ?? null;
}

/** Groups in display order, each with the workspaces that belong to it. */
export function groupWorkspaces<T extends { label: string }>(
  workspaces: T[],
): { group: NavGroup; workspaces: T[] }[] {
  const buckets = new Map<string, T[]>();
  const ungrouped: T[] = [];
  for (const workspace of workspaces) {
    const key = groupKeyForWorkspace(workspace.label);
    if (!key) {
      ungrouped.push(workspace);
      continue;
    }
    const bucket = buckets.get(key) ?? [];
    bucket.push(workspace);
    buckets.set(key, bucket);
  }

  const result = navGroups
    .map((group) => ({ group, workspaces: buckets.get(group.key) ?? [] }))
    .filter((entry) => entry.workspaces.length > 0);

  if (ungrouped.length > 0) {
    result.push({
      group: {
        key: "more",
        label: "More",
        description: "Everything else on FRELUX",
      },
      workspaces: ungrouped,
    });
  }
  return result;
}
