import { useEffect, useState, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Calculator,
  LogIn,
  LogOut,
  User,
  ChevronDown,
  Sun,
  Moon,
  LayoutDashboard,
  ShoppingBag,
  Briefcase,
  Package,
  UserCircle,
  ClipboardList,
  FileStack,
  Gem,
  Bot,
  Users,
  BarChart3,
  Search,
  ChevronRight,
  Crown,
  MessageCircle,
} from "lucide-react";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import Logo from "@/components/brand/Logo";
import { navWorkspaces, type NavChild } from "@/config/site";
import { classNames } from "@/lib/utils";
import { whatsappUrl } from "@/lib/analytics";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits-context";

import { useTheme } from "@/lib/theme";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { AccessibilityToggle } from "@/components/ui/AccessibilityToggle";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const location = useLocation();
  const { user, profile, signOut, isPaid, paidStatus } = useAuth();
  const { wallet } = useCredits();
  const { theme, toggle } = useTheme();
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
    setMobileExpanded(null);
  }, [location.pathname]);

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
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
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
      section: "Account",
      items: [
        { label: "My Profile", to: "/profile", icon: UserCircle },
        { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
        { label: "My Estimates", to: "/my-projects", icon: ClipboardList },
        { label: "Calculator Templates", to: "/my-templates", icon: FileStack },
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
        { label: "My Projects", to: "/contractor", icon: FileStack },
        { label: "Clients", to: "/clients", icon: Users },
        { label: "Analytics", to: "/analytics", icon: BarChart3 },
      ],
    },
    {
      section: "Plan",
      items: [
        { label: "Pricing", to: "/pricing", icon: Crown },
        { label: "Brand Studio", to: "/brand-studio", icon: Crown },
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
          "fixed top-0 z-40 w-full transition-all duration-500",
          scrolled
            ? "glass-premium border-b border-border/40 shadow-sm dark:border-white/5 dark:glass-dark-premium"
            : "bg-white/50 backdrop-blur-md border-b border-transparent dark:bg-background/50 dark:border-transparent",
        )}
      >
        <nav
          ref={navRef}
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        >
          {/* Logo — left */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-card-foreground transition-all hover:bg-muted active:scale-95 lg:hidden dark:text-muted-foreground/60 dark:hover:bg-white/5"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-[22px] w-[22px]" strokeWidth={1.75} />
            </button>
            <Link
              to="/"
              aria-label="FRELUX PAINT CALC home"
              className="shrink-0"
            >
              <Logo />
            </Link>
          </div>

          {/* Desktop nav with premium grouped dropdowns */}
          <div className="hidden items-center gap-1 lg:flex">
            {navWorkspaces.map((workspace) => (
              <div key={workspace.label} className="relative">
                {workspace.children ? (
                  <>
                    <button
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
                      {workspace.label}
                      <ChevronDown
                        className={classNames(
                          "h-3 w-3 transition-transform duration-300",
                          openDropdown === workspace.label && "rotate-180",
                        )}
                      />
                    </button>
                    {openDropdown === workspace.label && (
                      <div
                        className="absolute left-0 top-full z-50 pt-1"
                        onMouseLeave={() => setOpenDropdown(null)}
                      >
                        {/* Premium mega-menu panel */}
                        <div
                          className="origin-top-left rounded-2xl border border-border/50 bg-card shadow-premium-lg dark:border-white/10 dark:bg-card"
                          style={{
                            animation:
                              "navDropdownIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
                          }}
                        >
                          {/* Dropdown header bar */}
                          <div className="flex items-center justify-between rounded-t-2xl border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent px-5 py-2.5 dark:border-white/5 dark:from-primary/10">
                            <NavLink
                              to={workspace.path}
                              className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-brand-purple dark:text-muted-foreground dark:hover:text-brand-purple-lighter"
                            >
                              {workspace.label}
                              <ChevronRight className="h-3 w-3" />
                            </NavLink>
                          </div>

                          {/* Grouped sections — multi-column for large menus */}
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
                                      <div className="px-3 pb-1 pt-2.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-muted-foreground">
                                          {group.section}
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
                                            "group flex items-start gap-3 rounded-xl px-3 py-2 transition-all duration-150",
                                            isActive
                                              ? "bg-primary/8"
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
                                            {child.label}
                                          </p>
                                          {child.description && (
                                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground dark:text-muted-foreground">
                                              {child.description}
                                            </p>
                                          )}
                                        </div>
                                      </NavLink>
                                    ))}
                                    {gi < groups.length - 1 && (
                                      <div className="mx-3 my-1.5 border-t border-border/50 dark:border-white/5" />
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
                    {workspace.label}
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
                    {workspace.label}
                  </NavLink>
                )}
              </div>
            ))}
          </div>

          {/* Right side: utility icons, account, and primary CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search (desktop only) */}
            <button
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
              <kbd className="rounded border border-border px-1 text-[10px] font-medium dark:border-white/10">
                ⌘K
              </kbd>
            </button>

            {/* Utility toggles (desktop only) */}
            <div className="hidden items-center gap-1 lg:flex">
              <AccessibilityToggle />
              <LanguageSwitcher />
              <button
                type="button"
                onClick={toggle}
                aria-label="Toggle dark mode"
                className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-card-foreground active:scale-95 dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-muted-foreground/60"
              >
                {theme === "dark" ? (
                  <Sun className="h-[18px] w-[18px]" />
                ) : (
                  <Moon className="h-[18px] w-[18px]" />
                )}
              </button>
              <a
                href={whatsappUrl(
                  "Hello FRELUX, I would like to chat about a paint project.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
                className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-accent-green active:scale-95 dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-accent-green"
              >
                <MessageCircle className="h-[18px] w-[18px]" />
              </a>
            </div>

            {/* Language switcher — Nigerian languages */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenDropdown(openDropdown === "account" ? null : "account")
                }
                className={classNames(
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-card-foreground active:scale-95 dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-muted-foreground/60",
                  openDropdown === "account" &&
                    "bg-muted text-brand-purple dark:bg-white/5 dark:text-brand-purple-lighter",
                )}
                aria-label={user ? "Account menu" : "Sign in"}
                aria-expanded={openDropdown === "account"}
              >
                {user && profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : user ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
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
                  className="absolute right-0 top-full z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/30 bg-white/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2),0_8px_30px_-12px_rgba(0,0,0,0.12)] animate-fade-in-up dark:border-white/10 dark:bg-background-mid/95"
                  style={{
                    animationDuration: "0.22s",
                    transformOrigin: "top right",
                  }}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  {user ? (
                    <>
                      {/* Premium profile header with glass gradient */}
                      <div className="relative overflow-hidden rounded-t-2xl px-5 pt-5 pb-4">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/14 via-primary/5 to-transparent dark:from-primary/25 dark:via-primary/10" />
                        <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-primary/8 blur-2xl dark:bg-primary/15" />
                        <div className="relative flex items-center gap-3.5">
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-12 w-12 rounded-full object-cover ring-2 ring-white/40 shadow-lg dark:ring-white/20"
                            />
                          ) : (
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-base font-bold text-primary-foreground shadow-lg ring-2 ring-white/40 dark:ring-white/20">
                              {(
                                profile?.full_name?.charAt(0) ||
                                (user.email ?? "?")
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate dark:text-muted-foreground/40">
                              {profile?.full_name || user.email?.split("@")[0]}
                            </p>
                            <p className="text-xs text-muted-foreground truncate dark:text-muted-foreground">
                              {user.email}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {isPaid && <PremiumBadge size="xs" glow />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Credits balance card */}
                      <div className="px-3 pb-2">
                        <div className="rounded-xl border border-border/50 bg-gradient-to-br from-muted/50 to-card px-3.5 py-3 dark:border-white/5 dark:from-white/5 dark:to-transparent">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-deep text-primary-foreground shadow-sm">
                                <Bot className="h-3.5 w-3.5" />
                              </span>
                              <span className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground/80">
                                AI Credits
                              </span>
                            </div>
                            <Link
                              to="/rewards"
                              onClick={() => setOpenDropdown(null)}
                              className="text-[10px] font-medium text-brand-purple transition-opacity hover:opacity-70 dark:text-brand-purple-lighter"
                            >
                              Manage →
                            </Link>
                          </div>
                          <div className="mt-2.5 flex items-end justify-between">
                            <div>
                              <span className="text-2xl font-bold tracking-tight text-foreground dark:text-muted-foreground/40">
                                {wallet?.balance ?? 0}
                              </span>
                              <span className="ml-1 text-[11px] font-medium text-muted-foreground dark:text-muted-foreground">
                                available
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                {wallet?.total_earned ?? 0}
                              </span>
                              <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                                total owned
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Plan strip */}
                      <div className="flex items-center justify-between gap-2 border-y border-border/50 bg-muted/40 px-5 py-2 dark:border-white/5 dark:bg-white/3">
                        <Link
                          to="/dashboard"
                          onClick={() => setOpenDropdown(null)}
                          className="flex flex-col items-center gap-0.5 transition-opacity hover:opacity-70"
                        >
                          <span className="flex items-center gap-1 text-sm font-bold text-brand-purple dark:text-brand-purple-lighter">
                            {isPaid ? (
                              <PremiumBadge size="xs" minimal />
                            ) : (
                              "Free"
                            )}
                          </span>
                          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                            Plan
                          </span>
                        </Link>
                        <div className="h-7 w-px bg-muted dark:bg-white/10" />
                        <Link
                          to="/rewards"
                          onClick={() => setOpenDropdown(null)}
                          className="flex flex-col items-center gap-0.5 transition-opacity hover:opacity-70"
                        >
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                            {wallet?.total_earned ?? 0}
                          </span>
                          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                            Lifetime Credits
                          </span>
                        </Link>
                        <div className="h-7 w-px bg-muted dark:bg-white/10" />
                        <Link
                          to="/pricing"
                          onClick={() => setOpenDropdown(null)}
                          className="flex flex-col items-center gap-0.5 transition-opacity hover:opacity-70"
                        >
                          <span className="text-sm font-bold text-muted-foreground dark:text-muted-foreground/80">
                            {wallet?.total_spent ?? 0}
                          </span>
                          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                            Spent
                          </span>
                        </Link>
                      </div>

                      {/* Grouped menu sections */}
                      <div
                        className="max-h-[min(70vh,420px)] overflow-y-auto nav-scroll px-2 py-1.5"
                        style={{ scrollbarWidth: "thin" }}
                      >
                        {accountMenuSections.map((section, si) => (
                          <div key={section.section}>
                            {si > 0 && (
                              <div className="mx-2 my-1.5 border-t border-border/50 dark:border-white/5" />
                            )}
                            <p className="px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
                              {section.section}
                            </p>
                            {section.items.map((item) => {
                              const Icon = item.icon;
                              return (
                                <Link
                                  key={item.label}
                                  to={item.to}
                                  target={item.external ? "_blank" : undefined}
                                  rel={
                                    item.external
                                      ? "noopener noreferrer"
                                      : undefined
                                  }
                                  onClick={() => setOpenDropdown(null)}
                                  className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/6 hover:text-brand-purple dark:text-muted-foreground/80 dark:hover:bg-white/5 dark:hover:text-brand-purple-lighter"
                                >
                                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-purple dark:text-muted-foreground dark:group-hover:text-brand-purple-lighter" />
                                  {item.label}
                                </Link>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      {/* Sign out footer */}
                      <div className="border-t border-border/50 px-2 py-2.5 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            signOut();
                            setOpenDropdown(null);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:bg-red-50 hover:text-red-500 dark:text-muted-foreground dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          <LogOut className="h-4 w-4 shrink-0" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-2">
                      <div className="px-5 py-2 pb-3">
                        <p className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                          Welcome to FRELUX
                        </p>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                          Sign in to access your projects, estimates, and
                          rewards.
                        </p>
                      </div>
                      <div className="px-2">
                        <Link
                          to="/login"
                          onClick={() => setOpenDropdown(null)}
                          className="flex items-center gap-2.5 rounded-xl bg-primary/5 px-3 py-2.5 text-sm font-semibold text-brand-purple transition-all hover:bg-primary/10 dark:bg-primary/10 dark:text-brand-purple-lighter dark:hover:bg-primary/20"
                        >
                          <LogIn className="h-4 w-4 shrink-0" />
                          Sign In
                        </Link>
                        <Link
                          to="/login?mode=signup"
                          onClick={() => setOpenDropdown(null)}
                          className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5"
                        >
                          <User className="h-4 w-4 shrink-0" />
                          Create Account
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Primary CTA — Start Calculating */}
            <Link
              to="/paint-calculator?mode=room-estimate"
              className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-brand-purple/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-brand-purple/30 hover:-translate-y-0.5 active:scale-[0.98] dark:bg-primary dark:hover:bg-primary/90"
            >
              <Calculator className="h-4 w-4" />
              Start Calculating
            </Link>
          </div>
        </nav>
      </header>

      {/* ===== Mobile drawer — premium collapsible sections ===== */}
      <div
        className={classNames(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        {/* Scrim */}
        <div
          className={classNames(
            "absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer */}
        <div
          className={classNames(
            "absolute left-0 top-0 h-full w-[300px] max-w-[300px] overflow-y-auto bg-card shadow-2xl transition-transform duration-300 dark:bg-background",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 dark:border-white/5">
            <Link to="/" onClick={() => setMobileOpen(false)}>
              <Logo />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted dark:hover:bg-white/5"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer nav — collapsible sections */}
          <div className="px-3 py-4">
            {navWorkspaces.map((workspace) => (
              <div key={workspace.label} className="mb-1">
                {workspace.children ? (
                  <>
                    <button
                      onClick={() =>
                        setMobileExpanded(
                          mobileExpanded === workspace.label
                            ? null
                            : workspace.label,
                        )
                      }
                      className={classNames(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                        location.pathname.startsWith(workspace.path)
                          ? "bg-primary/8 text-brand-purple dark:bg-primary/15 dark:text-brand-purple-lighter"
                          : "text-card-foreground hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5",
                      )}
                    >
                      {workspace.label}
                      <ChevronDown
                        className={classNames(
                          "h-4 w-4 transition-transform duration-200",
                          mobileExpanded === workspace.label && "rotate-180",
                        )}
                      />
                    </button>
                    {mobileExpanded === workspace.label && (
                      <div className="ml-3 mt-1 border-l border-border/50 pl-3 dark:border-white/10">
                        {groupBySection(workspace.children).map((group, gi) => (
                          <div key={gi}>
                            {group.section && (
                              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 dark:text-muted-foreground">
                                {group.section}
                              </p>
                            )}
                            {group.items.map((child) => (
                              <NavLink
                                key={child.path}
                                to={child.path}
                                className={({ isActive }) =>
                                  classNames(
                                    "block rounded-lg px-3 py-2 text-sm transition-colors",
                                    isActive
                                      ? "font-medium text-brand-purple dark:text-brand-purple-lighter"
                                      : "text-muted-foreground hover:text-brand-purple dark:text-muted-foreground dark:hover:text-brand-purple-lighter",
                                  )
                                }
                              >
                                {child.label}
                              </NavLink>
                            ))}
                          </div>
                        ))}
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
                    {workspace.label}
                  </a>
                ) : (
                  <NavLink
                    to={workspace.path}
                    className={({ isActive }) =>
                      classNames(
                        "block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                        isActive
                          ? "bg-primary/8 text-brand-purple dark:bg-primary/15 dark:text-brand-purple-lighter"
                          : "text-card-foreground hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5",
                      )
                    }
                  >
                    {workspace.label}
                  </NavLink>
                )}
              </div>
            ))}

            {/* Language, Accessibility & Theme — stacked for narrow drawer */}
            <div className="mt-4 space-y-1 border-t border-border/50 pt-4 dark:border-white/5">
              <AccessibilityToggle inline={true} />
              <LanguageSwitcher inline={true} />
              <button
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
              </button>
            </div>

            {/* WhatsApp contact */}
            <a
              href={whatsappUrl(
                "Hello FRELUX, I would like to chat about a paint project.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 dark:text-muted-foreground/80 dark:hover:bg-white/5"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
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
                    to="/rewards"
                    onClick={() => setMobileOpen(false)}
                    className="ml-auto text-[10px] font-medium text-brand-purple dark:text-brand-purple-lighter"
                  >
                    Manage →
                  </Link>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                      Available
                    </span>
                    <span className="text-lg font-bold text-foreground dark:text-muted-foreground/40">
                      {wallet?.balance ?? 0}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-muted dark:bg-white/10" />
                  <Link
                    to="/rewards"
                    onClick={() => setMobileOpen(false)}
                    className="flex flex-col transition-opacity hover:opacity-70"
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                      Total Owned
                    </span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {wallet?.total_earned ?? 0}
                    </span>
                  </Link>
                  <div className="h-8 w-px bg-muted dark:bg-white/10" />
                  <Link
                    to="/pricing"
                    onClick={() => setMobileOpen(false)}
                    className="flex flex-col transition-opacity hover:opacity-70"
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                      Plan
                    </span>
                    <span className="flex items-center gap-1 text-sm font-bold text-brand-purple dark:text-brand-purple-lighter">
                      {isPaid ? <PremiumBadge size="xs" minimal /> : "Free"}
                    </span>
                  </Link>
                </div>
              </div>
            )}

            {/* Primary CTA */}
            <Link
              to="/paint-calculator?mode=room-estimate"
              onClick={() => setMobileOpen(false)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-brand-purple/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <Calculator className="h-4 w-4" />
              Start Calculating
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
