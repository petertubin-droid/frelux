/**
 * FRELUX Admin — Roof View Imagery Provider
 *
 * Admin page for activating and configuring the Roof View imagery
 * feature (Build-to-Roof Estimator's satellite view). Before this
 * page existed, the feature was dead UI: the frontend hook called
 * the `roof-view-imagery` Edge Function, but there was no admin
 * page to configure a provider, so the function always returned
 * "no provider configured".
 *
 * What this page does:
 *   - Pick one of the supported providers (Google Maps, Mapbox,
 *     Nearmap, Custom)
 *   - Enter the provider API key — stored server-side in
 *     integration_settings, NEVER displayed again after save
 *     (write-only field, exactly like the other integrations)
 *   - Configure provider settings from each provider's schema
 *   - Enable/disable the feature
 *   - Test the live provider with a sample location
 *
 * The API key is stored in integration_settings (config.api_key),
 * read server-side by the roof-view-imagery Edge Function with the
 * service role. It is never returned to any client.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Satellite,
  Loader2,
  Save,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Info,
  TestTube2,
} from "lucide-react";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminField,
  AdminInput,
  AdminSelect,
  Toggle,
  StateMessage,
} from "@/components/admin/AdminUi";
import { supabase } from "@/lib/supabase";
import {
  SUPPORTED_PROVIDERS,
  clearRoofViewConfigCache,
  fetchRoofViewImagery,
} from "@/lib/roof/provider-registry";
import { classNames } from "@/lib/utils";

// =========================================================
// Types & constants
// =========================================================

interface ConfigRow {
  id: string;
  provider_type: string;
  enabled: boolean;
  api_key_configured: boolean;
  display_name: string;
  settings: Record<string, unknown> | null;
}

/** integration_settings key this page owns. */
const INTEGRATION_KEY = "roof_view";

/** Providers whose server-side retrieval is not implemented yet. */
const NOT_IMPLEMENTED: string[] = ["nearmap"];

// Sample test location: Lagos city center
const TEST_LOCATION = { latitude: 6.5244, longitude: 3.3792 };

// =========================================================
// Page
// =========================================================

export default function AdminRoofView() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [providerType, setProviderType] = useState("google_maps");
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [configuredProvider, setConfiguredProvider] = useState<string | null>(
    null,
  );

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    | { ok: true; imagery_url: string; provider: string }
    | { ok: false; error: string }
    | null
  >(null);

  const provider = SUPPORTED_PROVIDERS.find((p) => p.type === providerType);

  // ---------------------------------------------------------
  // Load current config
  // ---------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: rows, error } = await supabase
        .from("roof_view_config")
        .select(
          "id, provider_type, enabled, api_key_configured, display_name, settings",
        )
        .order("updated_at", { ascending: false })
        .limit(1);
      if (error) throw error;

      const row = (rows?.[0] ?? null) as ConfigRow | null;
      if (row) {
        setProviderType(row.provider_type);
        setEnabled(row.enabled);
        setApiKeyConfigured(row.api_key_configured);
        setConfiguredProvider(
          row.enabled || row.api_key_configured ? row.provider_type : null,
        );
        // hydrate settings from schema defaults + stored values
        const stored = (row.settings ?? {}) as Record<string, unknown>;
        const next: Record<string, string> = {};
        const meta = SUPPORTED_PROVIDERS.find(
          (p) => p.type === row.provider_type,
        );
        if (meta) {
          for (const [key, field] of Object.entries(meta.settings_schema)) {
            const v = stored[key] ?? field.default;
            next[key] = String(v ?? "");
          }
        }
        setSettings(next);
      } else {
        // fresh defaults from the google_maps schema
        const meta = SUPPORTED_PROVIDERS.find((p) => p.type === "google_maps");
        const next: Record<string, string> = {};
        if (meta) {
          for (const [key, field] of Object.entries(meta.settings_schema)) {
            next[key] = String(field.default ?? "");
          }
        }
        setSettings(next);
      }
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Failed to load configuration.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---------------------------------------------------------
  // Switch provider → re-hydrate settings from its schema
  // ---------------------------------------------------------
  function handleProviderChange(type: string) {
    setProviderType(type);
    setTestResult(null);
    const meta = SUPPORTED_PROVIDERS.find((p) => p.type === type);
    const next: Record<string, string> = {};
    if (meta) {
      for (const [key, field] of Object.entries(meta.settings_schema)) {
        next[key] = String(field.default ?? "");
      }
    }
    setSettings(next);
  }

  // ---------------------------------------------------------
  // Save
  // ---------------------------------------------------------
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    setTestResult(null);
    try {
      const meta = SUPPORTED_PROVIDERS.find((p) => p.type === providerType);
      if (!meta) throw new Error("Unknown provider.");

      // 1. Coerce settings per schema type
      const settingsOut: Record<string, unknown> = {};
      for (const [key, field] of Object.entries(meta.settings_schema)) {
        const raw = (settings[key] ?? "").toString().trim();
        if (raw === "") continue;
        settingsOut[key] = field.type === "number" ? Number(raw) : raw;
      }
      const hasKey = apiKey.trim().length > 0;

      // 2. Store the API key in integration_settings (server-side only).
      //    Merge with any existing config so other keys survive.
      const { data: existing } = (await supabase
        .from("integration_settings")
        .select("config")
        .eq("integration_key", INTEGRATION_KEY)
        .maybeSingle()) as { data: { config: Record<string, unknown> } | null };

      const mergedConfig: Record<string, unknown> = {
        ...((existing?.config ?? {}) as Record<string, unknown>),
      };
      if (hasKey) {
        mergedConfig.api_key = apiKey.trim();
      } else if (apiKeyConfigured) {
        // admin explicitly cleared the field but a key exists — keep it.
        // To remove the key, use the "Remove key" action.
      }
      const { error: integrationError } = await supabase
        .from("integration_settings")
        .upsert(
          {
            integration_key: INTEGRATION_KEY,
            display_name: meta.display_name,
            category: "maps",
            is_enabled: enabled,
            config: mergedConfig,
          },
          { onConflict: "integration_key" },
        );
      if (integrationError) throw integrationError;

      // 3. Upsert the roof_view_config row.
      const apiKeyConfiguredNext = hasKey || apiKeyConfigured;
      const { data: existingRows } = (await supabase
        .from("roof_view_config")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)) as { data: { id: string }[] | null };

      const configPayload = {
        provider_type: providerType,
        enabled,
        api_key_configured: apiKeyConfiguredNext,
        display_name: meta.display_name,
        settings: settingsOut,
      };

      if (existingRows && existingRows.length > 0) {
        const { error: updateError } = await supabase
          .from("roof_view_config")
          .update(configPayload)
          .eq("id", existingRows[0].id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("roof_view_config")
          .insert(configPayload);
        if (insertError) throw insertError;
      }

      if (hasKey) {
        setApiKey("");
        setApiKeyConfigured(true);
      }
      setConfiguredProvider(providerType);
      clearRoofViewConfigCache();
      setSaveMessage(
        enabled
          ? `Saved. Roof View is live with ${meta.display_name}.`
          : `Saved. Roof View is disabled (toggle it on to go live).`,
      );
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------
  // Remove the stored API key entirely
  // ---------------------------------------------------------
  async function handleRemoveKey() {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    setTestResult(null);
    try {
      const { data: existing } = (await supabase
        .from("integration_settings")
        .select("config")
        .eq("integration_key", INTEGRATION_KEY)
        .maybeSingle()) as { data: { config: Record<string, unknown> } | null };
      const config = {
        ...((existing?.config ?? {}) as Record<string, unknown>),
      };
      delete config.api_key;
      const { error } = await supabase
        .from("integration_settings")
        .update({ config })
        .eq("integration_key", INTEGRATION_KEY);
      if (error) throw error;

      const { error: cfgError } = await supabase
        .from("roof_view_config")
        .update({ api_key_configured: false, enabled: false })
        .eq("provider_type", providerType);
      if (cfgError) throw cfgError;

      setApiKeyConfigured(false);
      setEnabled(false);
      clearRoofViewConfigCache();
      setSaveMessage(
        "API key removed. Roof View is now disabled until a new key is saved.",
      );
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to remove key.");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------
  // Test the live provider end-to-end (real Edge Function call)
  // ---------------------------------------------------------
  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      clearRoofViewConfigCache();
      const result = await fetchRoofViewImagery(TEST_LOCATION);
      if (result.available && result.imagery_url) {
        setTestResult({
          ok: true,
          imagery_url: result.imagery_url,
          provider: result.provider_display_name ?? providerType,
        });
      } else {
        setTestResult({
          ok: false,
          error: result.error ?? "Imagery is not available.",
        });
      }
    } catch (e) {
      setTestResult({
        ok: false,
        error: e instanceof Error ? e.message : "Test failed.",
      });
    } finally {
      setTesting(false);
    }
  }

  // =========================================================
  // Render
  // =========================================================

  if (loading) {
    return (
      <div>
        <AdminHeader
          title="Roof View Imagery"
          subtitle="Loading configuration…"
        />
        <StateMessage
          type="loading"
          title="Loading"
          message="Reading the current imagery provider configuration…"
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <AdminHeader
          title="Roof View Imagery"
          subtitle="Provider configuration"
        />
        <StateMessage
          type="error"
          title="Could not load configuration"
          message={loadError}
          action={<AdminButton onClick={load}>Retry</AdminButton>}
        />
      </div>
    );
  }

  const live = enabled && apiKeyConfigured;

  return (
    <div>
      <AdminHeader
        title="Roof View Imagery"
        subtitle="Configure the satellite imagery provider that powers Roof View in the Build-to-Roof Estimator. The API key is stored server-side and never exposed to site visitors."
        action={
          <span
            className={classNames(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              live
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground",
            )}
          >
            {live ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Live
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5" /> Not live
              </>
            )}
          </span>
        }
      />

      <div className="space-y-6">
        {/* Status card */}
        <AdminCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Satellite className="mt-0.5 h-5 w-5 text-brand-purple" />
              <div>
                <p className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                  Feature status
                </p>
                <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
                  {live
                    ? `Active — ${configuredProvider ?? providerType} imagery is served to signed-in users via the roof-view-imagery function.`
                    : enabled
                      ? "Enabled but no API key is stored. Save a provider API key below to go live."
                      : "Roof View is disabled. Users see an honest 'not configured' message instead of a broken tool."}
                </p>
              </div>
            </div>
            <Toggle
              checked={enabled}
              onChange={setEnabled}
              label={enabled ? "Enabled" : "Disabled"}
            />
          </div>
        </AdminCard>

        {/* Provider selection */}
        <AdminCard>
          <p className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
            Provider
          </p>
          <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
            The provider is called server-side by the roof-view-imagery Edge
            Function. Only providers implemented there can serve imagery; others
            are listed for transparency.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SUPPORTED_PROVIDERS.map((p) => {
              const implemented = !NOT_IMPLEMENTED.includes(p.type);
              const selected = providerType === p.type;
              return (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => handleProviderChange(p.type)}
                  className={classNames(
                    "rounded-xl border p-4 text-left transition-colors",
                    selected
                      ? "border-brand-purple bg-brand-purple/5"
                      : "border-border hover:border-brand-purple/40 dark:border-white/5 dark:hover:border-brand-purple/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                      {p.display_name}
                    </span>
                    {selected && (
                      <CheckCircle2 className="h-4 w-4 text-brand-purple" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                    {p.description}
                  </p>
                  <p
                    className={classNames(
                      "mt-2 text-xs font-semibold",
                      implemented
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {implemented
                      ? "Implemented — ready to serve imagery"
                      : "Registered, but server-side retrieval is not implemented yet"}
                  </p>
                </button>
              );
            })}
          </div>
        </AdminCard>

        {/* API key */}
        <AdminCard>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
            <KeyRound className="h-4 w-4" /> API key
          </p>
          <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
            Stored in integration_settings and read server-side only. Write-only
            on this page — never displayed again after saving.
          </p>
          <div className="mt-4">
            <AdminField
              label={
                apiKeyConfigured ? "Replace API key (optional)" : "API key"
              }
              hint={
                providerType === "google_maps"
                  ? "Google Maps API key with Static Maps API enabled."
                  : providerType === "mapbox"
                    ? "Mapbox access token with Static Tiles API access."
                    : "Provider credential, sent in the configured header on every imagery request."
              }
            >
              <AdminInput
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  apiKeyConfigured
                    ? "••••••••  (a key is stored — enter a new one to replace)"
                    : "Paste the provider API key"
                }
                autoComplete="off"
              />
            </AdminField>
          </div>
          {apiKeyConfigured && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                A key is stored. Removing it disables the feature entirely.
              </p>
              <AdminButton
                variant="danger"
                onClick={handleRemoveKey}
                disabled={saving}
              >
                Remove key
              </AdminButton>
            </div>
          )}
        </AdminCard>

        {/* Provider settings */}
        {provider && Object.keys(provider.settings_schema).length > 0 && (
          <AdminCard>
            <p className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
              {provider.display_name} settings
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Object.entries(provider.settings_schema).map(([key, field]) => (
                <AdminField key={key} label={field.label}>
                  {field.type === "boolean" ? (
                    <Toggle
                      checked={settings[key] === "true"}
                      onChange={(v) =>
                        setSettings((s) => ({ ...s, [key]: String(v) }))
                      }
                    />
                  ) : field.label.toLowerCase().includes("type") &&
                    key !== "api_key_header" ? (
                    <AdminSelect
                      value={settings[key]}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, [key]: e.target.value }))
                      }
                    >
                      <option value="satellite">satellite</option>
                      <option value="hybrid">hybrid</option>
                      <option value="terrain">terrain</option>
                    </AdminSelect>
                  ) : (
                    <AdminInput
                      type={field.type === "number" ? "number" : "text"}
                      value={settings[key] ?? ""}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, [key]: e.target.value }))
                      }
                    />
                  )}
                </AdminField>
              ))}
            </div>
          </AdminCard>
        )}

        {/* Save */}
        <AdminCard>
          <div className="flex flex-wrap items-center gap-3">
            <AdminButton onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save configuration
                </>
              )}
            </AdminButton>
            {saveMessage && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {saveMessage}
              </span>
            )}
            {saveError && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                {saveError}
              </span>
            )}
          </div>
        </AdminCard>

        {/* Test */}
        <AdminCard>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
            <TestTube2 className="h-4 w-4" /> End-to-end test
          </p>
          <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
            Fetches a real image through the roof-view-imagery function for a
            sample Lagos location, exactly the way a signed-in user's estimator
            would.
          </p>
          <div className="mt-4">
            <AdminButton
              variant="secondary"
              onClick={handleTest}
              disabled={testing || !live}
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Testing…
                </>
              ) : (
                "Test with sample location"
              )}
            </AdminButton>
          </div>
          {testResult && (
            <div className="mt-4">
              {testResult.ok ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <img
                    src={testResult.imagery_url}
                    alt="Sample roof view imagery"
                    className="h-48 w-48 rounded-lg border border-border object-cover dark:border-white/10"
                  />
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Success —{" "}
                      {testResult.provider} returned imagery.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                      The provider URL and API key never reach the browser; the
                      function returns the image as embedded data.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{testResult.error}</span>
                </div>
              )}
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
