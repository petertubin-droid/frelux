import { useState, useEffect, useCallback } from 'react';
import { AdminModal } from '@/components/admin/AdminModal';
import { supabase } from '@/lib/supabase';
import { formatNumber } from '@/lib/utils';
import { AdminButton } from '@/components/admin/AdminUi';

interface ErrorLog {
  id: string;
  created_at: string;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  boundary_name: string;
  url: string | null;
  user_agent: string | null;
  user_id: string | null;
  severity: 'info' | 'warning' | 'error' | 'critical';
  is_resolved: boolean;
}

type SeverityFilter = 'all' | 'critical' | 'error' | 'warning' | 'info';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  error: 'bg-orange-100 text-orange-700 border-orange-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function AdminErrors() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [stats, setStats] = useState({ total: 0, unresolved: 0, critical: 0, today: 0 });
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter !== 'all') {
      query = query.eq('severity', filter);
    }

    const { data, error } = await query;
    if (error) {
      if (import.meta.env.DEV) console.error('Failed to fetch error logs:', error);
      setErrors([]);
    } else {
      setErrors((data ?? []) as unknown as ErrorLog[]);
    }

    // Fetch stats
    const [allRes, unresolvedRes, criticalRes, todayRes] = await Promise.all([
      supabase.from('error_logs').select('*', { count: 'exact', head: true }),
      supabase.from('error_logs').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
      supabase.from('error_logs').select('*', { count: 'exact', head: true }).eq('severity', 'critical').eq('is_resolved', false),
      supabase.from('error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    ]);

    setStats({
      total: allRes.count ?? 0,
      unresolved: unresolvedRes.count ?? 0,
      critical: criticalRes.count ?? 0,
      today: todayRes.count ?? 0,
    });

    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchErrors(); }, [fetchErrors]);

  async function resolveError(id: string) {
    const { error } = await supabase
      .from('error_logs')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setErrors(prev => prev.map(e => e.id === id ? { ...e, is_resolved: true } : e));
      if (selectedError?.id === id) setSelectedError(prev => prev ? { ...prev, is_resolved: true } : null);
    }
  }

  async function resolveAll() {
    const ids = errors.filter(e => !e.is_resolved).map(e => e.id);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from('error_logs')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .in('id', ids);
    if (!error) {
      setErrors(prev => prev.map(e => ({ ...e, is_resolved: true })));
      fetchErrors();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Error Monitor</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Runtime errors and exceptions logged from the frontend</p>
        </div>
        <AdminButton
          variant="secondary"
          onClick={resolveAll}
          disabled={stats.unresolved === 0}
        >
          Resolve all ({stats.unresolved})
        </AdminButton>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Errors" value={stats.total} />
        <StatCard label="Unresolved" value={stats.unresolved} accent="text-orange-600" />
        <StatCard label="Critical (unresolved)" value={stats.critical} accent="text-red-600" />
        <StatCard label="Last 24 hours" value={stats.today} accent="text-blue-600" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'critical', 'error', 'warning', 'info'] as SeverityFilter[]).map(sev => (
          <button
            key={sev}
            type="button"
            onClick={() => setFilter(sev)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === sev ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:bg-white/5'
            }`}
          >
            {sev}
          </button>
        ))}
      </div>

      {/* Error list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-neutral-400 dark:text-neutral-500">Loading…</div>
      ) : errors.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-400 dark:text-neutral-500">No errors found 🎉</div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {errors.map(err => (
            <div
              key={err.id}
              className={`rounded-lg border p-3 transition-colors ${
                err.is_resolved ? 'border-neutral-100 bg-neutral-50 dark:bg-white/5 opacity-60' : 'border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid hover:bg-neutral-50 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[err.severity] ?? SEVERITY_STYLES.error}`}>
                      {err.severity}
                    </span>
                    {err.is_resolved && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">resolved</span>
                    )}
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">{err.boundary_name}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-neutral-800">{err.error_message}</p>
                  <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                    {new Date(err.created_at).toLocaleString()}
                    {err.url && <span className="ml-2 truncate">· {err.url}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedError(err)}
                    className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:bg-white/5"
                  >
                    Details
                  </button>
                  {!err.is_resolved && (
                    <AdminButton
                      variant="success"
                      onClick={() => resolveError(err.id)}
                      className="text-xs py-1 bg-green-50 border-green-200 text-green-600 hover:bg-green-100"
                    >
                      Resolve
                    </AdminButton>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedError && (
        <AdminModal open onClose={() => setSelectedError(null)} title="Error Details" maxWidth="max-w-2xl">
            <div className="space-y-3">
              <DetailRow label="Severity" value={selectedError.severity} />
              <DetailRow label="Boundary" value={selectedError.boundary_name} />
              <DetailRow label="Message" value={selectedError.error_message} />
              <DetailRow label="URL" value={selectedError.url ?? 'N/A'} />
              <DetailRow label="Time" value={new Date(selectedError.created_at).toLocaleString()} />
              <DetailRow label="User Agent" value={selectedError.user_agent ?? 'N/A'} />
              {selectedError.error_stack && (
                <div>
                  <p className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">Stack trace</p>
                  <pre className="overflow-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-300">{selectedError.error_stack}</pre>
                </div>
              )}
              {selectedError.component_stack && (
                <div>
                  <p className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">Component stack</p>
                  <pre className="overflow-auto rounded-lg bg-neutral-100 p-3 text-xs text-neutral-600">{selectedError.component_stack}</pre>
                </div>
              )}
            </div>
        </AdminModal>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-4">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? 'text-neutral-900'}`}>{formatNumber(value, 0)}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="min-w-0 flex-1 text-sm text-neutral-800 break-words">{value}</span>
    </div>
  );
}
