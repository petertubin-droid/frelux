import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Calculator, LogIn, LogOut, User, ChevronDown, Sun, Moon, LayoutDashboard } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { navWorkspaces } from '@/config/site';
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
    <header
      className={classNames(
        'sticky top-0 z-40 w-full transition-all duration-200',
        scrolled
          ? 'bg-white/90 backdrop-blur border-b border-neutral-200 shadow-sm'
          : 'bg-white border-b border-transparent'
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
                      'flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      location.pathname.startsWith(workspace.path) || openDropdown === workspace.label
                        ? 'text-brand-purple'
                        : 'text-neutral-600 hover:text-brand-purple hover:bg-neutral-50'
                    )}
                  >
                    {workspace.label}
                    <ChevronDown className={classNames('h-3 w-3 transition-transform', openDropdown === workspace.label && 'rotate-180')} />
                  </button>
                  {openDropdown === workspace.label && (
                    <div
                      className="absolute left-0 top-full z-50 min-w-[200px] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      <NavLink
                        to={workspace.path}
                        className="block px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-brand-purple"
                      >
                        {workspace.label} Home
                      </NavLink>
                      <div className="my-1 border-t border-neutral-100" />
                      {workspace.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) => classNames(
                            'block px-4 py-2 text-sm transition-colors',
                            isActive ? 'font-semibold text-brand-purple' : 'text-neutral-600 hover:bg-neutral-50 hover:text-brand-purple'
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
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'text-brand-purple' : 'text-neutral-600 hover:text-brand-purple hover:bg-neutral-50'
                  )}
                >
                  {workspace.label}
                </NavLink>
              )}
            </div>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <button type="button" onClick={toggle} aria-label="Toggle dark mode" className="inline-flex items-center justify-center rounded-md p-2 text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-brand-purple">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <Link to="/my-projects" className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-brand-purple">
                <User className="h-3.5 w-3.5" />
                <span className="max-w-[120px] truncate">{user.email}</span>
              </Link>
              <button type="button" onClick={() => signOut()} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-brand-purple">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-brand-purple">
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
          <Link to="/paint-calculator" className="btn-primary">
            <Calculator className="h-4 w-4" />
            Get Started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center justify-center rounded-md p-2 text-neutral-700 hover:bg-neutral-100 lg:hidden"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-6 w-6" />
        </button>
        <button type="button" onClick={toggle} aria-label="Toggle dark mode" className="inline-flex items-center justify-center rounded-md p-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 lg:hidden">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <div
        className={classNames('fixed inset-0 z-50 lg:hidden', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none')}
        aria-hidden={!mobileOpen}
      >
        <div
          className={classNames('absolute inset-0 bg-neutral-900/40 transition-opacity duration-200', mobileOpen ? 'opacity-100' : 'opacity-0')}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={classNames('absolute left-0 top-0 h-full w-[80%] max-w-xs bg-white shadow-xl transition-transform duration-300 ease-out', mobileOpen ? 'translate-x-0' : '-translate-x-full')}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
            <Logo />
            <button type="button" onClick={() => setMobileOpen(false)} className="inline-flex items-center justify-center rounded-md p-2 text-neutral-700 hover:bg-neutral-100" aria-label="Close menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex flex-col gap-0.5 overflow-y-auto p-4" style={{ maxHeight: 'calc(100% - 4rem)' }}>
            {navWorkspaces.map((workspace) => (
              <MobileNavItem key={workspace.label} workspace={workspace} />
            ))}
            <Link to="/paint-calculator" className="btn-primary mt-3 w-full">
              <Calculator className="h-4 w-4" />
              Get Started
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="btn-secondary mt-2 w-full">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link to="/my-projects" className="btn-secondary mt-2 w-full">
                  <User className="h-4 w-4" />
                  My Projects
                </Link>
                <button type="button" onClick={() => signOut()} className="btn-secondary mt-2 w-full">
                  <LogOut className="h-4 w-4" />
                  Sign out ({user.email})
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-secondary mt-2 w-full">
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileNavItem({ workspace }: { workspace: typeof navWorkspaces[number] }) {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();

  if (!workspace.children) {
    return (
      <NavLink
        to={workspace.path}
        className={({ isActive }) => classNames('rounded-lg px-4 py-3 text-base font-medium transition-colors', isActive ? 'bg-brand-purple/10 text-brand-purple' : 'text-neutral-700 hover:bg-neutral-50')}
      >
        {workspace.label}
      </NavLink>
    );
  }

  const isActive = location.pathname.startsWith(workspace.path);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={classNames('flex w-full items-center justify-between rounded-lg px-4 py-3 text-base font-medium transition-colors', isActive ? 'bg-brand-purple/10 text-brand-purple' : 'text-neutral-700 hover:bg-neutral-50')}
      >
        {workspace.label}
        <ChevronDown className={classNames('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
      </button>
      {expanded && (
        <div className="ml-3 border-l border-neutral-200 pl-3">
          <Link to={workspace.path} className="block rounded-lg px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-brand-purple">
            {workspace.label} Home
          </Link>
          {workspace.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              className={({ isActive: childActive }) => classNames('block rounded-lg px-4 py-2 text-sm transition-colors', childActive ? 'font-semibold text-brand-purple' : 'text-neutral-600 hover:bg-neutral-50 hover:text-brand-purple')}
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
