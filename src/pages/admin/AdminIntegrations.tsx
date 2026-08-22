import { useState, useEffect, useCallback } from 'react';
import { getIntegrationSettings, updateIntegrationSetting } from '@/lib/crm';
import type { DbIntegrationSetting } from '@/types/database';
import { Loader2, Check, X, CreditCard, BarChart3, MessageSquare, MapPin, Cloud, Megaphone, Save, ExternalLink, Search } from 'lucide-react';

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

// Field descriptions for specific integrations
const FIELD_HELP: Record<string, Record<string, string>> = {
  google_analytics: {
    measurement_id: 'Your GA4 Measurement ID (e.g. G-XXXXXXXXXX). Find it in GA4 → Admin → Data Streams.',
  },
  google_adsense: {
    publisher_id: 'Your AdSense Publisher ID (e.g. ca-pub-XXXXXXXXXXXXXXXX). Find it in AdSense → Account → Account information.',
    client_id: 'Same as publisher_id — the ca-pub-XXXX ID used to load the AdSense script.',
  },
  google_search_console: {
    verification_token: 'The verification token from Google Search Console. Get it at search.google.com/search-console → Add property → HTML tag method. Paste only the token content, not the full meta tag.',
  },
  media_net: {
    cid: 'Your Media.net Customer ID (CID). Find it in your Media.net dashboard.',
    crids: 'Optional — comma-separated CRIDs for specific ad zones.',
  },
  adsterra: {
    key: 'Your Adsterra ad zone key. Create a zone in Adsterra dashboard → Ad Units.',
    placement_id: 'Optional — a label for this placement (for your reference).',
  },
  buysellads: {
    site_key: 'Your BuySellAds site key. Register at buysellads.com and add your site.',
    zone_keys: 'Comma-separated zone keys for different ad sizes.',
  },
  taboola: {
    publisher_id: 'Your Taboola publisher ID. Register at taboola.com.',
    placement: 'Placement name (e.g. "Below Article Thumbnails").',
  },
  outbrain: {
    widget_id: 'Your Outbrain widget ID (e.g. AR_1). Register at outbrain.com.',
    publisher_key: 'Your publisher key for Outbrain.',
  },
  propellerads: {
    zone_id: 'Your PropellerAds zone ID. Create a zone in the PropellerAds dashboard.',
    format: 'Ad format: push, banner, or native.',
  },
  adgate_media: {
    gateway_id: 'Your AdGate Media gateway ID. Register at adgatemedia.com.',
    api_key: 'Your AdGate API key for postback verification.',
    postback_url: 'Set this in your AdGate dashboard: https://freluxtools.netlify.app/functions/v1/rewarded-postback/adgate_media',
  },
  offertoro: {
    app_id: 'Your OfferToro app ID. Register at offertoro.com.',
    pub_id: 'Your OfferToro publisher ID.',
    secret: 'Your OfferToro secret key for postback verification.',
    postback_url: 'Set this in your OfferToro dashboard: https://freluxtools.netlify.app/functions/v1/rewarded-postback/offertoro',
  },
  adgem: {
    placement_id: 'Your AdGem placement ID. Register at adgem.com.',
    api_key: 'Your AdGem API key for postback verification.',
    postback_url: 'Set this in your AdGem dashboard: https://freluxtools.netlify.app/functions/v1/rewarded-postback/adgem',
  },
  cpx_research: {
    app_id: 'Your CPX Research app ID. Register at cpx-research.com.',
    secure_hash: 'Your CPX Research secure hash for postback verification.',
    survey_mode: 'Survey mode: "full" for complete surveys, "quick" for shorter ones.',
  },
  ayet_studios: {
    app_id: 'Your Ayet Studios app ID. Register at ayetstudios.com.',
    api_key: 'Your Ayet Studios API key for postback verification.',
    postback_url: 'Set this in your Ayet Studios dashboard: https://freluxtools.netlify.app/functions/v1/rewarded-postback/ayet_studios',
  },
  meta_pixel: {
    pixel_id: 'Your Meta/Facebook Pixel ID (e.g. 123456789012345). Find it in Meta Events Manager → Data Sources → Pixel.',
  },
  revu: {
    api_key: 'Your RevU API key for postback verification.',
    placement_id: 'Your RevU placement ID.',
    postback_url: 'Set this in your RevU dashboard: https://freluxtools.netlify.app/functions/v1/rewarded-postback/revu',
  },
};

const INTEGRATION_LINKS: Record<string, { label: string; url: string }> = {
  google_analytics: { label: 'Open Google Analytics', url: 'https://analytics.google.com' },
  google_adsense: { label: 'Open Google AdSense', url: 'https://www.google.com/adsense' },
  google_search_console: { label: 'Open Search Console', url: 'https://search.google.com/search-console' },
  media_net: { label: 'Open Media.net', url: 'https://www.media.net' },
  adsterra: { label: 'Open Adsterra', url: 'https://adsterra.com' },
  buysellads: { label: 'Open BuySellAds', url: 'https://www.buysellads.com' },
  taboola: { label: 'Open Taboola', url: 'https://www.taboola.com' },
  outbrain: { label: 'Open Outbrain', url: 'https://www.outbrain.com' },
  propellerads: { label: 'Open PropellerAds', url: 'https://propellerads.com' },
  adgate_media: { label: 'Open AdGate Media', url: 'https://adgatemedia.com' },
  offertoro: { label: 'Open OfferToro', url: 'https://www.offertoro.com' },
  adgem: { label: 'Open AdGem', url: 'https://adgem.com' },
  cpx_research: { label: 'Open CPX Research', url: 'https://www.cpx-research.com' },
  ayet_studios: { label: 'Open Ayet Studios', url: 'https://ayetstudios.com' },
  meta_pixel: {
    pixel_id: 'Your Meta/Facebook Pixel ID (e.g. 123456789012345). Find it in Meta Events Manager → Data Sources → Pixel.',
  },
  meta_pixel: { label: 'Open Meta Events Manager', url: 'https://business.facebook.com/events_manager' },
  revu: { label: 'Open RevU', url: 'https://revu.tv' },
};

export default function AdminIntegrations() {
  const [integrations, setIntegrations] = useState<DbIntegrationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
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
    setSavedKeys((prev) => { const n = new Set(prev); n.delete(integration.integration_key); return n; });
    try {
      const configValues = editValues[integration.integration_key] ?? {};
      const newConfig: Record<string, unknown> = { ...integration.config };
      for (const [k, v] of Object.entries(configValues)) {
        newConfig[k] = v;
      }
      await updateIntegrationSetting(integration.integration_key, { config: newConfig });
      await load();
      setSavedKeys((prev) => new Set(prev).add(integration.integration_key));
      setTimeout(() => {
        setSavedKeys((prev) => { const n = new Set(prev); n.delete(integration.integration_key); return n; });
      }, 3000);
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

  // Check if a Google integration is properly configured
  function isConfigured(integration: DbIntegrationSetting): boolean {
    if (!integration.is_enabled) return false;
    const config = integration.config as Record<string, unknown>;
    return Object.values(config).some((v) => typeof v === 'string' && v.length > 0);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integration Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure and manage third-party integrations. Toggle each integration on, enter your credentials, and save. Changes take effect on the next page load.
        </p>
      </div>

      {/* Google integrations status summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {['google_analytics', 'google_adsense', 'google_search_console'].map((key) => {
          const integ = integrations.find((i) => i.integration_key === key);
          if (!integ) return null;
          const configured = isConfigured(integ as DbIntegrationSetting);
          const Icon = key === 'google_analytics' ? BarChart3 : key === 'google_adsense' ? Megaphone : Search;
          return (
            <div key={key} className={`rounded-lg border p-4 ${configured ? 'border-emerald-200 dark:border-emerald-800' : 'border-neutral-200 dark:border-white/10'}`}>
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${configured ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">{(integ as DbIntegrationSetting).display_name}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {configured ? (
                  <><Check className="h-3.5 w-3.5 text-emerald-600" /><span className="text-xs text-emerald-600">Configured & active</span></>
                ) : (integ as DbIntegrationSetting).is_enabled ? (
                  <><Loader2 className="h-3.5 w-3.5 text-amber-500" /><span className="text-xs text-amber-500">Enabled — needs credentials</span></>
                ) : (
                  <><X className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Not configured</span></>
                )}
              </div>
            </div>
          );
        })}
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
                const isSecret = (key: string) => key.includes('secret') || key.includes('token') || key.includes('password') || key.includes('api_key');
                const configFields = Object.entries(integration.config).filter(([k]) => k !== 'id');
                const link = INTEGRATION_LINKS[integration.integration_key];
                const justSaved = savedKeys.has(integration.integration_key);
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
                        aria-label="Toggle integration"
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${integration.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* External link for Google integrations */}
                    {link && (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-brand-purple hover:underline"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}

                    {configFields.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {configFields.map(([key, _value]) => (
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
                            {FIELD_HELP[integration.integration_key]?.[key] && (
                              <p className="mt-1 text-[11px] text-muted-foreground/70 leading-relaxed">
                                {FIELD_HELP[integration.integration_key][key]}
                              </p>
                            )}
                          </div>
                        ))}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSaveConfig(integration)}
                            disabled={saving === integration.integration_key}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                          >
                            {saving === integration.integration_key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Save Config
                          </button>
                          {justSaved && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Google Search Console verification note */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
          <Search className="h-4 w-4" />
          Google Search Console Setup Guide
        </h3>
        <ol className="mt-2 space-y-1 text-xs text-blue-800 dark:text-blue-300/80">
          <li>1. Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="underline">search.google.com/search-console</a> and add your property (freluxtools.netlify.app)</li>
          <li>2. Choose the "HTML tag" verification method</li>
          <li>3. Copy the token value from the meta tag (just the content attribute value)</li>
          <li>4. Enable "Google Search Console" above, paste the token in the verification field, and save</li>
          <li>5. Click "Verify" back in Search Console — the meta tag is auto-injected on page load</li>
          <li>6. Your sitemap is at <a href="https://freluxtools.netlify.app/sitemap.xml" target="_blank" rel="noopener noreferrer" className="underline">freluxtools.netlify.app/sitemap.xml</a> — submit it in Search Console</li>
        </ol>
      </div>
    </div>
  );
}
