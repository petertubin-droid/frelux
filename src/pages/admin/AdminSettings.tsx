import { useEffect, useState } from "react";
import { Save, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { DbSiteSettings } from "@/types/database";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminField,
  StateMessage,
  Toggle,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminUi";
import { MediaUploader } from "@/components/admin/MediaUploader";
import MaintenanceTicker from "@/components/layout/MaintenanceTicker";
import { MAINTENANCE_PRESETS } from "@/config/maintenance-presets";
import { invalidateHeroContentCache } from "@/lib/useHeroContent";
import {
  DEFAULT_LOADER_CONFIG,
  LOADER_STYLE_OPTIONS,
  LoaderVisual,
  invalidateLoaderConfigCache,
} from "@/components/ui/BrandedLoader";
import type { LoaderConfig } from "@/types/database";
import { useLanguage } from "@/lib/i18n";

export default function AdminSettings() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<DbSiteSettings | null>(null);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [maintenanceSaved, setMaintenanceSaved] = useState(false);
  const [bucketSizesInput, setBucketSizesInput] = useState("");
  const [bucketSizesError, setBucketSizesError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) setError(error.message);
      setSettings(data as DbSiteSettings | null);
      setBucketSizesInput(
        (data as DbSiteSettings | null)?.manual_paint_bucket_sizes?.join(
          ", ",
        ) ?? "20, 4",
      );
      setLoading(false);
    }
    load();
  }, []);

  function update<K extends keyof DbSiteSettings>(
    key: K,
    value: DbSiteSettings[K],
  ) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  function handleBucketSizesChange(raw: string) {
    setBucketSizesInput(raw);
    const sizes = raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (sizes.length === 0) {
      setBucketSizesError(
        "Enter at least one valid bucket size (liters), e.g. 20, 4",
      );
      return;
    }
    setBucketSizesError(null);
    update("manual_paint_bucket_sizes", sizes);
  }

  const loader = settings?.loader_config ?? null;

  async function saveBanner(patch: { enabled?: boolean }) {
    if (!settings) return;
    const message = (settings.maintenance_banner_message ?? "").trim();
    const enabled = patch.enabled ?? settings.maintenance_banner_enabled;
    // The database refuses an enabled banner without a message; say so here
    // instead of surfacing a constraint violation.
    if (enabled && !message) {
      setError("Write the ticker message first, then turn it on.");
      return;
    }
    setBannerSaving(true);
    setBannerSaved(false);
    setError(null);
    const { error: bannerError } = await supabase
      .from("site_settings")
      .update({
        maintenance_banner_message: message || null,
        maintenance_banner_enabled: enabled,
      })
      .eq("id", settings.id);
    setBannerSaving(false);
    if (bannerError) {
      setError(bannerError.message);
      return;
    }
    update("maintenance_banner_message", message);
    update("maintenance_banner_enabled", enabled);
    setBannerSaved(true);
    window.setTimeout(() => setBannerSaved(false), 3000);
  }

  function updateLoader(patch: Partial<LoaderConfig>) {
    if (!settings) return;
    const base = loader ?? DEFAULT_LOADER_CONFIG;
    update("loader_config", { ...base, ...patch });
  }

  async function onSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("site_settings")
      .update({
        site_name: settings.site_name,
        short_name: settings.short_name,
        tagline: settings.tagline,
        description: settings.description,
        logo_url: settings.logo_url,
        contact_email: settings.contact_email,
        whatsapp_number: settings.whatsapp_number,
        default_currency: settings.default_currency,
        default_currency_symbol: settings.default_currency_symbol,
        default_unit: settings.default_unit,
        maintenance_mode: settings.maintenance_mode,
        seo_title: settings.seo_title,
        seo_description: settings.seo_description,
        premium_subscriptions_enabled: settings.premium_subscriptions_enabled,
        payment_gateway: settings.payment_gateway ?? "paystack",
        hero_headline: settings.hero_headline,
        hero_subheadline: settings.hero_subheadline,
        hero_cta_primary_label: settings.hero_cta_primary_label,
        hero_cta_primary_href: settings.hero_cta_primary_href,
        hero_cta_secondary_label: settings.hero_cta_secondary_label,
        hero_cta_secondary_href: settings.hero_cta_secondary_href,
        manual_paint_bucket_sizes: settings.manual_paint_bucket_sizes,
        loader_config: settings.loader_config,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    invalidateHeroContentCache();
    invalidateLoaderConfigCache();
    setSavedAt(Date.now());
    window.setTimeout(() => setSavedAt(null), 3000);
  }

  if (loading)
    return (
      <>
        <AdminHeader
          title={t("Site Settings")}
          subtitle={t("Brand wide configuration shown across the public site.")}
        />
        <StateMessage
          type="loading"
          title={t("Loading…")}
          message="Fetching site settings."
        />
      </>
    );
  if (error || !settings)
    return (
      <>
        <AdminHeader
          title={t("Site Settings")}
          subtitle={t("Brand wide configuration shown across the public site.")}
        />
        <StateMessage
          type="error"
          title={t("Couldn't load settings")}
          message={error ?? "No settings row found."}
        />
      </>
    );

  return (
    <>
      <AdminHeader
        title={t("Site Settings")}
        subtitle={t("Brand wide configuration shown across the public site.")}
        action={
          <AdminButton onClick={onSave} disabled={saving}>
            <Save aria-hidden="true" className="h-4 w-4" />
            {saving ? "Saving…" : "Save changes"}
          </AdminButton>
        }
      />
      {savedAt && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> Settings
          saved.
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle aria-hidden="true" className="h-4 w-4" /> {error}
        </div>
      )}
      <div className="space-y-6">
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
            {t("Brand")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Site name">
              <AdminInput
                value={settings.site_name}
                onChange={(e) => update("site_name", e.target.value)}
              />
            </AdminField>
            <AdminField label="Short name">
              <AdminInput
                value={settings.short_name}
                onChange={(e) => update("short_name", e.target.value)}
              />
            </AdminField>
          </div>
          <div className="mt-4">
            <AdminField label="Tagline">
              <AdminInput
                value={settings.tagline}
                onChange={(e) => update("tagline", e.target.value)}
              />
            </AdminField>
          </div>
          <div className="mt-4">
            <AdminField label="Description">
              <AdminTextarea
                rows={2}
                value={settings.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </AdminField>
          </div>
          <div className="mt-4">
            <MediaUploader
              label="Logo"
              value={settings.logo_url}
              onChange={(url) => update("logo_url", url || null)}
              folder="branding"
            />
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
            {t("Contact")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Contact email">
              <AdminInput
                value={settings.contact_email}
                onChange={(e) => update("contact_email", e.target.value)}
              />
            </AdminField>
            <AdminField
              label="WhatsApp number"
              hint="International format without +"
            >
              <AdminInput
                value={settings.whatsapp_number}
                onChange={(e) => update("whatsapp_number", e.target.value)}
              />
            </AdminField>
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
            {t("Defaults")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField label="Default currency">
              <AdminInput
                value={settings.default_currency}
                onChange={(e) => update("default_currency", e.target.value)}
              />
            </AdminField>
            <AdminField label="Payment gateway">
              <AdminSelect
                value={settings.payment_gateway ?? "paystack"}
                onChange={(e) =>
                  update(
                    "payment_gateway",
                    e.target.value as "paystack" | "flutterwave",
                  )
                }
              >
                <option value="paystack">{t("Paystack (Nigeria)")}</option>

                <option value="flutterwave">
                  {t("Flutterwave (Pan-African)")}
                </option>
              </AdminSelect>
            </AdminField>
            <AdminField label="Currency symbol">
              <AdminInput
                value={settings.default_currency_symbol}
                onChange={(e) =>
                  update("default_currency_symbol", e.target.value)
                }
              />
            </AdminField>
            <AdminField label="Default unit">
              <AdminSelect
                value={settings.default_unit}
                onChange={(e) =>
                  update("default_unit", e.target.value as "meters" | "feet")
                }
              >
                <option value="meters">{t("Meters")}</option>
                <option value="feet">{t("Feet")}</option>
              </AdminSelect>
            </AdminField>
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
            {t("Cost Estimator")}
          </h2>
          <AdminField
            label="Manual paint bucket sizes (liters)"
            hint="Comma separated, e.g. 20, 4, 1. Shown as a bucket-size picker when a user manually enters a paint price instead of selecting a catalog product."
            error={bucketSizesError ?? undefined}
          >
            <AdminInput
              value={bucketSizesInput}
              onChange={(e) => handleBucketSizesChange(e.target.value)}
              placeholder="20, 4"
            />
          </AdminField>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
            {t("SEO")}
          </h2>
          <AdminField label="SEO title" hint="Optional">
            <AdminInput
              value={settings.seo_title ?? ""}
              onChange={(e) => update("seo_title", e.target.value || null)}
            />
          </AdminField>
          <div className="mt-4">
            <AdminField label="SEO description" hint="Optional">
              <AdminTextarea
                rows={2}
                value={settings.seo_description ?? ""}
                onChange={(e) =>
                  update("seo_description", e.target.value || null)
                }
              />
            </AdminField>
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
            {t("Premium Subscriptions")}
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                {t("Enable Premium Subscriptions")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                When enabled, users can subscribe to Pro and Premium plans via
                Paystack. When disabled, premium features show a "Coming Soon"
                message.
              </p>
            </div>
            <Toggle
              srLabel="Premium subscriptions"
              checked={settings.premium_subscriptions_enabled ?? false}
              onChange={(v) => update("premium_subscriptions_enabled", v)}
            />
          </div>
          {(settings.premium_subscriptions_enabled ?? false) && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
              ⚠️ Configure PAYSTACK_SECRET_KEY as a Supabase Edge Function
              secret and deploy the payment checkout, verification, and webhook
              functions before enabling. The hosted checkout does not use a
              browser public key.
            </div>
          )}
        </AdminCard>
        <AdminCard>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
            {t("Homepage Hero")}
          </h2>
          <p className="mb-4 text-xs text-amber-600 dark:text-amber-400">
            This is the approved, client-controlled copy shown on the homepage
            hero section. Changes here take effect immediately on save. Use{" "}
            <code className="rounded bg-muted px-1 dark:bg-white/10">
              #calculators
            </code>{" "}
            for in-page anchors or{" "}
            <code className="rounded bg-muted px-1 dark:bg-white/10">
              /screeding-calculator
            </code>{" "}
            for routes.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Headline" hint="Main hero headline">
              <AdminInput
                value={settings.hero_headline ?? ""}
                onChange={(e) =>
                  update("hero_headline", e.target.value || null)
                }
                placeholder={t(
                  "Know Exactly What Materials Your Project Needs.",
                )}
              />
            </AdminField>
            <AdminField
              label="Subheadline"
              hint="Supporting text below the headline"
            >
              <AdminInput
                value={settings.hero_subheadline ?? ""}
                onChange={(e) =>
                  update("hero_subheadline", e.target.value || null)
                }
                placeholder={t(
                  "Calculate materials and estimate project costs...",
                )}
              />
            </AdminField>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminField label="Primary CTA label" hint="Button text">
              <AdminInput
                value={settings.hero_cta_primary_label ?? ""}
                onChange={(e) =>
                  update("hero_cta_primary_label", e.target.value || null)
                }
                placeholder={t("Start Calculating")}
              />
            </AdminField>
            <AdminField label="Primary CTA link" hint="Route or anchor">
              <AdminInput
                value={settings.hero_cta_primary_href ?? ""}
                onChange={(e) =>
                  update("hero_cta_primary_href", e.target.value || null)
                }
                placeholder="/screeding-calculator"
              />
            </AdminField>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminField label="Secondary CTA label" hint="Button text">
              <AdminInput
                value={settings.hero_cta_secondary_label ?? ""}
                onChange={(e) =>
                  update("hero_cta_secondary_label", e.target.value || null)
                }
                placeholder={t("Explore Calculators")}
              />
            </AdminField>
            <AdminField label="Secondary CTA link" hint="Route or anchor">
              <AdminInput
                value={settings.hero_cta_secondary_href ?? ""}
                onChange={(e) =>
                  update("hero_cta_secondary_href", e.target.value || null)
                }
                placeholder="#calculators"
              />
            </AdminField>
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
            {t("Maintenance")}
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                {t("Maintenance mode")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                When on, visitors see a maintenance notice instead of the tools.
                Changes take effect immediately across the site.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {maintenanceSaving && (
                <span className="text-xs text-muted-foreground">Saving…</span>
              )}
              {maintenanceSaved && (
                <span className="text-xs text-green-600">✓ Live</span>
              )}
              <Toggle
                srLabel="Maintenance mode"
                checked={settings.maintenance_mode}
                onChange={async (v) => {
                  update("maintenance_mode", v);
                  setMaintenanceSaving(true);
                  setMaintenanceSaved(false);
                  const { error: mErr } = await supabase
                    .from("site_settings")
                    .update({ maintenance_mode: v })
                    .eq("id", settings.id);
                  setMaintenanceSaving(false);
                  if (!mErr) {
                    setMaintenanceSaved(true);
                    window.setTimeout(() => setMaintenanceSaved(false), 3000);
                  } else {
                    setError(mErr.message);
                    update("maintenance_mode", !v);
                  }
                }}
              />
            </div>
          </div>

          {/* Ticker: informs without closing the site. */}
          <div className="mt-6 border-t border-border/60 pt-6 dark:border-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                  Maintenance ticker
                </p>
                <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                  A thin orange line that slides under the header on every page,
                  carrying your message. Independent of maintenance mode, so you
                  can announce planned work without closing the site.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {bannerSaved && (
                  <span className="text-xs text-green-600">✓ Live</span>
                )}
                <Toggle
                  srLabel="Maintenance ticker"
                  checked={settings.maintenance_banner_enabled}
                  onChange={(next) => saveBanner({ enabled: next })}
                />
              </div>
            </div>

            <div className="mt-4">
              <AdminField
                label="Ticker message"
                hint="Up to 240 characters. It loops, so two short sentences read best."
              >
                <AdminTextarea
                  rows={3}
                  maxLength={240}
                  value={settings.maintenance_banner_message ?? ""}
                  onChange={(event) =>
                    update("maintenance_banner_message", event.target.value)
                  }
                  placeholder="Scheduled maintenance tonight, 11:00 pm to 1:00 am."
                />
              </AdminField>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {(settings.maintenance_banner_message ?? "").length}/240
                </span>
                <div className="flex items-center gap-2">
                  {bannerSaving && (
                    <span className="text-xs text-muted-foreground">
                      Saving…
                    </span>
                  )}
                  <AdminButton
                    onClick={() => saveBanner({})}
                    disabled={bannerSaving}
                  >
                    <Save className="h-4 w-4" />
                    Publish message
                  </AdminButton>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Presets
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {MAINTENANCE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      update("maintenance_banner_message", preset.message)
                    }
                    className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-card-foreground transition-colors hover:border-brand-purple/40 hover:bg-primary/5 dark:border-white/10 dark:text-muted-foreground dark:hover:bg-white/5"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border/60 dark:border-white/10">
              <p className="border-b border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground dark:border-white/10 dark:bg-white/5">
                Preview
              </p>
              {(settings.maintenance_banner_message ?? "").trim() ? (
                <MaintenanceTicker
                  inline
                  message={settings.maintenance_banner_message ?? ""}
                />
              ) : (
                <p className="px-3 py-3 text-xs text-muted-foreground">
                  Write a message, or pick a preset, to see it here.
                </p>
              )}
            </div>
          </div>
        </AdminCard>

        {/* Loading Experience */}
        <AdminCard>
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-base font-semibold">
                {t("Loading Experience")}
              </h3>
              <p className="text-sm text-muted-foreground">
                The branded loader shown while pages load. Saved to
                loader_config and applied site-wide immediately after save.
              </p>
            </div>

            <Toggle
              checked={(loader ?? DEFAULT_LOADER_CONFIG).enabled}
              onChange={(v) => updateLoader({ enabled: v })}
              label="Enable branded loader (off = plain spinner)"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <AdminField
                label="Loader style"
                hint={
                  (
                    LOADER_STYLE_OPTIONS.find(
                      (o) =>
                        o.value === (loader ?? DEFAULT_LOADER_CONFIG).style,
                    ) || LOADER_STYLE_OPTIONS[0]
                  ).description
                }
              >
                <AdminSelect
                  value={(loader ?? DEFAULT_LOADER_CONFIG).style}
                  onChange={(e) => updateLoader({ style: e.target.value })}
                >
                  {LOADER_STYLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>

              <AdminField label="Loader size">
                <AdminSelect
                  value={(loader ?? DEFAULT_LOADER_CONFIG).size}
                  onChange={(e) =>
                    updateLoader({
                      size: e.target.value as LoaderConfig["size"],
                    })
                  }
                >
                  <option value="sm">{t("Small (64px)")}</option>
                  <option value="md">{t("Medium (96px)")}</option>
                  <option value="lg">{t("Large (128px)")}</option>
                </AdminSelect>
              </AdminField>

              <AdminField label="Animation speed">
                <AdminSelect
                  value={(loader ?? DEFAULT_LOADER_CONFIG).speed}
                  onChange={(e) =>
                    updateLoader({
                      speed: e.target.value as LoaderConfig["speed"],
                    })
                  }
                >
                  <option value="slow">{t("Slow")}</option>
                  <option value="normal">{t("Normal")}</option>
                  <option value="fast">{t("Fast")}</option>
                </AdminSelect>
              </AdminField>

              <AdminField
                label="Custom loading text"
                hint="Leave empty to rotate default messages."
              >
                <AdminInput
                  value={(loader ?? DEFAULT_LOADER_CONFIG).text}
                  onChange={(e) => updateLoader({ text: e.target.value })}
                  placeholder={t("Loading…")}
                />
              </AdminField>

              <AdminField label="Primary color">
                <AdminInput
                  type="color"
                  className="h-10 p-1"
                  value={(loader ?? DEFAULT_LOADER_CONFIG).primary_color}
                  onChange={(e) =>
                    updateLoader({ primary_color: e.target.value })
                  }
                />
              </AdminField>

              <AdminField label="Secondary color">
                <AdminInput
                  type="color"
                  className="h-10 p-1"
                  value={(loader ?? DEFAULT_LOADER_CONFIG).secondary_color}
                  onChange={(e) =>
                    updateLoader({ secondary_color: e.target.value })
                  }
                />
              </AdminField>
            </div>

            <Toggle
              checked={(loader ?? DEFAULT_LOADER_CONFIG).show_logo}
              onChange={(v) => updateLoader({ show_logo: v })}
              label="Show logo mark inside the loader"
            />

            <AdminField
              label="Loader logo URL"
              hint={
                "Leave empty to fall back to the site logo, or the letter mark if none is set."
              }
            >
              <AdminInput
                value={(loader ?? DEFAULT_LOADER_CONFIG).logo_url ?? ""}
                onChange={(e) =>
                  updateLoader({ logo_url: e.target.value || null })
                }
                placeholder="https://… (optional)"
              />
            </AdminField>

            <AdminField label="Live preview">
              <div className="flex items-center justify-center rounded-xl border bg-background py-8">
                <div
                  className="relative flex items-center justify-center"
                  style={{ width: 96, height: 96 }}
                >
                  <LoaderVisual
                    config={loader ?? DEFAULT_LOADER_CONFIG}
                    sizePx={96}
                  />
                  {(loader ?? DEFAULT_LOADER_CONFIG).show_logo &&
                    !["bars", "dots", "progress"].includes(
                      (loader ?? DEFAULT_LOADER_CONFIG).style,
                    ) && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-md"
                          style={{ width: 44, height: 44 }}
                        >
                          {(loader ?? DEFAULT_LOADER_CONFIG).logo_url ||
                          settings?.logo_url ? (
                            <img
                              src={
                                (loader ?? DEFAULT_LOADER_CONFIG).logo_url ||
                                settings?.logo_url ||
                                ""
                              }
                              alt=""
                              style={{
                                width: 36,
                                height: 36,
                                objectFit: "contain",
                              }}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span className="font-black text-brand-purple dark:text-brand-purple-lighter text-lg">
                              F
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </AdminField>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
