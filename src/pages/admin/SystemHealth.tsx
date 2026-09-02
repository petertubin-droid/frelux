import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { AdminHeader, AdminCard, AdminButton } from '@/components/admin/AdminUi';
import { AdminModal } from '@/components/admin/AdminModal';
import { classNames } from '@/lib/utils';
import { analyzeErrorWithAI, generateErrorFix, approveFix, type ErrorDiagnosis, type ErrorFix, type ErrorFixHistoryRecord } from '@/lib/error-analysis';
import { Button } from "@/components/ui/shadcn/button";


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
  // ── AI Error Analysis state ──
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<ErrorDiagnosis | null>(null);
  const [aiFix, setAiFix] = useState<ErrorFix | null>(null);
  const [generatingFix, setGeneratingFix] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [fixHistory, setFixHistory] = useState<ErrorFixHistoryRecord[]>([]);
  const [approvingFix, setApprovingFix] = useState(false);
  const [showFixHistory, setShowFixHistory] = useState(false);

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

  // ── Analyze error with AI Studio ──
  const handleAnalyzeError = async (error: AppError) => {
    setAiAnalyzing(true);
    setAiError(null);
    setAiDiagnosis(null);
    setAiFix(null);
    try {
      const { diagnosis } = await analyzeErrorWithAI(error);
      setAiDiagnosis(diagnosis);
      // Load fix history for this error
      const history = await fetchFixHistoryForError(error.id);
      setFixHistory(history);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // ── Generate fix with AI Studio ──
  const handleGenerateFix = async (error: AppError) => {
    setGeneratingFix(true);
    setAiError(null);
    try {
      const { fix } = await generateErrorFix(error, aiDiagnosis ?? undefined);
      setAiFix(fix);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Fix generation failed');
    } finally {
      setGeneratingFix(false);
    }
  };

  // ── Approve and apply fix ──
  const handleApproveFix = async (errorId: string) => {
    setApprovingFix(true);
    try {
      // Find the latest fix history record for this error
      const latest = fixHistory[0];
      if (latest) {
        await approveFix(latest.id);
        // Refresh fix history
        const history = await fetchFixHistoryForError(errorId);
        setFixHistory(history);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApprovingFix(false);
    }
  };

  // ── Fetch fix history for error ──
  async function fetchFixHistoryForError(errorId: string): Promise<ErrorFixHistoryRecord[]> {
    try {
      const { data, error } = await supabase
        .from('error_fix_history')
        .select('*')
        .eq('error_id', errorId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data ?? []) as ErrorFixHistoryRecord[];
    } catch {
      return [];
    }
  }

  // ── Reset AI state when closing modal ──
  const handleCloseModal = () => {
    setSelectedError(null);
    setAiDiagnosis(null);
    setAiFix(null);
    setAiError(null);
    setFixHistory([]);
    setShowFixHistory(false);
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
        <p className="text-sm text-muted-foreground">Administrator access required.</p>
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
            <Button variant="ghost" onClick={() => { fetchStats(); fetchErrors(); fetchTrend(dateRange); runHealthChecks(); }}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 dark:border-white/10 dark:text-muted-foreground/80 dark:hover:bg-white/5">
              Refresh
            </Button>
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
          <span className="text-sm font-semibold text-foreground dark:text-primary-foreground">
            🟢 {STATUS_TEXT[systemStatus]}
          </span>
          <span className="ml-2 text-xs text-muted-foreground dark:text-muted-foreground">
            {systemStatus === 'operational' && 'All systems operating normally.'}
            {systemStatus === 'degraded' && 'Some errors detected. Monitor for issues.'}
            {systemStatus === 'critical' && 'Critical errors detected. Immediate attention required.'}
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-4 flex gap-1 border-b border-border dark:border-white/10">
        {(['overview', 'errors', 'health', 'alerts'] as const).map((tab) => (
          <Button variant="ghost" key={tab} onClick={() => setActiveTab(tab)}
            className={classNames(
              'px-4 py-2 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'border-b-2 border-brand-purple text-brand-purple'
                : 'text-muted-foreground hover:text-card-foreground dark:text-muted-foreground dark:hover:text-muted-foreground/60',
            )}>
            {tab === 'overview' ? 'Overview' : tab === 'errors' ? 'Error List' : tab === 'health' ? 'Health Checks' : 'Alert Config'}
          </Button>
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
            <h3 className="mb-3 text-sm font-semibold text-foreground dark:text-primary-foreground">Most Affected</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground dark:text-muted-foreground">Route</span>
                <p className="mt-1 text-sm font-medium text-foreground dark:text-primary-foreground">{stats.mostAffectedRoute}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground dark:text-muted-foreground">Feature</span>
                <p className="mt-1 text-sm font-medium text-foreground dark:text-primary-foreground">{stats.mostAffectedFeature}</p>
              </div>
            </div>
          </AdminCard>

          {/* Error trend chart */}
          <AdminCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground dark:text-primary-foreground">Error Trend</h3>
              <div className="flex gap-1">
                {(['24h', '7d', '30d'] as DateRange[]).map((r) => (
                  <Button variant="ghost" key={r} onClick={() => { setDateRange(r); fetchTrend(r); }}
                    className={classNames(
                      'rounded px-2 py-1 text-xs font-medium',
                      dateRange === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted dark:hover:bg-white/5',
                    )}>
                    {r === '24h' ? '24 hours' : r === '7d' ? '7 days' : '30 days'}
                  </Button>
                ))}
              </div>
            </div>
            {trend.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No errors in this period.</p>
            ) : (
              <div className="flex h-40 items-end gap-1 overflow-x-auto">
                {trend.map((point, i) => {
                  const maxCount = Math.max(...trend.map((t) => t.count), 1);
                  const heightPct = (point.count / maxCount) * 100;
                  return (
                    <div key={i} className="group relative flex min-w-[20px] flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
                      <div className="absolute -top-6 hidden whitespace-nowrap rounded bg-background px-2 py-1 text-xs text-primary-foreground group-hover:block">
                        {point.hour}: {point.count}
                      </div>
                      <div
                        className="w-full rounded-t bg-primary/70 transition-colors hover:bg-primary"
                        style={{ height: `${heightPct}%`, minHeight: '2px' }}
                      />
                      {trend.length <= 24 && (
                        <span className="mt-1 text-[10px] text-muted-foreground">{point.hour.split(' ')[1] || point.hour}</span>
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
              <h3 className="mb-3 text-sm font-semibold text-foreground dark:text-primary-foreground">Recent Errors</h3>
              <div className="space-y-2">
                {errors.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-2 dark:border-white/5"
                    onClick={() => setSelectedError(e)} role="button">
                    <span className={classNames('rounded px-2 py-0.5 text-[10px] font-medium border', SEVERITY_STYLES[e.severity])}>
                      {e.severity.toUpperCase()}
                    </span>
                    <span className="flex-1 truncate text-sm text-card-foreground dark:text-muted-foreground/80">{e.message}</span>
                    <span className="text-xs text-muted-foreground">{e.occurrence_count > 1 ? `${e.occurrence_count}×` : formatDate(e.last_seen)}</span>
                  </div>
                ))}
              </div>
              <Button variant="ghost" onClick={() => setActiveTab('errors')}
                className="mt-3 text-xs font-medium text-brand-purple hover:underline">
                View all errors →
              </Button>
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
              className="flex-1 min-w-[200px] rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-card"
            />
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
              className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-card">
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={showResolved} onChange={(e) => setShowResolved(e.target.value as 'all' | 'unresolved' | 'resolved')}
              className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-card">
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-card">
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          {/* Error table */}
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading errors...</p>
          ) : errors.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No errors found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground dark:border-white/10 dark:text-muted-foreground">
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
                      className="border-b border-border/50 cursor-pointer hover:bg-muted/50 dark:border-white/5 dark:hover:bg-white/5">
                      <td className="py-2 pr-3">
                        <span className={classNames('rounded px-2 py-0.5 text-[10px] font-medium border', SEVERITY_STYLES[e.severity])}>
                          {e.severity}
                        </span>
                      </td>
                      <td className="py-2 pr-3 max-w-[300px] truncate text-card-foreground dark:text-muted-foreground/80">{e.message}</td>
                      <td className="py-2 pr-3 text-muted-foreground dark:text-muted-foreground">{e.feature ?? '—'}</td>
                      <td className="py-2 pr-3 max-w-[150px] truncate text-muted-foreground dark:text-muted-foreground">{e.route ?? '—'}</td>
                      <td className="py-2 pr-3 text-card-foreground dark:text-muted-foreground/80">{e.occurrence_count}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{formatDate(e.first_seen)}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{formatDate(e.last_seen)}</td>
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
              <h3 className="text-sm font-semibold text-foreground dark:text-primary-foreground">Service Health</h3>
              <Button variant="ghost" onClick={runHealthChecks}
                className="text-xs font-medium text-brand-purple hover:underline">
                Re-check
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(healthChecks).map(([service, status]) => (
                <div key={service} className="flex items-center gap-3 rounded-lg border border-border/50 p-3 dark:border-white/5">
                  <span className={classNames(
                    'h-3 w-3 rounded-full',
                    status === 'operational' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-amber-500' : 'bg-red-500',
                  )} />
                  <div>
                    <p className="text-sm font-medium text-foreground dark:text-primary-foreground">{service}</p>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground capitalize">{status}</p>
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
            <h3 className="mb-4 text-sm font-semibold text-foreground dark:text-primary-foreground">Alert Thresholds</h3>
            <div className="space-y-3">
              {alertConfigs.map((cfg) => (
                <div key={cfg.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 p-3 dark:border-white/5">
                  <div className="flex-1 min-w-[150px]">
                    <p className="text-sm font-medium capitalize text-foreground dark:text-primary-foreground">
                      {cfg.alert_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                      {cfg.threshold_count} errors in {cfg.threshold_window_minutes} min · cooldown {cfg.cooldown_minutes} min
                    </p>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cfg.enabled}
                      onChange={(e) => updateAlertConfig(cfg.id, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-xs text-muted-foreground dark:text-muted-foreground">{cfg.enabled ? 'Enabled' : 'Disabled'}</span>
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
              <span className="text-xs text-muted-foreground dark:text-muted-foreground">
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
              <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">Message</span>
              <p className="mt-1 rounded-lg bg-muted/50 p-3 text-sm text-foreground dark:bg-white/5 dark:text-muted-foreground/60">
                {selectedError.message}
              </p>
            </div>

            {/* Stack trace */}
            {selectedError.stack_trace && (
              <div>
                <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">Stack Trace</span>
                <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-background p-3 text-xs text-muted-foreground/80">
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
                <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">Metadata</span>
                <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground dark:bg-white/5 dark:text-muted-foreground">
                  {JSON.stringify(selectedError.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* ── AI Studio Analysis section ── */}
            <div className="rounded-lg border border-brand-purple/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-brand-purple">AI Studio Error Analysis</h4>
                <div className="flex gap-2">
                  <Link
                    to="/admin/studio/error_analysis"
                    state={{ errorId: selectedError.id }}
                    className="text-xs font-medium text-brand-purple hover:underline"
                  >
                    Open in AI Studio →
                  </Link>
                </div>
              </div>

              {aiAnalyzing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg className="h-4 w-4 animate-spin text-brand-purple" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing error with AI...
                </div>
              )}

              {aiError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  {aiError}
                </div>
              )}

              {aiDiagnosis && !aiAnalyzing && (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-medium text-muted-foreground dark:text-muted-foreground">What failed: </span>
                    <span className="text-foreground dark:text-muted-foreground/60">{aiDiagnosis.what_failed}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground dark:text-muted-foreground">Root cause: </span>
                    <span className="text-foreground dark:text-muted-foreground/60">{aiDiagnosis.root_cause}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground dark:text-muted-foreground">Affected file: </span>
                    <span className="text-foreground dark:text-muted-foreground/60">{aiDiagnosis.affected_file}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground dark:text-muted-foreground">Category: </span>
                    <span className="text-foreground dark:text-muted-foreground/60">{aiDiagnosis.category}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground dark:text-muted-foreground">Risk level: </span>
                    <span className={classNames(
                      'rounded px-1.5 py-0.5 text-[10px] font-medium',
                      aiDiagnosis.risk_level === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                      aiDiagnosis.risk_level === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' :
                      aiDiagnosis.risk_level === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                    )}>{aiDiagnosis.risk_level.toUpperCase()}</span>
                  </div>
                  {aiDiagnosis.protected_functionality_affected && (
                    <div className="rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                      ⚠️ Protected FRELUX Logic Detected — explicit admin approval required
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-muted-foreground dark:text-muted-foreground">Proposed solution: </span>
                    <span className="text-foreground dark:text-muted-foreground/60">{aiDiagnosis.proposed_solution}</span>
                  </div>

                  {/* Generate Fix button */}
                  {!aiFix && (
                    <Button variant="ghost"
                      onClick={() => handleGenerateFix(selectedError)}
                      disabled={generatingFix}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {generatingFix ? 'Generating fix...' : 'Generate Fix'}
                    </Button>
                  )}
                </div>
              )}

              {/* AI Proposed Fix */}
              {aiFix && (
                <div className="space-y-2 border-t border-brand-purple/10 pt-3">
                  <h5 className="text-xs font-semibold text-brand-purple">Proposed Fix</h5>
                  <div className="text-xs">
                    <span className="font-medium text-muted-foreground dark:text-muted-foreground">File: </span>
                    <span className="text-foreground dark:text-muted-foreground/60">{aiFix.file}</span>
                  </div>
                  {aiFix.explanation && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground dark:text-muted-foreground">Explanation: </span>
                      <span className="text-foreground dark:text-muted-foreground/60">{aiFix.explanation}</span>
                    </div>
                  )}
                  {aiFix.expected_effect && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground dark:text-muted-foreground">Expected effect: </span>
                      <span className="text-foreground dark:text-muted-foreground/60">{aiFix.expected_effect}</span>
                    </div>
                  )}
                  {aiFix.protected_functionality_affected && (
                    <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                      ⚠️ Protected FRELUX Logic Detected — requires explicit admin approval before applying
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="ghost"
                      onClick={() => handleApproveFix(selectedError.id)}
                      disabled={approvingFix}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {approvingFix ? 'Approving...' : 'Approve & Apply Fix'}
                    </Button>
                    <Button variant="ghost"
                      onClick={() => setShowFixHistory(!showFixHistory)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 dark:border-white/10 dark:text-muted-foreground/80 dark:hover:bg-white/5"
                    >
                      {showFixHistory ? 'Hide' : 'Show'} Fix History
                    </Button>
                  </div>
                </div>
              )}

              {/* Fix History */}
              {showFixHistory && fixHistory.length > 0 && (
                <div className="space-y-1 border-t border-brand-purple/10 pt-3">
                  <h5 className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground">Fix History</h5>
                  {fixHistory.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-xs">
                      <span className={classNames(
                        'rounded px-1.5 py-0.5 text-[10px] font-medium',
                        h.status === 'verified' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        h.status === 'deployed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                        h.status === 'approved' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' :
                        h.status === 'failed' || h.status === 'rolled_back' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                        'bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground'
                      )}>{h.status.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground dark:text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Analyze button (initial) */}
              {!aiDiagnosis && !aiAnalyzing && !aiError && (
                <Button variant="ghost"
                  onClick={() => handleAnalyzeError(selectedError)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Analyze with AI Studio
                </Button>
              )}
            </div>

            {/* Resolve/reopen actions */}
            <div className="flex justify-end gap-2 border-t border-border/50 pt-4 dark:border-white/5">
              <AdminButton variant="secondary" onClick={handleCloseModal}>
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
  const colorClass = accent === 'red' ? 'text-red-600' : accent === 'amber' ? 'text-amber-600' : 'text-foreground dark:text-primary-foreground';
  return (
    <div className="rounded-lg border border-border/50 p-4 dark:border-white/5">
      <p className="text-xs text-muted-foreground dark:text-muted-foreground">{label}</p>
      <p className={classNames('mt-1 text-2xl font-bold', colorClass)}>{value}</p>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">{label}</span>
      <p className="mt-0.5 text-sm text-foreground dark:text-muted-foreground/60">{value ?? '—'}</p>
    </div>
  );
}
