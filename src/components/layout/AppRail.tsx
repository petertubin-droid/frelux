import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Home,
  LogIn,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Ruler,
  Search,
  Settings2,
  Shield,
  Store,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import { navWorkspaces, siteConfig, type NavWorkspace } from "@/config/site";
import { groupWorkspaces, navGroups } from "@/config/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { classNames } from "@/lib/utils";

/**
 * The persistent desktop rail.
 *
 * Modelled on the arrangement Netlify uses in its own product: one vertical
 * rail holds every destination, the account and the utilities, and the page
 * content lives to its right. The rail is the shared shell for both surfaces
 * (public site and the signed-in app), so the primary navigation can never
 * drift between them.
 *
 * Behaviour, in order of importance:
 *   - Expanded by default with icons plus labels. The choice is remembered in
 *     localStorage, and `data-rail` is written on <html> before paint so the
 *     content offset never jumps on the second visit.
 *   - Collapsible to icons with the pin at the foot of the rail. Collapsed
 *     items keep an accessible name and show a label on hover and focus, so
 *     nothing becomes a mystery icon.
 *   - Workspaces with children open a flyout panel with their grouped
 *     sections. Opening is by click, Enter/Space, or hover; Escape closes and
 *     returns focus to the trigger.
 *   - Desktop only. Below `lg` the existing drawer and bottom nav still own
 *     navigation, so mobile behaviour is untouched.
 */

const STORAGE_KEY = "frelux.rail.collapsed";

const WORKSPACE_ICONS: Record<string, typeof Home> = {
  Home: Home,
  "Convert & Explore": Ruler,
  "Construction Tools": Calculator,
  "Market Intelligence": TrendingUp,
  "Colors & Design": Palette,
  Services: Store,
  Projects: FolderKanban,
  Learn: BookOpen,
};

/** Read the stored preference and apply it before the first paint. */
function applyStoredRailState() {
  if (typeof document === "undefined") return;
  let collapsed = false;
  try {
    collapsed = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    collapsed = false;
  }
  document.documentElement.dataset.rail = collapsed ? "collapsed" : "expanded";
}

if (typeof window !== "undefined") {
  applyStoredRailState();
}

export interface AppRailProps {
  /**
   * "public" is the marketing and calculator shell; "app" adds the signed-in
   * destinations. Both render the same workspaces so the two shells agree.
   */
  variant?: "public" | "app";
  className?: string;
}

export default function AppRail({
  variant = "public",
  className,
}: AppRailProps) {
  const { t } = useLanguage();
  const location = useLocation();
  const { user, profile } = useAuth();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  /**
   * The open flyout, with the geometry it was opened at.
   *
   * It is rendered through a portal rather than inside the rail: the rail's
   * nav scrolls (overflow-y: auto) and the rail itself uses backdrop-filter,
   * so an absolutely positioned panel would be clipped by the scroll box and a
   * plain `fixed` child would resolve against the rail, not the viewport.
   * Measuring the trigger and portalling to <body> keeps the panel whole on
   * every screen size and lets the click-away layer cover the whole viewport.
   */
  const [openFlyout, setOpenFlyout] = useState<{
    label: string;
    top: number;
    left: number;
    maxWidth: number;
  } | null>(null);
  const flyoutTriggerRef = useRef<HTMLButtonElement | null>(null);
  const flyoutPanelRef = useRef<HTMLDivElement | null>(null);
  const moveFocusIntoPanel = useRef(false);

  const openFlyoutFor = (label: string, trigger: HTMLElement) => {
    const rect = trigger.getBoundingClientRect();
    const gutter = 12;
    const maxWidth = Math.max(
      280,
      Math.min(480, window.innerWidth - rect.right - gutter * 2),
    );
    // Keep the panel inside the viewport even for the last workspace in the
    // list, and never let it start above the top edge.
    const panelMaxHeight = Math.min(window.innerHeight * 0.7, 544);
    const top = Math.max(
      gutter,
      Math.min(rect.top, window.innerHeight - panelMaxHeight - gutter),
    );
    setOpenFlyout({ label, top, left: rect.right + 8, maxWidth });
  };

  useLayoutEffect(() => {
    document.documentElement.dataset.rail = collapsed
      ? "collapsed"
      : "expanded";
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Private mode with storage disabled: the rail still works, it just
      // forgets the preference on the next visit.
    }
  }, [collapsed]);

  // Escape closes the flyout and hands focus back to its trigger.
  useEffect(() => {
    if (!openFlyout) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenFlyout(null);
      flyoutTriggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openFlyout]);

  // A route change means the visitor made a choice; close whatever is open.
  useEffect(() => {
    setOpenFlyout(null);
  }, [location.pathname]);

  // A click or Enter means the visitor wants the panel, so the first
  // destination takes focus. Hover-open leaves focus where it was: stealing it
  // on a mouse pass would fight the pointer.
  useEffect(() => {
    if (!openFlyout || !moveFocusIntoPanel.current) return;
    moveFocusIntoPanel.current = false;
    flyoutPanelRef.current
      ?.querySelector<HTMLAnchorElement>("a[href]")
      ?.focus();
  }, [openFlyout]);

  // Scrolling or resizing moves the trigger, so the measured panel would be
  // stranded. Closing is cheaper than tracking every frame and reads as
  // intentional rather than jittery.
  //
  // The listener is in the capture phase, which also sees scrolls that happen
  // inside the panel. A list long enough to scroll closed itself on the first
  // wheel notch, so the panel's own scrolling is filtered out and only the page
  // around it closes the flyout.
  useEffect(() => {
    if (!openFlyout) return;
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && flyoutPanelRef.current?.contains(target)) {
        return;
      }
      setOpenFlyout(null);
    };
    const onResize = () => setOpenFlyout(null);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [openFlyout]);

  // A press outside the panel and its trigger closes it. This replaces a
  // full-viewport click-away layer: that layer covered the rail too, so moving
  // between workspaces hit the layer instead of the next trigger and the panel
  // appeared stuck on whichever one was opened first.
  useEffect(() => {
    if (!openFlyout) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (flyoutPanelRef.current?.contains(target)) return;
      if (flyoutTriggerRef.current?.contains(target)) return;
      setOpenFlyout(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openFlyout]);

  const isActive = (workspace: NavWorkspace) =>
    workspace.path === "/"
      ? location.pathname === "/"
      : location.pathname === workspace.path ||
        location.pathname.startsWith(`${workspace.path}/`);

  const grouped = groupWorkspaces(navWorkspaces);
  const isAdmin = profile?.role === "admin";

  const handleSearch = () => {
    // The command palette is mounted globally and listens for the shortcut;
    // reusing it means the rail cannot fall out of step with the palette.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true }),
    );
  };

  return (
    <>
      <aside
        aria-label={t("Primary navigation")}
        data-collapsed={collapsed ? "true" : "false"}
        className={classNames(
          "fixed left-0 top-0 z-40 hidden h-[100svh] flex-col border-r border-border/60 bg-card/80 backdrop-blur-xl lg:flex dark:border-white/10 dark:bg-background/70",
          "transition-[width] duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none",
          collapsed ? "w-[4.5rem]" : "w-[15.5rem]",
          className,
        )}
      >
        {/* Brand */}
        <Link
          to="/"
          aria-label={`${siteConfig.shortName} home`}
          className="flex h-16 shrink-0 items-center gap-3 px-4 text-foreground"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-deep text-[13px] font-bold text-primary-foreground">
            F
          </span>
          <span
            className={classNames(
              "min-w-0 overflow-hidden whitespace-nowrap text-sm font-bold tracking-tight transition-opacity duration-200",
              collapsed ? "pointer-events-none opacity-0" : "opacity-100",
            )}
          >
            FRELUX
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Smart Calc
            </span>
          </span>
        </Link>

        {/* Destinations, grouped the same way the drawer groups them. */}
        <nav
          aria-label={t("Site sections")}
          className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2 pt-1"
        >
          {grouped.map(({ group, workspaces }) => (
            <div key={group.key} className="mb-1">
              <p
                className={classNames(
                  "px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-opacity duration-200",
                  collapsed ? "opacity-0" : "opacity-100",
                )}
                aria-hidden={collapsed}
              >
                {collapsed ? "" : t(group.label)}
              </p>

              <ul className="space-y-0.5">
                {workspaces.map((workspace) => {
                  const Icon = WORKSPACE_ICONS[workspace.label] ?? Home;
                  const active = isActive(workspace);
                  const hasChildren =
                    Array.isArray(workspace.children) &&
                    workspace.children.length > 0;
                  const flyoutOpen = openFlyout?.label === workspace.label;

                  const itemClass = classNames(
                    "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-lighter"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5",
                  );

                  return (
                    <li key={workspace.label} className="relative">
                      {hasChildren ? (
                        <button
                          type="button"
                          ref={flyoutOpen ? flyoutTriggerRef : undefined}
                          onClick={(event) => {
                            if (flyoutOpen) {
                              setOpenFlyout(null);
                              return;
                            }
                            moveFocusIntoPanel.current = true;
                            openFlyoutFor(workspace.label, event.currentTarget);
                          }}
                          onMouseEnter={(event) => {
                            if (collapsed || flyoutOpen) return;
                            openFlyoutFor(workspace.label, event.currentTarget);
                          }}
                          // No onFocus auto-open: closing with Escape returns
                          // focus to this trigger, and an onFocus handler would
                          // immediately reopen the panel the visitor just
                          // dismissed. Enter/Space and hover open it instead.
                          aria-expanded={flyoutOpen}
                          aria-controls={`rail-flyout-${workspace.path.replace(/\W+/g, "-")}`}
                          aria-label={t(workspace.label)}
                          className={itemClass}
                        >
                          <Icon
                            className="h-[18px] w-[18px] shrink-0"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                          <span
                            className={classNames(
                              "truncate transition-opacity duration-200",
                              collapsed
                                ? "pointer-events-none opacity-0"
                                : "opacity-100",
                            )}
                          >
                            {t(workspace.label)}
                          </span>
                          <ChevronDown
                            className={classNames(
                              "ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                              collapsed && "hidden",
                              flyoutOpen && "rotate-180",
                            )}
                            aria-hidden="true"
                          />
                          {collapsed && (
                            <RailLabel>{t(workspace.label)}</RailLabel>
                          )}
                        </button>
                      ) : (
                        <NavLink
                          to={workspace.path}
                          aria-current={active ? "page" : undefined}
                          aria-label={t(workspace.label)}
                          className={itemClass}
                        >
                          {({ isActive: linkActive }) => (
                            <>
                              <Icon
                                className="h-[18px] w-[18px] shrink-0"
                                strokeWidth={1.75}
                                aria-hidden="true"
                              />
                              <span
                                className={classNames(
                                  "truncate transition-opacity duration-200",
                                  collapsed
                                    ? "pointer-events-none opacity-0"
                                    : "opacity-100",
                                )}
                              >
                                {t(workspace.label)}
                              </span>
                              {linkActive && !collapsed && (
                                <span
                                  className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                                  aria-hidden="true"
                                />
                              )}
                              {collapsed && (
                                <RailLabel>{t(workspace.label)}</RailLabel>
                              )}
                            </>
                          )}
                        </NavLink>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* App-only destinations, kept separate from the public groups. */}
          {variant === "app" && (
            <div className="mt-2 border-t border-border/60 pt-2 dark:border-white/10">
              <ul className="space-y-0.5">
                <li>
                  <NavLink
                    to="/dashboard"
                    aria-label={t("Dashboard")}
                    className={({ isActive: linkActive }) =>
                      classNames(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        linkActive
                          ? "bg-primary/10 text-primary dark:text-primary-lighter"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5",
                      )
                    }
                  >
                    <TrendingUp
                      className="h-[18px] w-[18px] shrink-0"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <RailText collapsed={collapsed}>{t("Dashboard")}</RailText>
                  </NavLink>
                </li>
                {isAdmin && (
                  <li>
                    <NavLink
                      to="/admin"
                      aria-label={t("Admin")}
                      className={({ isActive: linkActive }) =>
                        classNames(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                          linkActive
                            ? "bg-primary/10 text-primary dark:text-primary-lighter"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5",
                        )
                      }
                    >
                      <Shield
                        className="h-[18px] w-[18px] shrink-0"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <RailText collapsed={collapsed}>{t("Admin")}</RailText>
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          )}
        </nav>

        {/* Foot: search, settings, account, collapse. */}
        <div className="shrink-0 border-t border-border/60 p-2 dark:border-white/10">
          <ul className="space-y-0.5">
            <li>
              <button
                type="button"
                onClick={handleSearch}
                aria-label={t("Search")}
                className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5"
              >
                <Search
                  className="h-[18px] w-[18px] shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <RailText collapsed={collapsed}>{t("Search")}</RailText>
                {!collapsed && (
                  <kbd className="ml-auto rounded border border-border px-1 text-[10px] font-medium text-muted-foreground dark:border-white/10">
                    ⌘K
                  </kbd>
                )}
                {collapsed && <RailLabel>{t("Search")}</RailLabel>}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("frelux:open-menu"))
                }
                aria-label={t("Settings and display")}
                className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5"
              >
                <Settings2
                  className="h-[18px] w-[18px] shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <RailText collapsed={collapsed}>
                  {t("Settings and display")}
                </RailText>
                {collapsed && <RailLabel>{t("Settings")}</RailLabel>}
              </button>
            </li>
            <li>
              <Link
                to={user ? "/profile" : "/signin"}
                aria-label={t(user ? "Your account" : "Sign In")}
                className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5"
              >
                {user ? (
                  <UserCircle
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                ) : (
                  <LogIn
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                )}
                <RailText collapsed={collapsed}>
                  {user
                    ? profile?.full_name || t("Your account")
                    : t("Sign In")}
                </RailText>
                {collapsed && (
                  <RailLabel>
                    {user ? profile?.full_name || t("Account") : t("Sign In")}
                  </RailLabel>
                )}
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                aria-expanded={!collapsed}
                aria-label={
                  collapsed ? t("Expand navigation") : t("Collapse navigation")
                }
                className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5"
              >
                {collapsed ? (
                  <PanelLeftOpen
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                ) : (
                  <PanelLeftClose
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                )}
                <RailText collapsed={collapsed}>
                  {t("Collapse navigation")}
                </RailText>
                {collapsed && <RailLabel>{t("Expand")}</RailLabel>}
              </button>
            </li>
          </ul>
        </div>
      </aside>

      {/* Flyout panel. Portalled to <body> so the scrolling nav cannot clip it
          and the rail's backdrop-filter cannot trap it; geometry is measured
          when the trigger opens it. No click-away layer: outside presses are
          caught on the document so the rail itself stays live. */}
      {openFlyout &&
        createPortal(
          <div
            ref={flyoutPanelRef}
            id={`rail-flyout-${(navWorkspaces.find((entry) => entry.label === openFlyout.label)?.path ?? "").replace(/\W+/g, "-")}`}
            aria-label={t(openFlyout.label)}
            style={{
              top: openFlyout.top,
              left: openFlyout.left,
              width: openFlyout.maxWidth,
              minWidth: Math.min(320, openFlyout.maxWidth),
            }}
            className={classNames(
              "fixed z-50 flex max-h-[min(70vh,34rem)] flex-col overflow-hidden rounded-2xl border border-border/70 bg-popover shadow-[0_30px_80px_-32px_rgba(35,24,16,0.55),0_2px_8px_-4px_rgba(35,24,16,0.18)]",
              "animate-fade-in-up motion-reduce:animate-none dark:border-white/10",
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {t(openFlyout.label)}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  {sectionGroupsFor(openFlyout.label).reduce(
                    (total, section) => total + section.children.length,
                    0,
                  )}{" "}
                  {t("destinations")}
                </p>
              </div>
              <Link
                to={
                  navWorkspaces.find(
                    (entry) => entry.label === openFlyout.label,
                  )?.path ?? "/"
                }
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {t("Open")}
              </Link>
            </div>

            <div className="[scrollbar-gutter:stable] flex-1 overflow-y-auto overscroll-contain px-2 py-2 [scrollbar-width:thin]">
              {sectionGroupsFor(openFlyout.label).map((section) => (
                <div key={section.key} className="pb-1 last:pb-0">
                  <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {t(section.label)}
                  </p>
                  <ul className="space-y-0.5">
                    {section.children.map((child) => (
                      <li key={child.path}>
                        <Link
                          to={child.path}
                          className="group flex items-start gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/5"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium leading-snug text-foreground">
                              {t(child.label)}
                            </span>
                            {child.description && (
                              <span className="mt-0.5 block line-clamp-2 text-xs leading-snug text-muted-foreground">
                                {t(child.description)}
                              </span>
                            )}
                          </span>
                          <ChevronRight
                            aria-hidden="true"
                            className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                            strokeWidth={2}
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-border/60 px-4 py-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t("Esc closes")}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Label that fades out when the rail is collapsed. */
function RailText({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={classNames(
        "truncate transition-opacity duration-200",
        collapsed ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      {children}
    </span>
  );
}

/**
 * The readable label for a collapsed icon. Rendered only when collapsed, sits
 * beside the rail, and is announced to sighted keyboard users as well as shown
 * on hover.
 */
function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-border/60 bg-popover px-2.5 py-1.5 text-xs font-semibold text-popover-foreground shadow-lg group-hover:block group-focus-visible:block dark:border-white/10"
    >
      {children}
    </span>
  );
}

/**
 * Split a workspace's children into their named sections, in registry order.
 * The flyout is portalled outside the list, so it looks the workspace up by
 * label rather than closing over the map's variable.
 */
function sectionGroupsFor(label: string) {
  const workspace = navWorkspaces.find((entry) => entry.label === label);
  if (!workspace) return [];
  return sectionGroups(workspace);
}

/** Split a workspace's children into their named sections, in registry order. */
function sectionGroups(workspace: NavWorkspace) {
  const buckets = new Map<
    string,
    { key: string; label: string; children: NavChildLike[] }
  >();
  for (const child of workspace.children ?? []) {
    const label = child.section ?? workspace.label;
    const key = child.section ?? "__all";
    const bucket = buckets.get(key) ?? { key, label, children: [] };
    bucket.children.push(child);
    buckets.set(key, bucket);
  }
  return [...buckets.values()];
}

type NavChildLike = NonNullable<NavWorkspace["children"]>[number];

// Exported for the test that guards the rail's section ordering.
export { navGroups };
