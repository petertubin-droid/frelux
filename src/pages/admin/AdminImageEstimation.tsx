import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {AdminHeader, AdminCard, Toggle, StateMessage, AdminButton, AdminInput, AdminSelect} from '@/components/admin/AdminUi';
import {
  Camera, Crown, Users, TrendingUp, Settings2, Save, Loader2,
  CheckCircle2, AlertCircle, BarChart3,
} from 'lucide-react';

type Status = 'loading' | 'ready' | 'saving' | 'error';

interface EstimationConfig {
  estimation_enabled: boolean;
  estimation_access_mode: 'free' | 'rewarded' | 'paid' | 'free_rewarded' | 'disabled';
  estimation_daily_free_uses: number;
  estimation_rewarded_enabled: boolean;
  estimation_paid_enabled: boolean;
  estimation_paid_price: number;
  estimation_paid_currency: string;
  estimation_reset_period: string;
  estimation_admin_override: boolean;
}

interface UsageStats {
  total_estimates: number;
  today_estimates: number;
  unique_users: number;
}

const DEFAULT_CONFIG: EstimationConfig = {
  estimation_enabled: false,
  estimation_access_mode: 'disabled',
  estimation_daily_free_uses: 1,
  estimation_rewarded_enabled: false,
  estimation_paid_enabled: false,
  estimation_paid_price: 500,
  estimation_paid_currency: 'NGN',
  estimation_reset_period: 'daily',
  estimation_admin_override: true,
};

export default function AdminImageEstimation() {
  const [config, setConfig] = useState<EstimationConfig>(DEFAULT_CONFIG);
  const [rowId, setRowId] = useState<string | null>(null);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    const { data, error: fetchError } = await supabase
      .from('site_settings')
      .select(`
        id,
        estimation_enabled,
        estimation_access_mode,
        estimation_daily_free_uses,
        estimation_rewarded_enabled,
        estimation_paid_enabled,
        estimation_paid_price,
        estimation_paid_currency,
        estimation_reset_period,
        estimation_admin_override
      `)
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      // Columns might not exist yet — show default config with migration notice
      setError('Database migration required. Run the Phase 31 SQL migration to enable this feature.');
      setStatus('ready');
      return;
    }

    if (data) {
      setRowId(data.id ?? null);
      setConfig({
        estimation_enabled: data.estimation_enabled ?? false,
        estimation_access_mode: data.estimation_access_mode ?? 'disabled',
        estimation_daily_free_uses: data.estimation_daily_free_uses ?? 1,
        estimation_rewarded_enabled: data.estimation_rewarded_enabled ?? false,
        estimation_paid_enabled: data.estimation_paid_enabled ?? false,
        estimation_paid_price: Number(data.estimation_paid_price) || 500,
        estimation_paid_currency: data.estimation_paid_currency ?? 'NGN',
        estimation_reset_period: data.estimation_reset_period ?? 'daily',
        estimation_admin_override: data.estimation_admin_override ?? true,
      });
    }

    // Load usage stats
    try {
      const { count: totalCount } = await supabase
        .from('estimation_results')
        .select('*', { count: 'exact', head: true });
      const today = new Date().toISOString().slice(0, 10);
      const { count: todayCount } = await supabase
        .from('estimation_results')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);
      const { data: uniqueUsers } = await supabase
        .from('estimation_results')
        .select('user_id')
        .limit(1000);

      setStats({
        total_estimates: totalCount ?? 0,
        today_estimates: todayCount ?? 0,
        unique_users: new Set(uniqueUsers?.map(u => u.user_id) ?? []).size,
      });
    } catch {
      // Table might not exist yet
      setStats(null);
    }

    setStatus('ready');
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async () => {
    if (!rowId) {
      setSaveError('No settings row found to update — try reloading the page.');
      return;
    }
    setStatus('saving');
    setSaved(false);
    setSaveError('');
    const { error: updateError } = await supabase
      .from('site_settings')
      .update({
        estimation_enabled: config.estimation_enabled,
        estimation_access_mode: config.estimation_access_mode,
        estimation_daily_free_uses: config.estimation_daily_free_uses,
        estimation_rewarded_enabled: config.estimation_rewarded_enabled,
        estimation_paid_enabled: config.estimation_paid_enabled,
        estimation_paid_price: config.estimation_paid_price,
        estimation_paid_currency: config.estimation_paid_currency,
        estimation_reset_period: config.estimation_reset_period,
        estimation_admin_override: config.estimation_admin_override,
      })
      .eq('id', rowId);

    if (updateError) {
      setSaveError(updateError.message);
      setStatus('ready');
      return;
    }

    setSaved(true);
    setStatus('ready');
    setTimeout(() => setSaved(false), 3000);
  }, [config, rowId]);

  if (status === 'loading') {
    return (
      <>
        <AdminHeader title="AI Image Estimation" subtitle="Premium building photo estimation feature." />
        <StateMessage type="loading" title="Loading…" message="Fetching configuration." />
      </>
    );
  }

  return (
    <>
      <AdminHeader title="AI Image Estimation" subtitle="Premium building photo estimation — control access, pricing, and usage limits." />

      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle aria-hidden="true" className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Migration Required</p>
            <p className="text-xs text-amber-700 mt-1">{error}</p>
            <p className="text-xs text-amber-600 mt-2 font-mono">
              supabase/migrations/20260823100000_phase31_premium_estimation.sql
            </p>
          </div>
        </div>
      )}

      {saveError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Couldn't save changes</p>
            <p className="text-xs text-red-700 mt-1">{saveError}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={BarChart3} label="Total Estimates" value={stats.total_estimates} />
          <StatCard icon={TrendingUp} label="Today's Estimates" value={stats.today_estimates} />
          <StatCard icon={Users} label="Unique Users" value={stats.unique_users} />
        </div>
      )}

      {/* Configuration */}
      <AdminCard>
        <div className="flex items-center gap-2 mb-6">
          <Settings2 className="w-5 h-5 text-brand-purple" />
          <h3 className="font-semibold text-neutral-900">Access Configuration</h3>
        </div>

        <div className="space-y-5">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
            <div>
              <p className="font-medium text-neutral-900 flex items-center gap-2">
                <Camera aria-hidden="true" className="w-4 h-4" />
                Feature Enabled
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">Master switch for the AI building photo estimator.</p>
            </div>
            <Toggle
              checked={config.estimation_enabled}
              onChange={v => setConfig(prev => ({ ...prev, estimation_enabled: v }))}
            />
          </div>

          {/* Access mode */}
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-2 block">Access Mode</label>
            <AdminSelect
              value={config.estimation_access_mode}
              onChange={e => setConfig(prev => ({ ...prev, estimation_access_mode: e.target.value as EstimationConfig['estimation_access_mode'] }))}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none"
            >
              <option value="disabled">Disabled</option>
              <option value="free">Free (with daily limit)</option>
              <option value="rewarded">Rewarded (free uses, then watch ad)</option>
              <option value="free_rewarded">Free + Rewarded (hybrid)</option>
              <option value="paid">Paid (subscription required)</option>
            </AdminSelect>
          </div>

          {/* Daily free uses */}
          {(config.estimation_access_mode === 'free' || config.estimation_access_mode === 'rewarded' || config.estimation_access_mode === 'free_rewarded') && (
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-1 block">Daily Free Uses</label>
              <AdminInput
 type="number"
 min="0"
 value={config.estimation_daily_free_uses}
 onChange={e => setConfig(prev => ({ ...prev, estimation_daily_free_uses: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none"
              />
              <p className="text-xs text-neutral-400 mt-1">Number of free estimations per user per day.</p>
            </div>
          )}

          {/* Rewarded */}
          {(config.estimation_access_mode === 'rewarded' || config.estimation_access_mode === 'free_rewarded') && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
              <div>
                <p className="font-medium text-neutral-900">Rewarded Ads Enabled</p>
                <p className="text-xs text-neutral-500 mt-0.5">Let users watch ads to unlock more estimations.</p>
              </div>
              <Toggle
                checked={config.estimation_rewarded_enabled}
                onChange={v => setConfig(prev => ({ ...prev, estimation_rewarded_enabled: v }))}
              />
            </div>
          )}

          {/* Paid */}
          {config.estimation_access_mode === 'paid' && (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <div>
                  <p className="font-medium text-neutral-900 flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Paid Access Enabled
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">Require payment/subscription for access.</p>
                </div>
                <Toggle
                  checked={config.estimation_paid_enabled}
                  onChange={v => setConfig(prev => ({ ...prev, estimation_paid_enabled: v }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Price per Estimation</label>
                  <AdminInput
 type="number"
 min="0"
 value={config.estimation_paid_price}
 onChange={e => setConfig(prev => ({ ...prev, estimation_paid_price: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Currency</label>
                  <AdminInput
 type="text"
 value={config.estimation_paid_currency}
 onChange={e => setConfig(prev => ({ ...prev, estimation_paid_currency: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Reset period */}
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">Usage Reset Period</label>
            <AdminSelect
              value={config.estimation_reset_period}
              onChange={e => setConfig(prev => ({ ...prev, estimation_reset_period: e.target.value }))}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </AdminSelect>
          </div>

          {/* Admin override */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
            <div>
              <p className="font-medium text-neutral-900">Admin Override</p>
              <p className="text-xs text-neutral-500 mt-0.5">Admins can use the feature without limits.</p>
            </div>
            <Toggle
              checked={config.estimation_admin_override}
              onChange={v => setConfig(prev => ({ ...prev, estimation_admin_override: v }))}
            />
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <AdminButton
              onClick={save}
              disabled={status === 'saving'}
              className="px-5 py-2.5 text-sm"
            >
              {status === 'saving' ? <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" /> : <Save aria-hidden="true" className="w-4 h-4" />}
              {status === 'saving' ? 'Saving…' : 'Save Configuration'}
            </AdminButton>
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 aria-hidden="true" className="w-4 h-4" /> Saved successfully
              </span>
            )}
          </div>
        </div>
      </AdminCard>

      {/* Edge function deploy notice */}
      <AdminCard>
        <div className="flex items-start gap-3">
          <AlertCircle aria-hidden="true" className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-neutral-900">Edge Function Deployment</p>
            <p className="text-xs text-neutral-500 mt-1">
              The AI building estimation edge function must be deployed to Supabase for this feature to work.
              Deploy with: <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">supabase functions deploy ai-building-estimation</code>
            </p>
            <p className="text-xs text-neutral-400 mt-2">
              Requires <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">GEMINI_API_KEY</code> environment variable.
            </p>
          </div>
        </div>
      </AdminCard>
    </>
  );
}

function StatCard({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-neutral-400" />
        <span className="text-xs font-medium text-neutral-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}
