import { useEffect, useState, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import {
  BarChart3,
  Bot,
  Briefcase,
  Calculator,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Crown,
  FileStack,
  BookOpen,
  Building2,
  FileText,
  Gem,
  LayoutGrid,
  Map,
  LayoutDashboard,
  SlidersHorizontal,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Moon,
  Package,
  Search,
  ShoppingBag,
  Sun,
  User,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import Logo from "@/components/brand/Logo";
import BrandBackdrop from "@/components/ui/BrandBackdrop";
import { navWorkspaces, siteConfig, type NavChild } from "@/config/site";
import { groupWorkspaces } from "@/config/navigation";
import { classNames } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits-context";

import { useTheme } from "@/lib/theme";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { CurrencySwitcher } from "@/components/ui/CurrencySwitcher";
import { AccessibilityToggle } from "@/components/ui/AccessibilityToggle";
import { MarketSelector } from "@/components/ui/MarketSelector";
import { useMarket } from "@/lib/international/market-context";
import { getMarketNavigationLabel } from "@/lib/globalization/construction-terminology";
import { Button } from "@/components/ui/shadcn/button";
import AdFreePromptNotice from "@/components/subscription/AdFreePromptNotice";
import DisplaySettings from "@/components/layout/DisplaySettings";

export default function Navbar() {
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  // The desktop rail has no hamburger, so its settings button asks for this
  // drawer through a window event. One drawer, one set of controls.
  useEffect(() => {
    const openMenu = () => setMobileOpen(true);
    window.addEventListener("frelux:open-menu", openMenu);
    return () => window.removeEventListener("frelux:open-menu", openMenu);
  }, []);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  // Sub-category (section) expansion inside an open workspace.
  // Keys are `${t(workspace.label)}/${section}` so each category's
  // dropdown expands independently.
  const [mobileSubExpanded, setMobileSubExpanded] = useState<string | null>(
    null,
  );
  const [avatarError, setAvatarError] = useState(false);
  // Drawer search: with sixty-odd tools, typing the one you want is faster
  // than opening four accordions on a phone.
  const [navQuery, setNavQuery] = useState("");
  const location = useLocation();
  const { user, profile, signOut, isPaid } = useAuth();
  const { wallet } = useCredits();
  const { marketCode } = useMarket();
  const { theme, toggle } = useTheme();
  const navRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyOpenRef = useRef(false);

  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
    setMobileExpanded(null);
  }, [location.pathname]);

  // Make the off-canvas drawer genuinely absent to keyboard and assistive
  // technology users while closed, and manage focus like a modal navigation.
  useEffect(() => {
    const drawer = drawerRef.current;
    if (drawer) drawer.inert = !mobileOpen;

    if (mobileOpen) {
      requestAnimationFrame(() =>
        drawer?.querySelector<HTMLElement>("[data-menu-close]")?.focus(),
      );
    } else if (previouslyOpenRef.current) {
      menuTriggerRef.current?.focus();
    }
    previouslyOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) {
        event.preventDefault();
        drawer.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !drawer.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !drawer.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 8);
          ticking = false;
        });
        ticking = true;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // overflow-y only - never touch overflow-x, which must stay `clip`
    // (set globally in index.css) so position:sticky elements keep the
    // viewport as their scrolling ancestor instead of body/html.
    document.body.style.overflowY = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflowY = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const accountMenuSections = [
    {
      section: "Your account",
      items: [
        { label: "My Profile", to: "/profile", icon: UserCircle },
        { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
        {
          label: "Construction intelligence",
          to: "/intelligence",
          icon: LayoutDashboard,
        },
        {
          label: "Saved Estimates & Projects",
          to: "/my-projects",
          icon: ClipboardList,
        },
        { label: "Calculator Templates", to: "/my-templates", icon: FileStack },
        {
          label: "Project settings",
          to: "/settings/preferences",
          icon: SlidersHorizontal,
        },
      ],
    },
    {
      section: "Marketplace",
      items: [
        {
          label: "Browse Marketplace",
          to: "/marketplace",
          icon: ShoppingBag,
          external: true,
        },
        {
          label: "My Job Listings",
          to: "/marketplace/my-listings",
          icon: Briefcase,
        },
        { label: "My Products", to: "/marketplace/products/my", icon: Package },
      ],
    },
    {
      section: "Business",
      items: [
        { label: "Contractor Workspace", to: "/contractor", icon: FileStack },
        { label: "Quotes", to: "/quotes", icon: FileText },
        { label: "Clients", to: "/clients", icon: Users },
        { label: "Analytics", to: "/analytics", icon: BarChart3 },
      ],
    },
    {
      section: "Plan",
      items: [
        { label: "Pricing", to: "/pricing", icon: Crown },
        { label: "Brand Studio", to: "/brand-studio", icon: Crown },
        { label: "Document Studio", to: "/document-studio", icon: FileText },
        { label: "Rewards", to: "/rewards", icon: Gem },
      ],
    },
  ];

  // Group children by section for premium dropdown rendering
  function groupBySection(
    children: NavChild[] | undefined,
  ): { section: string | null; items: NavChild[] }[] {
    const groups: { section: string | null; items: NavChild[] }[] = [];
    let currentSection: string | null = null;
    let currentGroup: NavChild[] = [];

    for (const child of children ?? []) {
      const sec = child.section ?? null;
      if (sec !== currentSection) {
        if (currentGroup.length > 0) {
          groups.push({ section: currentSection, items: currentGroup });
        }
        currentSection = sec;
        currentGroup = [];
      }
      currentGroup.push(child);
    }
    if (currentGroup.length > 0) {
      groups.push({ section: currentSection, items: currentGroup });
    }
    return groups;
  }

  return (
    <>
      <header
        className={classNames(
          "neon-edge fixed top-0 z-40 w-full rounded-b-[26px] border-b transition-[background-color,border-color,box-shadow,backdrop-filter,border-radius] duration-500 lg:left-[var(--rail-w)] lg:w-[calc(100%-var(--rail-w))]",
          scrolled
            ? "nav-glass border-border/40 shadow-[0_18px_44px_-34px_rgba(16,12,40,0.8)] dark:border-white/10"
            : "border-transparent bg-transparent backdrop-blur-none",
        )}
      >
        <nav
          ref={navRef}
          className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-16 lg:justify-end lg:px-6"
        >
          {/* Logo and drawer trigger: below lg only. On desktop the rail
              carries the brand and every destination. */}
          <div className="flex items-center gap-3 lg:hidden">
            <Button
              variant="ghost"
              type="button"
              ref={menuTriggerRef}
              onClick={() => setMobileOpen(true)}
              className="glass-control inline-flex h-10 w-10 items-center justify-center text-card-foreground transition-all active:scale-95 dark:text-card-foreground"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-[22px] w-[22px]" strokeWidth={1.75} />
            </Button>
            <Link
              to="/"
              aria-label="FRELUX home"
              className="group shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Logo decorative />
            </Link>
          </div>

          {/* Grouped dropdowns: tablet and below. On desktop the rail is the
              single source of navigation. */}
          <div className="hidden items-center gap-1">
            {navWorkspaces.map((workspace) => (
              <div key={t(workspace.label)} className="relative">
                {workspace.children ? (
                  <>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setOpenDropdown(workspace.label)}
                      onMouseEnter={() => setOpenDropdown(workspace.label)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpenDropdown(workspace.label);
                        }
                      }}
                      onFocus={() => setOpenDropdown(workspace.label)}
                      className={classNames(
                        "flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                        location.pathname.startsWith(workspace.path) ||
                          openDropdown === workspace.label
                          ? "text-brand-purple dark:text-brand-purple-lighter"
                          : "text-muted-foreground hover:text-brand-purple hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:text-brand-purple-lighter dark:hover:bg-white/5",
                      )}
                    >
                      {t(workspace.label)}
                      <ChevronDown
                        className={classNames(
                          "h-3 w-3 transition-transform duration-300",
                          openDropdown === workspace.label && "rotate-180",
                        )}
                      />
                    </Button>
                    {openDropdown === workspace.label && (
                      <div className="absolute left-0 top-full z-50 pt-1">
                        {/* Premium mega-menu panel */}
                        <div
                          className="surface-float origin-top-left rounded-[26px]"
                          style={{
                            animation:
                              "navDropdownIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
                          }}
                        >
                          {/* Dropdown header bar */}
                          <div className="flex items-center justify-between rounded-t-[26px] border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent px-5 py-2.5 dark:border-white/5 dark:from-primary/10">
                            <NavLink
                              to={workspace.path}
                              className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-brand-purple dark:text-muted-foreground dark:hover:text-brand-purple-lighter"
                            >
                              {t(workspace.label)}
                              <ChevronRight className="h-3 w-3" />
                            </NavLink>
                          </div>

                          {/* Grouped sections, multi-column for large menus */}
                          {(() => {
                            const groups = groupBySection(workspace.children);
                            const totalItems = (workspace.children ?? [])
                              .length;
                            const isMega = totalItems > 8;
                            const maxHeight = isMega
                              ? "max-h-[min(70vh,560px)]"
                              : "max-h-[min(60vh,440px)]";
                            const colsClass = isMega
                              ? "grid grid-cols-2 gap-x-1"
                              : "flex flex-col";
                            return (
                              <div
                                className={classNames(
                                  "overflow-y-auto px-2 py-2 nav-scroll",
                                  maxHeight,
                                  colsClass,
                                )}
                                style={{ scrollbarWidth: "thin" }}
                              >
                                {groups.map((group, gi) => (
                                  <div
                                    key={gi}
                                    className={isMega ? "col-span-2" : ""}
                                  >
                                    {/* Section label */}
                                    {group.section && (
                                      <div className="px-3 pb-0.5 pt-2">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-muted-foreground">
                                          {t(group.section)}
                                        </p>
                                      </div>
                                    )}
                                    {/* Section items */}
                                    {group.items.map((child) => (
                                      <NavLink
                                        key={child.path}
                                        to={child.path}
                                        className={({ isActive }) =>
                                          classNames(
                                            "group flex min-h-[40px] items-start gap-3 rounded-xl px-3 py-1.5 transition-all duration-150",
                                            isActive
                                              ? "bg-primary/10"
                                              : "hover:bg-primary/5",
                                          )
                                        }
                                      >
                                        <div className="min-w-0 flex-1">
                                          <p
                                            className={classNames(
                                              "text-[13px] font-medium leading-tight transition-colors",
                                              location.pathname === child.path
                                                ? "text-brand-purple dark:text-brand-purple-lighter"
                                                : "text-card-foreground group-hover:text-brand-purple dark:text-muted-foreground/60 dark:group-hover:text-brand-purple-lighter",
                                            )}
                                          >
                                            {getMarketNavigationLabel(
                                              child.path,
                                              marketCode,
                                              child.label,
                                            )}
                                          </p>
                                          {child.description && (
                                            <p className="mt-0 text-xs leading-snug text-muted-foreground dark:text-muted-foreground">
                                              {child.description}
                                            </p>
                                          )}
                                        </div>
                                      </NavLink>
                                    ))}
                                    {gi < groups.length - 1 && (
                                      <div className="mx-3 my-1 border-t border-border/50 dark:border-white/5" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </>
                ) : workspace.external ? (
                  <a
                    href={workspace.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-brand-purple hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:text-brand-purple-lighter dark:hover:bg-white/5"
                  >
                    {t(workspace.label)}
                  </a>
                ) : (
                  <NavLink
                    to={workspace.path}
                    className={({ isActive }) =>
                      classNames(
                        "rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "text-brand-purple dark:text-brand-purple-lighter"
                          : "text-muted-foreground hover:text-brand-purple hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:text-brand-purple-lighter dark:hover:bg-white/5",
                      )
                    }
                  >
                    {t(workspace.label)}
                  </NavLink>
                )}
              </div>
            ))}
          </div>

          {/* Right side: utility icons, account, and primary CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search (desktop only) */}
            <Button
              variant="ghost"
              onClick={() => {
                const e = new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                });
                document.dispatchEvent(e);
              }}
              className="hidden items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-muted-foreground xl:flex dark:border-white/10 dark:hover:border-white/20 dark:text-muted-foreground"
              aria-label="Open command palette"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="rounded border border-border px-1 text-xs font-medium dark:border-white/10">
                ⌘K
              </kbd>
            </Button>

            {/* Utility toggles (desktop only) */}
            <div className="hidden items-center gap-1 lg:flex">
              <AccessibilityToggle />
              <LanguageSwitcher />
              <CurrencySwitcher />
              <MarketSelector />
              <Button
                variant="ghost"
                type="button"
                onClick={toggle}
                aria-label="Toggle dark mode"
                className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-all hover:text-card-foreground active:scale-95 dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-muted-foreground/60"
              >
                {theme === "dark" ? (
                  <Sun className="h-[18px] w-[18px]" />
                ) : (
                  <Moon className="h-[18px] w-[18px]" />
                )}
              </Button>
              <a
                href={`mailto:${siteConfig.email}`}
                aria-label="Email us"
                className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-brand-purple active:scale-95 dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-primary-foreground/90"
              >
                <Mail className="h-[18px] w-[18px]" />
              </a>
            </div>

            {/* Language switcher (11 supported languages) */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenDropdown(openDropdown === "account" ? null : "account")
                }
                className={classNames(
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground ring-1 ring-transparent transition-all hover:bg-muted hover:text-card-foreground hover:ring-border/60 active:scale-95 dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:ring-white/15 dark:hover:text-muted-foreground/60",
                  openDropdown === "account" &&
                    "bg-muted text-brand-purple dark:bg-white/5 dark:text-brand-purple-lighter",
                )}
                aria-label={user ? "Account menu" : "Sign in"}
                aria-expanded={openDropdown === "account"}
              >
                {user && profile?.avatar_url && !avatarError ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-border/50 dark:ring-white/15"
                    onError={() => setAvatarError(true)}
                  />
                ) : user ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-[13px] font-bold text-primary-foreground">
                    {(profile?.full_name?.charAt(0) || (user.email ?? "?"))
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                ) : (
                  <UserCircle className="h-5 w-5" strokeWidth={1.5} />
                )}
              </button>

              {openDropdown === "account" && (
                <div
                  role="menu"
                  aria-label={user ? t("Your account") : t("Sign In")}
                  className="surface-float absolute right-0 top-full z-50 mt-3 max-h-[calc(100vh-6rem)] w-[352px] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-[26px] border border-border/50 shadow-[0_28px_70px_-28px_rgba(15,23,42,0.45)] animate-fade-in-up dark:border-white/10"
                  style={{
                    animationDuration: "0.2s",
                    transformOrigin: "top right",
                  }}
                >
                  {user ? (
                    <>
                      {/* Identity. Large avatar, readable name, plan stated once
                          here instead of repeated in three places. */}
                      <div className="relative overflow-hidden rounded-t-[26px] px-5 pb-5 pt-6">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/5" />
                        <div className="relative flex items-center gap-4">
                          {profile?.avatar_url && !avatarError ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white shadow-md dark:ring-white/15"
                              onError={() => setAvatarError(true)}
                            />
                          ) : (
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-lg font-bold text-primary-foreground shadow-md">
                              {(
                                profile?.full_name?.charAt(0) ||
                                (user.email ?? "?")
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold leading-tight text-foreground">
                              {profile?.full_name || user.email?.split("@")[0]}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {user.email}
                            </p>
                            <span className="mt-2 inline-flex items-center rounded-full border border-brand-purple/20 bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-brand-purple dark:border-white/10 dark:bg-white/10 dark:text-brand-purple-lighter">
                              {isPaid ? t("Paid plan") : t("Free plan")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Balance. The single number people open this panel for,
                          given the room it deserves. */}
                      <div className="px-3 pb-3">
                        <Link
                          to="/rewards/"
                          onClick={() => setOpenDropdown(null)}
                          className="group flex items-center justify-between rounded-2xl border border-border/50 bg-card/70 px-4 py-3 transition-colors hover:border-brand-purple/30 hover:bg-primary/5 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {t("Credits")}
                            </p>
                            <p className="mt-0.5 text-2xl font-bold leading-none tracking-tight text-foreground">
                              {wallet?.balance ?? 0}
                            </p>
                          </div>
                          <span className="flex items-center gap-1 text-xs font-semibold text-brand-purple transition-transform group-hover:translate-x-0.5 dark:text-brand-purple-lighter">
                            {t("Manage")}
                            <ChevronRight
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                          </span>
                        </Link>
                      </div>

                      {/* Three facts, wide enough to read. */}
                      <div className="mx-3 mb-2 grid grid-cols-2 gap-2">
                        <Link
                          to="/rewards/"
                          onClick={() => setOpenDropdown(null)}
                          className="rounded-xl bg-muted/40 px-2 py-2.5 text-center transition-colors hover:bg-muted/70 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          <span className="block text-sm font-bold text-foreground">
                            {wallet?.total_earned ?? 0}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {t("Total Owned")}
                          </span>
                        </Link>
                        <Link
                          to="/dashboard/"
                          onClick={() => setOpenDropdown(null)}
                          className="rounded-xl bg-muted/40 px-2 py-2.5 text-center transition-colors hover:bg-muted/70 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          <span className="block truncate text-sm font-bold text-foreground">
                            {isPaid ? "Premium" : t("Free")}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {t("Plan")}
                          </span>
                        </Link>
                      </div>

                      {/* Destinations. Comfortable rows, 18px icons, section
                          labels that read as labels rather than fine print. */}
                      <div className="px-3 pb-2">
                        {accountMenuSections.map((section, si) => (
                          <div key={section.section}>
                            <p
                              className={classNames(
                                "px-2 pb-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground/70",
                                si === 0 ? "pt-1" : "pt-4",
                              )}
                            >
                              {t(section.section)}
                            </p>
                            {section.items.map((item) => {
                              const Icon = item.icon;
                              return (
                                <Link
                                  key={t(item.label)}
                                  to={item.to}
                                  target={item.external ? "_blank" : undefined}
                                  rel={
                                    item.external
                                      ? "noopener noreferrer"
                                      : undefined
                                  }
                                  onClick={() => setOpenDropdown(null)}
                                  role="menuitem"
                                  className="group flex h-10 items-center gap-3 rounded-xl px-2.5 text-[13px] font-medium text-card-foreground transition-colors hover:bg-primary/8 hover:text-brand-purple focus-visible:bg-primary/8 focus-visible:outline-none dark:text-muted-foreground dark:hover:bg-white/8 dark:hover:text-brand-purple-lighter"
                                >
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-colors group-hover:bg-primary/12 group-hover:text-brand-purple dark:bg-white/5 dark:group-hover:bg-white/10 dark:group-hover:text-brand-purple-lighter">
                                    <Icon
                                      aria-hidden="true"
                                      className="h-[18px] w-[18px]"
                                    />
                                  </span>
                                  <span className="min-w-0 flex-1 truncate">
                                    {t(item.label)}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      {/* Footer action, given its own space. */}
                      <div className="border-t border-border/50 p-2 dark:border-white/5">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => {
                            signOut();
                            setOpenDropdown(null);
                          }}
                          className="flex h-10 w-full items-center gap-3 rounded-xl px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 dark:bg-white/5">
                            <LogOut
                              aria-hidden="true"
                              className="h-[18px] w-[18px]"
                            />
                          </span>
                          {t("Sign out")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-5">
                      <p className="text-base font-semibold text-foreground">
                        {t("Welcome to FRELUX")}
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        {t("Sign in for projects, estimates & rewards.")}
                      </p>
                      <Link
                        to="/login/"
                        onClick={() => setOpenDropdown(null)}
                        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-deep text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95"
                      >
                        <LogIn
                          aria-hidden="true"
                          className="h-[18px] w-[18px]"
                        />
                        {t("Sign In")}
                      </Link>
                      <Link
                        to="/login/?mode=signup"
                        onClick={() => setOpenDropdown(null)}
                        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/60 text-sm font-semibold text-card-foreground transition-colors hover:bg-muted/60 dark:border-white/10 dark:text-muted-foreground"
                      >
                        <User
                          aria-hidden="true"
                          className="h-[18px] w-[18px]"
                        />
                        {t("Create account")}
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </nav>
        <AdFreePromptNotice />
      </header>

      {/* ===== Mobile drawer, premium collapsible sections ===== */}
      <div
        className={classNames(
          "fixed inset-0 z-50",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        {/* Scrim: pointer-only; keyboard dismissal is handled by Escape. */}
        <div
          aria-hidden="true"
          className={classNames(
            "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer */}
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="FRELUX navigation menu"
          aria-hidden={!mobileOpen}
          tabIndex={-1}
          className={classNames(
            // Logical anchoring: in Arabic the drawer must enter from the
            // right edge, not the left one. `start-2` follows the writing
            // direction, and the closed transform mirrors with it.
            "surface-sheet absolute start-2 top-2 flex h-[calc(100%-1rem)] w-[318px] max-w-[88vw] flex-col overflow-hidden rounded-[26px] transition-transform duration-300 ease-out",
            mobileOpen
              ? "translate-x-0"
              : "ltr:-translate-x-full rtl:translate-x-full",
          )}
        >
          {/* Same architectural backdrop as the hero and footer, held
              still while the menu list scrolls over it. */}
          <BrandBackdrop variant="drawer" />
          <div className="relative flex-1 overflow-y-auto overscroll-contain">
            {/* Drawer header */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-[26px] border-b border-border/50 bg-card/75 px-4 py-3 backdrop-blur-xl dark:border-white/5 dark:bg-card/70">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                aria-label="FRELUX home"
                className="group min-w-0 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Logo decorative />
              </Link>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:border-border/60 hover:bg-muted/60 dark:hover:border-white/10 dark:hover:bg-white/5"
                aria-label="Close menu"
                data-menu-close
              >
                <X className="h-[18px] w-[18px]" />
              </Button>
            </div>

            {/* Quick tools are the surfaces people ask for by name, so
              they sit above the workspaces. Rendered as one disclosure
              row rather than a tile grid, so the drawer reads as a single
              vertical list from top to bottom. */}
            <div className="border-b border-border/50 px-3 py-3 dark:border-white/5">
              <Button
                variant="ghost"
                type="button"
                onClick={() =>
                  setMobileExpanded(
                    mobileExpanded === "__quick_tools" ? null : "__quick_tools",
                  )
                }
                aria-expanded={mobileExpanded === "__quick_tools"}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-card-foreground transition-colors hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5"
              >
                Quick tools
                <ChevronDown
                  aria-hidden="true"
                  className={classNames(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    mobileExpanded === "__quick_tools" && "rotate-180",
                  )}
                />
              </Button>
              {mobileExpanded === "__quick_tools" && (
                <div className="ml-3 mt-1 border-l border-border/50 pl-3 dark:border-white/10">
                  {[
                    {
                      label: "Unit Converter",
                      to: "/unit-converter",
                      icon: Calculator,
                    },
                    {
                      label: "Building types",
                      to: "/building-types",
                      icon: Building2,
                    },
                    { label: "Explore Map", to: "/map", icon: Map },
                    { label: "Price book", to: "/prices", icon: BookOpen },
                    {
                      label: "All tools",
                      to: "/construction-tools",
                      icon: LayoutGrid,
                    },
                  ].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground dark:text-muted-foreground/80 dark:hover:bg-white/5"
                    >
                      <item.icon
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-muted-foreground/70"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Identity: who you are signed in as, or the way in. A menu that
                never says whose account it is leaves people guessing on a
                shared phone. */}
            <div className="border-b border-border/50 px-3 py-3 dark:border-white/5">
              {user ? (
                <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary-deep text-sm font-semibold text-primary-foreground">
                    {avatarError || !profile?.avatar_url ? (
                      <UserCircle
                        aria-hidden="true"
                        className="h-5 w-5 opacity-90"
                      />
                    ) : (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-card-foreground">
                      {profile?.full_name?.trim() ||
                        profile?.email ||
                        t("Your account")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {isPaid ? t("Paid plan") : t("Free plan")}
                    </p>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-purple transition-colors hover:bg-muted/60 dark:text-brand-purple-lighter dark:hover:bg-white/5"
                  >
                    {t("My dashboard")}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card/70 text-sm font-semibold text-card-foreground transition-colors hover:bg-muted/60 dark:border-white/10 dark:bg-white/5 dark:text-foreground"
                  >
                    <LogIn aria-hidden="true" className="h-4 w-4" />
                    {t("Sign in")}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-deep text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95"
                  >
                    <User aria-hidden="true" className="h-4 w-4" />
                    {t("Create account")}
                  </Link>
                </div>
              )}
            </div>

            {/* Search across every workspace, tool and page name. Matches are
                shown flat with their workspace underneath, so a result is
                never ambiguous about where it lives. */}
            <div className="border-b border-border/50 px-3 py-3 dark:border-white/5">
              <label htmlFor="mobile-nav-search" className="sr-only">
                {t("Search tools and pages")}
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  id="mobile-nav-search"
                  type="search"
                  value={navQuery}
                  onChange={(event) => setNavQuery(event.target.value)}
                  placeholder={t("Search tools and pages")}
                  autoComplete="off"
                  className="h-10 w-full rounded-xl border border-border/60 bg-card/80 pl-9 pr-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-purple/50 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5"
                />
                {navQuery && (
                  <button
                    type="button"
                    onClick={() => setNavQuery("")}
                    aria-label={t("Clear search")}
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground dark:hover:bg-white/10"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="px-3 py-3">
              {(() => {
                const query = navQuery.trim().toLowerCase();
                if (query) {
                  const matches = navWorkspaces
                    .filter((workspace) => workspace.path !== "/")
                    .flatMap((workspace) => [
                      {
                        path: workspace.path,
                        workspace: workspace.label,
                        label: workspace.label,
                        description: "",
                        external: workspace.external,
                      },
                      ...(workspace.children ?? []).map((child) => ({
                        path: child.path,
                        workspace: workspace.label,
                        label: child.label,
                        description: child.description ?? "",
                        external: false,
                      })),
                    ])
                    .filter((entry) =>
                      `${entry.label} ${entry.description}`
                        .toLowerCase()
                        .includes(query),
                    )
                    .slice(0, 24);

                  if (matches.length === 0) {
                    return (
                      <div className="px-3 py-6 text-center">
                        <p className="text-sm font-medium text-card-foreground">
                          {t("No matches")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("Try a trade, a material or a page name.")}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-0.5">
                      {matches.map((entry, index) => (
                        <Link
                          key={`${entry.path}-${index}`}
                          to={entry.path}
                          onClick={() => setMobileOpen(false)}
                          className="block rounded-lg px-3 py-2 transition-colors hover:bg-muted/50 dark:hover:bg-white/5"
                        >
                          <span className="block text-sm font-medium text-card-foreground">
                            {getMarketNavigationLabel(
                              entry.path,
                              marketCode,
                              entry.label,
                            )}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {t(entry.workspace)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  );
                }

                return (
                  <>
                    <NavLink
                      to="/"
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        classNames(
                          "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                          isActive
                            ? "bg-primary/10 text-brand-purple before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-brand-purple dark:bg-primary/15 dark:text-brand-purple-lighter"
                            : "text-card-foreground hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5",
                        )
                      }
                    >
                      <LayoutDashboard
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 opacity-70"
                      />
                      {t("Home")}
                    </NavLink>

                    {groupWorkspaces(
                      navWorkspaces.filter(
                        (workspace) => workspace.path !== "/",
                      ),
                    ).map(({ group, workspaces }) => (
                      <div key={group.key} className="mt-4 first:mt-2">
                        <p className="px-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
                          {t(group.label)}
                        </p>
                        <p className="mb-1 px-3 text-xs text-muted-foreground">
                          {t(group.description)}
                        </p>
                        {workspaces.map((workspace) => (
                          <div key={workspace.label} className="mb-0.5">
                            {workspace.children ? (
                              <>
                                <Button
                                  variant="ghost"
                                  onClick={() =>
                                    setMobileExpanded(
                                      mobileExpanded === workspace.label
                                        ? null
                                        : workspace.label,
                                    )
                                  }
                                  aria-expanded={
                                    mobileExpanded === workspace.label
                                  }
                                  className={classNames(
                                    "relative flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                                    location.pathname.startsWith(workspace.path)
                                      ? "bg-primary/10 text-brand-purple before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-brand-purple dark:bg-primary/15 dark:text-brand-purple-lighter"
                                      : "text-card-foreground hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5",
                                  )}
                                >
                                  <span className="min-w-0 flex-1 truncate text-left">
                                    {t(workspace.label)}
                                  </span>
                                  <ChevronDown
                                    aria-hidden="true"
                                    className={classNames(
                                      "h-4 w-4 shrink-0 transition-transform duration-200",
                                      mobileExpanded === workspace.label &&
                                        "rotate-180",
                                    )}
                                  />
                                </Button>
                                {mobileExpanded === workspace.label && (
                                  <div className="ml-3 mt-1 border-l border-border/50 pl-3 dark:border-white/10">
                                    {groupBySection(workspace.children).map(
                                      (group, gi) => {
                                        const groupKey = `${workspace.label}/${group.section ?? "general"}`;
                                        const renderLinks = () =>
                                          group.items.map((child) => (
                                            <NavLink
                                              key={child.path}
                                              to={child.path}
                                              onClick={() =>
                                                setMobileOpen(false)
                                              }
                                              className={({ isActive }) =>
                                                classNames(
                                                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                                                  isActive
                                                    ? "bg-primary/10 font-medium text-brand-purple dark:bg-primary/15 dark:text-brand-purple-lighter"
                                                    : "text-muted-foreground hover:bg-muted/50 hover:text-brand-purple dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-brand-purple-lighter",
                                                )
                                              }
                                            >
                                              <ChevronRight
                                                aria-hidden="true"
                                                className="h-3.5 w-3.5 shrink-0 opacity-50"
                                              />
                                              {getMarketNavigationLabel(
                                                child.path,
                                                marketCode,
                                                child.label,
                                              )}
                                            </NavLink>
                                          ));
                                        if (!group.section) {
                                          return (
                                            <div
                                              key={gi}
                                              className="mb-1 space-y-0.5"
                                            >
                                              {renderLinks()}
                                            </div>
                                          );
                                        }
                                        return (
                                          <div key={gi} className="mb-1">
                                            <button
                                              type="button"
                                              aria-expanded={
                                                mobileSubExpanded === groupKey
                                              }
                                              onClick={() =>
                                                setMobileSubExpanded(
                                                  mobileSubExpanded === groupKey
                                                    ? null
                                                    : groupKey,
                                                )
                                              }
                                              className="flex w-full items-center justify-between rounded-md bg-muted/70 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted dark:bg-white/5 dark:text-foreground dark:hover:bg-white/10"
                                            >
                                              {t(group.section)}
                                              <ChevronDown
                                                aria-hidden="true"
                                                className={classNames(
                                                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                                  mobileSubExpanded ===
                                                    groupKey && "rotate-180",
                                                )}
                                              />
                                            </button>
                                            {mobileSubExpanded === groupKey && (
                                              <div className="mt-0.5 space-y-0.5 pl-2">
                                                {renderLinks()}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                )}
                              </>
                            ) : workspace.external ? (
                              <a
                                href={workspace.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-card-foreground transition-colors hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5"
                              >
                                {t(workspace.label)}
                              </a>
                            ) : (
                              <NavLink
                                to={workspace.path}
                                onClick={() => setMobileOpen(false)}
                                className={({ isActive }) =>
                                  classNames(
                                    "relative block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                                    isActive
                                      ? "bg-primary/10 text-brand-purple before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-brand-purple dark:bg-primary/15 dark:text-brand-purple-lighter"
                                      : "text-card-foreground hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5",
                                  )
                                }
                              >
                                {t(workspace.label)}
                              </NavLink>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                );
              })()}

              {/* Display and accessibility controls live in the hamburger menu */}
              <div className="mt-4 border-t border-border/50 pt-4 dark:border-white/5">
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">
                      Display & layout
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Scale and calculator view
                    </p>
                  </div>
                  <DisplaySettings />
                </div>
                <div className="mt-1 space-y-1">
                  <AccessibilityToggle inline={true} />
                  <LanguageSwitcher inline={true} />
                  <CurrencySwitcher inline={true} />
                  <MarketSelector inline={true} />
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={toggle}
                    aria-label="Toggle dark mode"
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5"
                  >
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    <span>Dark mode</span>
                    <span
                      className={classNames(
                        "ml-auto text-xs",
                        theme === "dark"
                          ? "text-brand-purple dark:text-brand-purple-lighter"
                          : "text-muted-foreground",
                      )}
                    >
                      {theme === "dark" ? "On" : "Off"}
                    </span>
                  </Button>
                </div>
              </div>

              {user && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={async () => {
                    setMobileOpen(false);
                    await signOut();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5"
                >
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                  <span>{t("Sign out")}</span>
                </Button>
              )}

              {/* Email contact */}
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5"
              >
                <Mail className="h-4 w-4" />
                <span>Email us</span>
              </a>

              {/* AI Credit info */}
              {user && (
                <div className="mt-4 rounded-xl border border-brand-purple/15 bg-gradient-to-br from-primary/5 to-transparent p-3 dark:from-primary/10">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-deep text-primary-foreground">
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-xs font-semibold text-card-foreground dark:text-muted-foreground/60">
                      AI Credits
                    </p>
                    <Link
                      to="/rewards/"
                      onClick={() => setMobileOpen(false)}
                      className="ml-auto text-xs font-medium text-brand-purple dark:text-brand-purple-lighter"
                    >
                      Manage →
                    </Link>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                        Available
                      </span>
                      <span className="text-lg font-bold text-foreground dark:text-muted-foreground/40">
                        {wallet?.balance ?? 0}
                      </span>
                    </div>
                    <div className="h-8 w-px bg-muted dark:bg-white/10" />
                    <Link
                      to="/rewards/"
                      onClick={() => setMobileOpen(false)}
                      className="flex flex-col transition-opacity hover:opacity-70"
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                        Total Owned
                      </span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {wallet?.total_earned ?? 0}
                      </span>
                    </Link>
                    <div className="h-8 w-px bg-muted dark:bg-white/10" />
                    <Link
                      to="/pricing/"
                      onClick={() => setMobileOpen(false)}
                      className="flex flex-col transition-opacity hover:opacity-70"
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                        Plan
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold text-brand-purple dark:text-brand-purple-lighter">
                        {isPaid ? <PremiumBadge size="xs" minimal /> : "Free"}
                      </span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
