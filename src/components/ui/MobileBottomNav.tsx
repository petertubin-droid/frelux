import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Calculator,
  ShoppingBag,
  FolderOpen,
  Trophy,
} from "lucide-react";
import { classNames } from "@/lib/utils";
import { getAchievements } from "@/lib/achievements";
import { useEffect, useState } from "react";

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const [unlockedCount, setUnlockedCount] = useState(0);

  useEffect(() => {
    const data = getAchievements();
    setUnlockedCount(data.unlocked.length);
  }, [pathname]);

  const navItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/paint-calculator", label: "Calculate", icon: Calculator },
    { to: "/marketplace", label: "Market", icon: ShoppingBag },
    { to: "/my-projects", label: "Projects", icon: FolderOpen },
    { to: "/rewards", label: "Rewards", icon: Trophy, badge: unlockedCount },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-white/95 backdrop-blur-xl md:hidden dark:border-white/5 dark:bg-background/95"
      aria-label="Bottom navigation"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      <div
        className="flex items-stretch justify-around px-1 py-0.5"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
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
                "flex flex-1 flex-col items-center gap-0 rounded-lg py-1 text-[10px] font-medium transition-all",
                active
                  ? "text-brand-purple dark:text-brand-purple-lighter"
                  : "text-muted-foreground dark:text-muted-foreground",
              )}
            >
              <span
                className={classNames(
                  "relative inline-flex h-6 w-6 items-center justify-center rounded-lg transition-all",
                  active && "bg-primary/8 dark:bg-primary/15",
                )}
              >
                <item.icon
                  className={classNames(
                    "h-[18px] w-[18px] transition-transform",
                    active && "scale-110",
                  )}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-amber-400 px-1 text-[8px] font-bold text-primary-foreground">
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
