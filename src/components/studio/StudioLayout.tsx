import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { ArrowLeft, Menu, X, Code, Activity } from "lucide-react";
import { classNames } from "@/lib/utils";
import { TOOLS, TOOL_CATEGORIES } from "@/components/studio/tools";

import { useSeo } from "@/lib/seo";
import { Button } from "@/components/ui/shadcn/button";
export default function StudioLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  useSeo({
    title: "FRELUX Studio",
    description: "FRELUX Studio",
    noIndex: true,
  });

  return (
    <div className="min-h-screen bg-muted">
      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border dark:border-white/5 bg-card dark:bg-card px-4 lg:hidden">
        <Link to="/admin/studio" className="flex items-center gap-2">
          <Code className="h-5 w-5 text-brand-purple" />
          <span className="text-sm font-bold text-foreground dark:text-primary-foreground">
            AI Studio
          </span>
        </Link>
        <Button
          variant="ghost"
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-muted-foreground dark:text-muted-foreground/80 hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border dark:border-white/5 bg-card dark:bg-card lg:flex">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 bg-card dark:bg-card shadow-xl">
              <div className="flex h-14 items-center justify-between border-b border-border dark:border-white/5 px-4">
                <span className="flex items-center gap-2 text-sm font-bold text-foreground dark:text-primary-foreground">
                  <Code className="h-5 w-5 text-brand-purple" /> AI Studio
                </span>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-2 text-muted-foreground dark:text-muted-foreground/80 hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="hidden border-b border-border dark:border-white/5 px-5 py-4 lg:block">
        <Link to="/admin/studio" className="flex items-center gap-2">
          <Code className="h-5 w-5 text-brand-purple" />
          <span className="text-base font-bold text-foreground dark:text-primary-foreground">
            AI Developer Studio
          </span>
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground dark:text-muted-foreground">
          AI assisted development
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {TOOL_CATEGORIES.map((cat) => (
          <div key={cat} className="mb-4">
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
              {cat}
            </p>
            <div className="space-y-0.5">
              {TOOLS.filter((t) => t.category === cat).map((tool) => {
                const Icon = tool.icon;
                return (
                  <NavLink
                    key={tool.slug}
                    to={`/admin/studio/${tool.slug}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      classNames(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground dark:text-muted-foreground/80 hover:bg-muted hover:text-brand-purple",
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{tool.shortLabel}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border dark:border-white/5 p-3">
        <Link
          to="/admin/system-health"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground dark:text-muted-foreground/80 hover:bg-muted"
        >
          <Activity className="h-4 w-4" /> System Health
        </Link>
        <Link
          to="/admin"
          className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground dark:text-muted-foreground/80 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Link>
      </div>
    </div>
  );
}
