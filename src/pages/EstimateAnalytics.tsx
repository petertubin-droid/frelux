import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import { getEstimateHistory } from '@/lib/crm';
import type { DbEstimateHistory } from '@/types/database';
import { downloadCsv } from '@/lib/export-utils';
import { Loader2, Download, TrendingUp, TrendingDown, BarChart3, Calendar, DollarSign, Calculator } from 'lucide-react';
import { getSafeError } from "@/lib/safeError";

const CALCULATOR_LABELS: Record<string, string> = {
  paint: 'Painting',
  tile: 'Tiling',
  pop: 'POP Ceiling',
  screeding: 'Wall Screeding',
};

export default function EstimateAnalytics() {
  const { user } = useAuth();
  const [history, setHistory] = useState<DbEstimateHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await getEstimateHistory(user.id, { limit: 500 });
      setHistory(data as DbEstimateHistory[]);
    } catch (e) {
      setError(getSafeError(e, 'Failed to load analytics'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (filterType === 'all') return history;
    return history.filter((h) => h.calculator_type === filterType);
  }, [history, filterType]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const totalCost = filtered.reduce((sum, h) => sum + (h.total_cost ?? 0), 0);
    const totalMaterial = filtered.reduce((sum, h) => sum + (h.material_cost ?? 0), 0);
    const totalLabour = filtered.reduce((sum, h) => sum + (h.labour_cost ?? 0), 0);
    const avgCost = total > 0 ? totalCost / total : 0;

    // Most used calculators
    const calcCounts: Record<string, number> = {};
    for (const h of filtered) {
      calcCounts[h.calculator_type] = (calcCounts[h.calculator_type] ?? 0) + 1;
    }
    const mostUsed = Object.entries(calcCounts).sort((a, b) => b[1] - a[1]);

    // Monthly summaries
    const monthly: Record<string, { count: number; cost: number }> = {};
    for (const h of filtered) {
      const month = h.created_at.substring(0, 7);
      if (!monthly[month]) monthly[month] = { count: 0, cost: 0 };
      monthly[month].count++;
      monthly[month].cost += h.total_cost ?? 0;
    }
    const monthlySummary = Object.entries(monthly).sort((a, b) => b[0].localeCompare(a[0]));

    // Cost trends (compare last two months)
    let costTrend: 'up' | 'down' | 'stable' = 'stable';
    let trendPct = 0;
    if (monthlySummary.length >= 2) {
      const recent = monthlySummary[0][1].cost;
      const previous = monthlySummary[1][1].cost;
      if (previous > 0) {
        trendPct = ((recent - previous) / previous) * 100;
        costTrend = trendPct > 5 ? 'up' : trendPct < -5 ? 'down' : 'stable';
      }
    }

    return { total, totalCost, totalMaterial, totalLabour, avgCost, mostUsed, monthlySummary, costTrend, trendPct };
  }, [filtered]);

  function handleExportCsv() {
    const rows = filtered.map((h) => ({
      date: new Date(h.created_at).toLocaleDateString(),
      calculator: CALCULATOR_LABELS[h.calculator_type] ?? h.calculator_type,
      project: h.project_name ?? '',
      total_cost: h.total_cost ?? 0,
      material_cost: h.material_cost ?? 0,
      labour_cost: h.labour_cost ?? 0,
      currency: h.currency,
    }));
    downloadCsv('frelux-estimate-history', rows, [
      { header: 'Date', key: 'date' },
      { header: 'Calculator', key: 'calculator' },
      { header: 'Project', key: 'project' },
      { header: 'Total Cost', key: 'total_cost', format: (v) => Number(v).toLocaleString() },
      { header: 'Material Cost', key: 'material_cost', format: (v) => Number(v).toLocaleString() },
      { header: 'Labour Cost', key: 'labour_cost', format: (v) => Number(v).toLocaleString() },
      { header: 'Currency', key: 'currency' },
    ]);
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <PageHeader title="Estimate Analytics" subtitle="Sign in to view your estimate history and business insights." />
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-brand-purple" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Estimate History & Analytics" subtitle="Track usage patterns, cost trends, and business insights." />

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Filter + Export */}
      <div className="mt-6 flex items-center justify-between">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border bg-background px-4 py-2 text-sm"
        >
          <option value="all">All Calculators</option>
          <option value="paint">Painting</option>
          <option value="tile">Tiling</option>
          <option value="pop">POP Ceiling</option>
          <option value="screeding">Wall Screeding</option>
        </select>
        <button
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Download aria-hidden="true" className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Stat Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Calculator} label="Total Estimates" value={String(stats.total)} />
        <StatCard icon={DollarSign} label="Total Value" value={`₦${stats.totalCost.toLocaleString()}`} />
        <StatCard icon={BarChart3} label="Average Estimate" value={`₦${stats.avgCost.toLocaleString()}`} />
        <StatCard
          icon={stats.costTrend === 'up' ? TrendingUp : stats.costTrend === 'down' ? TrendingDown : BarChart3}
          label="Cost Trend"
          value={stats.costTrend === 'up' ? `↑ ${stats.trendPct.toFixed(1)}%` : stats.costTrend === 'down' ? `↓ ${Math.abs(stats.trendPct).toFixed(1)}%` : 'Stable'}
        />
      </div>

      {/* Most Used Calculators */}
      <div className="mt-6 rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-foreground">Most Used Calculators</h3>
        {stats.mostUsed.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {stats.mostUsed.map(([type, count]) => {
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-28 text-sm font-medium">{CALCULATOR_LABELS[type] ?? type}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Summaries */}
      <div className="mt-6 rounded-lg border p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Calendar aria-hidden="true" className="h-5 w-5" /> Monthly Summaries
        </h3>
        {stats.monthlySummary.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No monthly data yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {stats.monthlySummary.map(([month, data]) => (
              <div key={month} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{new Date(month + '-01').toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p>
                  <p className="text-xs text-muted-foreground">{data.count} estimate{data.count !== 1 ? 's' : ''}</p>
                </div>
                <p className="text-sm font-semibold">₦{data.cost.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent History */}
      <div className="mt-6 rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Estimates</h3>
        {filtered.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No estimates yet. Run a calculator to start tracking history.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {filtered.slice(0, 20).map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{h.project_name ?? CALCULATOR_LABELS[h.calculator_type] ?? h.calculator_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {CALCULATOR_LABELS[h.calculator_type] ?? h.calculator_type} • {new Date(h.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm font-semibold">₦{(h.total_cost ?? 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Calculator; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-purple" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
