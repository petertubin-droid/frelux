import { useEffect, useState } from 'react';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DbSiteSettings } from '@/types/database';
import { AdminHeader, AdminCard, AdminButton, AdminField, StateMessage, Toggle } from '@/components/admin/AdminUi';
import { MediaUploader } from '@/components/admin/MediaUploader';

export default function AdminSettings() {
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
      site_name: settings.site_name, short_name: settings.short_name, tagline: settings.tagline,
      description: settings.description, logo_url: settings.logo_url, contact_email: settings.contact_email,
      whatsapp_number: settings.whatsapp_number, default_currency: settings.default_currency,
      default_currency_symbol: settings.default_currency_symbol, default_unit: settings.default_unit,
      maintenance_mode: settings.maintenance_mode, seo_title: settings.seo_title, seo_description: settings.seo_description,
    }).eq('id', settings.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setSavedAt(Date.now());
    window.setTimeout(() => setSavedAt(null), 3000);
  }

  if (loading) return (<><AdminHeader title="Site Settings" subtitle="Brand wide configuration shown across the public site." /><StateMessage type="loading" title="Loading…" message="Fetching site settings." /></>);
  if (error || !settings) return (<><AdminHeader title="Site Settings" subtitle="Brand wide configuration shown across the public site." /><StateMessage type="error" title="Couldn't load settings" message={error ?? 'No settings row found.'} /></>);

  return (
    <>
      <AdminHeader title="Site Settings" subtitle="Brand wide configuration shown across the public site."
        action={<AdminButton onClick={onSave} disabled={saving}><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save changes'}</AdminButton>} />
      {savedAt && <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" /> Settings saved.</div>}
      {error && <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
      <div className="space-y-6">
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Brand</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Site name"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={settings.site_name} onChange={(e) => update('site_name', e.target.value)} /></AdminField>
            <AdminField label="Short name"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={settings.short_name} onChange={(e) => update('short_name', e.target.value)} /></AdminField>
          </div>
          <div className="mt-4"><AdminField label="Tagline"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={settings.tagline} onChange={(e) => update('tagline', e.target.value)} /></AdminField></div>
          <div className="mt-4"><AdminField label="Description"><textarea className="input-field dark:bg-brand-navy-mid dark:border-white/10" rows={2} value={settings.description} onChange={(e) => update('description', e.target.value)} /></AdminField></div>
          <div className="mt-4"><MediaUploader label="Logo" value={settings.logo_url} onChange={(url) => update('logo_url', url || null)} folder="branding" /></div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Contact email"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={settings.contact_email} onChange={(e) => update('contact_email', e.target.value)} /></AdminField>
            <AdminField label="WhatsApp number" hint="International format without +"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={settings.whatsapp_number} onChange={(e) => update('whatsapp_number', e.target.value)} /></AdminField>
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Defaults</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Default currency"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={settings.default_currency} onChange={(e) => update('default_currency', e.target.value)} /></AdminField>
            <AdminField label="Currency symbol"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={settings.default_currency_symbol} onChange={(e) => update('default_currency_symbol', e.target.value)} /></AdminField>
            <AdminField label="Default unit"><select className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={settings.default_unit} onChange={(e) => update('default_unit', e.target.value as 'meters' | 'feet')}><option value="meters">Meters</option><option value="feet">Feet</option></select></AdminField>
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">SEO</h2>
          <AdminField label="SEO title" hint="Optional"><input className="input-field dark:bg-brand-navy-mid dark:border-white/10" value={settings.seo_title ?? ''} onChange={(e) => update('seo_title', e.target.value || null)} /></AdminField>
          <div className="mt-4"><AdminField label="SEO description" hint="Optional"><textarea className="input-field dark:bg-brand-navy-mid dark:border-white/10" rows={2} value={settings.seo_description ?? ''} onChange={(e) => update('seo_description', e.target.value || null)} /></AdminField></div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Maintenance</h2>
          <div className="flex items-center gap-3">
            <Toggle checked={settings.maintenance_mode} onChange={(v) => update('maintenance_mode', v)} />
            <div><p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Maintenance mode</p><p className="text-xs text-neutral-400 dark:text-neutral-500">When on, visitors see a maintenance notice instead of the tools.</p></div>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
