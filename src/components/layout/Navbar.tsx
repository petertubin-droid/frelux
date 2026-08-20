import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Calculator, LogIn, LogOut, User, ChevronDown, ChevronRight, Sun, Moon, LayoutDashboard, Building2 } from "lucide-react";
import Logo from '@/components/brand/Logo';
import { navWorkspaces, type NavWorkspace } from '@/config/site';
import { classNames } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

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

  // Close dropdown when clicking outside
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
          'sticky top-0 z-40 w-full transition-all duration-300',
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-neutral-200/60 shadow-sm dark:bg-brand-navy/80 dark:border-white/5'
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
                          ? 'text-brand-purple'
                          : 'text-neutral-600 hover:text-brand-purple hover:bg-neutral-50 dark:text-neutral-300 dark:hover:text-brand-purple-lighter dark:hover:bg-white/5'
                      )}
                    >
                      {workspace.label}
                      <ChevronDown className={classNames('h-3 w-3 transition-transform duration-200', openDropdown === workspace.label && 'rotate-180')} />
                    </button>
                    {openDropdown === workspace.label && (
                      <div
                        className="absolute left-0 top-full z-50 min-w-[220px] rounded-xl border border-neutral-200/60 bg-white py-1.5 shadow-premium animate-fade-in-up dark:border-white/10 dark:bg-brand-navy-mid"
                        style={{ animationDuration: '0.15s' }}
                        onMouseLeave={() => setOpenDropdown(null)}
                      >
                        <NavLink
                          to={workspace.path}
                          className="block px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-brand-purple dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-brand-purple-lighter"
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
                              isActive ? 'font-semibold text-brand-purple dark:text-brand-purple-lighter' : 'text-neutral-600 hover:bg-neutral-50 hover:text-brand-purple dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-brand-purple-lighter'
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
            <button type="button" onClick={toggle} aria-label="Toggle dark mode" className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200">
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
            <Link to="/contractor" className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-brand-purple transition-colors hover:bg-purple-100 dark:bg-brand-purple/15 dark:text-brand-purple-lighter dark:hover:bg-brand-purple/25">
              <Building2 className="h-3.5 w-3.5" />
              Contractor
            </Link>
            <Link to="/paint-calculator" className="btn-primary">
              <Calculator className="h-4 w-4" />
              Get Started
            </Link>
          </div>

          {/* Hamburger menu — rightmost position, opens navigation drawer */}
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

      {/* Mobile drawer — rendered OUTSIDE the header to avoid
          backdrop-filter creating a containing block that clips
          the fixed-position drawer to the header's height. */}
      <div
        className={classNames('fixed inset-0 z-50 lg:hidden', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none')}
        aria-hidden={!mobileOpen}
      >
        {/* Sophisticated backdrop with layered blur */}
        <div
          className={classNames(
            'absolute inset-0 transition-opacity duration-300',
            mobileOpen ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            background: 'linear-gradient(135deg, rgba(10,10,26,0.5) 0%, rgba(10,10,26,0.35) 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer panel */}
        <div
          className={classNames(
            'absolute left-0 top-0 h-full w-[85%] max-w-sm transition-transform duration-300 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex h-full flex-col bg-white shadow-premium-lg dark:bg-brand-navy-mid">
            {/* Drawer header — elevated, refined */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200/60 px-5 dark:border-white/5">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-900 active:scale-95 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            {/* Navigation list — scrollable, staggered entrance */}
            <nav
              className="flex-1 overflow-y-auto px-3 py-4"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {navWorkspaces.map((workspace, index) => (
                <MobileNavItem
                  key={workspace.label}
                  workspace={workspace}
                  index={index}
                  isOpen={mobileOpen}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </nav>

            {/* Bottom action area — refined, balanced, prominent */}
            <div className="shrink-0 space-y-3 border-t border-neutral-200/60 bg-neutral-50/50 px-4 pb-5 pt-4 dark:border-white/5 dark:bg-black/20">
              {/* Get Started CTA — full width, primary */}
              <Link
                to="/paint-calculator"
                className="btn-primary w-full"
                onClick={() => setMobileOpen(false)}
              >
                <Calculator className="h-4 w-4" />
                Get Started
              </Link>

              {/* Sign in + Theme toggle — balanced split row */}
              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-white/20 dark:hover:bg-white/10"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => { signOut(); setMobileOpen(false); }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-white/20 dark:hover:bg-white/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-white/20 dark:hover:bg-white/10"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </Link>
                )}
                {/* Theme toggle — compact, icon-forward */}
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-white/20 dark:hover:bg-white/10"
                >
                  {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MobileNavItem({ workspace, index, isOpen, onNavigate }: {
  workspace: NavWorkspace;
  index: number;
  isOpen: boolean;
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();

  // Auto-expand if current path is within this workspace
  useEffect(() => {
    if (workspace.children && location.pathname.startsWith(workspace.path)) {
      setExpanded(true);
    }
  }, [location.pathname, workspace.path, workspace.children]);

  if (!workspace.children) {
    return (
      <NavLink
        to={workspace.path}
        onClick={onNavigate}
        className={({ isActive }) => classNames(
          'group relative flex items-center rounded-xl px-3.5 py-3 text-[15px] font-medium transition-all duration-200 active:scale-[0.98]',
          isActive
            ? 'bg-brand-purple/8 text-brand-purple dark:bg-brand-purple/15 dark:text-brand-purple-lighter'
            : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-white'
        )}
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0)' : 'translateY(8px)',
          transition: `opacity 0.3s ease-out ${0.05 + index * 0.04}s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) ${0.05 + index * 0.04}s`,
        }}
      >
        {({ isActive }) => (
          <>
            {/* Active indicator bar */}
            <span
              className={classNames(
                'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-brand-purple transition-opacity duration-200 dark:bg-brand-purple-lighter',
                isActive ? 'opacity-100' : 'opacity-0'
              )}
            />
            <span className="ml-1">{workspace.label}</span>
          </>
        )}
      </NavLink>
    );
  }

  const isWorkspaceActive = location.pathname.startsWith(workspace.path);

  return (
    <div
      style={{
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 0.3s ease-out ${0.05 + index * 0.04}s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) ${0.05 + index * 0.04}s`,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={classNames(
          'group relative flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-[15px] font-medium transition-all duration-200 active:scale-[0.98]',
          isWorkspaceActive
            ? 'text-brand-purple dark:text-brand-purple-lighter'
            : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-white'
        )}
        aria-expanded={expanded}
      >
        {/* Active indicator bar */}
        <span
          className={classNames(
            'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-brand-purple transition-opacity duration-200 dark:bg-brand-purple-lighter',
            isWorkspaceActive ? 'opacity-100' : 'opacity-0'
          )}
        />
        <span className="ml-1">{workspace.label}</span>
        <ChevronDown
          className={classNames(
            'h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-300 dark:text-neutral-500',
            expanded && 'rotate-180'
          )}
        />
      </button>
      {/* Expandable children — smooth height + opacity transition */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: expanded ? '500px' : '0',
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-neutral-200/60 pl-3 dark:border-white/5">
          <NavLink
            to={workspace.path}
            onClick={onNavigate}
            className={({ isActive }) => classNames(
              'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 active:scale-[0.98]',
              isActive
                ? 'font-medium text-brand-purple dark:text-brand-purple-lighter'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            )}
          >
            <ChevronRight className="h-3 w-3 opacity-40" />
            {workspace.label} Home
          </NavLink>
          {workspace.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              onClick={onNavigate}
              className={({ isActive }) => classNames(
                'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 active:scale-[0.98]',
                isActive
                  ? 'font-medium text-brand-purple dark:text-brand-purple-lighter'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              )}
            >
              <ChevronRight className="h-3 w-3 opacity-40" />
              {child.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
