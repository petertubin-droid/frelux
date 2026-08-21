import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Code } from 'lucide-react';
import { TOOLS, TOOL_CATEGORIES } from '@/components/studio/tools';
import { supabase } from '@/lib/supabase';

export default function StudioOverview() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      const tables = ['ai_studio_sessions', 'ai_studio_artifacts', 'ai_studio_prompts', 'ai_studio_plugins', 'ai_studio_integrations', 'ai_studio_features', 'ai_studio_roles'];
      const results = await Promise.all(tables.map((t) => supabase.from(t).select('*', { count: 'exact', head: true })));
      const next: Record<string, number> = {};
      tables.forEach((t, i) => { next[t] = results[i].count ?? 0; });
      setCounts(next);
    }
    load();
  }, []);

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
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">AI assisted development environment for the FRELUX platform.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid p-4">
            <p className="text-2xl font-bold text-brand-navy dark:text-white">{s.value}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tool grid by category */}
      {TOOL_CATEGORIES.map((cat) => (
        <div key={cat} className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-neutral-400">{cat}</h2>
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
                    <ArrowRight className="h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-brand-navy dark:text-white">{tool.label}</h3>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{tool.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
