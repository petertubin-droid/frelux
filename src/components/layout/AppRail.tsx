import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  BookOpen,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Sun,
  X,
  Calculator,
  FolderKanban,
  Home,
  LogIn,
  Palette,
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
import { useTheme } from "@/lib/theme";
import { useMarket } from "@/lib/international";
import { classNames } from "@/lib/utils";

/**
 * The persistent desktop navigation.
 *
 * Two columns, the arrangement Netlify uses in its own dashboard and the reason
 * this replaced the old hover flyout: a narrow icon rail holds the workspaces,
 * and a labelled column beside it holds the current workspace's destinations
 * inline. Nothing floats over the page, so there is no panel to strand, clip or
 * close by accident while it is being scrolled.
 *
 * The column is the workspace you are in, not whatever the pointer last touched.
 * It stays put while you read and scroll, which is what makes the shell calm on
 * a second visit rather than something to re-discover each time.
 */

const STORAGE_KEY = "frelux.rail.collapsed";
const PINNED_STORAGE_KEY = "frelux.rail.pinned";

function loadPinned(): string[] {
  try {
    const raw = window.localStorage.getItem(PINNED_STORAGE_KEY);
    const value = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function getCountryFlag(countryCode?: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  return String.fromCodePoint(...countryCode.toUpperCase().split("").map((char) => 127397 + char.charCodeAt(0)));
}

function loadRecentPaths(): string[] {
  try {
    const raw = window.localStorage.getItem("frelux_recent_tools");
    const value = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(value)) return [];
    return value.map((item) => typeof item === "string" ? item : item?.path)
      .filter((path): path is string => typeof path === "string").slice(0, 6);
  } catch {
    return [];
  }
}

/** Hover/focus label for the icon rail while the labels are hidden. */
function RailTip({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-border/60 bg-popover px-2.5 py-1.5 text-xs font-semibold text-popover-foreground shadow-lg group-hover:block group-focus-visible:block dark:border-white/10"
    >
      {children}
    </span>
  );
}

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
  let collapsed = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    collapsed = stored === null ? true : stored === "1";
  } catch {
    // Storage disabled: the quiet default still applies.
  }
  document.documentElement.dataset.rail = collapsed ? "collapsed" : "expanded";
}

applyStoredRailState();

/** Split a workspace's children into their named sections, in registry order. */
function sectionGroups(workspace: NavWorkspace | null) {
  const buckets = new Map<
    string,
    { key: string; label: string; children: NavChildLike[] }
  >();
  for (const child of workspace?.children ?? []) {
    const label = child.section ?? workspace!.label;
    const key = child.section ?? "__all";
    const bucket = buckets.get(key) ?? { key, label, children: [] };
    bucket.children.push(child);
    buckets.set(key, bucket);
  }
  return [...buckets.values()];
}

type NavChildLike = NonNullable<NavWorkspace["children"]>[number];

export default function AppRail({
  variant = "public",
  className,
}: {
  variant?: "public" | "app";
  className?: string;
}) {
  const { t } = useLanguage();
  const location = useLocation();
  const { user, profile, paidStatus, isPaid } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { market, marketCode } = useMarket();
  const [filterQuery, setFilterQuery] = useState("");
  const [pinnedPaths, setPinnedPaths] = useState<string[]>(loadPinned);
  const [recentPaths, setRecentPaths] = useState<string[]>(loadRecentPaths);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setRecentPaths(loadRecentPaths());
  }, [location.pathname]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const active = document.activeElement;
      const typing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || (active instanceof HTMLElement && active.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b" && !typing) {
        event.preventDefault();
        setCollapsed((value) => !value);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.rail = collapsed
      ? "collapsed"
      : "expanded";
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Private mode: the rail works, it just forgets between visits.
    }
  }, [collapsed]);

  const pathMatches = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  // A workspace is current when you are on it or anywhere inside it, so the
  // icon for the section you are reading is lit while you read one of its tools.
  const isActive = (workspace: NavWorkspace) =>
    pathMatches(workspace.path) ||
    (workspace.children?.some((child) => pathMatches(child.path)) ?? false);

  const grouped = groupWorkspaces(navWorkspaces);
  // The column follows the page. A tool path belongs to the workspace that
  // lists it, so opening a calculator from a deep link still lights up the
  // right rail icon and shows its siblings.
  const activeWorkspace =
    navWorkspaces.find((workspace) =>
      workspace.children?.some((child) => pathMatches(child.path)),
    ) ??
    navWorkspaces.find((workspace) => isActive(workspace)) ??
    navWorkspaces[0];
  const activeSections = sectionGroups(activeWorkspace);
  const filteredSections = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return activeSections;
    return activeSections.map((section) => ({
      ...section,
      children: section.children.filter((child) =>
        `${child.label} ${child.path} ${section.label}`.toLowerCase().includes(query),
      ),
    })).filter((section) => section.children.length > 0);
  }, [activeSections, filterQuery]);

  const pinnedItems = useMemo(
    () => activeWorkspace.children?.filter((child) => pinnedPaths.includes(child.path)) ?? [],
    [activeWorkspace, pinnedPaths],
  );
  const recentItems = useMemo(() => {
    const children = activeWorkspace.children ?? [];
    return recentPaths.flatMap((path) => {
      const match = children.find((child) => child.path === path || child.path.endsWith(`/${path}`));
      return match ? [match] : [];
    }).filter((child, index, items) => items.findIndex((item) => item.path === child.path) === index).slice(0, 4);
  }, [activeWorkspace, recentPaths]);

  const togglePin = (path: string) => {
    setPinnedPaths((current) => {
      const next = current.includes(path) ? current.filter((item) => item !== path) : [...current, path];
      try { window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };

  const isAdmin = profile?.role === "admin";

  const handleSearch = () => {
    // The command palette is mounted globally and listens for the shortcut;
    // reusing it means the rail cannot fall out of step with the palette.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true }),
    );
  };

  const railItem = (active: boolean) =>
    classNames(
      "group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
      active
        ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-lighter"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5",
    );

  return (
    <aside
      aria-label={t("Primary navigation")}
      data-collapsed={collapsed ? "true" : "false"}
      className={classNames(
        "fixed left-0 top-0 z-40 hidden h-[100svh] border-r border-border/70 bg-card/95 lg:flex dark:border-white/10 dark:bg-background/95",
        "transition-[width] duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none",
        collapsed ? "w-[4.5rem]" : "w-[18rem]",
        className,
      )}
    >
      {/* Column one: the workspaces, as icons on a persistent rail. */}
      <div className="flex w-[4.5rem] shrink-0 flex-col border-r border-border/60 dark:border-white/10">
        <Link
          to="/"
          aria-label={`${siteConfig.shortName} home`}
          className="flex h-16 shrink-0 items-center justify-center text-foreground"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            F
          </span>
        </Link>

        <div className="px-2 pb-2">
          <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                aria-expanded={!collapsed}
                aria-label={
                  collapsed ? t("Open navigation") : t("Close navigation")
                }
                title={
                  collapsed
                    ? `${t("Open the section list")} (⌘B)`
                    : `${t("Close the section list")} (⌘B)`
                }
                className={classNames(railItem(false), "mx-auto")}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-[20px] w-[20px]" strokeWidth={1.7} aria-hidden="true" />
                ) : (
                  <PanelLeftClose className="h-[20px] w-[20px]" strokeWidth={1.7} aria-hidden="true" />
                )}
              </button>
        </div>

        <nav
          aria-label={t("Site sections")}
          className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2 pt-1 [scrollbar-width:none]"
        >
          {grouped.map(({ group, workspaces }) => (
            <div
              key={group.key}
              className="mb-1 border-b border-border/40 pb-1 last:border-0 dark:border-white/5"
            >
              <ul className="space-y-1">
                {workspaces.map((workspace) => {
                  const Icon = WORKSPACE_ICONS[workspace.label] ?? Home;
                  const active = isActive(workspace);
                  return (
                    <li key={workspace.label}>
                      <Link
                        to={workspace.path}
                        aria-label={t(workspace.label)}
                        aria-current={active ? "page" : undefined}
                        title={t(workspace.label)}
                        onClick={(event) => {
                          if (!active || !collapsed) return;
                          event.preventDefault();
                          setCollapsed(false);
                        }}
                        className={railItem(active)}
                      >
                        <Icon
                          className="h-[20px] w-[20px]"
                          strokeWidth={1.7}
                          aria-hidden="true"
                        />
                        {active && (
                          <span
                            aria-hidden="true"
                            className="absolute -left-2 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                          />
                        )}
                        {collapsed && <RailTip>{t(workspace.label)}</RailTip>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border/60 p-2 dark:border-white/10">
          <ul className="space-y-1">
            {collapsed && (
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("frelux:open-menu"))}
                  aria-label={`${t("Market and currency preferences")}: ${marketCode} ${market.currencyCode}`}
                  title={`${marketCode} · ${market.currencySymbol} ${market.currencyCode}`}
                  className={classNames(railItem(false), "text-[14px]")}
                >
                  <span aria-hidden="true">{getCountryFlag(marketCode)}</span>
                  <RailTip>{marketCode} · {market.currencySymbol} {market.currencyCode}</RailTip>
                </button>
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={handleSearch}
                aria-label={t("Search")}
                title={t("Search")}
                className={railItem(false)}
              >
                <Search
                  className="h-[20px] w-[20px]"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={t("Toggle theme")}
                title={theme === "dark" ? t("Switch to light mode") : t("Switch to dark mode")}
                className={railItem(false)}
              >
                {theme === "dark" ? <Sun className="h-[20px] w-[20px] text-amber-400" strokeWidth={1.7} aria-hidden="true" /> : <Moon className="h-[20px] w-[20px]" strokeWidth={1.7} aria-hidden="true" />}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("frelux:open-menu"))
                }
                aria-label={t("Settings and display")}
                title={t("Settings and display")}
                className={railItem(false)}
              >
                <Settings2
                  className="h-[20px] w-[20px]"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </button>
            </li>
            <li>
              <Link
                to={user ? "/profile" : "/signin"}
                aria-label={t(user ? "Your account" : "Sign In")}
                title={
                  user ? profile?.full_name || t("Your account") : t("Sign In")
                }
                className={railItem(false)}
              >
                {user ? (
                  <UserCircle
                    className="h-[20px] w-[20px]"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                ) : (
                  <LogIn
                    className="h-[20px] w-[20px]"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                )}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Column two: the current workspace's destinations, inline and scrollable. */}
      {!collapsed && (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4 dark:border-white/10">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold tracking-tight text-foreground">
                {t(activeWorkspace.label)}
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {activeSections.reduce(
                  (total, section) => total + section.children.length,
                  0,
                )}{" "}
                {t("pages")}
              </p>
            </div>
            <Link
              to={activeWorkspace.path}
              className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {t("Open")}
            </Link>
          </div>

          <div className="border-b border-border/40 px-3 py-2 dark:border-white/5">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <input
                ref={filterInputRef}
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder={`${t("Filter")} ${t(activeWorkspace.label)}...`}
                aria-label={`${t("Filter")} ${t(activeWorkspace.label)}`}
                className="h-8 w-full rounded-lg border border-border/60 bg-muted/30 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5"
              />
              {filterQuery && <button type="button" onClick={() => { setFilterQuery(""); filterInputRef.current?.focus(); }} aria-label={t("Clear filter")} className="absolute right-2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
            </div>
          </div>

          <nav
            aria-label={t(activeWorkspace.label)}
            className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 [scrollbar-gutter:stable] [scrollbar-width:thin]"
          >
            {!filterQuery && recentItems.length > 0 && (
              <div className="mb-2 border-b border-border/40 pb-2 dark:border-white/5">
                <p className="flex items-center gap-1.5 px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Recent")}</p>
                <ul className="space-y-0.5">{recentItems.map((child) => (
                  <li key={`recent-${child.path}`}>
                    <NavLink to={child.path} className={({ isActive: active }) => classNames("block rounded-lg border-l-2 py-1.5 pl-2.5 pr-2 text-[13px]", active ? "border-primary bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
                      <span className="block truncate">{t(child.label)}</span>
                    </NavLink>
                  </li>
                ))}</ul>
              </div>
            )}
            {!filterQuery && pinnedItems.length > 0 && (
              <div className="mb-2 border-b border-border/40 pb-2 dark:border-white/5">
                <p className="flex items-center gap-1.5 px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary"><Pin className="h-3 w-3 fill-primary/30" />{t("Pinned")}</p>
                <ul className="space-y-0.5">{pinnedItems.map((child) => (
                  <li key={`pin-${child.path}`} className="group/item flex items-center gap-1">
                    <NavLink to={child.path} className={({ isActive: active }) => classNames("min-w-0 flex-1 rounded-lg border-l-2 py-1.5 pl-2.5 pr-1 text-[13px]", active ? "border-primary bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
                      <span className="block truncate">{t(child.label)}</span>
                    </NavLink>
                    <button type="button" onClick={() => togglePin(child.path)} aria-label={`${t("Unpin tool")}: ${t(child.label)}`} title={t("Unpin tool")} className="rounded p-1 text-primary"><Pin className="h-3 w-3 fill-current" /></button>
                  </li>
                ))}</ul>
              </div>
            )}
            {filteredSections.length === 0 ? (
              <div className="px-3 py-8 text-center"><p className="text-xs text-muted-foreground">{t("No tools match")} &ldquo;{filterQuery}&rdquo;</p><button type="button" onClick={() => setFilterQuery("")} className="mt-2 text-[11px] font-semibold text-primary hover:underline">{t("Clear filter")}</button></div>
            ) : filteredSections.map((section) => (
              <div key={section.key} className="pb-2 last:pb-0">
                <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t(section.label)}
                </p>
                <ul className="space-y-0.5">
                  {section.children.map((child) => {
                    const isPinned = pinnedPaths.includes(child.path);
                    return (
                      <li key={child.path} className="group/item flex items-center gap-1">
                        <NavLink
                          to={child.path}
                          className={({ isActive: childActive }) =>
                            classNames(
                              "min-w-0 flex-1 rounded-lg border-l-2 py-1.5 pl-2.5 pr-1 transition-colors",
                              childActive
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5",
                            )
                          }
                        >
                          <span className="block truncate text-[13px] font-medium leading-snug">
                            {t(child.label)}
                          </span>
                        </NavLink>
                        <button
                          type="button"
                          onClick={() => togglePin(child.path)}
                          aria-label={`${t(isPinned ? "Unpin tool" : "Pin tool")}: ${t(child.label)}`}
                          title={t(isPinned ? "Unpin tool" : "Pin tool")}
                          className={classNames(
                            "shrink-0 rounded p-1 text-muted-foreground transition-opacity hover:text-primary",
                            isPinned ? "text-primary opacity-100" : "opacity-0 group-hover/item:opacity-100 focus:opacity-100",
                          )}
                        >
                          <Pin className={classNames("h-3 w-3", isPinned && "fill-current")} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {variant === "app" && (
              <div className="mt-1 border-t border-border/60 pt-2 dark:border-white/10">
                <ul className="space-y-0.5">
                  <li>
                    <NavLink
                      to="/dashboard"
                      className={({ isActive: linkActive }) =>
                        classNames(
                          "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                          linkActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5",
                        )
                      }
                    >
                      <TrendingUp
                        className="h-4 w-4 shrink-0"
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                      {t("Dashboard")}
                    </NavLink>
                  </li>
                  {isAdmin && (
                    <li>
                      <NavLink
                        to="/admin"
                        className={({ isActive: linkActive }) =>
                          classNames(
                            "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                            linkActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5",
                          )
                        }
                      >
                        <Shield
                          className="h-4 w-4 shrink-0"
                          strokeWidth={1.7}
                          aria-hidden="true"
                        />
                        {t("Admin")}
                      </NavLink>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </nav>

          <div className="shrink-0 border-t border-border/60 px-3 py-2 dark:border-white/10">
            <div className="flex items-center justify-between gap-1">
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("frelux:open-menu"))} aria-label={t("Market and currency preferences")} title={t("Market and currency preferences")} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                <span aria-hidden="true">{getCountryFlag(marketCode)}</span><span className="font-semibold text-foreground">{marketCode}</span><span className="text-[10px]">· {market.currencySymbol}</span>
              </button>
              <div className="flex items-center gap-1.5">
                {isAdmin ? <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">Admin</span> : isPaid ? <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">{paidStatus?.plan || "Pro"}</span> : <Link to="/pricing" className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground hover:text-foreground">Free</Link>}
                <span className="text-[10px] font-medium text-muted-foreground">{t("FRELUX")} · {t("Smart Calc")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// Exported for the test that guards the rail's section ordering.
export { navGroups, sectionGroups, STORAGE_KEY };
