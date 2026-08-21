import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Filter, User, Calendar, Database, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminHeader, AdminCard, AdminButton, StateMessage } from '@/components/admin/AdminUi';

interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: 'create' | 'update' | 'delete' | 'activate' | 'deactivate' | 'price_change' | 'adjust' | string;
  old_value: unknown;
  new_value: unknown;
  changed_by: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

function getActionBadge(action: string) {
  switch (action) {
    case 'create':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'update':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'delete':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'activate':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'deactivate':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'price_change':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'adjust':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-neutral-100 text-neutral-700 border-neutral-200';
  }
}

export default function AdminEstimationAudit() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filter state
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');

  // Expansion state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(
    async (targetPage: number, entityType: string, isAppend = false) => {
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const from = targetPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('estimation_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (entityType !== 'all') {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;

      if (error) {
        setError(error.message);
      } else {
        const fetched = (data as AuditLogEntry[]) ?? [];
        if (isAppend) {
          setEntries((prev) => [...prev, ...fetched]);
        } else {
          setEntries(fetched);
        }
        setHasMore(fetched.length === PAGE_SIZE);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    []
  );

  useEffect(() => {
    setPage(0);
    fetchAuditLogs(0, selectedEntityType, false);
  }, [selectedEntityType, fetchAuditLogs]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchAuditLogs(nextPage, selectedEntityType, true);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <AdminHeader
        title="Estimation Audit Trail"
        subtitle="View-only audit log tracking changes across estimation products, prices, rules, and calculations."
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-600">Filter Entity:</span>
          <select
            className="input-field dark:bg-brand-navy-mid dark:border-white/10 text-xs py-1.5 w-48"
            value={selectedEntityType}
            onChange={(e) => setSelectedEntityType(e.target.value)}
          >
            <option value="all">All Entities</option>
            <option value="product">product</option>
            <option value="quality">quality</option>
            <option value="material">material</option>
            <option value="price">price</option>
            <option value="calc_rule">calc_rule</option>
            <option value="pack_size">pack_size</option>
            <option value="estimate">estimate</option>
          </select>
        </div>

        <AdminButton
          variant="secondary"
          onClick={() => {
            setPage(0);
            fetchAuditLogs(0, selectedEntityType, false);
          }}
          className="text-xs py-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </AdminButton>
      </div>

      {loading ? (
        <StateMessage type="loading" title="Loading audit log..." message="Fetching security audit trail." />
      ) : entries.length === 0 ? (
        <StateMessage
          type="empty"
          title="No audit entries found"
          message={
            selectedEntityType !== 'all'
              ? `No audit logs recorded for entity type "${selectedEntityType}".`
              : 'Audit events will be recorded here automatically when changes are made.'
          }
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;

            return (
              <AdminCard key={entry.id} className="transition-all">
                <div
                  className="flex cursor-pointer flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => toggleExpand(entry.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold font-mono text-neutral-800 border border-neutral-200">
                        <Database className="h-3 w-3 text-neutral-500" />
                        {entry.entity_type}
                      </span>

                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getActionBadge(
                          entry.action
                        )}`}
                      >
                        {entry.action}
                      </span>

                      {entry.entity_id && (
                        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
                          ID: {entry.entity_id}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400 dark:text-neutral-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <User className="h-3 w-3" />
                        {entry.changed_by ? `User: ${entry.changed_by}` : 'System / Trigger'}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-brand-purple font-medium hidden sm:inline">
                      {isExpanded ? 'Hide changes' : 'View details'}
                    </span>
                    <div className="rounded-full bg-neutral-100 p-1.5 text-neutral-500 hover:bg-neutral-200">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded JSON diff panel */}
                {isExpanded && (
                  <div className="mt-4 border-t border-neutral-200 pt-4 text-xs">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <h4 className="mb-1.5 font-bold uppercase tracking-wider text-neutral-500 text-[11px]">
                          Old Value
                        </h4>
                        {entry.old_value !== null && entry.old_value !== undefined ? (
                          <pre className="max-h-60 overflow-x-auto rounded-lg bg-neutral-900 p-3 font-mono text-[11px] text-red-300">
                            {JSON.stringify(entry.old_value, null, 2)}
                          </pre>
                        ) : (
                          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 dark:bg-white/5 dark:border-white/5 dark:bg-white/5 p-3 text-neutral-400 italic">
                            None (Initial creation)
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="mb-1.5 font-bold uppercase tracking-wider text-neutral-500 text-[11px]">
                          New Value
                        </h4>
                        {entry.new_value !== null && entry.new_value !== undefined ? (
                          <pre className="max-h-60 overflow-x-auto rounded-lg bg-neutral-900 p-3 font-mono text-[11px] text-emerald-300">
                            {JSON.stringify(entry.new_value, null, 2)}
                          </pre>
                        ) : (
                          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 dark:bg-white/5 dark:border-white/5 dark:bg-white/5 p-3 text-neutral-400 italic">
                            None (Record deleted)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </AdminCard>
            );
          })}

          {/* Load More Pagination */}
          {hasMore && (
            <div className="mt-6 text-center">
              <AdminButton
                variant="secondary"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full sm:w-auto"
              >
                {loadingMore ? 'Loading more logs…' : 'Load More Audit Entries'}
              </AdminButton>
            </div>
          )}
        </div>
      )}
    </>
  );
}
