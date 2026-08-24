import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Calculator, DollarSign, Palette, Settings, FileText, BarChart3,
  LogOut, Menu, X, ExternalLink, Megaphone, Layers, Image, GraduationCap, Gift, Globe,
  BookOpen, Users, Search, Plug, ShieldCheck, Sun, Moon, HardHat, Mail, AlertTriangle, Package, Calendar, FileSignature, Type, Factory, Building2, Briefcase, ShoppingBag, Cpu, MapPin, Camera, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { classNames } from '@/lib/utils';
import { useTheme } from '@/lib/theme';

// =========================================================
// Admin sidebar — organized into logical modules
// =========================================================
// Each module is a group with a heading and items. This replaces the
// previous flat list and makes the admin panel scalable.

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

interface NavModule {
  heading: string;
  items: NavItem[];
}

const navModules: NavModule[] = [
  {
    heading: 'Dashboard',
    items: [
      { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true },
    ],
  },
  {
    heading: 'Content',
    items: [
      { label: 'Learn Articles', to: '/admin/learn', icon: BookOpen },
      { label: 'AI Learning Assistant', to: '/admin/ai-learning', icon: GraduationCap },
      { label: 'Legal Pages', to: '/admin/legal', icon: FileText },
      { label: 'Contact Messages', to: '/admin/contact', icon: Mail },
    ],
  },
  {
    heading: 'Color Library',
    items: [
      { label: 'Color Gallery', to: '/admin/colors', icon: Palette },
    ],
  },
  {
    heading: 'Media Library',
    items: [
      { label: 'Media Manager', to: '/admin/media', icon: Image },
    ],
  },
  {
    heading: 'Estimation Engine',
    items: [
      { label: 'Products', to: '/admin/estimation-products', icon: Layers },
      { label: 'Materials', to: '/admin/estimation-materials', icon: Layers },
      { label: 'Config & Rules', to: '/admin/estimation-config', icon: Settings },
      { label: 'Pricing', to: '/admin/estimation-pricing', icon: DollarSign },
      { label: 'Estimates', to: '/admin/estimation-estimates', icon: FileText },
      { label: 'Audit Log', to: '/admin/estimation-audit', icon: ShieldCheck },
      { label: 'Production Rules', to: '/admin/estimation-production', icon: Factory },
      { label: 'Engine Test Calculator', to: '/admin/paint-engine-test', icon: Calculator },
      { label: 'Price Updater', to: '/admin/price-updater', icon: TrendingUp },
      { label: 'Tyrolene Config', to: '/admin/tyrolene-config', icon: Building2 },
      { label: 'Engine Config', to: '/admin/engine-config', icon: Cpu },
    ],
  },
  {
    heading: 'Calculators',
    items: [
      { label: 'Paint Calculator (Legacy)', to: '/admin/paint-types', icon: Calculator },
      { label: 'Wall Screeding', to: '/admin/screeding', icon: Layers },
      { label: 'POP Ceiling', to: '/admin/pop-materials', icon: Layers },
      { label: 'Tile Library', to: '/admin/tile-materials', icon: Layers },
      { label: 'Templates', to: '/admin/templates', icon: Layers },
    ],
  },
  {
    heading: 'Pricing',
    items: [
      { label: 'Cost & Pricing', to: '/admin/pricing', icon: DollarSign },
      { label: 'Labour Settings', to: '/admin/labour-settings', icon: HardHat },
    ],
  },
  {
    heading: 'AI',
    items: [
      { label: 'AI Monetization', to: '/admin/ai-monetization', icon: DollarSign },
      { label: 'Ad Management', to: '/admin/ads', icon: Megaphone },
      { label: 'Rewarded Access', to: '/admin/rewarded-access', icon: Gift },
      { label: 'AI Developer Studio', to: '/admin/studio', icon: GraduationCap },
      { label: 'Image Estimation', to: '/admin/image-estimation', icon: Camera },
    ],
  },
  {
    heading: 'Users',
    items: [
      { label: 'User Management', to: '/admin/users', icon: Users },
    ],
  },
  {
    heading: 'Analytics',
    items: [
      { label: 'Analytics Dashboard', to: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    heading: 'SEO',
    items: [
      { label: 'SEO Settings', to: '/admin/seo', icon: Search },
    ],
  },
  {
    heading: 'Integrations',
    items: [
      { label: 'Integration Center', to: '/admin/integrations', icon: Plug },
    ],
  },
  {
    heading: 'Pro Connect',
    items: [
      { label: 'Professionals & Reports', to: '/admin/pro-connect', icon: Briefcase },
      { label: 'Marketplace', to: '/admin/marketplace', icon: ShoppingBag },
      { label: 'SEO & Location', to: '/admin/seo-location', icon: MapPin },
    ],
  },
  {
    heading: 'Contractor',
    items: [
      { label: 'Material Catalog', to: '/admin/material-catalog', icon: Package },
      { label: 'Timeline Templates', to: '/admin/timeline-templates', icon: Calendar },
      { label: 'Quotation Settings', to: '/admin/quotation-settings', icon: FileSignature },
    ],
  },
  {
    heading: 'International',
    items: [
      { label: 'Markets & Regions', to: '/admin/markets', icon: Globe },
      { label: 'Market Intelligence', to: '/admin/market-intelligence', icon: TrendingUp },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Site Branding', to: '/admin/branding', icon: Palette },
      { label: 'Typography', to: '/admin/typography', icon: Type },
      { label: 'Site Settings', to: '/admin/settings', icon: Settings },
      { label: 'Studio Management', to: '/admin/studio/management', icon: ShieldCheck },
      { label: 'Error Monitor', to: '/admin/errors', icon: AlertTriangle },
    ],
  },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  async function handleSignOut() {
    await signOut();
    navigate('/admin/login');
  }

  return (
    <div className="admin-layout min-h-screen bg-neutral-50 dark:bg-[#0a0a0f]">
      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900 lg:hidden">
        <span className="text-sm font-bold text-brand-navy dark:text-white">FRELUX Admin</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={toggle} aria-label="Toggle dark mode" className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button type="button" onClick={() => setMobileOpen(true)} className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800" aria-label="Open admin menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:flex">
          <SidebarContent user={user?.email} onSignOut={handleSignOut} theme={theme} onToggleTheme={toggle} />
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl dark:bg-neutral-900">
              <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
                <span className="text-sm font-bold text-brand-navy dark:text-white">FRELUX Admin</span>
                <button type="button" onClick={() => setMobileOpen(false)} className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800" aria-label="Close admin menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent user={user?.email} onSignOut={handleSignOut} onNavigate={() => setMobileOpen(false)} theme={theme} onToggleTheme={toggle} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ user, onSignOut, onNavigate, theme, onToggleTheme }: { user?: string; onSignOut: () => void; onNavigate?: () => void; theme: string; onToggleTheme: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="hidden border-b border-neutral-200 px-5 py-4 dark:border-neutral-800 lg:block">
        <span className="text-base font-bold text-brand-navy dark:text-white">FRELUX Admin</span>
        <p className="text-xs text-neutral-400">Platform management</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {navModules.map((module) => (
          <div key={module.heading} className="mb-4">
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">{module.heading}</p>
            <div className="space-y-0.5">
              {module.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) => classNames(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-brand-purple text-white dark:nav-active' : 'text-neutral-600 hover:bg-neutral-100 hover:text-brand-purple dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-brand-purple-light'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        <div className="mb-2 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
            <ExternalLink className="h-4 w-4" /> View website
          </Link>
          <button type="button" onClick={onToggleTheme} aria-label="Toggle dark mode" className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-1 px-3 py-1 text-xs text-neutral-400 truncate">{user}</div>
        <button type="button" onClick={onSignOut} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
