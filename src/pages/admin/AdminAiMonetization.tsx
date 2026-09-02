import { useEffect, useState } from 'react';
import { Save, CheckCircle2, AlertCircle, DollarSign, Lock, Gift, CreditCard, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DbSiteSettings, AiAccessMode } from '@/types/database';
import { AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle, AdminInput, AdminSelect } from '@/components/admin/AdminUi';

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
  // Issue #4 fix: Track if a payment provider is configured
  const [paymentProviderConfigured, setPaymentProviderConfigured] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      const { data, error } = await supabase.from('site_settings').select('*').limit(1).maybeSingle();
      if (error) setError(error.message);
      setSettings(data as DbSiteSettings | null);
      // Check if payment provider is configured (issue #4 fix)
      setPaymentProviderConfigured(data?.payment_provider_configured ?? false);
      setLoading(false);
    }
    load();
  }, []);

  function update<K extends keyof DbSiteSettings>(key: K, value: DbSiteSettings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  // Issue #4 fix: Prevent saving with paid mode if no payment provider is configured
  function canSave(): boolean {
    if (!settings) return false;
    if (settings.ai_access_mode === 'paid' && !paymentProviderConfigured) return false;
    return true;
  }

  async function onSave() {
    if (!settings) return;
    // Issue #4 fix: Guard against saving paid mode without a provider
    if (settings.ai_access_mode === 'paid' && !paymentProviderConfigured) {
      setError('Cannot enable Paid mode, no payment provider is configured. Connect a payment provider (Paystack, Flutterwave, or Stripe) first.');
      return;
    }
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

  const showPaidWarning = settings.ai_access_mode === 'paid' && !paymentProviderConfigured;

  return (
    <>
      <AdminHeader title="AI Monetization" subtitle="Configure AI feature access, daily limits, and monetization options."
        action={<AdminButton onClick={onSave} disabled={saving || !canSave()}><Save aria-hidden="true" className="h-4 w-4" />{saving ? 'Saving…' : 'Save changes'}</AdminButton>} />
      {savedAt && <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"><CheckCircle2 aria-hidden="true" className="h-4 w-4" /> AI settings saved.</div>}
      {error && <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle aria-hidden="true" className="h-4 w-4" /> {error}</div>}

      {/* Issue #4 fix: Warning when paid mode is selected without a provider */}
      {showPaidWarning && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
          <div>
            <p className="font-semibold">No payment provider connected</p>
            <p className="mt-1 text-xs">Paid mode is selected but no payment provider (Paystack, Flutterwave, Stripe) is configured. Users will be completely locked out of AI features with no way to pay. Switch to Free or Rewarded mode, or connect a payment provider first.</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Global AI toggle */}
        <AdminCard>
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple"><DollarSign aria-hidden="true" className="h-5 w-5" /></div>
            <div className="flex-1">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">Global AI</h2>
              <div className="mt-3 flex items-center gap-3">
                <Toggle checked={settings.ai_enabled} onChange={(v) => update('ai_enabled', v)} />
                <div><p className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">AI features enabled</p><p className="text-xs text-muted-foreground dark:text-muted-foreground">Master switch for all Smart Color Assistant features.</p></div>
              </div>
            </div>
          </div>
        </AdminCard>

        {/* Access mode */}
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">Access Mode</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACCESS_MODES.map((m) => (
              <AdminButton
                key={m.value}
                type="button"
                onClick={() => update('ai_access_mode', m.value)}
                className={'flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-all ' + (settings.ai_access_mode === m.value ? 'border-brand-purple bg-primary/5 ring-2 ring-brand-purple/20' : 'border-border hover:border-border')}
              >
                <span className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                  {m.label}
                  {/* Issue #4 fix: Show warning indicator on paid mode when no provider */}
                  {m.value === 'paid' && !paymentProviderConfigured && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-normal text-orange-500">
                      <AlertTriangle className="h-3 w-3" /> not ready
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground dark:text-muted-foreground">{m.description}</span>
              </AdminButton>
            ))}
          </div>
        </AdminCard>

        {/* Daily usage */}
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">Shared Daily Usage</h2>
          <p className="mb-4 text-xs text-muted-foreground dark:text-muted-foreground">This limit is shared across all AI features (text consultation, image analysis). Only successful generations consume a use.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Daily free AI uses" hint="Default: 3. Shared across all AI features.">
              <AdminInput type="number" min={0} max={100}  value={settings.ai_daily_free_uses} onChange={(e) => update('ai_daily_free_uses', Number(e.target.value))} />
            </AdminField>
            <AdminField label="Usage reset period">
              <AdminSelect  value={settings.ai_reset_period} onChange={(e) => update('ai_reset_period', e.target.value)}>
                <option value="daily">Daily (midnight reset)</option>
                <option value="hourly">Hourly</option>
              </AdminSelect>
            </AdminField>
          </div>
        </AdminCard>

        {/* Rewarded access */}
        <AdminCard>
          <div className="flex items-center gap-2"><Gift aria-hidden="true" className="h-4 w-4 text-accent-orange" /><h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">Rewarded Access</h2></div>
          <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">Provider agnostic architecture. No rewarded provider is connected yet, the UI shows an unavailable state. Never grants access on a button click alone.</p>
          <div className="mt-3 flex items-center gap-3">
            <Toggle checked={settings.ai_rewarded_enabled} onChange={(v) => update('ai_rewarded_enabled', v)} />
            <span className="text-sm text-muted-foreground">Rewarded access available (shows option to users)</span>
          </div>
        </AdminCard>

        {/* Paid access (future) */}
        <AdminCard>
          <div className="flex items-center gap-2"><CreditCard aria-hidden="true" className="h-4 w-4 text-accent-green" /><h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">Paid Access</h2></div>
          <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
            {paymentProviderConfigured
              ? 'A payment provider is configured. Paid access can be enabled.'
              : 'No payment provider is connected yet. Connect a provider (Paystack, Flutterwave, or Stripe) before enabling paid mode, otherwise users will be locked out of AI features.'}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Toggle
              checked={settings.ai_paid_enabled}
              onChange={(v) => {
                // Issue #4 fix: Prevent enabling paid toggle without a provider
                if (v && !paymentProviderConfigured) {
                  setError('Cannot enable Paid access, no payment provider is configured. Connect a payment provider first.');
                  return;
                }
                update('ai_paid_enabled', v);
              }}
            />
            <span className="text-sm text-muted-foreground">
              Paid access {paymentProviderConfigured ? 'enabled' : '(disabled, no provider)'}
            </span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminField label="Price" hint={paymentProviderConfigured ? 'Price per AI access period.' : 'Placeholder, not active until a payment provider is connected.'}>
              <AdminInput
                type="number"
                min={0}
                step="0.01"
                
                value={settings.ai_paid_price}
                onChange={(e) => update('ai_paid_price', Number(e.target.value))}
                disabled={!paymentProviderConfigured}
              />
            </AdminField>
            <AdminField label="Currency">
              <AdminInput
                
                value={settings.ai_paid_currency}
                onChange={(e) => update('ai_paid_currency', e.target.value)}
                disabled={!paymentProviderConfigured}
              />
            </AdminField>
          </div>
        </AdminCard>

        {/* Admin override */}
        <AdminCard>
          <div className="flex items-center gap-2"><Lock aria-hidden="true" className="h-4 w-4 text-foreground" /><h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">Admin Override</h2></div>
          <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">When enabled, admin users bypass AI usage limits for testing.</p>
          <div className="mt-3 flex items-center gap-3">
            <Toggle checked={settings.ai_admin_override} onChange={(v) => update('ai_admin_override', v)} />
            <span className="text-sm text-muted-foreground">Admins bypass daily limits</span>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
