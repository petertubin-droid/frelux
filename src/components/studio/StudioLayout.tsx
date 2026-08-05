import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { ArrowLeft, Menu, X, Sparkles } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { TOOLS, TOOL_CATEGORIES } from '@/components/studio/tools';

export default function StudioLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:hidden">
        <Link to="/admin/studio" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-purple" />
          <span className="text-sm font-bold text-brand-navy">AI Studio</span>
        </Link>
        <button type="button" onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-neutral-200 bg-white lg:flex">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-neutral-900/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
              <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4">
                <span className="flex items-center gap-2 text-sm font-bold text-brand-navy"><Sparkles className="h-5 w-5 text-brand-purple" /> AI Studio</span>
                <button type="button" onClick={() => setMobileOpen(false)} className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
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
      <div className="hidden border-b border-neutral-200 px-5 py-4 lg:block">
        <Link to="/admin/studio" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-purple" />
          <span className="text-base font-bold text-brand-navy">AI Developer Studio</span>
        </Link>
        <p className="mt-0.5 text-xs text-neutral-400">AI assisted development</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {TOOL_CATEGORIES.map((cat) => (
          <div key={cat} className="mb-4">
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">{cat}</p>
            <div className="space-y-0.5">
              {TOOLS.filter((t) => t.category === cat).map((tool) => {
                const Icon = tool.icon;
                return (
                  <NavLink
                    key={tool.slug}
                    to={`/admin/studio/${tool.slug}`}
                    onClick={onNavigate}
                    className={({ isActive }) => classNames(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-brand-purple'
                    )}
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

      <div className="border-t border-neutral-200 p-3">
        <Link to="/admin" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Link>
      </div>
    </div>
  );
}
