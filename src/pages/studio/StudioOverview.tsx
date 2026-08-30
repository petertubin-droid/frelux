import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Code, AlertCircle } from 'lucide-react';
import { TOOLS, TOOL_CATEGORIES } from '@/components/studio/tools';
import { supabase } from '@/lib/supabase';
import { fetchRecentErrorsForStudio } from '@/lib/error-analysis';

export default function StudioOverview() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [recentErrors, setRecentErrors] = useState<{ id: string; message: string; severity: string; feature: string | null; occurrence_count: number }[]>([]);

  const loadRecentErrors = useCallback(async () => {
    try {
      const data = await fetchRecentErrorsForStudio(5);
      setRecentErrors(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    async function load() {
      const tables = ['ai_studio_sessions', 'ai_studio_artifacts', 'ai_studio_prompts', 'ai_studio_plugins', 'ai_studio_integrations', 'ai_studio_features', 'ai_studio_roles'];
      const results = await Promise.all(tables.map((t) => supabase.from(t).select('*', { count: 'exact', head: true })));
      const next: Record<string, number> = {};
      tables.forEach((t, i) => { next[t] = results[i].count ?? 0; });
      setCounts(next);
    }
    load();
    loadRecentErrors();
  }, [loadRecentErrors]);

  const stats = [
    { label: 'Sessions', value: counts.ai_studio_sessions ?? 0 },
    { label: 'Artifacts', value: counts.ai_studio_artifacts ?? 0 },
    { label: 'Prompts', value: counts.ai_studio_prompts ?? 0 },
    { label: 'Plugins', value: counts.ai_studio_plugins ?? 0 },
    { label: 'Integrations', value: counts.ai_studio_integrations ?? 0 },
    { label: 'Features', value: counts.ai_studio_features ?? 0 },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start gap-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
          <Code className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-navy dark:text-white">AI Developer Studio</h1>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-500">AI assisted development environment for the FRELUX platform.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-4">
            <p className="text-2xl font-bold text-brand-navy dark:text-white">{s.value}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Errors from System Health */}
      {recentErrors.length > 0 && (
        <div className="mb-8 rounded-xl border border-brand-purple/20 bg-brand-purple/5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle aria-hidden="true" className="h-4 w-4 text-brand-purple" />
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Recent Errors from System Health</h2>
            </div>
            <Link to="/admin/studio/error_analysis" className="text-xs font-medium text-brand-purple hover:underline">
              Analyze all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentErrors.map((e) => (
              <Link
                key={e.id}
                to={`/admin/studio/error_analysis?errorId=${e.id}`}
                className="flex items-center gap-3 rounded-lg border border-neutral-100 p-2 transition-colors hover:bg-neutral-50 dark:border-white/5 dark:hover:bg-white/5"
              >
                <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                  e.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                  e.severity === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' :
                  e.severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                }`}>{e.severity.toUpperCase()}</span>
                <span className="flex-1 truncate text-sm text-neutral-700 dark:text-neutral-300">{e.message}</span>
                <span className="text-xs text-neutral-500">{e.occurrence_count > 1 ? `${e.occurrence_count}×` : ''}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tool grid by category */}
      {TOOL_CATEGORIES.map((cat) => (
        <div key={cat} className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-neutral-500">{cat}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.filter((t) => t.category === cat).map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.slug}
                  to={`/admin/studio/${tool.slug}`}
                  className="group rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-5 transition-all hover:-translate-y-0.5 hover:border-brand-purple hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-brand-navy dark:text-white">{tool.label}</h3>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">{tool.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
