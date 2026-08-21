import { useState, useEffect, useCallback } from 'react';
import { getIntegrationSettings, updateIntegrationSetting } from '@/lib/crm';
import type { DbIntegrationSetting } from '@/types/database';
import { Loader2, Check, X, CreditCard, BarChart3, MessageSquare, MapPin, Cloud, Megaphone, Save } from 'lucide-react';

const CATEGORY_ICONS: Record<string, typeof CreditCard> = {
  payment: CreditCard,
  analytics: BarChart3,
  communication: MessageSquare,
  maps: MapPin,
  storage: Cloud,
  advertising: Megaphone,
};

const CATEGORY_LABELS: Record<string, string> = {
  payment: 'Payment Processing',
  analytics: 'Analytics & Tracking',
  communication: 'Communication',
  maps: 'Maps & Location',
  storage: 'Cloud Storage',
  advertising: 'Advertising',
};

export default function AdminIntegrations() {
  const [integrations, setIntegrations] = useState<DbIntegrationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, Record<string, string>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getIntegrationSettings();
      setIntegrations(data as DbIntegrationSetting[]);
      // Initialize edit values
      const vals: Record<string, Record<string, string>> = {};
      for (const i of data as DbIntegrationSetting[]) {
        vals[i.integration_key] = {};
        for (const [k, v] of Object.entries(i.config)) {
          if (typeof v === 'string' && !k.includes('secret')) {
            vals[i.integration_key][k] = v;
          } else if (typeof v === 'number') {
            vals[i.integration_key][k] = String(v);
          }
        }
      }
      setEditValues(vals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(integration: DbIntegrationSetting) {
    setSaving(integration.integration_key);
    try {
      await updateIntegrationSetting(integration.integration_key, { is_enabled: !integration.is_enabled });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle');
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveConfig(integration: DbIntegrationSetting) {
    setSaving(integration.integration_key);
    try {
      const configValues = editValues[integration.integration_key] ?? {};
      const newConfig: Record<string, unknown> = { ...integration.config };
      for (const [k, v] of Object.entries(configValues)) {
        newConfig[k] = v;
      }
      await updateIntegrationSetting(integration.integration_key, { config: newConfig });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  }

  function updateFieldValue(integrationKey: string, field: string, value: string) {
    setEditValues((prev) => ({
      ...prev,
      [integrationKey]: { ...prev[integrationKey], [field]: value },
    }));
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-brand-purple" /></div>;
  }

  const categories = [...new Set(integrations.map((i) => i.category))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integration Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure and manage third-party integrations. All integrations can be toggled on/off and configured here.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-xs underline">Dismiss</button>
        </div>
      )}

      {categories.map((category) => {
        const categoryIntegrations = integrations.filter((i) => i.category === category);
        const Icon = CATEGORY_ICONS[category] ?? CreditCard;
        return (
          <div key={category}>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Icon className="h-5 w-5 text-brand-purple" />
              {CATEGORY_LABELS[category] ?? category}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {categoryIntegrations.map((integration) => {
                const isSecret = (key: string) => key.includes('secret') || key.includes('token') || key.includes('password');
                const configFields = Object.entries(integration.config).filter(([k]) => k !== 'id');
                return (
                  <div key={integration.id} className="rounded-lg border p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{integration.display_name}</h3>
                        <span className={`mt-1 inline-flex items-center gap-1 text-xs ${integration.is_enabled ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {integration.is_enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {integration.is_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggle(integration)}
                        disabled={saving === integration.integration_key}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${integration.is_enabled ? 'bg-brand-purple' : 'bg-muted'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${integration.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {configFields.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {configFields.map(([key, value]) => (
                          <div key={key}>
                            <label className="text-xs font-medium text-muted-foreground">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </label>
                            <input
                              type={isSecret(key) ? 'password' : 'text'}
                              value={editValues[integration.integration_key]?.[key] ?? ''}
                              onChange={(e) => updateFieldValue(integration.integration_key, key, e.target.value)}
                              placeholder={isSecret(key) ? '••••••••' : ''}
                              className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm"
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => handleSaveConfig(integration)}
                          disabled={saving === integration.integration_key}
                          className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {saving === integration.integration_key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          Save Config
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
