import { useState, useEffect } from 'react';
import {AdminHeader, AdminCard, AdminButton, StateMessage, AdminInput, AdminTextarea} from '@/components/admin/AdminUi';
import { fetchQuotationSettings, updateQuotationSettings } from '@/lib/contractor';
import type { DbQuotationSettings } from '@/types/database';
import { Save, Check, AlertCircle } from 'lucide-react';

export default function AdminQuotationSettings() {
  const [settings, setSettings] = useState<DbQuotationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotationSettings()
      .then(s => { setSettings(s); setLoading(false); })
      .catch(e => { setError(e instanceof Error ? e.message : 'Failed to load quotation settings'); setLoading(false); });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateQuotationSettings(settings.id, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save quotation settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <><AdminHeader title="Quotation Settings" subtitle="Configure default quotation branding, terms, and pricing" /><StateMessage type="loading" title="Loading…" message="Fetching quotation settings." /></>;
  if (!settings && error) return <><AdminHeader title="Quotation Settings" subtitle="Configure default quotation branding, terms, and pricing" /><StateMessage type="error" title="Couldn't load settings" message={error} /></>;
  if (!settings) return <><AdminHeader title="Quotation Settings" subtitle="Configure default quotation branding, terms, and pricing" /><StateMessage type="empty" title="No settings found" message="Quotation settings row not found in the database." /></>;

  return (
    <div>
      <AdminHeader
        title="Quotation Settings"
        subtitle="Configure default quotation branding, terms, and pricing"
        action={
          <AdminButton onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? <><Check aria-hidden="true" className="h-4 w-4" /> Saved</> : <><Save aria-hidden="true" className="h-4 w-4" /> Save Changes</>}
          </AdminButton>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/10 p-3 text-sm text-accent-green">
          <Check aria-hidden="true" className="h-4 w-4 shrink-0" /> Settings saved successfully.
        </div>
      )}

      <div className="space-y-6">
        <AdminCard>
          <h3 className="mb-4 font-semibold text-neutral-800 dark:text-white">Company Branding</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Company Name</span>
              <AdminInput value={settings.company_name ?? ''} onChange={e => setSettings({ ...settings, company_name: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Company Phone</span>
              <AdminInput value={settings.company_phone ?? ''} onChange={e => setSettings({ ...settings, company_phone: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Company Email</span>
              <AdminInput value={settings.company_email ?? ''} onChange={e => setSettings({ ...settings, company_email: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Logo URL</span>
              <AdminInput value={settings.company_logo_url ?? ''} onChange={e => setSettings({ ...settings, company_logo_url: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
            </label>
            <label className="block col-span-2">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Company Address</span>
              <AdminInput value={settings.company_address ?? ''} onChange={e => setSettings({ ...settings, company_address: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
            </label>
          </div>
        </AdminCard>

        <AdminCard>
          <h3 className="mb-4 font-semibold text-neutral-800 dark:text-white">Default Pricing</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Default Markup (%)</span>
              <AdminInput type="number" value={settings.default_markup_percentage} onChange={e => setSettings({ ...settings, default_markup_percentage: +e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Default Profit (%)</span>
              <AdminInput type="number" value={settings.default_profit_percentage} onChange={e => setSettings({ ...settings, default_profit_percentage: +e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Default Tax (%)</span>
              <AdminInput type="number" value={settings.default_tax_percentage} onChange={e => setSettings({ ...settings, default_tax_percentage: +e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
            </label>
          </div>
        </AdminCard>

        <AdminCard>
          <h3 className="mb-4 font-semibold text-neutral-800 dark:text-white">Terms & Conditions</h3>
          <label className="block">
            <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Default Terms & Conditions</span>
            <AdminTextarea value={settings.default_terms_conditions} onChange={e => setSettings({ ...settings, default_terms_conditions: e.target.value })} rows={8} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
          </label>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Default Payment Terms</span>
              <AdminInput value={settings.default_payment_terms} onChange={e => setSettings({ ...settings, default_payment_terms: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Default Validity (days)</span>
              <AdminInput type="number" value={settings.default_validity_days} onChange={e => setSettings({ ...settings, default_validity_days: +e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" />
            </label>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
