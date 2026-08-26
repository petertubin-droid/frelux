import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DbAnalyticsEvent } from '@/types/database';
import { AdminHeader, AdminCard, StateMessage } from '@/components/admin/AdminUi';
import { Calculator, DollarSign, Palette, MessageCircle, Mail, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';

const CATEGORIES = [
  {
    label: 'Calculator',
    icon: Calculator,
    events: ['calculator_started', 'calculator_completed'],
    color: 'text-brand-purple',
  },
  {
    label: 'Cost Estimator',
    icon: DollarSign,
    events: ['cost_estimator_started', 'cost_estimate_completed'],
    color: 'text-accent-green',
  },
  {
    label: 'AI Assistant',
    icon: BarChart3,
    events: ['ai_assistant_opened', 'text_consultation_submitted', 'image_analysis_started', 'ai_recommendation_generated', 'ai_request_failed', 'ai_usage_limit_reached', 'rewarded_access_requested', 'rewarded_access_verified'],
    color: 'text-accent-orange',
  },
  {
    label: 'Color Gallery',
    icon: Palette,
    events: ['color_gallery_viewed', 'color_page_viewed', 'color_recommendation_clicked'],
    color: 'text-accent-cyan',
  },
  {
    label: 'Contact',
    icon: MessageCircle,
    events: ['whatsapp_clicked', 'contact_form_submitted'],
    color: 'text-accent-green',
  },
];

export default function AdminAnalytics() {
  const [events, setEvents] = useState<DbAnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      const { data, error } = await supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) setError(error.message);
      setEvents(data ?? []); setLoading(false);
    }
    load();
  }, []);

  const counts = events.reduce<Record<string, number>>((acc, e) => { acc[e.event] = (acc[e.event] ?? 0) + 1; return acc; }, {});
  const totalEvents = events.length;

  // AI-specific metrics
  const aiSuccess = counts['ai_recommendation_generated'] ?? 0;
  const aiFailed = counts['ai_request_failed'] ?? 0;
  const aiLimitReached = counts['ai_usage_limit_reached'] ?? 0;


  return (
    <>
      <AdminHeader title="Analytics" subtitle="Real platform events. Events are logged as visitors use the tools." />

      {loading ? <StateMessage type="loading" title="Loading…" message="Fetching analytics events." />
        : error ? <StateMessage type="error" title="Couldn't load analytics" message={error} />
        : events.length === 0 ? <StateMessage type="empty" title="No events yet" message="Events will appear here as visitors use the calculator, estimator, and color pages." />
        : (
          <>
            {/* Total events banner */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AdminCard>
                <div className="flex items-center gap-2">
                  <TrendingUp aria-hidden="true" className="h-5 w-5 text-brand-navy" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Total events</p>
                </div>
                <p className="mt-1 text-2xl font-bold text-brand-navy dark:text-white">{totalEvents}</p>
                <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Event count, not unique visitors</p>
              </AdminCard>
              <AdminCard>
                <div className="flex items-center gap-2">
                  <BarChart3 aria-hidden="true" className="h-5 w-5 text-accent-green" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">AI successes</p>
                </div>
                <p className="mt-1 text-2xl font-bold text-brand-navy dark:text-white">{aiSuccess}</p>
                <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Recommendations generated</p>
              </AdminCard>
              <AdminCard>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">AI failures</p>
                </div>
                <p className="mt-1 text-2xl font-bold text-brand-navy dark:text-white">{aiFailed}</p>
                <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Failed AI requests</p>
              </AdminCard>
              <AdminCard>
                <div className="flex items-center gap-2">
                  <Mail aria-hidden="true" className="h-5 w-5 text-accent-green" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">WhatsApp clicks</p>
                </div>
                <p className="mt-1 text-2xl font-bold text-brand-navy dark:text-white">{counts['whatsapp_clicked'] ?? 0}</p>
                <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Contact via WhatsApp</p>
              </AdminCard>
            </div>

            {/* Category breakdown */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const catTotal = cat.events.reduce((sum, e) => sum + (counts[e] ?? 0), 0);
                return (
                  <AdminCard key={cat.label}>
                    <div className="flex items-center gap-2">
                      <Icon className={'h-4 w-4 ' + cat.color} />
                      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{cat.label}</p>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-brand-navy dark:text-white">{catTotal}</p>
                    <div className="mt-2 space-y-1">
                      {cat.events.map((e) => (
                        <div key={e} className="flex items-center justify-between text-xs">
                          <span className="text-neutral-500 dark:text-neutral-400">{e}</span>
                          <span className="font-semibold text-brand-navy dark:text-white">{counts[e] ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  </AdminCard>
                );
              })}
            </div>

            {/* AI usage limit events */}
            {aiLimitReached > 0 && (
              <div className="mb-6">
                <AdminCard>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-accent-yellow" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Usage limit reached</p>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-brand-navy dark:text-white">{aiLimitReached}</p>
                  <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Times users hit the daily AI limit</p>
                </AdminCard>
              </div>
            )}

            {/* Recent events table */}
            <AdminCard>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Recent events</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-widest text-neutral-400 dark:text-neutral-500"><th className="py-2 pr-4">Event</th><th className="py-2 pr-4">Page</th><th className="py-2 pr-4">Time</th></tr></thead>
                  <tbody>
                    {events.slice(0, 50).map((e) => (
                      <tr key={e.id} className="border-b border-neutral-100">
                        <td className="py-2 pr-4 font-medium text-brand-navy dark:text-white">{e.event}</td>
                        <td className="py-2 pr-4 text-neutral-500 dark:text-neutral-400">{e.page_path ?? 'N/A'}</td>
                        <td className="py-2 pr-4 text-neutral-400 dark:text-neutral-500">{new Date(e.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">Showing the 50 most recent events. Total events logged: {totalEvents}.</p>
            </AdminCard>
          </>
        )
      }
    </>
  );
}
