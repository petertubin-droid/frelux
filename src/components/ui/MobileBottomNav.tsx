import { Link, useLocation } from 'react-router-dom';
import { Home, Calculator, Palette, FolderOpen, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { classNames } from '@/lib/utils';

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const accountTo = user ? '/dashboard' : '/login';
  const accountLabel = user ? 'Account' : 'Sign In';

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/paint-calculator', label: 'Calculate', icon: Calculator },
    { to: '/colors', label: 'Colors', icon: Palette },
    { to: '/my-projects', label: 'Projects', icon: FolderOpen },
    { to: accountTo, label: accountLabel, icon: User },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200/60 bg-white/95 backdrop-blur-xl md:hidden dark:border-white/5 dark:bg-brand-navy/95"
      aria-label="Bottom navigation"
    >
      {/* Premium top border line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/10 to-transparent" />
      <div className="flex items-stretch justify-around px-1 py-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map((item) => {
          const active = pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={classNames(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-all',
                active ? 'text-brand-purple dark:text-brand-purple-lighter' : 'text-neutral-400 dark:text-neutral-500',
              )}
            >
              <span className={classNames(
                'inline-flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                active && 'bg-brand-purple/8 dark:bg-brand-purple/15'
              )}>
                <item.icon className={classNames('h-5 w-5 transition-transform', active && 'scale-110')} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
