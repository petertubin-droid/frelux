import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Palette, FileText, BarChart3, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminHeader, AdminCard, StateMessage } from '@/components/admin/AdminUi';

interface Counts {
  paint_types: number; paint_products: number; material_prices: number; labor_rates: number;
  color_categories: number; color_combinations: number; legal_pages: number; analytics_events: number;
}

export default function AdminOverview() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const tables: (keyof Counts)[] = ['paint_types','paint_products','material_prices','labor_rates','color_categories','color_combinations','legal_pages','analytics_events'];
      try {
        const results = await Promise.all(tables.map((t) => supabase.from(t).select('*', { count: 'exact', head: true })));
        const next = {} as Counts;
        tables.forEach((t, i) => { next[t] = results[i].count ?? 0; });
        setCounts(next);
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return (<><AdminHeader title="Overview" subtitle="Platform summary at a glance." /><StateMessage type="loading" title="Loading summary…" message="Fetching counts from the database." /></>);
  if (error) return (<><AdminHeader title="Overview" subtitle="Platform summary at a glance." /><StateMessage type="error" title="Couldn’t load summary" message={error} /></>);

  const cards = [
    { label: 'Paint types', value: counts?.paint_types ?? 0, to: '/admin/paint-types', icon: Calculator },
    { label: 'Color combinations', value: counts?.color_combinations ?? 0, to: '/admin/colors', icon: Palette },
    { label: 'Legal pages', value: counts?.legal_pages ?? 0, to: '/admin/legal', icon: FileText },
    { label: 'Analytics events', value: counts?.analytics_events ?? 0, to: '/admin/analytics', icon: BarChart3 },
  ];

  return (
    <>
      <AdminHeader title="Overview" subtitle="Platform summary at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.to} className="card group p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple"><Icon className="h-5 w-5" /></span>
                <ArrowRight aria-hidden="true" className="h-4 w-4 text-muted-foreground/80 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-4 text-3xl font-bold text-foreground dark:text-primary-foreground">{c.value}</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">{c.label}</p>
            </Link>
          );
        })}
      </div>
      <AdminCard className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">All records</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatRow label="Paint products" value={counts?.paint_products ?? 0} />
          <StatRow label="Material prices" value={counts?.material_prices ?? 0} />
          <StatRow label="Labor rates" value={counts?.labor_rates ?? 0} />
          <StatRow label="Color categories" value={counts?.color_categories ?? 0} />
        </div>
      </AdminCard>
    </>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (<div className="flex items-center justify-between rounded-lg border border-border px-4 py-3"><span className="text-sm text-muted-foreground">{label}</span><span className="text-sm font-bold text-foreground dark:text-primary-foreground">{value}</span></div>);
}
