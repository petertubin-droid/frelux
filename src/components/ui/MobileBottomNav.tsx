import { Link, useLocation } from 'react-router-dom';
import { Home, Calculator, Palette, FolderOpen, Trophy, Hash } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { getAchievements } from '@/lib/achievements';
import { useEffect, useState } from 'react';

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const [unlockedCount, setUnlockedCount] = useState(0);

  useEffect(() => {
    const data = getAchievements();
    setUnlockedCount(data.unlocked.length);
  }, [pathname]);

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/paint-calculator', label: 'Calculate', icon: Calculator },
    { to: '/worker-channels', label: 'Channels', icon: Hash },
    { to: '/my-projects', label: 'Projects', icon: FolderOpen },
    { to: '/achievements', label: 'Rewards', icon: Trophy, badge: unlockedCount },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200/60 bg-white/95 backdrop-blur-xl md:hidden dark:border-white/5 dark:bg-brand-navy/95"
      aria-label="Bottom navigation"
    >
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
                'relative inline-flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                active && 'bg-brand-purple/8 dark:bg-brand-purple/15'
              )}>
                <item.icon className={classNames('h-5 w-5 transition-transform', active && 'scale-110')} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-400 px-1 text-[8px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
