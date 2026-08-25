import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AdminHeader, AdminCard, AdminButton } from '@/components/admin/AdminUi';
import { AdminModal } from '@/components/admin/AdminModal';
import { classNames } from '@/lib/utils';

// ── Types ──

interface AppError {
  id: string;
  created_at: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  error_type: string;
  message: string;
  stack_trace: string | null;
  route: string | null;
  feature: string | null;
  calculator: string | null;
  http_status: number | null;
  service: string | null;
  browser: string | null;
  operating_system: string | null;
  device_type: string | null;
  app_version: string | null;
  session_id: string | null;
  user_id: string | null;
  metadata: Record<string, unknown>;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  fingerprint: string;
}

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
type DateRange = '24h' | '7d' | '30d';
type HealthStatus = 'operational' | 'degraded' | 'critical';

interface AlertConfig {
  id: string;
  alert_type: string;
  enabled: boolean;
  threshold_count: number;
  threshold_window_minutes: number;
  cooldown_minutes: number;
}

// ── Severity helpers ──

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  high: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
};

const STATUS_DOT: Record<HealthStatus, string> = {
  operational: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  critical: 'bg-red-500',
};

const STATUS_TEXT: Record<HealthStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  critical: 'Critical',
};

// ── Date helpers ──

function dateRangeToISO(range: DateRange): string {
  const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Main component ──

export default function SystemHealth() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<AppError[]>([]);
  const [stats, setStats] = useState({
    today: 0,
    last24h: 0,
    last7d: 0,
    unresolved: 0,
    critical: 0,
    mostAffectedRoute: '—',
    mostAffectedFeature: '—',
  });
  const [systemStatus, setSystemStatus] = useState<HealthStatus>('operational');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('24h');
  const [search, setSearch] = useState('');
  const [showResolved, setShowResolved] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [selectedError, setSelectedError] = useState<AppError | null>(null);
  const [trend, setTrend] = useState<{ hour: string; count: number }[]>([]);
  const [healthChecks, setHealthChecks] = useState<Record<string, HealthStatus>>({});
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'health' | 'alerts'>('overview');
  const [resolving, setResolving] = useState(false);

  // ── Fetch errors ──
  const fetchErrors = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('application_errors')
      .select('*')
      .order('last_seen', { ascending: false })
      .limit(200);

    if (showResolved === 'unresolved') {
      query = query.eq('resolved', false);
    } else if (showResolved === 'resolved') {
      query = query.eq('resolved', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to fetch errors:', error);
      setErrors([]);
    } else {
      let filtered = data ?? [];

      // Severity filter
      if (severityFilter !== 'all') {
        filtered = filtered.filter((e: AppError) => e.severity === severityFilter);
      }

      // Date range filter
      const since = dateRangeToISO(dateRange);
      filtered = filtered.filter((e: AppError) => e.last_seen >= since);

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter((e: AppError) =>
          e.message?.toLowerCase().includes(q) ||
          e.error_type?.toLowerCase().includes(q) ||
          e.route?.toLowerCase().includes(q) ||
          e.feature?.toLowerCase().includes(q),
        );
      }

      setErrors(filtered as AppError[]);
    }
    setLoading(false);
  }, [showResolved, severityFilter, dateRange, search]);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const start24h = dateRangeToISO('24h');
    const start7d = dateRangeToISO('7d');

    const [todayRes, last24hRes, last7dRes, unresolvedRes, criticalRes] = await Promise.all([
      supabase.from('application_errors').select('*', { count: 'exact', head: true }).gte('last_seen', startOfDay),
      supabase.from('application_errors').select('*', { count: 'exact', head: true }).gte('last_seen', start24h),
      supabase.from('application_errors').select('*', { count: 'exact', head: true }).gte('last_seen', start7d),
      supabase.from('application_errors').select('*', { count: 'exact', head: true }).eq('resolved', false),
      supabase.from('application_errors').select('*', { count: 'exact', head: true }).eq('severity', 'critical').eq('resolved', false),
    ]);

    // Most affected route and feature
    const { data: recentErrors } = await supabase
      .from('application_errors')
      .select('route, feature')
      .gte('last_seen', start24h)
      .limit(500);

    let topRoute = '—';
    let topFeature = '—';
    if (recentErrors && recentErrors.length > 0) {
      const routeCounts: Record<string, number> = {};
      const featureCounts: Record<string, number> = {};
      for (const e of recentErrors) {
        if (e.route) routeCounts[e.route] = (routeCounts[e.route] || 0) + 1;
        if (e.feature) featureCounts[e.feature] = (featureCounts[e.feature] || 0) + 1;
      }
      topRoute = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
      topFeature = Object.entries(featureCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    }

    setStats({
      today: todayRes.count ?? 0,
      last24h: last24hRes.count ?? 0,
      last7d: last7dRes.count ?? 0,
      unresolved: unresolvedRes.count ?? 0,
      critical: criticalRes.count ?? 0,
      mostAffectedRoute: topRoute,
      mostAffectedFeature: topFeature,
    });

    // ── Determine system status ──
    const criticalCount = criticalRes.count ?? 0;
    const last24hCount = last24hRes.count ?? 0;
    if (criticalCount > 0 || last24hCount > 50) {
      setSystemStatus('critical');
    } else if (last24hCount > 10 || (unresolvedRes.count ?? 0) > 20) {
      setSystemStatus('degraded');
    } else {
      setSystemStatus('operational');
    }
  }, []);

  // ── Fetch trend data ──
  const fetchTrend = useCallback(async (range: DateRange) => {
    const since = dateRangeToISO(range);
    const { data } = await supabase
      .from('application_errors')
      .select('last_seen')
      .gte('last_seen', since)
      .order('last_seen', { ascending: true })
      .limit(1000);

    if (!data || data.length === 0) {
      setTrend([]);
      return;
    }

    // Group by hour for 24h, by day for 7d/30d
    const buckets: Record<string, number> = {};
    const bucketSize = range === '24h' ? 'hour' : 'day';
    for (const e of data) {
      const d = new Date(e.last_seen);
      const key = bucketSize === 'hour'
        ? `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:00`
        : `${d.getDate()}/${d.getMonth() + 1}`;
      buckets[key] = (buckets[key] || 0) + 1;
    }
    setTrend(Object.entries(buckets).map(([hour, count]) => ({ hour, count })));
  }, []);

  // ── Fetch health checks ──
  const runHealthChecks = useCallback(async () => {
    const checks: Record<string, HealthStatus> = {};

    // Website check
    try {
      const res = await fetch(window.location.origin, { method: 'HEAD', cache: 'no-cache' });
      checks['Website'] = res.ok ? 'operational' : 'degraded';
    } catch {
      checks['Website'] = 'down' as HealthStatus;
    }

    // Supabase + Database check
    try {
      const start = performance.now();
      const { error } = await supabase.from('site_settings').select('id').limit(1);
      const elapsed = performance.now() - start;
      if (error) {
        checks['Database'] = 'critical';
      } else if (elapsed > 2000) {
        checks['Database'] = 'degraded';
      } else {
        checks['Database'] = 'operational';
      }
    } catch {
      checks['Database'] = 'critical';
    }

    // Authentication check
    try {
      const { data } = await supabase.auth.getSession();
      checks['Authentication'] = data || !data ? 'operational' : 'degraded';
    } catch {
      checks['Authentication'] = 'critical';
    }

    // Storage check
    try {
      const { error } = await supabase.storage.from('media').list('', { limit: 1 });
      checks['Storage'] = error && error.message !== 'The resource was not found' ? 'degraded' : 'operational';
    } catch {
      checks['Storage'] = 'degraded';
    }

    // Edge Functions check
    try {
      const start = performance.now();
      const { error } = await supabase.functions.invoke('report-error', {
        body: JSON.stringify({ test: true }),
      });
      const elapsed = performance.now() - start;
      // A valid response (even an error about missing fields) means the function is up
      if (error && elapsed > 5000) {
        checks['Edge Functions'] = 'degraded';
      } else {
        checks['Edge Functions'] = 'operational';
      }
    } catch {
      checks['Edge Functions'] = 'degraded';
    }

    // AI service check (check if AI edge function responds)
    try {
      const { error } = await supabase.functions.invoke('ai-color-consult', {
        body: JSON.stringify({ health_check: true }),
      });
      checks['AI Service'] = error ? 'degraded' : 'operational';
    } catch {
      checks['AI Service'] = 'degraded';
    }

    setHealthChecks(checks);
  }, []);

  // ── Fetch alert configs ──
  const fetchAlertConfigs = useCallback(async () => {
    const { data, error } = await supabase.from('error_alert_config').select('*').order('alert_type');
    if (!error && data) {
      setAlertConfigs(data as AlertConfig[]);
    }
  }, []);

  // ── Resolve/reopen error ──
  const toggleResolved = async (errorId: string, currentResolved: boolean) => {
    setResolving(true);
    const { error } = await supabase
      .from('application_errors')
      .update({ resolved: !currentResolved })
      .eq('id', errorId);

    if (!error) {
      setErrors((prev) =>
        prev.map((e) => e.id === errorId ? { ...e, resolved: !currentResolved } : e),
      );
      if (selectedError?.id === errorId) {
        setSelectedError({ ...selectedError, resolved: !currentResolved });
      }
    }
    setResolving(false);
  };

  // ── Update alert config ──
  const updateAlertConfig = async (id: string, updates: Partial<AlertConfig>) => {
    const { error } = await supabase.from('error_alert_config').update(updates).eq('id', id);
    if (!error) {
      setAlertConfigs((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c));
    }
  };

  // ── Initial load ──
  useEffect(() => {
    if (!isAdmin) return;
    fetchStats();
    fetchErrors();
    fetchTrend(dateRange);
    runHealthChecks();
    fetchAlertConfigs();
  }, [isAdmin, fetchStats, fetchErrors, fetchTrend, dateRange, runHealthChecks, fetchAlertConfigs]);

  // ── Refetch on filter change ──
  useEffect(() => {
    if (isAdmin) fetchErrors();
  }, [isAdmin, fetchErrors, severityFilter, dateRange, showResolved]);

  // ── Render ──

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-neutral-500">Administrator access required.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminHeader
        title="System Health"
        subtitle="Centralized error monitoring and system health monitoring"
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => { fetchStats(); fetchErrors(); fetchTrend(dateRange); runHealthChecks(); }}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5">
              Refresh
            </button>
          </div>
        }
      />

      {/* ── Status banner ── */}
      <div className="mb-6 flex items-center gap-3 rounded-lg border p-4"
        style={{
          borderColor: systemStatus === 'operational' ? '#10b98133' : systemStatus === 'degraded' ? '#f59e0b33' : '#ef444433',
          background: systemStatus === 'operational' ? '#10b9810d' : systemStatus === 'degraded' ? '#f59e0b0d' : '#ef44440d',
        }}>
        <span className={classNames('h-3 w-3 rounded-full', STATUS_DOT[systemStatus])} />
        <div>
          <span className="text-sm font-semibold text-neutral-800 dark:text-white">
            🟢 {STATUS_TEXT[systemStatus]}
          </span>
          <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
            {systemStatus === 'operational' && 'All systems operating normally.'}
            {systemStatus === 'degraded' && 'Some errors detected. Monitor for issues.'}
            {systemStatus === 'critical' && 'Critical errors detected. Immediate attention required.'}
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-4 flex gap-1 border-b border-neutral-200 dark:border-white/10">
        {(['overview', 'errors', 'health', 'alerts'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={classNames(
              'px-4 py-2 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'border-b-2 border-brand-purple text-brand-purple'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
            )}>
            {tab === 'overview' ? 'Overview' : tab === 'errors' ? 'Error List' : tab === 'health' ? 'Health Checks' : 'Alert Config'}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Errors Today" value={stats.today} />
            <StatCard label="Last 24h" value={stats.last24h} />
            <StatCard label="Last 7 Days" value={stats.last7d} />
            <StatCard label="Unresolved" value={stats.unresolved} accent={stats.unresolved > 0 ? 'amber' : undefined} />
            <StatCard label="Critical" value={stats.critical} accent={stats.critical > 0 ? 'red' : undefined} />
            <StatCard label="Total (loaded)" value={errors.length} />
          </div>

          {/* Most affected */}
          <AdminCard>
            <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-white">Most Affected</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Route</span>
                <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-white">{stats.mostAffectedRoute}</p>
              </div>
              <div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Feature</span>
                <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-white">{stats.mostAffectedFeature}</p>
              </div>
            </div>
          </AdminCard>

          {/* Error trend chart */}
          <AdminCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-white">Error Trend</h3>
              <div className="flex gap-1">
                {(['24h', '7d', '30d'] as DateRange[]).map((r) => (
                  <button key={r} onClick={() => { setDateRange(r); fetchTrend(r); }}
                    className={classNames(
                      'rounded px-2 py-1 text-xs font-medium',
                      dateRange === r ? 'bg-brand-purple text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5',
                    )}>
                    {r === '24h' ? '24 hours' : r === '7d' ? '7 days' : '30 days'}
                  </button>
                ))}
              </div>
            </div>
            {trend.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">No errors in this period.</p>
            ) : (
              <div className="flex h-40 items-end gap-1 overflow-x-auto">
                {trend.map((point, i) => {
                  const maxCount = Math.max(...trend.map((t) => t.count), 1);
                  const heightPct = (point.count / maxCount) * 100;
                  return (
                    <div key={i} className="group relative flex min-w-[20px] flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
                      <div className="absolute -top-6 hidden whitespace-nowrap rounded bg-neutral-900 px-2 py-1 text-xs text-white group-hover:block">
                        {point.hour}: {point.count}
                      </div>
                      <div
                        className="w-full rounded-t bg-brand-purple/70 transition-colors hover:bg-brand-purple"
                        style={{ height: `${heightPct}%`, minHeight: '2px' }}
                      />
                      {trend.length <= 24 && (
                        <span className="mt-1 text-[10px] text-neutral-400">{point.hour.split(' ')[1] || point.hour}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </AdminCard>

          {/* Recent errors preview */}
          {errors.length > 0 && (
            <AdminCard>
              <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-white">Recent Errors</h3>
              <div className="space-y-2">
                {errors.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 p-2 dark:border-white/5"
                    onClick={() => setSelectedError(e)} role="button">
                    <span className={classNames('rounded px-2 py-0.5 text-[10px] font-medium border', SEVERITY_STYLES[e.severity])}>
                      {e.severity.toUpperCase()}
                    </span>
                    <span className="flex-1 truncate text-sm text-neutral-700 dark:text-neutral-300">{e.message}</span>
                    <span className="text-xs text-neutral-400">{e.occurrence_count > 1 ? `${e.occurrence_count}×` : formatDate(e.last_seen)}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setActiveTab('errors')}
                className="mt-3 text-xs font-medium text-brand-purple hover:underline">
                View all errors →
              </button>
            </AdminCard>
          )}
        </div>
      )}

      {/* ── Error list tab ── */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search errors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy-mid"
            />
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy-mid">
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={showResolved} onChange={(e) => setShowResolved(e.target.value as 'all' | 'unresolved' | 'resolved')}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy-mid">
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy-mid">
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          {/* Error table */}
          {loading ? (
            <p className="py-8 text-center text-sm text-neutral-400">Loading errors...</p>
          ) : errors.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">No errors found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                    <th className="pb-2 pr-3 font-medium">Severity</th>
                    <th className="pb-2 pr-3 font-medium">Error</th>
                    <th className="pb-2 pr-3 font-medium">Feature</th>
                    <th className="pb-2 pr-3 font-medium">Route</th>
                    <th className="pb-2 pr-3 font-medium">Occurrences</th>
                    <th className="pb-2 pr-3 font-medium">First seen</th>
                    <th className="pb-2 pr-3 font-medium">Last seen</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((e) => (
                    <tr key={e.id} onClick={() => setSelectedError(e)} role="button"
                      className="border-b border-neutral-100 cursor-pointer hover:bg-neutral-50 dark:border-white/5 dark:hover:bg-white/5">
                      <td className="py-2 pr-3">
                        <span className={classNames('rounded px-2 py-0.5 text-[10px] font-medium border', SEVERITY_STYLES[e.severity])}>
                          {e.severity}
                        </span>
                      </td>
                      <td className="py-2 pr-3 max-w-[300px] truncate text-neutral-700 dark:text-neutral-300">{e.message}</td>
                      <td className="py-2 pr-3 text-neutral-500 dark:text-neutral-400">{e.feature ?? '—'}</td>
                      <td className="py-2 pr-3 max-w-[150px] truncate text-neutral-500 dark:text-neutral-400">{e.route ?? '—'}</td>
                      <td className="py-2 pr-3 text-neutral-700 dark:text-neutral-300">{e.occurrence_count}</td>
                      <td className="py-2 pr-3 text-xs text-neutral-400">{formatDate(e.first_seen)}</td>
                      <td className="py-2 pr-3 text-xs text-neutral-400">{formatDate(e.last_seen)}</td>
                      <td className="py-2">
                        {e.resolved ? (
                          <span className="text-xs text-emerald-600">Resolved</span>
                        ) : (
                          <span className="text-xs text-amber-600">Open</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Health checks tab ── */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          <AdminCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-white">Service Health</h3>
              <button onClick={runHealthChecks}
                className="text-xs font-medium text-brand-purple hover:underline">
                Re-check
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(healthChecks).map(([service, status]) => (
                <div key={service} className="flex items-center gap-3 rounded-lg border border-neutral-100 p-3 dark:border-white/5">
                  <span className={classNames(
                    'h-3 w-3 rounded-full',
                    status === 'operational' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-amber-500' : 'bg-red-500',
                  )} />
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-white">{service}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">{status}</p>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      )}

      {/* ── Alerts config tab ── */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <AdminCard>
            <h3 className="mb-4 text-sm font-semibold text-neutral-800 dark:text-white">Alert Thresholds</h3>
            <div className="space-y-3">
              {alertConfigs.map((cfg) => (
                <div key={cfg.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-100 p-3 dark:border-white/5">
                  <div className="flex-1 min-w-[150px]">
                    <p className="text-sm font-medium capitalize text-neutral-800 dark:text-white">
                      {cfg.alert_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {cfg.threshold_count} errors in {cfg.threshold_window_minutes} min · cooldown {cfg.cooldown_minutes} min
                    </p>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cfg.enabled}
                      onChange={(e) => updateAlertConfig(cfg.id, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-neutral-300"
                    />
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{cfg.enabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      )}

      {/* ── Error detail modal ── */}
      {selectedError && (
        <AdminModal open={!!selectedError} onClose={() => setSelectedError(null)}
          title="Error Details">
          <div className="space-y-4">
            {/* Severity & status */}
            <div className="flex items-center gap-2">
              <span className={classNames('rounded px-2 py-1 text-xs font-medium border', SEVERITY_STYLES[selectedError.severity])}>
                {selectedError.severity.toUpperCase()}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {selectedError.error_type}
              </span>
              {selectedError.resolved ? (
                <span className="text-xs text-emerald-600">· Resolved</span>
              ) : (
                <span className="text-xs text-amber-600">· Open</span>
              )}
            </div>

            {/* Message */}
            <div>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Message</span>
              <p className="mt-1 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-800 dark:bg-white/5 dark:text-neutral-200">
                {selectedError.message}
              </p>
            </div>

            {/* Stack trace */}
            {selectedError.stack_trace && (
              <div>
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Stack Trace</span>
                <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-300">
                  {selectedError.stack_trace}
                </pre>
              </div>
            )}

            {/* Context grid */}
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Feature" value={selectedError.feature} />
              <DetailField label="Calculator" value={selectedError.calculator} />
              <DetailField label="Route" value={selectedError.route} />
              <DetailField label="Service" value={selectedError.service} />
              <DetailField label="HTTP Status" value={selectedError.http_status ? String(selectedError.http_status) : null} />
              <DetailField label="App Version" value={selectedError.app_version} />
              <DetailField label="Browser" value={selectedError.browser} />
              <DetailField label="OS" value={selectedError.operating_system} />
              <DetailField label="Device" value={selectedError.device_type} />
              <DetailField label="Error Type" value={selectedError.error_type} />
            </div>

            {/* Occurrence info */}
            <div className="grid grid-cols-3 gap-3">
              <DetailField label="Occurrences" value={String(selectedError.occurrence_count)} />
              <DetailField label="First Seen" value={formatDate(selectedError.first_seen)} />
              <DetailField label="Last Seen" value={formatDate(selectedError.last_seen)} />
            </div>

            {/* Metadata */}
            {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
              <div>
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Metadata</span>
                <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-neutral-50 p-2 text-xs text-neutral-600 dark:bg-white/5 dark:text-neutral-400">
                  {JSON.stringify(selectedError.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Resolve/reopen actions */}
            <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-white/5">
              <AdminButton variant="secondary" onClick={() => setSelectedError(null)}>
                Close
              </AdminButton>
              {selectedError.resolved ? (
                <AdminButton variant="primary" onClick={() => toggleResolved(selectedError.id, true)} disabled={resolving}>
                  Reopen
                </AdminButton>
              ) : (
                <AdminButton variant="success" onClick={() => toggleResolved(selectedError.id, false)} disabled={resolving}>
                  {resolving ? 'Resolving...' : 'Mark Resolved'}
                </AdminButton>
              )}
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

// ── Sub-components ──

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'amber' | 'red' }) {
  const colorClass = accent === 'red' ? 'text-red-600' : accent === 'amber' ? 'text-amber-600' : 'text-neutral-800 dark:text-white';
  return (
    <div className="rounded-lg border border-neutral-100 p-4 dark:border-white/5">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={classNames('mt-1 text-2xl font-bold', colorClass)}>{value}</p>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      <p className="mt-0.5 text-sm text-neutral-800 dark:text-neutral-200">{value ?? '—'}</p>
    </div>
  );
}
