/**
 * AdminSeo — Search Engine Optimization & Global Meta Controls
 *
 * Full admin control room to configure global SEO titles, meta descriptions,
 * search engine verification tags (Google, GA4, Meta Pixel), Open Graph cards,
 * canonical URLs, and custom robots.txt directives with live SERP preview.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Globe,
  Share2,
  FileCode,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminInput,
  AdminTextarea,
} from "@/components/admin/AdminUi";
import {
  SITE_SETTINGS_COLUMNS_WITHOUT_BANNER,
  isMissingMaintenanceBannerColumn,
} from "@/lib/siteSettingsColumns";
import type { DbSiteSettings } from "@/types/database";

interface SeoFormState {
  id?: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  seo_canonical_base: string;
  og_image_url: string;
  twitter_handle: string;
  robots_txt_custom: string;
  google_site_verification: string;
  bing_site_verification: string;
  ga_measurement_id: string;
  meta_pixel_id: string;
}

const DEFAULT_FORM: SeoFormState = {
  seo_title: "Frelux — Global Construction Estimator & Contractor Intelligence",
  seo_description:
    "Accurate, code-referenced preliminary construction calculators, real-time material price tracking, and contractor intelligence across 30+ markets.",
  seo_keywords:
    "construction calculator, material takeoff, quantity surveying, concrete estimator, rebar calculator, building cost index",
  seo_canonical_base: "https://freluxtools.com",
  og_image_url: "https://freluxtools.com/og-frelux-preview.png",
  twitter_handle: "@frelux_official",
  robots_txt_custom:
    "User-agent: *\nAllow: /\n\nSitemap: https://freluxtools.com/sitemap.xml",
  google_site_verification: "",
  bing_site_verification: "",
  ga_measurement_id: "",
  meta_pixel_id: "",
};

export default function AdminSeo() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalSettings, setOriginalSettings] =
    useState<SeoFormState>(DEFAULT_FORM);
  const [form, setForm] = useState<SeoFormState>(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState<
    "meta" | "social" | "verification" | "robots"
  >("meta");

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (fetchErr) {
        // Fallback without newly added or banner columns if migration has not run yet
        const fallback = await supabase
          .from("site_settings")
          .select(SITE_SETTINGS_COLUMNS_WITHOUT_BANNER)
          .limit(1)
          .maybeSingle();

        if (fallback.data) {
          populateForm(fallback.data as unknown as Partial<DbSiteSettings>);
        } else {
          setError(fetchErr.message);
        }
      } else if (data) {
        populateForm(data as unknown as Partial<DbSiteSettings>);
      }
    } catch (err: unknown) {
      setError(
        (err instanceof Error ? err.message : String(err)) ||
          "Failed to load SEO settings",
      );
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (
    data: Partial<DbSiteSettings> & Record<string, unknown>,
  ) => {
    const loaded: SeoFormState = {
      id: data.id,
      seo_title: data.seo_title || DEFAULT_FORM.seo_title,
      seo_description: data.seo_description || DEFAULT_FORM.seo_description,
      seo_keywords: data.seo_keywords || DEFAULT_FORM.seo_keywords,
      seo_canonical_base:
        data.seo_canonical_base || DEFAULT_FORM.seo_canonical_base,
      og_image_url: data.og_image_url || DEFAULT_FORM.og_image_url,
      twitter_handle: data.twitter_handle || DEFAULT_FORM.twitter_handle,
      robots_txt_custom:
        data.robots_txt_custom || DEFAULT_FORM.robots_txt_custom,
      google_site_verification:
        typeof data.google_site_verification === "string"
          ? data.google_site_verification
          : "",
      bing_site_verification:
        typeof data.bing_site_verification === "string"
          ? data.bing_site_verification
          : "",
      ga_measurement_id:
        typeof data.ga_measurement_id === "string"
          ? data.ga_measurement_id
          : "",
      meta_pixel_id:
        typeof data.meta_pixel_id === "string" ? data.meta_pixel_id : "",
    };
    setOriginalSettings(loaded);
    setForm(loaded);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(originalSettings);
  }, [form, originalSettings]);

  const handleReset = () => {
    setForm(originalSettings);
    toast({ type: "info", title: "Changes reverted to last saved state" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        seo_title: form.seo_title.trim(),
        seo_description: form.seo_description.trim(),
        seo_keywords: form.seo_keywords.trim(),
        seo_canonical_base: form.seo_canonical_base.trim(),
        og_image_url: form.og_image_url.trim() || null,
        twitter_handle: form.twitter_handle.trim() || null,
        robots_txt_custom: form.robots_txt_custom.trim() || null,
        google_site_verification: form.google_site_verification.trim() || null,
        bing_site_verification: form.bing_site_verification.trim() || null,
        ga_measurement_id: form.ga_measurement_id.trim() || null,
        meta_pixel_id: form.meta_pixel_id.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (form.id) {
        // Attempt update with all columns; if custom columns don't exist yet, strip them
        const { error: updateErr } = await supabase
          .from("site_settings")
          .update(payload)
          .eq("id", form.id);

        if (updateErr) {
          // If custom column missing in old schema, save core columns
          const safePayload = {
            seo_title: payload.seo_title,
            seo_description: payload.seo_description,
            google_site_verification: payload.google_site_verification,
            ga_measurement_id: payload.ga_measurement_id,
            meta_pixel_id: payload.meta_pixel_id,
            updated_at: payload.updated_at,
          };
          const { error: retryErr } = await supabase
            .from("site_settings")
            .update(safePayload)
            .eq("id", form.id);
          if (retryErr) throw retryErr;
        }
      } else {
        // Create new settings row
        const { data: newRow, error: insertErr } = await supabase
          .from("site_settings")
          .insert(payload)
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        if (newRow?.id) {
          setForm((f) => ({ ...f, id: newRow.id }));
        }
      }

      setOriginalSettings(form);
      toast({
        type: "success",
        title: "SEO configuration saved successfully!",
      });
    } catch (err: unknown) {
      setError(
        (err instanceof Error ? err.message : String(err)) ||
          "Failed to update SEO configuration",
      );
      toast({
        type: "error",
        title:
          (err instanceof Error ? err.message : String(err)) || "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const titleLength = form.seo_title.length;
  const descLength = form.seo_description.length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <AdminPageHeader
            eyebrow="Search Engine Optimization"
            title="SEO & Indexing Control Room"
            description="Manage global meta titles, canonical URLs, verification tokens, Open Graph assets, and crawler instructions."
          />
        </div>
        <div className="flex items-center gap-2">
          <AdminButton
            type="button"
            variant="secondary"
            onClick={handleReset}
            disabled={!isDirty || saving}
            icon={RotateCcw}
          >
            Reset
          </AdminButton>
          <AdminButton
            type="button"
            variant="primary"
            onClick={handleSave}
            loading={saving}
            icon={Save}
          >
            Save Changes
          </AdminButton>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("meta")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "meta"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Global Meta & SERP</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("social")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "social"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Open Graph & Social Cards</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("verification")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "verification"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Search Engine Verification</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("robots")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "robots"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Robots & Sitemaps</span>
        </button>
      </div>

      {/* Tab 1: Global Meta & SERP */}
      {activeTab === "meta" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <AdminCard>
              <div className="font-semibold text-sm mb-3 text-slate-900 dark:text-slate-100">
                Search Engine Snippet Configuration
              </div>
              <div className="space-y-4">
                <AdminField
                  label="Global Title Tag"
                  required
                  helpText="Optimal length: 50-60 characters for desktop and mobile SERPs."
                >
                  <div className="relative">
                    <AdminInput
                      value={form.seo_title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, seo_title: e.target.value }))
                      }
                      placeholder="e.g. Frelux — Construction Estimator"
                    />
                    <span
                      className={`absolute right-3 top-2.5 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        titleLength >= 45 && titleLength <= 65
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60"
                          : titleLength > 65
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                      }`}
                    >
                      {titleLength} / 60
                    </span>
                  </div>
                </AdminField>

                <AdminField
                  label="Meta Description"
                  required
                  helpText="Optimal length: 140-160 characters summarizing the platform value proposition."
                >
                  <div className="relative">
                    <AdminTextarea
                      rows={3}
                      value={form.seo_description}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          seo_description: e.target.value,
                        }))
                      }
                      placeholder="Describe the application for search engine snippets..."
                    />
                    <span
                      className={`absolute right-3 bottom-3 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        descLength >= 130 && descLength <= 165
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60"
                          : descLength > 165
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                      }`}
                    >
                      {descLength} / 160
                    </span>
                  </div>
                </AdminField>

                <AdminField
                  label="Keywords Meta Tag"
                  helpText="Comma-separated secondary industry terminology (for internal search and regional aggregators)."
                >
                  <AdminInput
                    value={form.seo_keywords}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, seo_keywords: e.target.value }))
                    }
                    placeholder="concrete, masonry, rebar takeoff, pricing index"
                  />
                </AdminField>

                <AdminField
                  label="Canonical Base URL"
                  required
                  helpText="Root domain used to assemble rel='canonical' tags across multi-market landing pages."
                >
                  <AdminInput
                    type="url"
                    value={form.seo_canonical_base}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        seo_canonical_base: e.target.value,
                      }))
                    }
                    placeholder="https://freluxtools.com"
                  />
                </AdminField>
              </div>
            </AdminCard>
          </div>

          {/* Live Google Preview Card */}
          <div className="lg:col-span-5 space-y-4">
            <AdminCard>
              <div className="font-semibold text-sm mb-3 text-slate-900 dark:text-slate-100">
                Live Google Desktop Snippet Preview
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                    F
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                      Frelux Global
                    </span>
                    <span className="text-[10px] text-slate-400 truncate max-w-xs">
                      {form.seo_canonical_base || "https://freluxtools.com"}
                    </span>
                  </div>
                </div>

                <div className="text-base text-blue-700 dark:text-blue-400 hover:underline font-normal cursor-pointer leading-snug line-clamp-2">
                  {form.seo_title || "Frelux — Construction Estimator"}
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {form.seo_description ||
                    "Accurate preliminary calculations and live commodity tracking across markets."}
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>SERP Readability Guidelines</span>
                </div>
                <p>
                  Google typically cuts off desktop page titles at ~600px width
                  (approx. 60 characters) and snippet descriptions at 960px
                  (~160 characters).
                </p>
              </div>
            </AdminCard>
          </div>
        </div>
      )}

      {/* Tab 2: Social Cards & Open Graph */}
      {activeTab === "social" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <AdminCard>
              <div className="font-semibold text-sm mb-3 text-slate-900 dark:text-slate-100">
                Open Graph & Twitter Metadata
              </div>
              <div className="space-y-4">
                <AdminField
                  label="OG Image URL (1200x630 Recommended)"
                  helpText="Default visual asset rendered on WhatsApp, LinkedIn, iMessage, and Twitter previews."
                >
                  <AdminInput
                    type="url"
                    value={form.og_image_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, og_image_url: e.target.value }))
                    }
                    placeholder="https://freluxtools.com/og-preview.png"
                  />
                </AdminField>

                <AdminField
                  label="Official Twitter / X Handle"
                  helpText="Attributed via twitter:site and twitter:creator tags."
                >
                  <AdminInput
                    value={form.twitter_handle}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, twitter_handle: e.target.value }))
                    }
                    placeholder="@frelux_official"
                  />
                </AdminField>
              </div>
            </AdminCard>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <AdminCard>
              <div className="font-semibold text-sm mb-3 text-slate-900 dark:text-slate-100">
                Social Card Card Preview
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <div className="h-36 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  {form.og_image_url ? (
                    <img
                      src={form.og_image_url}
                      alt="Social Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="text-slate-400 text-xs flex items-center gap-1.5">
                      <Share2 className="w-4 h-4" />
                      <span>No OG image URL specified</span>
                    </div>
                  )}
                </div>
                <div className="p-3.5 space-y-1">
                  <div className="text-[10px] uppercase font-mono text-slate-400">
                    {
                      new URL(
                        form.seo_canonical_base || "https://freluxtools.com",
                      ).hostname
                    }
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {form.seo_title}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {form.seo_description}
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>
        </div>
      )}

      {/* Tab 3: Verification & Analytics */}
      {activeTab === "verification" && (
        <div className="space-y-4 max-w-3xl">
          <AdminCard>
            <div className="font-semibold text-sm mb-3 text-slate-900 dark:text-slate-100">
              Webmaster & Analytics Tracking Tokens
            </div>
            <div className="space-y-4">
              <AdminField
                label="Bing Webmaster Tools Verification Token (msvalidate.01)"
                helpText="Verification code for Bing and Yahoo Search webmaster tools."
              >
                <AdminInput
                  value={form.bing_site_verification}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bing_site_verification: e.target.value,
                    }))
                  }
                  placeholder="e.g. 1234567890ABCDEF1234567890ABCDEF"
                />
              </AdminField>
              <AdminField
                label="Google Search Console Verification Token"
                helpText="HTML tag verification code or token content for google-site-verification."
              >
                <AdminInput
                  value={form.google_site_verification}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      google_site_verification: e.target.value,
                    }))
                  }
                  placeholder="e.g. google1234567890abcdef.html or meta token"
                />
              </AdminField>

              <AdminField
                label="Google Analytics 4 (GA4) Measurement ID"
                helpText="Stream ID starting with G- used for global user traffic telemetry."
              >
                <AdminInput
                  value={form.ga_measurement_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      ga_measurement_id: e.target.value,
                    }))
                  }
                  placeholder="e.g. G-ABC123XYZ"
                />
              </AdminField>

              <AdminField
                label="Meta Pixel ID"
                helpText="Pixel ID used for tracking construction contractor onboarding conversions."
              >
                <AdminInput
                  value={form.meta_pixel_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, meta_pixel_id: e.target.value }))
                  }
                  placeholder="e.g. 123456789012345"
                />
              </AdminField>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Tab 4: Robots & Crawlers Directives */}
      {activeTab === "robots" && (
        <div className="space-y-4 max-w-3xl">
          <AdminCard>
            <div className="font-semibold text-sm mb-3 text-slate-900 dark:text-slate-100">
              Robots.txt & Sitemap Directives
            </div>
            <div className="space-y-4">
              <AdminField
                label="Custom Robots.txt Directives"
                helpText="Directives served at /robots.txt instructing Googlebot, Bingbot, and AI crawlers."
              >
                <AdminTextarea
                  rows={8}
                  className="font-mono text-xs leading-relaxed"
                  value={form.robots_txt_custom}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      robots_txt_custom: e.target.value,
                    }))
                  }
                  placeholder="User-agent: *\nAllow: /\n\nSitemap: https://freluxtools.com/sitemap.xml"
                />
              </AdminField>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold">
                      View Live Sitemap (/sitemap.xml)
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>

                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold">
                      View Live Robots (/robots.txt)
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  );
}
