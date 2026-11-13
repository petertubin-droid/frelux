import { Link, useLocation } from "react-router-dom";
import { Home, Wrench, ShoppingBag, FolderOpen, Trophy } from "lucide-react";
import { classNames } from "@/lib/utils";
import { getAchievements } from "@/lib/achievements";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const [unlockedCount, setUnlockedCount] = useState(0);

  useEffect(() => {
    const data = getAchievements();
    setUnlockedCount(data.unlocked.length);
  }, [pathname]);

  const navItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/construction-tools", label: "Tools", icon: Wrench },
    { to: "/marketplace", label: "Market", icon: ShoppingBag },
    { to: "/my-projects", label: "Projects", icon: FolderOpen },
    { to: "/rewards", label: "Rewards", icon: Trophy, badge: unlockedCount },
  ];

  return (
    <nav
      // The offset below the navigation lives in index.css
      // (.mobile-bottom-nav): it is the bar's original 0.75rem plus the bottom
      // ad's published height, which is 0px when nothing is showing, so the bar
      // never moves on its own.
      className="mobile-bottom-nav nav-glass-card fixed inset-x-3 z-30 mx-auto max-w-[520px] rounded-[26px] md:hidden"
      aria-label="Bottom navigation"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div
        className="flex items-stretch justify-around px-1 py-1"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2px)" }}
      >
        {navItems.map((item) => {
          const active =
            pathname === item.to ||
            (item.to !== "/" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={classNames(
                "relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-xs font-semibold leading-tight transition-colors",
                active
                  ? "text-brand-purple dark:text-brand-purple-lighter"
                  : "text-muted-foreground dark:text-muted-foreground",
              )}
            >
              <span
                className={classNames(
                  "relative inline-flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200",
                  active &&
                    "bg-primary/10 ring-1 ring-inset ring-primary/15 dark:bg-primary/20",
                )}
              >
                <item.icon
                  className={classNames(
                    "h-4 w-4 transition-transform duration-200",
                    active && "scale-105",
                  )}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-bold text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="truncate">{t(item.label)}</span>
              <span
                aria-hidden="true"
                className={classNames(
                  "absolute bottom-0 h-[2px] w-4 rounded-full bg-brand-purple transition-opacity duration-200",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
