import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Menu, X, Calculator, LogIn, LogOut, User, ChevronDown,
  Sun, Moon, LayoutDashboard, UserCircle, ClipboardList, FileStack, Heart,
  Users, BarChart3, Search,
} from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { navWorkspaces } from '@/config/site';
import { classNames } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { AccessibilityToggle } from '@/components/ui/AccessibilityToggle';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
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

  // Close dropdown when clicking outside the entire nav
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
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My Estimates', to: '/my-projects', icon: ClipboardList },
    { label: 'Calculator Templates', to: '/my-templates', icon: FileStack },
    { label: 'My Projects', to: '/contractor', icon: FileStack },
    { label: 'Clients', to: '/clients', icon: Users },
    { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  ];

  return (
    <>
      <header
        className={classNames(
          'sticky top-0 z-40 w-full transition-all duration-500',
          scrolled
            ? 'glass-premium border-b border-neutral-200/40 shadow-sm dark:border-white/5 dark:glass-dark-premium'
            : 'bg-white/50 backdrop-blur-md border-b border-transparent dark:bg-brand-navy/50 dark:border-transparent'
        )}
      >
        <nav ref={navRef} className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo — left */}
          <div className="flex items-center gap-3">
            {/* Hamburger — left side on mobile (before logo) */}
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

          {/* Desktop nav with workspace dropdowns */}
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
                        className="absolute left-0 top-full z-50 min-w-[240px] rounded-xl border border-neutral-200/40 bg-white/90 py-1.5 shadow-premium-lg backdrop-blur-xl animate-fade-in-up dark:border-white/10 dark:bg-brand-navy-mid/90"
                        style={{ animationDuration: '0.15s' }}
                        onMouseLeave={() => setOpenDropdown(null)}
                      >
                        <NavLink
                          to={workspace.path}
                          className="block px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-brand-purple/5 hover:text-brand-purple dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-brand-purple-lighter"
                        >
                          {workspace.label} Home
                        </NavLink>
                        <div className="my-1 border-t border-neutral-100 dark:border-white/5" />
                        {workspace.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) => classNames(
                              'block px-4 py-2 text-sm transition-colors',
                              isActive ? 'font-semibold text-brand-purple dark:text-brand-purple-lighter bg-brand-purple/5' : 'text-neutral-600 hover:bg-brand-purple/5 hover:text-brand-purple dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-brand-purple-lighter'
                            )}
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
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

            {/* Account icon — dropdown menu */}
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
                {user ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-purple text-xs font-bold text-white">
                    {(user.email ?? '?').charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <UserCircle className="h-5 w-5" strokeWidth={1.5} />
                )}
              </button>

              {openDropdown === 'account' && (
                <div
                  className="absolute right-0 top-full z-50 min-w-[220px] rounded-xl border border-neutral-200/40 bg-white/90 py-1.5 shadow-premium-lg backdrop-blur-xl animate-fade-in-up dark:border-white/10 dark:bg-brand-navy-mid/90"
                  style={{ animationDuration: '0.15s' }}
                >
                  {user ? (
                    <>
                      {/* User email header */}
                      <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-white/5">
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">Signed in as</p>
                        <p className="text-sm font-semibold text-neutral-700 truncate dark:text-neutral-200">{user.email}</p>
                      </div>
                      {accountMenuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.label}
                            to={item.to}
                            onClick={() => setOpenDropdown(null)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-600 transition-colors hover:bg-brand-purple/5 hover:text-brand-purple dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-brand-purple-lighter"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                          </Link>
                        );
                      })}
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
              to="/paint-calculator"
              className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 transition-all hover:bg-brand-purple-dark hover:shadow-xl hover:shadow-brand-purple/30 hover:-translate-y-0.5 active:scale-[0.98] dark:bg-brand-purple dark:hover:bg-brand-purple-dark"
            >
              <Calculator className="h-4 w-4" />
              Start Calculating
            </Link>
          </div>
        </nav>
      </header>

      {/* ===== Mobile drawer ===== */}
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

          {/* Drawer nav */}
          <div className="px-3 py-4">
            {navWorkspaces.map((workspace) => (
              <div key={workspace.label} className="mb-1">
                <NavLink
                  to={workspace.path}
                  className={({ isActive }) => classNames(
                    'block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                    isActive ? 'bg-brand-purple/8 text-brand-purple dark:bg-brand-purple/15 dark:text-brand-purple-lighter' : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5'
                  )}
                >
                  {workspace.label}
                </NavLink>
                {workspace.children && (
                  <div className="ml-3 mt-1 border-l border-neutral-100 pl-3 dark:border-white/5">
                    {workspace.children.map((child) => (
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
                )}
              </div>
            ))}

            {/* Account section */}
            <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-white/5">
              {user ? (
                <div className="space-y-1">
                  <div className="px-3 py-1.5">
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">Signed in as</p>
                    <p className="text-sm font-semibold text-neutral-700 truncate dark:text-neutral-200">{user.email}</p>
                  </div>
                  {accountMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-neutral-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link to="/login" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </Link>
                  <Link to="/login?mode=signup" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                    <User className="h-4 w-4" />
                    Create Account
                  </Link>
                </div>
              )}
            </div>

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
              to="/paint-calculator"
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
