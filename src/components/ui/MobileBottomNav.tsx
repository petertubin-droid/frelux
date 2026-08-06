import { Link, useLocation } from 'react-router-dom';
import { Home, Calculator, Palette, FolderOpen, User } from 'lucide-react';
import { classNames } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/paint-calculator', label: 'Calculate', icon: Calculator },
  { to: '/colors', label: 'Colors', icon: Palette },
  { to: '/my-projects', label: 'Projects', icon: FolderOpen },
  { to: '/login', label: 'Account', icon: User },
];

export default function MobileBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur-md md:hidden">
      <div className="flex items-stretch justify-around px-1 py-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map((item) => {
          const active = pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={classNames(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors',
                active ? 'text-brand-purple' : 'text-neutral-400',
              )}
            >
              <item.icon className={classNames('h-5 w-5 transition-transform', active && 'scale-110')} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
