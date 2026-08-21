import { useEffect, useState, useMemo, useCallback } from 'react';
import { Gift, BarChart3, DollarSign, Users, Calendar, TrendingUp, Loader2, Settings2 } from 'lucide-react';
import { AdminHeader, AdminCard, AdminField, Toggle, StateMessage } from '@/components/admin/AdminUi';
import { fetchAllRewardedToolConfigs, fetchRewardedUnlockStats, fetchRewardedAdEventStats } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { classNames } from '@/lib/utils';
import { REWARDED_FEATURES } from '@/lib/ad-providers';
import type { DbRewardedToolConfig, DbRewardedUnlockLog, DbRewardedAdEvent, DbRewardedFeatureConfig, DbAdProvider } from '@/types/database';

type Tab = 'features' | 'tools' | 'analytics';

export default function AdminRewardedAccess() {
  const [tab, setTab] = useState<Tab>('features');
  return (
    <>
      <AdminHeader
        title="Rewarded Ads Manager"
        subtitle="Configure rewarded ad providers, feature unlock durations, daily limits, cooldowns, and reward rules. Track unlock analytics and ad performance."
      />
      <div className="mb-5 inline-flex flex-wrap rounded-lg border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid dark:border-white/5 dark:bg-brand-navy-mid p-1 dark:border-neutral-700 dark:bg-neutral-900">
        {([
          { key: 'features', label: 'Feature Config', icon: Settings2 },
          { key: 'tools', label: 'Tool Config', icon: Gift },
          { key: 'analytics', label: 'Analytics', icon: BarChart3 },
        ] as { key: Tab; label: string; icon: typeof Gift }[]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={classNames(
              'inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all',
              tab === t.key ? 'bg-brand-purple text-white' : 'text-neutral-600 hover:text-brand-purple dark:text-neutral-300',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'features' && <FeatureConfigTab />}
      {tab === 'tools' && <ToolConfigTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </>
  );
}

// =========================================================
// Feature Config Tab — manages rewarded_feature_config table
// =========================================================
function FeatureConfigTab() {
  const [features, setFeatures] = useState<DbRewardedFeatureConfig[]>([]);
  const [providers, setProviders] = useState<DbAdProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [featRes, provRes] = await Promise.all([
      supabase.from('rewarded_feature_config').select('*').order('feature_key'),
      supabase.from('ad_providers').select('*').eq('is_active', true).order('priority'),
    ]);
    if (featRes.error) setError(featRes.error.message);
    setFeatures((featRes.data as DbRewardedFeatureConfig[]) ?? []);
    setProviders((provRes.data as DbAdProvider[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateFeature(id: string, updates: Partial<DbRewardedFeatureConfig>) {
    // Validate numeric fields
    const validated: Partial<DbRewardedFeatureConfig> = { ...updates };
    if ('unlock_duration_minutes' in validated) {
      validated.unlock_duration_minutes = Math.max(1, Math.floor(Number(validated.unlock_duration_minutes) || 1));
    }
    if ('daily_usage_limit' in validated) {
      validated.daily_usage_limit = Math.max(0, Math.floor(Number(validated.daily_usage_limit) || 0));
    }
    if ('cooldown_minutes' in validated) {
      validated.cooldown_minutes = Math.max(0, Math.floor(Number(validated.cooldown_minutes) || 0));
    }
    setSaving(id);
    const { error: updateError } = await supabase
      .from('rewarded_feature_config')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) {
      setError(updateError.message);
    } else {
      setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, ...validated } : f)));
    }
    setSaving(null);
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching feature configurations." />;
  if (error) return <StateMessage type="error" title="Error" message={error} />;

  const rewardedProviders = providers.filter(p => p.provider_type === 'rewarded' || p.provider_type === 'mixed');

  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="space-y-3">
        {features.map((feat) => {
          const featureMeta = REWARDED_FEATURES.find(f => f.key === feat.feature_key);
          void featureMeta;
          return (
            <AdminCard key={feat.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-brand-navy dark:text-white">{feat.feature_name}</h3>
                    <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800">{feat.feature_key}</code>
                  </div>
                  {feat.description && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{feat.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Toggle checked={feat.is_enabled} onChange={(v) => updateFeature(feat.id, { is_enabled: v })} />
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{feat.is_enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AdminField label="Primary Provider">
                  <select
                    value={feat.primary_provider_id ?? ''}
                    onChange={(e) => updateFeature(feat.id, { primary_provider_id: e.target.value || null })}
                    className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                  >
                    <option value="">None</option>
                    {rewardedProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </AdminField>
                <AdminField label="Fallback Provider">
                  <select
                    value={feat.fallback_provider_id ?? ''}
                    onChange={(e) => updateFeature(feat.id, { fallback_provider_id: e.target.value || null })}
                    className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                  >
                    <option value="">None</option>
                    {rewardedProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </AdminField>
                <AdminField label="Unlock Duration (minutes)" hint="1440 = 24 hours / end of day">
                  <input
                    type="number"
                    min={1}
                    value={feat.unlock_duration_minutes}
                    onChange={(e) => updateFeature(feat.id, { unlock_duration_minutes: Number(e.target.value) })}
                    className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                  />
                </AdminField>
                <AdminField label="Daily Usage Limit" hint="0 = unlimited">
                  <input
                    type="number"
                    min={0}
                    value={feat.daily_usage_limit}
                    onChange={(e) => updateFeature(feat.id, { daily_usage_limit: Number(e.target.value) })}
                    className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                  />
                </AdminField>
                <AdminField label="Cooldown (minutes)" hint="Wait time between unlocks">
                  <input
                    type="number"
                    min={0}
                    value={feat.cooldown_minutes}
                    onChange={(e) => updateFeature(feat.id, { cooldown_minutes: Number(e.target.value) })}
                    className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                  />
                </AdminField>
              </div>

              {/* Reward rules */}
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Reward Rules</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminField label="Success Message">
                    <input
                      type="text"
                      value={feat.reward_rules?.success_message ?? ''}
                      onChange={(e) => updateFeature(feat.id, { reward_rules: { ...feat.reward_rules, success_message: e.target.value } })}
                      className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                      placeholder="Feature unlocked! Enjoy your premium access."
                    />
                  </AdminField>
                  <AdminField label="Failure Message">
                    <input
                      type="text"
                      value={feat.reward_rules?.failure_message ?? ''}
                      onChange={(e) => updateFeature(feat.id, { reward_rules: { ...feat.reward_rules, failure_message: e.target.value } })}
                      className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                      placeholder="Unable to load ad. Please try again."
                    />
                  </AdminField>
                </div>
              </div>

              {saving === feat.id && (
                <div className="mt-3 flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </div>
              )}
            </AdminCard>
          );
        })}
      </div>
    </>
  );
}

// =========================================================
// Tool Config Tab — legacy rewarded_tool_config management
// =========================================================
function ToolConfigTab() {
  const [configs, setConfigs] = useState<DbRewardedToolConfig[]>([]);
  const [providers, setProviders] = useState<DbAdProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cfgRes, provRes] = await Promise.all([
      fetchAllRewardedToolConfigs(),
      supabase.from('ad_providers').select('*').eq('is_active', true).order('priority'),
    ]);
    if (cfgRes.error) setError(cfgRes.error);
    setConfigs(cfgRes.data);
    setProviders((provRes.data as DbAdProvider[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateConfig(id: string, updates: Partial<DbRewardedToolConfig>) {
    // Validate numeric fields
    const validated: Partial<DbRewardedToolConfig> = { ...updates };
    if ('unlock_duration_minutes' in validated) {
      validated.unlock_duration_minutes = Math.max(1, Math.floor(Number(validated.unlock_duration_minutes) || 1));
    }
    if ('daily_usage_limit' in validated) {
      validated.daily_usage_limit = Math.max(0, Math.floor(Number(validated.daily_usage_limit) || 0));
    }
    if ('cooldown_minutes' in validated) {
      validated.cooldown_minutes = Math.max(0, Math.floor(Number(validated.cooldown_minutes) || 0));
    }
    setSaving(id);
    const { error: updateError } = await supabase
      .from('rewarded_tool_config')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) {
      setError(updateError.message);
    } else {
      setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, ...validated } : c)));
    }
    setSaving(null);
  }

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching tool configurations." />;
  if (error) return <StateMessage type="error" title="Error" message={error} />;

  const rewardedProviders = providers.filter(p => p.provider_type === 'rewarded' || p.provider_type === 'mixed');

  return (
    <>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
        These are tool-level configs that link specific tools to rewarded ad providers. Feature-level configs in the Feature Config tab take priority when both are set.
      </p>
      <div className="space-y-3">
        {configs.map((cfg) => (
          <AdminCard key={cfg.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-brand-navy dark:text-white">{cfg.tool_label}</h3>
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800">{cfg.tool_key}</code>
                </div>
                {cfg.description && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{cfg.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Toggle checked={cfg.is_enabled} onChange={(v) => updateConfig(cfg.id, { is_enabled: v })} />
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{cfg.is_enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AdminField label="Primary Provider">
                <select
                  value={cfg.primary_provider_id ?? ''}
                  onChange={(e) => updateConfig(cfg.id, { primary_provider_id: e.target.value || null })}
                  className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                >
                  <option value="">Use legacy ad_provider</option>
                  {rewardedProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </AdminField>
              <AdminField label="Fallback Provider">
                <select
                  value={cfg.fallback_provider_id ?? ''}
                  onChange={(e) => updateConfig(cfg.id, { fallback_provider_id: e.target.value || null })}
                  className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                >
                  <option value="">None</option>
                  {rewardedProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </AdminField>
              <AdminField label="Legacy Ad Provider">
                <select
                  value={cfg.ad_provider}
                  onChange={(e) => updateConfig(cfg.id, { ad_provider: e.target.value })}
                  className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                >
                  <option value="adsense">Google AdSense</option>
                  <option value="admob">Google AdMob</option>
                  <option value="applovin">AppLovin</option>
                  <option value="unity">Unity Ads</option>
                  <option value="custom">Custom</option>
                </select>
              </AdminField>
              <AdminField label="Ad Unit ID">
                <input
                  type="text"
                  value={cfg.ad_unit_id ?? ''}
                  onChange={(e) => updateConfig(cfg.id, { ad_unit_id: e.target.value })}
                  className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                  placeholder="ca app pub xxx"
                />
              </AdminField>
              <AdminField label="Unlock Duration (hours)">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={cfg.unlock_duration_hours}
                  onChange={(e) => updateConfig(cfg.id, { unlock_duration_hours: Number(e.target.value) })}
                  className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                />
              </AdminField>
              <AdminField label="Daily Usage Limit" hint="0 = unlimited">
                <input
                  type="number"
                  min={0}
                  value={cfg.daily_usage_limit}
                  onChange={(e) => updateConfig(cfg.id, { daily_usage_limit: Number(e.target.value) })}
                  className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                />
              </AdminField>
              <AdminField label="Cooldown (minutes)">
                <input
                  type="number"
                  min={0}
                  value={cfg.cooldown_minutes}
                  onChange={(e) => updateConfig(cfg.id, { cooldown_minutes: Number(e.target.value) })}
                  className="input-field dark:bg-brand-navy-mid dark:border-white/10"
                />
              </AdminField>
            </div>

            {saving === cfg.id && (
              <div className="mt-3 flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </div>
            )}
          </AdminCard>
        ))}
      </div>
    </>
  );
}

// =========================================================
// Analytics Tab
// =========================================================
function AnalyticsTab() {
  const [unlocks, setUnlocks] = useState<Pick<DbRewardedUnlockLog, 'tool_key' | 'unlock_date' | 'ad_provider' | 'ad_revenue_estimated'>[]>([]);
  const [events, setEvents] = useState<Pick<DbRewardedAdEvent, 'tool_key' | 'event_type' | 'revenue_estimated' | 'created_at'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const [unlockRes, eventRes] = await Promise.all([
        fetchRewardedUnlockStats(days),
        fetchRewardedAdEventStats(days),
      ]);
      setUnlocks(unlockRes.data);
      setEvents(eventRes.data);
      setLoading(false);
    }
    load();
  }, [days]);

  const stats = useMemo(() => {
    const totalUnlocks = unlocks.length;
    const uniqueUsers = new Set(unlocks.map((u) => u.tool_key + u.unlock_date)).size;
    const totalRevenue = unlocks.reduce((sum, u) => sum + Number(u.ad_revenue_estimated || 0), 0);
    const eventCounts = events.reduce<Record<string, number>>((acc, e) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    }, {});
    const eventRevenue = events.reduce((sum, e) => sum + Number(e.revenue_estimated || 0), 0);
    const byDate: Record<string, number> = {};
    unlocks.forEach((u) => { byDate[u.unlock_date] = (byDate[u.unlock_date] || 0) + 1; });
    const dailyData = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
    const byTool: Record<string, number> = {};
    unlocks.forEach((u) => { byTool[u.tool_key] = (byTool[u.tool_key] || 0) + 1; });
    return { totalUnlocks, uniqueUsers, totalRevenue, eventCounts, eventRevenue, dailyData, byTool };
  }, [unlocks, events]);

  if (loading) return <StateMessage type="loading" title="Loading…" message="Fetching analytics data." />;
  if (error) return <StateMessage type="error" title="Error" message={error} />;

  return (
    <>
      {/* Stats overview */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Unlocks" value={stats.totalUnlocks.toString()} color="text-brand-purple" />
        <StatCard icon={Calendar} label="Unique Daily Unlocks" value={stats.uniqueUsers.toString()} color="text-accent-cyan" />
        <StatCard icon={DollarSign} label="Est. Ad Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} color="text-accent-green" />
        <StatCard icon={TrendingUp} label="Ad Events" value={Object.values(stats.eventCounts).reduce((a, b) => a + b, 0).toString()} color="text-accent-yellow" />
      </div>

      {/* Time range selector */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Time range:</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={classNames(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              days === d ? 'bg-brand-purple text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300',
            )}
          >
            {d} days
          </button>
        ))}
      </div>

      {/* Daily unlock chart */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Daily Unlocks (Last 14 Days)</h2>
        <AdminCard className="p-5">
          {stats.dailyData.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">No unlock data yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.dailyData.map(([date, count]) => {
                const maxCount = Math.max(...stats.dailyData.map(([, c]) => c));
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={date} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{date}</span>
                    <div className="h-6 flex-1 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                      <div className="flex h-full items-center rounded bg-brand-purple/60 px-2 text-[10px] font-semibold text-white" style={{ width: `${Math.max(pct, 5)}%` }}>
                        {count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AdminCard>
      </div>

      {/* Ad event breakdown */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Ad Event Breakdown</h2>
        <AdminCard className="p-5">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {(['impression', 'click', 'reward', 'close', 'error'] as const).map((type) => (
              <div key={type} className="rounded-lg border border-neutral-200 p-3 text-center dark:border-neutral-700">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{type}</p>
                <p className="mt-1 text-2xl font-bold text-brand-navy dark:text-white">{stats.eventCounts[type] || 0}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
            <DollarSign className="h-3.5 w-3.5" />
            Estimated event revenue: <span className="font-semibold text-neutral-700 dark:text-neutral-300">${stats.eventRevenue.toFixed(2)}</span>
          </div>
        </AdminCard>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid dark:border-white/5 dark:bg-brand-navy-mid p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-brand-navy dark:text-white">{value}</p>
    </div>
  );
}
