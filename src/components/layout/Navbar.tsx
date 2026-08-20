import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Calculator, LogIn, LogOut, User, ChevronDown, Sun, Moon, LayoutDashboard, Building2 } from "lucide-react";
import Logo from '@/components/brand/Logo';
import { navWorkspaces } from '@/config/site';
import { classNames } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Search } from 'lucide-react';
import { AccessibilityToggle } from '@/components/ui/AccessibilityToggle';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="FRELUX PAINT CALC home" className="shrink-0">
            <Logo />
          </Link>

          {/* Desktop nav with workspace dropdowns */}
          <div ref={dropdownRef} className="hidden items-center gap-0.5 lg:flex">
            {navWorkspaces.map((workspace) => (
              <div key={workspace.label} className="relative">
                {workspace.children ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === workspace.label ? null : workspace.label)}
                      onMouseEnter={() => setOpenDropdown(workspace.label)}
                      className={classNames(
                        'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
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
                      'rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                      isActive ? 'text-brand-purple dark:text-brand-purple-lighter' : 'text-neutral-600 hover:text-brand-purple hover:bg-neutral-50 dark:text-neutral-300 dark:hover:text-brand-purple-lighter dark:hover:bg-white/5'
                    )}
                  >
                    {workspace.label}
                  </NavLink>
                )}
              </div>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true }); document.dispatchEvent(e); }}
              className="hidden items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-600 sm:flex dark:border-white/10 dark:hover:border-white/20"
              aria-label="Open command palette"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="rounded border border-neutral-200 px-1 text-[10px] font-medium dark:border-white/10">⌘K</kbd>
            </button>
            <AccessibilityToggle />
            <LanguageSwitcher />
            <button type="button" onClick={toggle} aria-label="Toggle dark mode" className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-700 active:scale-95 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200">
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:text-brand-purple dark:bg-white/5 dark:text-neutral-300 dark:hover:text-brand-purple-lighter">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
                <Link to="/my-projects" className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:text-brand-purple dark:bg-white/5 dark:text-neutral-300 dark:hover:text-brand-purple-lighter">
                  <User className="h-3.5 w-3.5" />
                  <span className="max-w-[120px] truncate">{user.email}</span>
                </Link>
                <button type="button" onClick={() => signOut()} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-brand-purple dark:border-white/10 dark:text-neutral-300 dark:hover:border-white/20 dark:hover:text-brand-purple-lighter">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            ) : (
              <Link to="/login" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3.5 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-brand-purple dark:border-white/10 dark:text-neutral-300 dark:hover:border-white/20 dark:hover:text-brand-purple-lighter">
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            )}
            <Link to="/contractor" className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-brand-purple transition-all hover:bg-purple-100 hover:scale-105 dark:bg-brand-purple/15 dark:text-brand-purple-lighter dark:hover:bg-brand-purple/25">
              <Building2 className="h-3.5 w-3.5" />
              Contractor
            </Link>
            <Link to="/paint-calculator" className="btn-primary magnetic-hover">
              <Calculator className="h-4 w-4" />
              Get Started
            </Link>
          </div>

          {/* Hamburger menu */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-neutral-700 transition-all hover:bg-neutral-100 active:scale-95 lg:hidden dark:text-neutral-200 dark:hover:bg-white/5"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-[22px] w-[22px]" strokeWidth={1.75} />
          </button>
        </nav>
      </header>

      {/* Mobile drawer */}
      <div
        className={classNames('fixed inset-0 z-50 lg:hidden', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none')}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          className={classNames(
            'absolute inset-0 bg-brand-navy/60 backdrop-blur-sm transition-opacity duration-300',
            mobileOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setMobileOpen(false)}
        />

        {/* Drawer panel */}
        <div
          className={classNames(
            'absolute right-0 top-0 h-full w-[320px] max-w-[85vw] overflow-y-auto bg-white shadow-premium-lg transition-transform duration-300 dark:bg-brand-navy',
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-white/5">
            <Logo />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-all hover:bg-neutral-100 active:scale-95 dark:text-neutral-400 dark:hover:bg-white/5"
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
                  <Link to="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link to="/my-projects" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                    <User className="h-4 w-4" />
                    My Projects
                  </Link>
                  <button type="button" onClick={() => signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : (
                <Link to="/login" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
              )}
              <Link to="/contractor" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-purple transition-colors hover:bg-purple-50 dark:text-brand-purple-lighter dark:hover:bg-brand-purple/10">
                <Building2 className="h-4 w-4" />
                Contractor Portal
              </Link>
            </div>

            {/* Language & Accessibility */}
            <div className="mt-4 flex items-center justify-around border-t border-neutral-100 pt-4 dark:border-white/5">
              <AccessibilityToggle compact={false} />
              <LanguageSwitcher compact={false} />
              <button type="button" onClick={toggle} aria-label="Toggle dark mode" className="inline-flex items-center gap-1.5 rounded-lg p-2 text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200">
                {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </button>
            </div>

            {/* CTA */}
            <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-white/5">
              <Link to="/paint-calculator" className="btn-primary w-full">
                <Calculator className="h-4 w-4" />
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
