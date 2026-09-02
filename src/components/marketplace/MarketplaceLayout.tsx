import { Outlet, Link, useLocation } from 'react-router-dom';
import { Store, Briefcase, Plus, LayoutDashboard, Package } from 'lucide-react';
import { classNames } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SupportChatWidget from '@/components/layout/SupportChatWidget';

export default function MarketplaceLayout() {
  const location = useLocation();

  const navItems = [
    { to: '/marketplace', label: 'All', icon: Store, exact: true },
    { to: '/marketplace?tab=jobs', label: 'Jobs', icon: Briefcase },
    { to: '/marketplace?tab=products', label: 'Products', icon: Package },
  ];

  function isActive(to: string, exact = false) {
    if (exact) return location.pathname === '/marketplace';
    return false;
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Navbar />
      <main className="w-full flex-1 pt-16 pb-16 md:pb-0">
        {/* Marketplace sub-nav */}
        <div className="sticky top-16 z-30 border-b border-border/50 bg-white/80 backdrop-blur dark:border-white/5 dark:bg-background/80">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={classNames(
                      'inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                      isActive(item.to, item.exact)
                        ? 'border-brand-purple text-brand-purple'
                        : 'border-transparent text-muted-foreground hover:text-card-foreground dark:text-muted-foreground dark:hover:text-muted-foreground/60'
                    )}
                  >
                    <Icon className="h-4 w-4" /> {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                to="/marketplace/seller-dashboard"
                className={classNames(
                  'hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:inline-flex',
                  location.pathname === '/marketplace/seller-dashboard'
                    ? 'bg-primary/10 text-brand-purple'
                    : 'text-muted-foreground hover:text-card-foreground dark:text-muted-foreground dark:hover:text-muted-foreground/60'
                )}
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
              <Link
                to="/marketplace/post"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus aria-hidden="true" className="h-4 w-4" /> Post
              </Link>
            </div>
          </div>
        </div>

        <Outlet />
      </main>
      <Footer />
      <SupportChatWidget />
    </div>
  );
}
