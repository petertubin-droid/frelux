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

export default function AdminPdfBranding() {
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
  const [brandName, setBrandName] = useState("FRELUX PAINT CALC");
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
      setBrandName(c.pdf_default_brand_name || "FRELUX PAINT CALC");
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
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    const { error } = await deletePdfTemplate(id);
    if (error) setTplError(error);
    await loadData();
  }

  if (loading)
    return (
      <StateMessage
        type="loading"
        title="Loading…"
        message="Fetching PDF branding configuration."
      />
    );

  return (
    <>
      <AdminHeader
        title="PDF Branding & Templates"
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
            Brand Studio Feature
          </h2>
        </div>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={brandStudioEnabled}
              onChange={(e) => setBrandStudioEnabled(e.target.checked)}
            />
            Enable FRELUX Brand Studio for users
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
            FRELUX Default PDF Branding
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
            Watermark Configuration
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={watermarkEnabled}
                onChange={(e) => setWatermarkEnabled(e.target.checked)}
              />
              Enable watermark
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={watermarkDiagonal}
                onChange={(e) => setWatermarkDiagonal(e.target.checked)}
              />
              Diagonal watermark
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
                  <option value="center">Center</option>
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
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
              PDF Templates
            </h2>
          </div>
          <Button variant="ghost"
            onClick={() => setShowNewTpl(!showNewTpl)}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-brand-purple hover:bg-primary/20"
          >
            <Plus className="h-3 w-3" /> New Template
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
                  placeholder="Template description"
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
                Create Template
              </AdminButton>
              <Button variant="ghost"
                onClick={() => setShowNewTpl(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs dark:border-white/10"
              >
                Cancel
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
                        System
                      </span>
                    )}
                    {tpl.is_default && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Default
                      </span>
                    )}
                    {tpl.is_premium && <PremiumBadge size="xs" glow />}
                    {tpl.rewarded_unlock_enabled && (
                      <span className="rounded bg-accent-green/10 px-1.5 py-0.5 text-xs text-accent-green">
                        Ad unlock
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
                    <Button variant="ghost"
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
    </>
  );
}
