import { useEffect, useState } from 'react';
import { Save, CheckCircle2, AlertCircle, DollarSign, Lock, Gift, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DbSiteSettings, AiAccessMode } from '@/types/database';
import { AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle } from '@/components/admin/AdminUi';

const ACCESS_MODES: { value: AiAccessMode; label: string; description: string }[] = [
  { value: 'free', label: 'Free', description: 'Anyone can use AI features within the daily limit.' },
  { value: 'rewarded', label: 'Rewarded Access', description: 'After the daily free limit, users can unlock more via rewarded access.' },
  { value: 'paid', label: 'Paid', description: 'AI features require payment (future integration).' },
  { value: 'free_rewarded', label: 'Free + Rewarded', description: 'Free daily uses, then rewarded access option.' },
  { value: 'disabled', label: 'Disabled', description: 'AI features are turned off for everyone.' },
];

export default function AdminAiMonetization() {
  const [settings, setSettings] = useState<DbSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      const { data, error } = await supabase.from('site_settings').select('*').limit(1).maybeSingle();
      if (error) setError(error.message);
      setSettings(data as DbSiteSettings | null);
      setLoading(false);
    }
    load();
  }, []);

  function update<K extends keyof DbSiteSettings>(key: K, value: DbSiteSettings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  async function onSave() {
    if (!settings) return;
    setSaving(true); setError(null);
    const { error } = await supabase.from('site_settings').update({
      ai_enabled: settings.ai_enabled,
      ai_access_mode: settings.ai_access_mode,
      ai_daily_free_uses: settings.ai_daily_free_uses,
      ai_rewarded_enabled: settings.ai_rewarded_enabled,
      ai_paid_enabled: settings.ai_paid_enabled,
      ai_paid_price: settings.ai_paid_price,
      ai_paid_currency: settings.ai_paid_currency,
      ai_reset_period: settings.ai_reset_period,
      ai_admin_override: settings.ai_admin_override,
    }).eq('id', settings.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setSavedAt(Date.now());
    window.setTimeout(() => setSavedAt(null), 3000);
  }

  if (loading) return (<><AdminHeader title="AI Monetization" subtitle="Configure AI feature access, daily limits, and monetization options." /><StateMessage type="loading" title="Loading…" message="Fetching AI settings." /></>);
  if (error || !settings) return (<><AdminHeader title="AI Monetization" subtitle="Configure AI feature access, daily limits, and monetization options." /><StateMessage type="error" title="Couldn't load settings" message={error ?? 'No settings row found.'} /></>);

  return (
    <>
      <AdminHeader title="AI Monetization" subtitle="Configure AI feature access, daily limits, and monetization options."
        action={<AdminButton onClick={onSave} disabled={saving}><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save changes'}</AdminButton>} />
      {savedAt && <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" /> AI settings saved.</div>}
      {error && <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}

      <div className="space-y-6">
        {/* Global AI toggle */}
        <AdminCard>
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple"><DollarSign className="h-5 w-5" /></div>
            <div className="flex-1">
              <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Global AI</h2>
              <div className="mt-3 flex items-center gap-3">
                <Toggle checked={settings.ai_enabled} onChange={(v) => update('ai_enabled', v)} />
                <div><p className="text-sm font-semibold text-neutral-700">AI features enabled</p><p className="text-xs text-neutral-400">Master switch for all Smart Color Assistant features.</p></div>
              </div>
            </div>
          </div>
        </AdminCard>

        {/* Access mode */}
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500">Access Mode</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACCESS_MODES.map((m) => (
              <button key={m.value} type="button" onClick={() => update('ai_access_mode', m.value)}
                className={'flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-all ' + (settings.ai_access_mode === m.value ? 'border-brand-purple bg-brand-purple/5 ring-2 ring-brand-purple/20' : 'border-neutral-200 hover:border-neutral-300')}>
                <span className="text-sm font-semibold text-brand-navy">{m.label}</span>
                <span className="text-xs text-neutral-500">{m.description}</span>
              </button>
            ))}
          </div>
        </AdminCard>

        {/* Daily usage */}
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500">Shared Daily Usage</h2>
          <p className="mb-4 text-xs text-neutral-400">This limit is shared across all AI features (text consultation, image analysis). Only successful generations consume a use.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Daily free AI uses" hint="Default: 3. Shared across all AI features.">
              <input type="number" min={0} max={100} className="input-field" value={settings.ai_daily_free_uses} onChange={(e) => update('ai_daily_free_uses', Number(e.target.value))} />
            </AdminField>
            <AdminField label="Usage reset period">
              <select className="input-field" value={settings.ai_reset_period} onChange={(e) => update('ai_reset_period', e.target.value)}>
                <option value="daily">Daily (midnight reset)</option>
                <option value="hourly">Hourly</option>
              </select>
            </AdminField>
          </div>
        </AdminCard>

        {/* Rewarded access */}
        <AdminCard>
          <div className="flex items-center gap-2"><Gift className="h-4 w-4 text-accent-orange" /><h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Rewarded Access</h2></div>
          <p className="mt-2 text-xs text-neutral-400">Provider agnostic architecture. No rewarded provider is connected yet — the UI shows an unavailable state. Never grants access on a button click alone.</p>
          <div className="mt-3 flex items-center gap-3">
            <Toggle checked={settings.ai_rewarded_enabled} onChange={(v) => update('ai_rewarded_enabled', v)} />
            <span className="text-sm text-neutral-600">Rewarded access available (shows option to users)</span>
          </div>
        </AdminCard>

        {/* Paid access (future) */}
        <AdminCard>
          <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-accent-green" /><h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Paid Access (Future)</h2></div>
          <p className="mt-2 text-xs text-neutral-400">Prepared for future payment integration. No fake payments are activated. Paid access requires verified confirmation from a real payment provider.</p>
          <div className="mt-3 flex items-center gap-3">
            <Toggle checked={settings.ai_paid_enabled} onChange={(v) => update('ai_paid_enabled', v)} />
            <span className="text-sm text-neutral-600">Paid access enabled (future)</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminField label="Future price" hint="Placeholder only — not active until a payment provider is connected.">
              <input type="number" min={0} step="0.01" className="input-field" value={settings.ai_paid_price} onChange={(e) => update('ai_paid_price', Number(e.target.value))} />
            </AdminField>
            <AdminField label="Currency">
              <input className="input-field" value={settings.ai_paid_currency} onChange={(e) => update('ai_paid_currency', e.target.value)} />
            </AdminField>
          </div>
        </AdminCard>

        {/* Admin override */}
        <AdminCard>
          <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-brand-navy" /><h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Admin Override</h2></div>
          <p className="mt-2 text-xs text-neutral-400">When enabled, admin users bypass AI usage limits for testing.</p>
          <div className="mt-3 flex items-center gap-3">
            <Toggle checked={settings.ai_admin_override} onChange={(v) => update('ai_admin_override', v)} />
            <span className="text-sm text-neutral-600">Admins bypass daily limits</span>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
