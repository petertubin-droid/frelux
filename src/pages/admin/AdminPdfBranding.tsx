import {
  fetchStudioPlanLimits,
  updateStudioPlanLimit,
  fetchStudioAuditLogs,
  type StudioPlanLimit,
  type StudioAuditEntry,
} from "@/lib/document-studio";
/**
 * Admin: PDF Branding & Templates
 *
 * Manages:
 * - FRELUX default PDF branding (logo, name, tagline, contact, colours, watermark)
 * - PDF template configuration (create, edit, activate, set default, mark premium)
 */
import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  Settings2,
} from "lucide-react";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  AdminHeader,
  AdminCard,
  AdminField,
  StateMessage,
  AdminButton,
  AdminInput,
} from "@/components/admin/AdminUi";
import { MediaUploader } from "@/components/admin/MediaUploader";
import {
  fetchPdfTemplates,
  createPdfTemplate,
  updatePdfTemplate,
  deletePdfTemplate,
  fetchPdfBrandingConfig,
  invalidateBrandingConfigCache,
} from "@/lib/brand-studio";
import type {
  DbPdfBrandingTemplate,
  PdfDefaultBrandingConfig,
  PdfTemplateConfig,
  PdfWatermarkConfig,
} from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

export default function AdminPdfBranding() {
  const { t: tr } = useLanguage();

  // Plan limits state
  const [planLimits, setPlanLimits] = useState<StudioPlanLimit[]>([
    {
      plan: "free",
      monthly_exports: 3,
      visual_builder: false,
      custom_branding: false,
      watermark_removal: false,
    },
    {
      plan: "basic",
      monthly_exports: 3,
      visual_builder: false,
      custom_branding: false,
      watermark_removal: false,
    },
    {
      plan: "pro",
      monthly_exports: 25,
      visual_builder: true,
      custom_branding: true,
      watermark_removal: true,
    },
    {
      plan: "premium",
      monthly_exports: 100,
      visual_builder: true,
      custom_branding: true,
      watermark_removal: true,
    },
    {
      plan: "enterprise",
      monthly_exports: 500,
      visual_builder: true,
      custom_branding: true,
      watermark_removal: true,
    },
  ]);
  const [auditLogs, setAuditLogs] = useState<StudioAuditEntry[]>([]);
  const [loadingLimits, setLoadingLimits] = useState(false);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const [limitErr, setLimitErr] = useState<string | null>(null);

  const loadLimits = useCallback(async () => {
    setLoadingLimits(true);
    try {
      const limits = await fetchStudioPlanLimits();
      if (limits.length > 0) setPlanLimits(limits);
      const logs = await fetchStudioAuditLogs();
      setAuditLogs(logs);
    } catch {
      // Fallback to local defaults if database table not yet populated
    } finally {
      setLoadingLimits(false);
    }
  }, []);

  const handleLimitChange = (
    plan: string,
    field: keyof StudioPlanLimit,
    value: unknown,
  ) => {
    setPlanLimits((prev) =>
      prev.map((item) =>
        item.plan === plan ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSaveLimit = async (plan: string) => {
    const item = planLimits.find((l) => l.plan === plan);
    if (!item) return;
    setSavingPlan(plan);
    setLimitMsg(null);
    setLimitErr(null);
    try {
      await updateStudioPlanLimit(plan, {
        monthly_exports: item.monthly_exports,
        visual_builder: item.visual_builder,
        custom_branding: item.custom_branding,
        watermark_removal: item.watermark_removal,
      });
      setLimitMsg(`Updated quota limits for ${plan.toUpperCase()} plan.`);
      setTimeout(() => setLimitMsg(null), 3000);
      loadLimits();
    } catch (err: unknown) {
      setLimitErr(
        err instanceof Error ? err.message : "Failed to update plan limits.",
      );
    } finally {
      setSavingPlan(null);
    }
  };

  const [_config, setConfig] = useState<PdfDefaultBrandingConfig | null>(null);
  const [templates, setTemplates] = useState<DbPdfBrandingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [tplError, setTplError] = useState<string | null>(null);
  const [showNewTpl, setShowNewTpl] = useState(false);

  // Config form state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("FRELUX");
  const [tagline, setTagline] = useState("Smart Construction Estimation");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [secondaryColor, setSecondaryColor] = useState("#0B1120");
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.08);
  const [watermarkScale, setWatermarkScale] = useState(0.6);
  const [watermarkPosition, setWatermarkPosition] = useState("center");
  const [watermarkDiagonal, setWatermarkDiagonal] = useState(false);
  const [brandStudioEnabled, setBrandStudioEnabled] = useState(false);
  const [aiLogoDailyLimit, setAiLogoDailyLimit] = useState(3);

  // New template form
  const [newTplName, setNewTplName] = useState("");
  const [newTplDesc, setNewTplDesc] = useState("");
  const [newTplPremium, setNewTplPremium] = useState(false);
  const [newTplRewarded, setNewTplRewarded] = useState(false);

  const loadData = useCallback(async () => {
    const c = await fetchPdfBrandingConfig();
    if (c) {
      setConfig(c);
      setLogoUrl(c.pdf_default_logo_url);
      setBrandName(c.pdf_default_brand_name || "FRELUX");
      setTagline(c.pdf_default_tagline || "Smart Construction Estimation");
      setContactEmail(c.pdf_default_contact_email || "");
      setContactPhone(c.pdf_default_contact_phone || "");
      setAddress(c.pdf_default_address || "");
      setPrimaryColor(c.pdf_default_primary_color || "#7C3AED");
      setSecondaryColor(c.pdf_default_secondary_color || "#0B1120");
      setWatermarkEnabled(c.pdf_watermark_enabled ?? true);
      setWatermarkOpacity(c.pdf_watermark_opacity ?? 0.08);
      setWatermarkScale(c.pdf_watermark_scale ?? 0.6);
      setWatermarkPosition(c.pdf_watermark_position || "center");
      setWatermarkDiagonal(c.pdf_watermark_diagonal ?? false);
      setBrandStudioEnabled(c.brand_studio_enabled ?? false);
      setAiLogoDailyLimit(c.ai_logo_daily_limit ?? 3);
    }
    const t = await fetchPdfTemplates(true);
    setTemplates(t);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    loadLimits();
  }, [loadData]);

  async function handleSaveConfig() {
    if (!isSupabaseConfigured) return;
    setSavingConfig(true);
    setConfigError(null);
    setConfigMsg(null);

    const { error } = await supabase
      .from("site_settings")
      .update({
        pdf_default_logo_url: logoUrl,
        pdf_default_brand_name: brandName,
        pdf_default_tagline: tagline,
        pdf_default_contact_email: contactEmail || null,
        pdf_default_contact_phone: contactPhone || null,
        pdf_default_address: address || null,
        pdf_default_primary_color: primaryColor,
        pdf_default_secondary_color: secondaryColor,
        pdf_watermark_enabled: watermarkEnabled,
        pdf_watermark_opacity: watermarkOpacity,
        pdf_watermark_scale: watermarkScale,
        pdf_watermark_position: watermarkPosition,
        pdf_watermark_diagonal: watermarkDiagonal,
        brand_studio_enabled: brandStudioEnabled,
        ai_logo_daily_limit: aiLogoDailyLimit,
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    setSavingConfig(false);
    if (error) {
      setConfigError(error.message);
    } else {
      setConfigMsg("PDF branding configuration saved!");
      invalidateBrandingConfigCache();
      setTimeout(() => setConfigMsg(null), 4000);
    }
  }

  async function handleCreateTemplate() {
    if (!newTplName.trim()) return;
    setTplError(null);
    const defaultConfig: PdfTemplateConfig = {
      headerLayout: "logo-right",
      footerLayout: "default",
      contactPlacement: "header",
      accentBar: true,
      accentBarColor: primaryColor,
    };
    const defaultWm: PdfWatermarkConfig = {
      enabled: true,
      opacity: 0.08,
      scale: 0.6,
      position: "center",
      diagonal: false,
    };
    const { error } = await createPdfTemplate({
      name: newTplName.trim(),
      description: newTplDesc.trim() || undefined,
      template_config: defaultConfig,
      watermark_config: defaultWm,
      is_premium: newTplPremium,
      rewarded_unlock_enabled: newTplRewarded,
    });
    if (error) {
      setTplError(error);
    } else {
      setShowNewTpl(false);
      setNewTplName("");
      setNewTplDesc("");
      setNewTplPremium(false);
      setNewTplRewarded(false);
      await loadData();
      loadLimits();
    }
  }

  async function handleToggleTemplate(
    id: string,
    field:
      "is_active" | "is_default" | "is_premium" | "rewarded_unlock_enabled",
    value: boolean,
  ) {
    await updatePdfTemplate(id, { [field]: value });
    await loadData();
    loadLimits();
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    const { error } = await deletePdfTemplate(id);
    if (error) setTplError(error);
    await loadData();
    loadLimits();
  }

  if (loading)
    return (
      <StateMessage
        type="loading"
        title={tr("Loading…")}
        message="Fetching PDF branding configuration."
      />
    );

  return (
    <>
      <AdminHeader
        title={tr("PDF Branding & Templates")}
        subtitle="Configure the default FRELUX PDF branding, watermark settings, and manage PDF templates available to users."
      />

      {configError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {configError}
        </div>
      )}
      {configMsg && (
        <div className="mb-4 rounded-lg border border-accent-green/30 bg-accent-green/10 p-3 text-sm text-accent-green">
          {configMsg}
        </div>
      )}
      {tplError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {tplError}
        </div>
      )}

      {/* Feature toggle */}
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">
            {tr("Brand Studio Feature")}
          </h2>
        </div>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={brandStudioEnabled}
              onChange={(e) => setBrandStudioEnabled(e.target.checked)}
            />
            {tr("Enable FRELUX Brand Studio for users")}
          </label>
          <AdminField label="AI Logo Daily Limit">
            <AdminInput
              type="number"
              min={1}
              max={20}
              value={aiLogoDailyLimit}
              onChange={(e) => setAiLogoDailyLimit(Number(e.target.value))}
            />
          </AdminField>
        </div>
      </AdminCard>

      {/* Default PDF Branding */}
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-purple" />
          <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">
            {tr("FRELUX Default PDF Branding")}
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          This is the default branding used for all PDFs when a user doesn't
          have custom branding.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Brand Name">
            <AdminInput
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
          </AdminField>
          <AdminField label="Tagline">
            <AdminInput
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </AdminField>
          <AdminField label="Contact Email">
            <AdminInput
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </AdminField>
          <AdminField label="Contact Phone">
            <AdminInput
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </AdminField>
        </div>
        <AdminField label="Address">
          <AdminInput
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </AdminField>

        <div className="mt-4">
          <MediaUploader
            label="Default PDF Logo"
            value={logoUrl}
            onChange={setLogoUrl}
            folder="branding"
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminField label="Primary Color">
            <div className="flex items-center gap-2">
              <AdminInput
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded border"
              />
              <AdminInput
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </div>
          </AdminField>
          <AdminField label="Secondary Color">
            <div className="flex items-center gap-2">
              <AdminInput
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded border"
              />
              <AdminInput
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
              />
            </div>
          </AdminField>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-card-foreground dark:text-muted-foreground/80">
            {tr("Watermark Configuration")}
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={watermarkEnabled}
                onChange={(e) => setWatermarkEnabled(e.target.checked)}
              />
              {tr("Enable watermark")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={watermarkDiagonal}
                onChange={(e) => setWatermarkDiagonal(e.target.checked)}
              />
              {tr("Diagonal watermark")}
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <AdminField label="Opacity (0.01–0.3)">
                <AdminInput
                  type="number"
                  step={0.01}
                  min={0.01}
                  max={0.3}
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                />
              </AdminField>
              <AdminField label="Scale (0.1–1.0)">
                <AdminInput
                  type="number"
                  step={0.1}
                  min={0.1}
                  max={1.0}
                  value={watermarkScale}
                  onChange={(e) => setWatermarkScale(Number(e.target.value))}
                />
              </AdminField>
              <AdminField label="Position">
                <select
                  value={watermarkPosition}
                  onChange={(e) => setWatermarkPosition(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground"
                >
                  <option value="center">{tr("Center")}</option>
                  <option value="top-left">{tr("Top Left")}</option>
                  <option value="top-right">{tr("Top Right")}</option>
                  <option value="bottom-left">{tr("Bottom Left")}</option>
                  <option value="bottom-right">{tr("Bottom Right")}</option>
                </select>
              </AdminField>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <AdminButton onClick={handleSaveConfig} disabled={savingConfig}>
            {savingConfig ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {savingConfig ? "Saving…" : "Save Configuration"}
          </AdminButton>
        </div>
      </AdminCard>

      {/* Templates */}
      <AdminCard className="mb-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PremiumBadge size="sm" />
            <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">
              {tr("PDF Templates")}
            </h2>
          </div>
          <Button
            variant="ghost"
            onClick={() => setShowNewTpl(!showNewTpl)}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-brand-purple hover:bg-primary/20"
          >
            <Plus className="h-3 w-3" /> {tr("New Template")}
          </Button>
        </div>

        {showNewTpl && (
          <div className="mt-4 rounded-lg border border-border p-4 dark:border-white/10">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Template Name">
                <AdminInput
                  type="text"
                  value={newTplName}
                  onChange={(e) => setNewTplName(e.target.value)}
                  placeholder="e.g. Luxury Gold"
                />
              </AdminField>
              <AdminField label="Description">
                <AdminInput
                  type="text"
                  value={newTplDesc}
                  onChange={(e) => setNewTplDesc(e.target.value)}
                  placeholder={tr("Template description")}
                />
              </AdminField>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newTplPremium}
                  onChange={(e) => setNewTplPremium(e.target.checked)}
                />{" "}
                Premium
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newTplRewarded}
                  onChange={(e) => setNewTplRewarded(e.target.checked)}
                />{" "}
                Rewarded-ad unlock
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <AdminButton onClick={handleCreateTemplate}>
                {tr("Create Template")}
              </AdminButton>
              <Button
                variant="ghost"
                onClick={() => setShowNewTpl(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs dark:border-white/10"
              >
                {tr("Cancel")}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-lg border border-border p-3 dark:border-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground dark:text-primary-foreground">
                      {tpl.name}
                    </span>
                    {tpl.is_system && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground dark:bg-white/10">
                        {tr("System")}
                      </span>
                    )}
                    {tpl.is_default && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {tr("Default")}
                      </span>
                    )}
                    {tpl.is_premium && <PremiumBadge size="xs" glow />}
                    {tpl.rewarded_unlock_enabled && (
                      <span className="rounded bg-accent-green/10 px-1.5 py-0.5 text-xs text-accent-green">
                        {tr("Ad unlock")}
                      </span>
                    )}
                  </div>
                  {tpl.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tpl.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={tpl.is_active}
                      onChange={(e) =>
                        handleToggleTemplate(
                          tpl.id,
                          "is_active",
                          e.target.checked,
                        )
                      }
                    />{" "}
                    Active
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={tpl.is_default}
                      onChange={(e) =>
                        handleToggleTemplate(
                          tpl.id,
                          "is_default",
                          e.target.checked,
                        )
                      }
                    />{" "}
                    Default
                  </label>
                  {!tpl.is_system && (
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard className="mb-4 p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {tr("Document Studio Plan Quotas & Entitlements")}
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure server-enforced monthly export quotas and feature
              permissions for each subscription tier. Changes are immediately
              enforced by database rules.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLimits}
            disabled={loadingLimits}
            className="text-xs"
          >
            {loadingLimits ? "Refreshing..." : "Refresh Quotas"}
          </Button>
        </div>

        {limitMsg && (
          <div className="mb-3 rounded-lg border border-accent-green/30 bg-accent-green/10 p-2.5 text-xs text-accent-green">
            {limitMsg}
          </div>
        )}
        {limitErr && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            {limitErr}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2 font-semibold uppercase">{tr("Plan")}</th>
                <th className="pb-2 font-semibold uppercase">
                  {tr("Monthly Export Limit")}
                </th>
                <th className="pb-2 font-semibold uppercase">
                  {tr("Custom Branding")}
                </th>
                <th className="pb-2 font-semibold uppercase">
                  {tr("Watermark Removable")}
                </th>
                <th className="pb-2 font-semibold uppercase">
                  {tr("Visual Builder")}
                </th>
                <th className="pb-2 font-semibold uppercase text-right">
                  {tr("Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {planLimits.map((l) => (
                <tr key={l.plan}>
                  <td className="py-2.5 font-medium capitalize">{l.plan}</td>
                  <td className="py-2.5">
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={l.monthly_exports}
                      onChange={(e) =>
                        handleLimitChange(
                          l.plan,
                          "monthly_exports",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="w-20 rounded border border-border px-2 py-1 text-xs dark:bg-background"
                    />
                  </td>
                  <td className="py-2.5">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={l.custom_branding}
                        onChange={(e) =>
                          handleLimitChange(
                            l.plan,
                            "custom_branding",
                            e.target.checked,
                          )
                        }
                      />
                      <span
                        className={
                          l.custom_branding
                            ? "text-emerald-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {l.custom_branding ? "Allowed" : "Disabled"}
                      </span>
                    </label>
                  </td>
                  <td className="py-2.5">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={l.watermark_removal}
                        onChange={(e) =>
                          handleLimitChange(
                            l.plan,
                            "watermark_removal",
                            e.target.checked,
                          )
                        }
                      />
                      <span
                        className={
                          l.watermark_removal
                            ? "text-emerald-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {l.watermark_removal ? "Allowed" : "Disabled"}
                      </span>
                    </label>
                  </td>
                  <td className="py-2.5">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={l.visual_builder}
                        onChange={(e) =>
                          handleLimitChange(
                            l.plan,
                            "visual_builder",
                            e.target.checked,
                          )
                        }
                      />
                      <span
                        className={
                          l.visual_builder
                            ? "text-emerald-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {l.visual_builder ? "Allowed" : "Disabled"}
                      </span>
                    </label>
                  </td>
                  <td className="py-2.5 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={savingPlan === l.plan}
                      onClick={() => handleSaveLimit(l.plan)}
                      className="h-7 text-xs text-brand-purple hover:bg-brand-purple/10"
                    >
                      {savingPlan === l.plan ? "Saving..." : "Save"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {auditLogs.length > 0 && (
          <div className="mt-6 border-t border-border pt-4">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              {tr("Recent Quota Audits")}
            </h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {auditLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="text-[11px] text-muted-foreground flex justify-between border-b border-border/40 pb-1"
                >
                  <span>
                    {tr("Plan")} <strong>{log.plan}</strong> updated (
                    {JSON.stringify(log.new_values)})
                  </span>
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </AdminCard>
    </>
  );
}
