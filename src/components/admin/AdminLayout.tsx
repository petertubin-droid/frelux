import { useState, useEffect, useMemo } from "react";
import {
  NavLink,
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Globe2,
  ScanLine,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Coins,
  Cpu,
  Crown,
  Dna,
  DollarSign,
  ExternalLink,
  Factory,
  FileSignature,
  FileText,
  Gem,
  Gift,
  Globe,
  GraduationCap,
  HardHat,
  Image,
  Images,
  KeyRound,
  Languages,
  Layers,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogOut,
  Handshake,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  MessageCircle,
  MessageSquare,
  CloudOff,
  Moon,
  Package,
  Paintbrush,
  Palette,
  Plug,
  Satellite,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sun,
  Tag,
  TrendingUp,
  Type,
  Users,
  X,
  Leaf,
  Wallet,
  Percent,
  Stethoscope,
  ChevronRight,
  Thermometer,
  RefreshCcw,
  Boxes,
  LineChart,
  ScrollText,
  SlidersHorizontal,
  FlaskConical,
  Wrench,
  ClipboardList,
  FileStack,
  Activity,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { classNames } from "@/lib/utils";
import { AdminThemeProvider, useAdminTheme } from "@/lib/admin-theme";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

// =========================================================
// Admin sidebar - 11 sections, owner-first control center.
//
// Mental model (one question per section):
//   Overview            Is FRELUX healthy?
//   Construction Eng.    Which engines exist and are they active?
//   Materials & Prices   Which materials/prices are configured?
//   Projects & Estimates How is FRELUX being used?
//   Users                Who uses FRELUX?
//   ARCHIE / AI          What is the AI doing?
//   Content              What does the site say?
//   Monetization         What earns money?
//   Marketplace & Pros   Pro/marketplace activity
//   System               Technical configuration
//   Security & Audit      What happened recently?
// =========================================================

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  /** Optional sub-group label rendered between items. */
  group?: string;
}

interface NavModule {
  heading: string;
  items: NavItem[];
}

const navModules: NavModule[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true },
    ],
  },
  {
    heading: "Construction Engines",
    items: [
      {
        label: "Engine Config",
        to: "/admin/engine-config",
        icon: Cpu,
        group: "Core",
      },
      {
        label: "Config & Rules",
        to: "/admin/estimation-config",
        icon: SlidersHorizontal,
      },
      {
        label: "Production Rules",
        to: "/admin/estimation-production",
        icon: Factory,
      },
      {
        label: "Engine Test Calculator",
        to: "/admin/paint-engine-test",
        icon: FlaskConical,
      },
      {
        label: "Paint Types (Legacy)",
        to: "/admin/paint-types",
        icon: Paintbrush,
        group: "Materials & Finishes",
      },
      { label: "Wall Screeding", to: "/admin/screeding", icon: Layers },
      { label: "POP Ceiling", to: "/admin/pop-materials", icon: Building2 },
      { label: "Tile Library", to: "/admin/tile-materials", icon: Images },
      { label: "Paint Comparison", to: "/admin/paint-comparison", icon: Tag },
      {
        label: "Surface Conditions",
        to: "/admin/surface-conditions",
        icon: ClipboardList,
      },
      { label: "Tyrolene Config", to: "/admin/tyrolene-config", icon: Dna },
      {
        label: "Project Stages",
        to: "/admin/project-stages",
        icon: ListChecks,
        group: "Structure",
      },
      {
        label: "Timeline Templates",
        to: "/admin/timeline-templates",
        icon: Calendar,
      },
      {
        label: "Cash-Flow Templates",
        to: "/admin/cash-flow-templates",
        icon: Wallet,
        group: "Project & Cost",
      },
      { label: "Margin Presets", to: "/admin/margin-presets", icon: Percent },
      { label: "Defects", to: "/admin/defects", icon: Stethoscope },
      {
        label: "Maintenance Profiles",
        to: "/admin/maintenance-profiles",
        icon: Wrench,
      },
      { label: "Credit Profiles", to: "/admin/credit-profiles", icon: Scale },
      {
        label: "Solar Panels",
        to: "/admin/solar-panels",
        icon: Sun,
        group: "Building Services",
      },
      {
        label: "Conversational Packs",
        to: "/admin/conversational-packs",
        icon: MessageCircle,
        group: "AI Engines",
      },
      { label: "Counter-Vision", to: "/admin/count-vision", icon: ScanLine },
      {
        label: "Image Estimation",
        to: "/admin/image-estimation",
        icon: Camera,
      },
      { label: "Field Sync", to: "/admin/field-sync", icon: CloudOff },
      { label: "Roof View Imagery", to: "/admin/roof-view", icon: Satellite },
      {
        label: "Regional Costs",
        to: "/admin/regional-cost-indices",
        icon: MapPin,
        group: "Factor Tables",
      },
      {
        label: "Macro Tracker",
        to: "/admin/macro-tracker",
        icon: Activity,
        group: "Factor Tables",
      },
      { label: "Code Registry", to: "/admin/code-registry", icon: Scale },
      { label: "Carbon Factors", to: "/admin/carbon-factors", icon: Leaf },
      {
        label: "Thermal Factors",
        to: "/admin/thermal-factors",
        icon: Thermometer,
      },
      { label: "Reuse Factors", to: "/admin/reuse-factors", icon: RefreshCcw },
    ],
  },
  {
    heading: "Materials & Prices",
    items: [
      {
        label: "Material Catalog",
        to: "/admin/material-catalog",
        icon: Boxes,
        group: "Materials",
      },
      {
        label: "Estimation Materials",
        to: "/admin/estimation-materials",
        icon: Package,
      },
      {
        label: "Estimation Products",
        to: "/admin/estimation-products",
        icon: Layers,
      },
      {
        label: "Material Prices",
        to: "/admin/material-prices",
        icon: DollarSign,
        group: "Prices",
      },
      {
        label: "Estimation Pricing",
        to: "/admin/estimation-pricing",
        icon: Coins,
      },
      { label: "Price Updater", to: "/admin/price-updater", icon: TrendingUp },
      { label: "Price Scan", to: "/admin/price-scan", icon: ScanLine },
      { label: "Market Prices", to: "/admin/market-prices", icon: Globe2 },
      { label: "Price Pipeline", to: "/admin/price-pipeline", icon: Globe },
      { label: "Solar Prices", to: "/admin/solar-prices", icon: Sun },
      { label: "Labour Rates", to: "/admin/labour-rates", icon: HardHat },
      { label: "Labour Settings", to: "/admin/labour-settings", icon: HardHat },
      { label: "Cost & Pricing", to: "/admin/pricing", icon: DollarSign },
      {
        label: "Market Intelligence",
        to: "/admin/market-intelligence",
        icon: LineChart,
      },
      {
        label: "Community Prices",
        to: "/admin/price-submissions",
        icon: ClipboardList,
      },
    ],
  },
  {
    heading: "Projects & Estimates",
    items: [
      { label: "Estimates", to: "/admin/estimation-estimates", icon: FileText },
      { label: "Templates", to: "/admin/templates", icon: FileStack },
      {
        label: "Quotation Settings",
        to: "/admin/quotation-settings",
        icon: FileSignature,
      },
      {
        label: "PDF Branding & Templates",
        to: "/admin/pdf-branding",
        icon: FileText,
      },
    ],
  },
  {
    heading: "Users",
    items: [
      { label: "User Management", to: "/admin/users", icon: Users },
      {
        label: "Roles & Permissions",
        to: "/admin/studio/role_management",
        icon: KeyRound,
      },
      { label: "Analytics Dashboard", to: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    heading: "ARCHIE / AI",
    items: [
      { label: "AI Control Center", to: "/admin/ai-settings", icon: Crown },
      { label: "AI Assistant", to: "/admin/ai-assistant", icon: Brain },
      {
        label: "AI Learning Assistant",
        to: "/admin/ai-learning",
        icon: GraduationCap,
      },
      {
        label: "Learning Review",
        to: "/admin/learning-review",
        icon: BookOpen,
      },
      {
        label: "Intelligence Sources",
        to: "/admin/intelligence-sources",
        icon: Search,
      },
      {
        label: "Intelligence Dashboard",
        to: "/admin/intelligence-dashboard",
        icon: Activity,
      },
    ],
  },
  {
    heading: "Content",
    items: [
      { label: "Learn Articles", to: "/admin/learn", icon: BookOpen },
      {
        label: "Wall Finishing Library",
        to: "/admin/learn/wall-finishing",
        icon: Globe,
      },
      {
        label: "Construction Dictionary",
        to: "/admin/dictionary",
        icon: Languages,
      },
      { label: "Color Gallery", to: "/admin/colors", icon: Palette },
      {
        label: "Gallery Moderation",
        to: "/admin/gallery-moderation",
        icon: Images,
      },
      { label: "Case Studies", to: "/admin/case-studies", icon: Images },
      { label: "Testimonials", to: "/admin/testimonials", icon: Images },
      { label: "Media Manager", to: "/admin/media", icon: Image },
      { label: "Legal Pages", to: "/admin/legal", icon: FileText },
      { label: "Contact Messages", to: "/admin/contact", icon: Mail },
      {
        label: "Partnership Inquiries",
        to: "/admin/partnership-inquiries",
        icon: Handshake,
      },
      {
        label: "Feedback & Suggestions",
        to: "/admin/feedback",
        icon: MessageSquare,
      },
      { label: "SEO Settings", to: "/admin/seo", icon: Search },
    ],
  },
  {
    heading: "Monetization",
    items: [
      { label: "Ad Management", to: "/admin/ads", icon: Megaphone },
      { label: "AI Monetization", to: "/admin/ai-monetization", icon: Crown },
      { label: "Rewarded Access", to: "/admin/rewarded-access", icon: Gift },
      { label: "Credits & Rewards", to: "/admin/rewards", icon: Gem },
      { label: "Credits & Rewarded Ads", to: "/admin/credits-ads", icon: Gift },
    ],
  },
  {
    heading: "Marketplace & Pros",
    items: [
      { label: "Marketplace", to: "/admin/marketplace", icon: ShoppingBag },
      { label: "Marketplace Products", to: "/admin/products", icon: Package },
      {
        label: "Professionals & Reports",
        to: "/admin/pro-connect",
        icon: Briefcase,
      },
      { label: "Pro SEO & Location", to: "/admin/seo-location", icon: MapPin },
    ],
  },
  {
    heading: "System",
    items: [
      { label: "Site Settings", to: "/admin/settings", icon: Settings },
      { label: "Currency & FX Rates", to: "/admin/currency", icon: Coins },
      { label: "Site Branding", to: "/admin/branding", icon: Palette },
      { label: "Header Images", to: "/admin/header-images", icon: Image },
      { label: "Typography", to: "/admin/typography", icon: Type },
      {
        label: "Social Brand Center",
        to: "/admin/social-brand-center",
        icon: Link2,
      },
      { label: "API Keys", to: "/admin/api-keys", icon: KeyRound },
      { label: "Integration Center", to: "/admin/integrations", icon: Plug },
      { label: "AI Developer Studio", to: "/admin/studio", icon: Smartphone },
      { label: "Markets & Regions", to: "/admin/markets", icon: Globe },
    ],
  },
  {
    heading: "Security & Audit",
    items: [
      { label: "Audit Log", to: "/admin/estimation-audit", icon: ScrollText },
      { label: "Error Monitor", to: "/admin/errors", icon: AlertTriangle },
      {
        label: "Error Analysis",
        to: "/admin/error_analysis",
        icon: AlertTriangle,
      },
      { label: "System Health", to: "/admin/system-health", icon: ShieldCheck },
    ],
  },
];

const ADMIN_SIDEBAR_COLLAPSED_KEY = "admin:sidebar-collapsed";

/** Flat path lookup for breadcrumbs and search. */
const flatNav: { heading: string; item: NavItem }[] = navModules.flatMap((m) =>
  m.items.map((item) => ({ heading: m.heading, item })),
);

function crumbsFor(pathname: string): { label: string; to?: string }[] {
  const crumbs: { label: string; to?: string }[] = [
    { label: "Admin", to: "/admin" },
  ];
  if (pathname === "/admin") return crumbs;
  const match =
    flatNav.find((f) => f.item.to === pathname) ??
    flatNav
      .filter(
        (f) => f.item.to !== "/admin" && pathname.startsWith(f.item.to + "/"),
      )
      .sort((a, b) => b.item.to.length - a.item.to.length)[0];
  if (match) {
    crumbs.push({ label: match.heading });
    crumbs.push({ label: match.item.label });
  }
  return crumbs;
}

function Breadcrumbs() {
  const { t } = useLanguage();
  const location = useLocation();
  const crumbs = crumbsFor(location.pathname);
  if (crumbs.length < 2) return null;
  return (
    <nav
      aria-label={t("Breadcrumb")}
      className="mb-5 flex flex-wrap items-center gap-1.5 text-xs"
    >
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <ChevronRight
              className="h-3 w-3 text-muted-foreground/60"
              aria-hidden="true"
            />
          )}
          {c.to && i === 0 ? (
            <Link
              to={c.to}
              className="font-medium text-muted-foreground hover:text-brand-purple"
            >
              {c.label}
            </Link>
          ) : (
            <span
              className={
                i === crumbs.length - 1
                  ? "font-semibold text-foreground dark:text-primary-foreground"
                  : "font-medium text-muted-foreground"
              }
            >
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner />
    </AdminThemeProvider>
  );
}

function AdminLayoutInner() {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useAdminTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // overflow-y only - never touch overflow-x, which must stay `clip`
    // (set globally in index.css) so position:sticky elements keep the
    // viewport as their scrolling ancestor instead of body/html.
    if (mobileOpen) {
      document.body.style.overflowY = "hidden";
    } else {
      document.body.style.overflowY = "";
    }
    return () => {
      document.body.style.overflowY = "";
    };
  }, [mobileOpen]);

  async function handleSignOut() {
    await signOut();
    navigate("/admin/login");
  }

  return (
    <div className="admin-layout min-h-screen bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_15%_-10%,hsl(var(--primary)/0.10),transparent_60%),radial-gradient(900px_500px_at_100%_0%,hsl(var(--ring)/0.08),transparent_55%)] dark:bg-[radial-gradient(1200px_600px_at_15%_-10%,hsl(var(--primary)/0.18),transparent_60%),radial-gradient(900px_500px_at_100%_0%,hsl(var(--ring)/0.12),transparent_55%)]"
      />
      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-card/80 px-4 backdrop-blur-xl dark:border-white/10 lg:hidden">
        <span className="text-sm font-bold text-foreground dark:text-primary-foreground">
          {t("FRELUX Admin")}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            type="button"
            onClick={toggle}
            aria-label={t("Toggle dark mode")}
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground dark:text-muted-foreground/80 dark:hover:bg-card-foreground/90"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted dark:text-muted-foreground/80 dark:hover:bg-card-foreground/90"
            aria-label={t("Open admin menu")}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-card/70 backdrop-blur-xl dark:border-white/10 dark:bg-background/80 lg:flex">
          <SidebarContent
            user={user?.email}
            onSignOut={handleSignOut}
            theme={theme}
            onToggleTheme={toggle}
          />
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-64 border-r border-border/60 bg-card/95 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-background/95">
              <div className="flex h-14 items-center justify-between border-b border-border px-4 dark:border-border">
                <span className="text-sm font-bold text-foreground dark:text-primary-foreground">
                  {t("FRELUX Admin")}
                </span>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted dark:text-muted-foreground/80 dark:hover:bg-card-foreground/90"
                  aria-label={t("Close admin menu")}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <SidebarContent
                user={user?.email}
                onSignOut={handleSignOut}
                onNavigate={() => setMobileOpen(false)}
                theme={theme}
                onToggleTheme={toggle}
              />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  user,
  onSignOut,
  onNavigate,
  theme,
  onToggleTheme,
}: {
  user?: string;
  onSignOut: () => void;
  onNavigate?: () => void;
  theme: string;
  onToggleTheme: () => void;
}) {
  const { t } = useLanguage();
  // Sidebar search filters sections/pages so the owner can jump straight to
  // any admin page (materials, prices, engines, users, settings…) instead of
  // hunting through the sidebar.
  const [query, setQuery] = useState("");

  // Collapsible category dropdowns. The collapsed set persists across
  // visits (localStorage). On first use everything starts collapsed except
  // the section containing the current page, so the sidebar reads as an
  // organized menu of categories instead of a ~100-link wall.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY);
      if (!raw) return new Set<string>(navModules.map((m) => m.heading));
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set<string>(navModules.map((m) => m.heading));
    }
  });
  const toggleCollapsed = (heading: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(heading)) next.delete(heading);
      else next.add(heading);
      try {
        localStorage.setItem(
          ADMIN_SIDEBAR_COLLAPSED_KEY,
          JSON.stringify([...next]),
        );
      } catch {
        /* storage unavailable - keep in-memory state */
      }
      return next;
    });
  };
  const location = useLocation();
  // The section of the active page always stays open, even if collapsed,
  // so the owner never loses sight of where they are.
  const activeHeading = useMemo(() => {
    const match = flatNav.find((f) => f.item.to === location.pathname);
    if (match) return match.heading;
    const prefix = flatNav
      .filter(
        (f) =>
          f.item.to !== "/admin" &&
          location.pathname.startsWith(f.item.to + "/"),
      )
      .sort((a, b) => b.item.to.length - a.item.to.length)[0];
    return prefix?.heading;
  }, [location.pathname]);

  const q = query.trim().toLowerCase();
  const modules = useMemo(
    () =>
      q
        ? navModules
            .map((m) => ({
              heading: m.heading,
              items: m.items.filter(
                (i) =>
                  i.label.toLowerCase().includes(q) ||
                  (i.group ?? "").toLowerCase().includes(q) ||
                  m.heading.toLowerCase().includes(q) ||
                  i.to.toLowerCase().includes(q),
              ),
            }))
            .filter((m) => m.items.length > 0)
        : navModules,
    [q],
  );
  return (
    <div className="flex h-full flex-col">
      <div className="hidden border-b border-border/60 px-5 py-5 dark:border-white/10 lg:block">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-[13px] font-bold text-primary-foreground shadow-[0_8px_18px_-10px_hsl(var(--primary))]"
          >
            F
          </span>
          <div className="min-w-0">
            <span className="block font-display text-sm font-bold leading-tight tracking-tight text-foreground">
              {t("FRELUX Admin")}
            </span>
            <p className="text-[11px] text-muted-foreground">
              {t("Platform management")}
            </p>
          </div>
        </div>
      </div>
      <div className="border-b border-border/60 p-3 dark:border-white/10">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search admin pages…")}
            aria-label={t("Search admin pages")}
            className="h-9 w-full rounded-lg border border-border/60 bg-card/70 pl-8 pr-3 text-sm text-foreground shadow-sm backdrop-blur outline-none transition-all placeholder:text-muted-foreground/70 hover:border-border focus:border-primary focus:ring-2 focus:ring-ring/30 dark:border-white/10 dark:bg-white/5"
          />
        </div>
      </div>

      <nav
        className="flex-1 overflow-y-auto p-3"
        aria-label={t("Admin sections")}
      >
        {modules.map((module) => {
          let lastGroup: string | undefined;
          // When searching, every matching section is force-expanded so
          // results are visible immediately; otherwise sections open when
          // not collapsed (or when they hold the active page).
          const isOpen = q
            ? true
            : !collapsed.has(module.heading) ||
              module.heading === activeHeading;
          return (
            <div key={module.heading} className="mb-2">
              <button
                type="button"
                onClick={() => toggleCollapsed(module.heading)}
                aria-expanded={isOpen}
                aria-label={`Toggle ${module.heading} section`}
                className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-primary dark:hover:bg-white/5"
              >
                <span>{module.heading}</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[9px] font-semibold text-muted-foreground/50">
                    {module.items.length}
                  </span>
                  <ChevronDown
                    className={classNames(
                      "h-3 w-3 transition-transform duration-200",
                      isOpen ? "rotate-0" : "-rotate-90",
                    )}
                    aria-hidden="true"
                  />
                </span>
              </button>
              <div className="mt-0.5 space-y-0.5">
                {module.items.map((item) => {
                  if (!isOpen) return null;
                  const Icon = item.icon;
                  const showGroup = item.group && item.group !== lastGroup;
                  lastGroup = item.group;
                  return (
                    <div key={item.to}>
                      {showGroup && (
                        <p className="mt-2 px-3 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                          {item.group}
                        </p>
                      )}
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          classNames(
                            "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-[0_10px_24px_-14px_hsl(var(--primary)),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:text-muted-foreground/90 dark:hover:bg-white/5 dark:hover:text-foreground",
                          )
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </NavLink>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {modules.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No admin pages match “{query}”.
          </p>
        )}
      </nav>

      <div className="border-t border-border/60 p-3 dark:border-white/10">
        <div className="mb-2 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted dark:text-muted-foreground/80 dark:hover:bg-card-foreground/90"
          >
            <ExternalLink className="h-4 w-4" /> {t("View website")}
          </Link>
          <Button
            variant="ghost"
            type="button"
            onClick={onToggleTheme}
            aria-label={t("Toggle dark mode")}
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground dark:text-muted-foreground/80 dark:hover:bg-card-foreground/90"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="mt-1 px-3 py-1 text-xs text-muted-foreground truncate">
          {user}
        </div>
        <Button
          variant="ghost"
          type="button"
          onClick={onSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <LogOut className="h-4 w-4" /> {t("Sign out")}
        </Button>
      </div>
    </div>
  );
}
