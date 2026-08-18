import { useState, useEffect } from 'react';
import { AdminHeader, AdminCard, AdminButton } from '@/components/admin/AdminUi';
import { fetchQuotationSettings, updateQuotationSettings } from '@/lib/contractor';
import type { DbQuotationSettings } from '@/types/database';
import { Save, Check } from 'lucide-react';

export default function AdminQuotationSettings() {
  const [settings, setSettings] = useState<DbQuotationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchQuotationSettings()
      .then(s => { setSettings(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    await updateQuotationSettings(settings.id, settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="p-6 text-sm text-neutral-500">Loading quotation settings...</div>;
  if (!settings) return <div className="p-6 text-sm text-red-600">Failed to load quotation settings.</div>;

  return (
    <div>
      <AdminHeader
        title="Quotation Settings"
        subtitle="Configure default quotation branding, terms, and pricing"
        action={
          <AdminButton onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save Changes</>}
          </AdminButton>
        }
      />

      <div className="space-y-6">
        <AdminCard>
          <h3 className="mb-4 font-semibold text-neutral-800">Company Branding</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700">Company Name</span>
              <input value={settings.company_name ?? ''} onChange={e => setSettings({ ...settings, company_name: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700">Company Phone</span>
              <input value={settings.company_phone ?? ''} onChange={e => setSettings({ ...settings, company_phone: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700">Company Email</span>
              <input value={settings.company_email ?? ''} onChange={e => setSettings({ ...settings, company_email: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700">Logo URL</span>
              <input value={settings.company_logo_url ?? ''} onChange={e => setSettings({ ...settings, company_logo_url: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="block col-span-2">
              <span className="block text-sm font-semibold text-neutral-700">Company Address</span>
              <input value={settings.company_address ?? ''} onChange={e => setSettings({ ...settings, company_address: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
          </div>
        </AdminCard>

        <AdminCard>
          <h3 className="mb-4 font-semibold text-neutral-800">Default Pricing</h3>
          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700">Default Markup (%)</span>
              <input type="number" value={settings.default_markup_percentage} onChange={e => setSettings({ ...settings, default_markup_percentage: +e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700">Default Profit (%)</span>
              <input type="number" value={settings.default_profit_percentage} onChange={e => setSettings({ ...settings, default_profit_percentage: +e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700">Default Tax (%)</span>
              <input type="number" value={settings.default_tax_percentage} onChange={e => setSettings({ ...settings, default_tax_percentage: +e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
          </div>
        </AdminCard>

        <AdminCard>
          <h3 className="mb-4 font-semibold text-neutral-800">Terms & Conditions</h3>
          <label className="block">
            <span className="block text-sm font-semibold text-neutral-700">Default Terms & Conditions</span>
            <textarea value={settings.default_terms_conditions} onChange={e => setSettings({ ...settings, default_terms_conditions: e.target.value })} rows={8} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700">Default Payment Terms</span>
              <input value={settings.default_payment_terms} onChange={e => setSettings({ ...settings, default_payment_terms: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-700">Default Validity (days)</span>
              <input type="number" value={settings.default_validity_days} onChange={e => setSettings({ ...settings, default_validity_days: +e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
