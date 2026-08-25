import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Menu, X, Calculator, LogIn, LogOut, User, ChevronDown,
  Sun, Moon, LayoutDashboard, ShoppingBag, Briefcase, Package, UserCircle, ClipboardList, FileStack, Gem,
  Users, BarChart3, Search, ChevronRight, Crown,
} from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { navWorkspaces, type NavChild } from '@/config/site';
import { classNames } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useCredits } from '@/lib/credits-context';
import { useTheme } from '@/lib/theme';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { AccessibilityToggle } from '@/components/ui/AccessibilityToggle';

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
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const accountMenuItems = [
    { label: 'My Profile', to: '/profile', icon: UserCircle },
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My Estimates', to: '/my-projects', icon: ClipboardList },
    { label: 'Calculator Templates', to: '/my-templates', icon: FileStack },
    { label: 'Marketplace', to: '/marketplace', icon: ShoppingBag, external: true },
    { label: 'Pricing', to: '/pricing', icon: Crown },
    { label: 'Rewards', to: '/rewards', icon: Gem },
    { label: 'My Job Listings', to: '/marketplace/my-listings', icon: Briefcase },
    { label: 'My Products', to: '/marketplace/products/my', icon: Package },
    { label: 'My Projects', to: '/contractor', icon: FileStack },
    { label: 'Clients', to: '/clients', icon: Users },
    { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  ];

  // Group children by section for premium dropdown rendering
  function groupBySection(children: NavChild[] | undefined): { section: string | null; items: NavChild[] }[] {
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
          'fixed top-0 z-40 w-full transition-all duration-500',
          scrolled
            ? 'glass-premium border-b border-neutral-200/40 shadow-sm dark:border-white/5 dark:glass-dark-premium'
            : 'bg-white/50 backdrop-blur-md border-b border-transparent dark:bg-brand-navy/50 dark:border-transparent'
        )}
      >
        <nav ref={navRef} className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo — left */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-700 transition-all hover:bg-neutral-100 active:scale-95 lg:hidden dark:text-neutral-200 dark:hover:bg-white/5"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-[22px] w-[22px]" strokeWidth={1.75} />
            </button>
            <Link to="/" aria-label="FRELUX PAINT CALC home" className="shrink-0">
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
                      onClick={() => setOpenDropdown(openDropdown === workspace.label ? null : workspace.label)}
                      onMouseEnter={() => setOpenDropdown(workspace.label)}
                      className={classNames(
                        'flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200',
                        location.pathname.startsWith(workspace.path) || openDropdown === workspace.label
                          ? 'text-brand-purple dark:text-brand-purple-lighter'
                          : 'text-neutral-600 hover:text-brand-purple hover:bg-neutral-50 dark:text-neutral-300 dark:hover:text-brand-purple-lighter dark:hover:bg-white/5'
                      )}
                    >
                      {workspace.label}
                      <ChevronDown className={classNames('h-3 w-3 transition-transform duration-300', openDropdown === workspace.label && 'rotate-180')} />
                    </button>
                    {openDropdown === workspace.label && (
                      <div
                        className="absolute left-0 top-full z-50 min-w-[320px] max-w-[400px] rounded-2xl border border-neutral-200/40 bg-white/95 py-2 shadow-premium-lg backdrop-blur-xl animate-fade-in-up dark:border-white/10 dark:bg-brand-navy-mid/95"
                        style={{ animationDuration: '0.15s' }}
                        onMouseLeave={() => setOpenDropdown(null)}
                      >
                        {/* Dropdown header */}
                        <div className="px-4 py-2">
                          <NavLink
                            to={workspace.path}
                            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400 transition-colors hover:text-brand-purple dark:text-neutral-500 dark:hover:text-brand-purple-lighter"
                          >
                            {workspace.label}
                            <ChevronRight className="h-3 w-3" />
                          </NavLink>
                        </div>
                        {/* Grouped sections */}
                        {groupBySection(workspace.children).map((group, gi) => (
                          <div key={gi}>
                            {group.section && (
                              <div className="px-4 pb-1.5 pt-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-300 dark:text-neutral-600">
                                  {group.section}
                                </p>
                              </div>
                            )}
                            {group.items.map((child) => (
                              <NavLink
                                key={child.path}
                                to={child.path}
                                className={({ isActive }) => classNames(
                                  'group flex items-start gap-3 rounded-lg px-4 py-2 transition-all',
                                  isActive
                                    ? 'bg-brand-purple/5'
                                    : 'hover:bg-brand-purple/5'
                                )}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className={classNames(
                                    'text-sm font-medium transition-colors',
                                    location.pathname === child.path
                                      ? 'text-brand-purple dark:text-brand-purple-lighter'
                                      : 'text-neutral-700 group-hover:text-brand-purple dark:text-neutral-200 dark:group-hover:text-brand-purple-lighter'
                                  )}>
                                    {child.label}
                                  </p>
                                  {child.description && (
                                    <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                                      {child.description}
                                    </p>
                                  )}
                                </div>
                              </NavLink>
                            ))}
                            {gi < groupBySection(workspace.children).length - 1 && (
                              <div className="mx-4 my-1 border-t border-neutral-100 dark:border-white/5" />
                            )}
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
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-neutral-600 transition-all duration-200 hover:text-brand-purple hover:bg-neutral-50 dark:text-neutral-300 dark:hover:text-brand-purple-lighter dark:hover:bg-white/5"
                  >
                    {workspace.label}
                  </a>
                ) : (
                  <NavLink
                    to={workspace.path}
                    className={({ isActive }) => classNames(
                      'rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200',
                      isActive ? 'text-brand-purple dark:text-brand-purple-lighter' : 'text-neutral-600 hover:text-brand-purple hover:bg-neutral-50 dark:text-neutral-300 dark:hover:text-brand-purple-lighter dark:hover:bg-white/5'
                    )}
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
              onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true }); document.dispatchEvent(e); }}
              className="hidden items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-600 xl:flex dark:border-white/10 dark:hover:border-white/20"
              aria-label="Open command palette"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="rounded border border-neutral-200 px-1 text-[10px] font-medium dark:border-white/10">⌘K</kbd>
            </button>

            {/* Utility toggles (desktop only) */}
            <div className="hidden items-center gap-1 lg:flex">
              <AccessibilityToggle />
              <LanguageSwitcher />
              <button type="button" onClick={toggle} aria-label="Toggle dark mode" className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-700 active:scale-95 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200">
                {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </button>
            </div>

            {/* Language switcher — Nigerian languages */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'account' ? null : 'account')}
                className={classNames(
                  'inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-700 active:scale-95 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200',
                  openDropdown === 'account' && 'bg-neutral-100 text-brand-purple dark:bg-white/5 dark:text-brand-purple-lighter'
                )}
                aria-label={user ? 'Account menu' : 'Sign in'}
                aria-expanded={openDropdown === 'account'}
              >
                {user && profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : user ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-purple text-xs font-bold text-white">
                    {(profile?.full_name?.charAt(0) || (user.email ?? '?')).charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <UserCircle className="h-5 w-5" strokeWidth={1.5} />
                )}
              </button>

              {openDropdown === 'account' && (
                <div
                  className="absolute right-0 top-full z-50 min-w-[240px] rounded-2xl border border-neutral-200/40 bg-white/95 py-2 shadow-premium-lg backdrop-blur-xl animate-fade-in-up dark:border-white/10 dark:bg-brand-navy-mid/95"
                  style={{ animationDuration: '0.15s' }}
                >
                  {user ? (
                    <>
                      <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-white/5">
                        <div className="flex items-center gap-2.5">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple text-xs font-bold text-white">
                              {(profile?.full_name?.charAt(0) || (user.email ?? '?')).charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-neutral-700 truncate dark:text-neutral-200">{profile?.full_name || user.email?.split('@')[0]}</p>
                            <p className="text-xs text-neutral-400 truncate dark:text-neutral-500">{user.email}</p>
                            {isPaid && (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-purple/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-purple">
                                <Crown className="h-2.5 w-2.5" />
                                {paidStatus?.plan ? paidStatus.plan.toUpperCase() : 'PREMIUM'}
                              </span>
                            )}
                            {user && (
                              <Link to="/rewards" className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                                <Gem className="h-2.5 w-2.5" />
                                {wallet?.balance ?? 0} Credits
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="py-1">
                        {accountMenuItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.label}
                              to={item.to}
                              target={item.external ? '_blank' : undefined}
                              rel={item.external ? 'noopener noreferrer' : undefined}
                              onClick={() => setOpenDropdown(null)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-600 transition-colors hover:bg-brand-purple/5 hover:text-brand-purple dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-brand-purple-lighter"
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                      <div className="my-1 border-t border-neutral-100 dark:border-white/5" />
                      <button
                        type="button"
                        onClick={() => { signOut(); setOpenDropdown(null); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-neutral-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <div className="py-1">
                      <Link
                        to="/login"
                        onClick={() => setOpenDropdown(null)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-brand-purple/5 hover:text-brand-purple dark:text-neutral-200 dark:hover:bg-white/5 dark:hover:text-brand-purple-lighter"
                      >
                        <LogIn className="h-4 w-4 shrink-0" />
                        Sign In
                      </Link>
                      <Link
                        to="/login?mode=signup"
                        onClick={() => setOpenDropdown(null)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-brand-purple/5 hover:text-brand-purple dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-brand-purple-lighter"
                      >
                        <User className="h-4 w-4 shrink-0" />
                        Create Account
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Primary CTA — Start Calculating */}
            <Link
              to="/paint-calculator?mode=room-estimate"
              className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 transition-all hover:bg-brand-purple-dark hover:shadow-xl hover:shadow-brand-purple/30 hover:-translate-y-0.5 active:scale-[0.98] dark:bg-brand-purple dark:hover:bg-brand-purple-dark"
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
          'fixed inset-0 z-50 lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        {/* Scrim */}
        <div
          className={classNames(
            'absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300',
            mobileOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer */}
        <div
          className={classNames(
            'absolute left-0 top-0 h-full w-[85%] max-w-sm overflow-y-auto bg-white shadow-2xl transition-transform duration-300 dark:bg-brand-navy',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-white/5">
            <Link to="/" onClick={() => setMobileOpen(false)}>
              <Logo />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5"
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
                      onClick={() => setMobileExpanded(mobileExpanded === workspace.label ? null : workspace.label)}
                      className={classNames(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                        location.pathname.startsWith(workspace.path)
                          ? 'bg-brand-purple/8 text-brand-purple dark:bg-brand-purple/15 dark:text-brand-purple-lighter'
                          : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5'
                      )}
                    >
                      {workspace.label}
                      <ChevronDown className={classNames(
                        'h-4 w-4 transition-transform duration-200',
                        mobileExpanded === workspace.label && 'rotate-180'
                      )} />
                    </button>
                    {mobileExpanded === workspace.label && (
                      <div className="ml-3 mt-1 border-l border-neutral-100 pl-3 dark:border-white/10">
                        {groupBySection(workspace.children).map((group, gi) => (
                          <div key={gi}>
                            {group.section && (
                              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-300 dark:text-neutral-600">
                                {group.section}
                              </p>
                            )}
                            {group.items.map((child) => (
                              <NavLink
                                key={child.path}
                                to={child.path}
                                className={({ isActive }) => classNames(
                                  'block rounded-lg px-3 py-2 text-sm transition-colors',
                                  isActive ? 'font-medium text-brand-purple dark:text-brand-purple-lighter' : 'text-neutral-500 hover:text-brand-purple dark:text-neutral-400 dark:hover:text-brand-purple-lighter'
                                )}
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
                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5"
                  >
                    {workspace.label}
                  </a>
                ) : (
                  <NavLink
                    to={workspace.path}
                    className={({ isActive }) => classNames(
                      'block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                      isActive ? 'bg-brand-purple/8 text-brand-purple dark:bg-brand-purple/15 dark:text-brand-purple-lighter' : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5'
                    )}
                  >
                    {workspace.label}
                  </NavLink>
                )}
              </div>
            ))}

            {/* Language & Accessibility */}
            <div className="mt-4 flex items-center justify-around border-t border-neutral-100 pt-4 dark:border-white/5">
              <AccessibilityToggle compact={false} />
              <LanguageSwitcher compact={false} />
              <button type="button" onClick={toggle} aria-label="Toggle dark mode" className="inline-flex items-center gap-1.5 rounded-lg p-2 text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200">
                {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </button>
            </div>

            {/* Primary CTA */}
            <Link
              to="/paint-calculator?mode=room-estimate"
              onClick={() => setMobileOpen(false)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-purple px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 transition-all hover:bg-brand-purple-dark active:scale-[0.98]"
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
