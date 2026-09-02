import { useEffect, useState, useCallback } from "react";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Bot,
  MessageSquare,
  Camera,
  GraduationCap,
  Palette,
  Building2,
  Code2,
  Loader2,
  ExternalLink,
  Power,
  Settings2,
  Zap,
  Clock,
  DollarSign,
  ShieldCheck,
  Eye,
  Crown,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { DbSiteSettings, AiAccessMode } from "@/types/database";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminField,
  StateMessage,
  Toggle,
  AdminInput,
  AdminSelect,
} from "@/components/admin/AdminUi";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

// Derive Supabase project ref from the env URL for dashboard links
const SUPABASE_PROJECT_REF =
  (import.meta.env.VITE_SUPABASE_URL ?? "").match(
    /https:\/\/(\w+)\.supabase\.co/,
  )?.[1] ?? "";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";

// =========================================================
// AI Feature Registry — every AI feature in the app
// =========================================================
interface AiFeatureDef {
  key: string;
  name: string;
  description: string;
  edgeFunction: string;
  icon: typeof Bot;
  model: string;
  provider: "Google Gemini" | "OpenAI" | "Google Gemini Vision";
  category: "user-facing" | "admin" | "estimation";
}

const AI_FEATURES: AiFeatureDef[] = [
  {
    key: "color-consult",
    name: "AI Color Consultant",
    description:
      "Personalized paint color recommendations based on room type, lighting, and preferences.",
    edgeFunction: "ai-color-consult",
    icon: Palette,
    model: "gemini-3.6-flash",
    provider: "Google Gemini",
    category: "user-facing",
  },
  {
    key: "color-preview",
    name: "AI Color Preview",
    description:
      "AI-powered visual previews of paint colors applied to room images.",
    edgeFunction: "ai-color-preview",
    icon: Eye,
    model: "gemini-2.0-flash",
    provider: "Google Gemini",
    category: "user-facing",
  },
  {
    key: "livechat",
    name: "AI Live Chat",
    description:
      "Real-time chat assistant for visitors — painting, screeding, tiles, products.",
    edgeFunction: "ai-livechat",
    icon: MessageSquare,
    model: "gpt-4o-mini",
    provider: "OpenAI",
    category: "user-facing",
  },
  {
    key: "building-estimation",
    name: "AI Image Estimation",
    description:
      "Analyzes building photos with Gemini Vision to estimate material quantities.",
    edgeFunction: "ai-building-estimation",
    icon: Camera,
    model: "gemini-3.6-flash",
    provider: "Google Gemini Vision",
    category: "estimation",
  },
  {
    key: "project-assistant",
    name: "AI Project Assistant",
    description:
      "AI-generated project timelines, material lists, and cost guidance.",
    edgeFunction: "ai-project-assistant",
    icon: Building2,
    model: "gemini-2.0-flash",
    provider: "Google Gemini",
    category: "user-facing",
  },
  {
    key: "learn-assistant",
    name: "AI Learning Assistant",
    description:
      "Generates and improves educational articles, FAQs, tutorials, and SEO content.",
    edgeFunction: "ai-learn-assistant",
    icon: GraduationCap,
    model: "gemini-2.0-flash",
    provider: "Google Gemini",
    category: "admin",
  },
  {
    key: "ai-studio",
    name: "AI Developer Studio",
    description:
      "Admin-only AI for code generation, page building, CRUD, and DB design.",
    edgeFunction: "ai-studio",
    icon: Code2,
    model: "gemini-2.0-flash",
    provider: "Google Gemini",
    category: "admin",
  },
];

const ACCESS_MODES: { value: AiAccessMode; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "rewarded", label: "Rewarded Access" },
  { value: "free_rewarded", label: "Free + Rewarded" },
  { value: "paid", label: "Paid" },
  { value: "disabled", label: "Disabled" },
];

const RESET_PERIODS = [
  { value: "daily", label: "Daily (24h)" },
  { value: "weekly", label: "Weekly (7d)" },
  { value: "monthly", label: "Monthly (30d)" },
];

export default function AdminAiSettings() {
  const [settings, setSettings] = useState<DbSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(
    "color-consult",
  );
  const [healthChecking, setHealthChecking] = useState<string | null>(null);
  const [healthResults, setHealthResults] = useState<
    Record<string, "ok" | "error" | "checking">
  >({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) setError(error.message);
    setSettings(data as DbSiteSettings | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function update<K extends keyof DbSiteSettings>(
    key: K,
    value: DbSiteSettings[K],
  ) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  async function onSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("site_settings")
      .update({
        ai_enabled: settings.ai_enabled,
        ai_access_mode: settings.ai_access_mode,
        ai_daily_free_uses: settings.ai_daily_free_uses,
        ai_rewarded_enabled: settings.ai_rewarded_enabled,
        ai_paid_enabled: settings.ai_paid_enabled,
        ai_paid_price: settings.ai_paid_price,
        ai_paid_currency: settings.ai_paid_currency,
        ai_reset_period: settings.ai_reset_period,
        ai_admin_override: settings.ai_admin_override,
        estimation_enabled: settings.estimation_enabled,
        estimation_access_mode: settings.estimation_access_mode,
        estimation_daily_free_uses: settings.estimation_daily_free_uses,
        estimation_rewarded_enabled: settings.estimation_rewarded_enabled,
        estimation_paid_enabled: settings.estimation_paid_enabled,
        estimation_paid_price: settings.estimation_paid_price,
        estimation_paid_currency: settings.estimation_paid_currency,
        estimation_reset_period: settings.estimation_reset_period,
        estimation_admin_override: settings.estimation_admin_override,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSavedAt(Date.now());
    window.setTimeout(() => setSavedAt(null), 3000);
  }

  async function checkHealth(fnKey: string, edgeFunction: string) {
    setHealthChecking(fnKey);
    setHealthResults((prev) => ({ ...prev, [fnKey]: "checking" }));
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${edgeFunction}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      setHealthResults((prev) => ({
        ...prev,
        [fnKey]: res.status === 404 ? "error" : "ok",
      }));
    } catch {
      setHealthResults((prev) => ({ ...prev, [fnKey]: "error" }));
    }
    setHealthChecking(null);
  }

  if (loading)
    return (
      <>
        <AdminHeader
          title="AI Control Center"
          subtitle="Centralized control for all AI features on the website."
        />
        <StateMessage
          type="loading"
          title="Loading…"
          message="Fetching AI configuration."
        />
      </>
    );
  if (error || !settings)
    return (
      <>
        <AdminHeader
          title="AI Control Center"
          subtitle="Centralized control for all AI features on the website."
        />
        <StateMessage
          type="error"
          title="Couldn't load settings"
          message={error ?? "No settings row found."}
        />
      </>
    );

  const aiDisabled = !settings.ai_enabled;

  return (
    <>
      <AdminHeader
        title="AI Control Center"
        subtitle="Centralized control for all AI features — toggle, configure, and monitor from one place."
        action={
          <AdminButton onClick={onSave} disabled={saving}>
            <Save aria-hidden="true" className="h-4 w-4" />
            {saving ? "Saving…" : "Save changes"}
          </AdminButton>
        }
      />

      {savedAt && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> Settings saved
          successfully.
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle aria-hidden="true" className="h-4 w-4" /> {error}
        </div>
      )}

      {/* ── Global AI Master Switch ── */}
      <AdminCard>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
              <Power aria-hidden="true" className="h-5 w-5 text-brand-purple" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground dark:text-primary-foreground">
                Global AI Master Switch
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground dark:text-muted-foreground">
                When off, all AI features across the entire site are disabled.
                Individual feature controls below are ignored.
              </p>
            </div>
          </div>
          <Toggle
            checked={settings.ai_enabled}
            onChange={(v) => update("ai_enabled", v)}
            label={settings.ai_enabled ? "ON" : "OFF"}
          />
        </div>
      </AdminCard>

      {/* ── Access Control & Monetization ── */}
      <AdminCard
        className={classNames(
          "mt-6 transition-opacity",
          aiDisabled && "opacity-40 pointer-events-none",
        )}
      >
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="h-4 w-4" /> Access Control
          &amp; Monetization
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Access Mode" hint="How users access AI features">
            <AdminSelect
              value={settings.ai_access_mode}
              onChange={(e) =>
                update("ai_access_mode", e.target.value as AiAccessMode)
              }
            >
              {ACCESS_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField label="Reset Period" hint="How often free usage resets">
            <AdminSelect
              value={settings.ai_reset_period}
              onChange={(e) => update("ai_reset_period", e.target.value)}
            >
              {RESET_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <AdminField
            label="Daily Free Uses"
            hint="Free AI requests per period"
          >
            <AdminInput
              type="number"
              min={0}
              max={100}
              value={settings.ai_daily_free_uses}
              onChange={(e) =>
                update("ai_daily_free_uses", parseInt(e.target.value) || 0)
              }
            />
          </AdminField>
          <AdminField label="Paid Price" hint="Price per AI request">
            <AdminInput
              type="number"
              min={0}
              step={0.01}
              value={settings.ai_paid_price}
              onChange={(e) =>
                update("ai_paid_price", parseFloat(e.target.value) || 0)
              }
            />
          </AdminField>
          <AdminField label="Currency" hint="Currency for paid pricing">
            <AdminInput
              value={settings.ai_paid_currency}
              onChange={(e) => update("ai_paid_currency", e.target.value)}
            />
          </AdminField>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          <Toggle
            checked={settings.ai_rewarded_enabled}
            onChange={(v) => update("ai_rewarded_enabled", v)}
            label="Rewarded Access (ads)"
          />
          <Toggle
            checked={settings.ai_paid_enabled}
            onChange={(v) => update("ai_paid_enabled", v)}
            label="Paid Access"
          />
          <Toggle
            checked={settings.ai_admin_override}
            onChange={(v) => update("ai_admin_override", v)}
            label="Admin Override (unlimited)"
          />
        </div>
      </AdminCard>

      {/* ── AI Feature Registry ── */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
          <Crown aria-hidden="true" className="h-4 w-4" /> AI Features (
          {AI_FEATURES.length})
        </h2>
        <div className="space-y-3">
          {AI_FEATURES.map((feature) => {
            const isExpanded = expandedFeature === feature.key;
            const health = healthResults[feature.key];
            const isChecking = healthChecking === feature.key;
            return (
              <AdminCard
                key={feature.key}
                compact
                className={classNames(
                  "transition-opacity",
                  aiDisabled && "opacity-40",
                )}
              >
                <Button variant="ghost"
                  type="button"
                  onClick={() =>
                    setExpandedFeature(isExpanded ? null : feature.key)
                  }
                  className="flex w-full items-center gap-3 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
                    <feature.icon
                      aria-hidden="true"
                      className="h-5 w-5 text-brand-purple"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-foreground dark:text-primary-foreground">
                        {feature.name}
                      </h3>
                      <span
                        className={classNames(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          feature.category === "user-facing"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                            : feature.category === "estimation"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
                        )}
                      >
                        {feature.category}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground dark:text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isChecking ? (
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin text-muted-foreground"
                      />
                    ) : health === "ok" ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                        <span className="h-2 w-2 rounded-full bg-green-500" />{" "}
                        Live
                      </span>
                    ) : health === "error" ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
                        <span className="h-2 w-2 rounded-full bg-red-500" />{" "}
                        Error
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-muted dark:bg-muted-foreground" />{" "}
                        Unknown
                      </span>
                    )}
                    <ChevronDown
                      aria-hidden="true"
                      className={classNames(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </div>
                </Button>

                {isExpanded && (
                  <div className="mt-4 border-t border-border pt-4 dark:border-white/5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <InfoTile
                        label="Edge Function"
                        value={feature.edgeFunction}
                        icon={Zap}
                      />
                      <InfoTile
                        label="AI Model"
                        value={feature.model}
                        icon={Bot}
                      />
                      <InfoTile
                        label="Provider"
                        value={feature.provider}
                        icon={Crown}
                      />
                      <InfoTile
                        label="Category"
                        value={feature.category}
                        icon={Settings2}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <AdminButton
                        variant="secondary"
                        onClick={() =>
                          checkHealth(feature.key, feature.edgeFunction)
                        }
                        disabled={isChecking}
                      >
                        {isChecking ? (
                          <Loader2
                            aria-hidden="true"
                            className="h-3.5 w-3.5 animate-spin"
                          />
                        ) : (
                          <Zap aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                        Health Check
                      </AdminButton>
                      <a
                        href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/functions/${feature.edgeFunction}/details`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-brand-purple hover:underline"
                      >
                        <ExternalLink
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />{" "}
                        View in Supabase
                      </a>
                    </div>

                    {feature.key === "building-estimation" && (
                      <div className="mt-4 rounded-lg border border-brand-purple/20 bg-primary/5 p-4 dark:border-brand-purple/30 dark:bg-primary/10">
                        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-purple dark:text-brand-purple-lighter">
                          Image Estimation Settings
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Toggle
                            checked={settings.estimation_enabled}
                            onChange={(v) => update("estimation_enabled", v)}
                            label="Enabled"
                          />
                          <AdminField label="Access Mode">
                            <AdminSelect
                              value={settings.estimation_access_mode}
                              onChange={(e) =>
                                update("estimation_access_mode", e.target.value)
                              }
                            >
                              {ACCESS_MODES.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </AdminSelect>
                          </AdminField>
                          <AdminField label="Daily Free Uses">
                            <AdminInput
                              type="number"
                              min={0}
                              max={100}
                              value={settings.estimation_daily_free_uses}
                              onChange={(e) =>
                                update(
                                  "estimation_daily_free_uses",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                          </AdminField>
                          <AdminField label="Paid Price">
                            <AdminInput
                              type="number"
                              min={0}
                              step={0.01}
                              value={settings.estimation_paid_price}
                              onChange={(e) =>
                                update(
                                  "estimation_paid_price",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </AdminField>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4">
                          <Toggle
                            checked={settings.estimation_rewarded_enabled}
                            onChange={(v) =>
                              update("estimation_rewarded_enabled", v)
                            }
                            label="Rewarded"
                          />
                          <Toggle
                            checked={settings.estimation_paid_enabled}
                            onChange={(v) =>
                              update("estimation_paid_enabled", v)
                            }
                            label="Paid"
                          />
                          <Toggle
                            checked={settings.estimation_admin_override}
                            onChange={(v) =>
                              update("estimation_admin_override", v)
                            }
                            label="Admin Override"
                          />
                        </div>
                      </div>
                    )}

                    {feature.key === "livechat" && (
                      <div className="mt-4 rounded-lg border border-brand-purple/20 bg-primary/5 p-4 dark:border-brand-purple/30 dark:bg-primary/10">
                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-purple dark:text-brand-purple-lighter">
                          Live Chat Settings
                        </h4>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                          Uses OpenAI GPT-4o-mini. System prompt is in the edge
                          function source. Requires{" "}
                          <code className="text-[10px] text-brand-purple">
                            OPENAI_API_KEY
                          </code>{" "}
                          in Supabase secrets.
                        </p>
                        <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                          <AlertCircle
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0"
                          />
                          <span>
                            Uses OpenAI, not Google Gemini. Separate API key
                            required.
                          </span>
                        </div>
                      </div>
                    )}

                    {feature.key === "color-consult" && (
                      <div className="mt-4 rounded-lg border border-brand-purple/20 bg-primary/5 p-4 dark:border-brand-purple/30 dark:bg-primary/10">
                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-purple dark:text-brand-purple-lighter">
                          Color Consultant Settings
                        </h4>
                        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-xs dark:bg-white/5">
                          <Clock
                            aria-hidden="true"
                            className="h-3.5 w-3.5 text-muted-foreground"
                          />
                          <span>
                            Free uses:{" "}
                            <strong>{settings.ai_daily_free_uses}</strong> per{" "}
                            {settings.ai_reset_period}
                          </span>
                          <span className="text-muted-foreground/80 dark:text-muted-foreground">
                            |
                          </span>
                          <DollarSign
                            aria-hidden="true"
                            className="h-3.5 w-3.5 text-muted-foreground"
                          />
                          <span>
                            Paid:{" "}
                            <strong>
                              {settings.ai_paid_currency}{" "}
                              {settings.ai_paid_price}
                            </strong>
                          </span>
                        </div>
                      </div>
                    )}

                    {feature.category === "admin" &&
                      feature.key !== "livechat" && (
                        <div className="mt-4 rounded-lg border border-brand-purple/20 bg-primary/5 p-4 dark:border-brand-purple/30 dark:bg-primary/10">
                          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-purple dark:text-brand-purple-lighter">
                            {feature.name} Configuration
                          </h4>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                            Admin-only feature — no user-facing access control.
                            Powered by Google Gemini. Requires{" "}
                            <code className="text-[10px] text-brand-purple">
                              GOOGLE_AI_API_KEY
                            </code>{" "}
                            in Supabase secrets.
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </AdminCard>
            );
          })}
        </div>
      </div>

      {/* ── API Keys Reference ── */}
      <AdminCard className="mt-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
          <Settings2 aria-hidden="true" className="h-4 w-4" /> API Keys &amp;
          Secrets
        </h2>
        <div className="space-y-2">
          <SecretRow
            name="GOOGLE_AI_API_KEY"
            usedBy="Color Consult, Color Preview, Project Assistant, Learn Assistant, AI Studio, Image Estimation"
            provider="Google Gemini"
          />
          <SecretRow
            name="OPENAI_API_KEY"
            usedBy="AI Live Chat"
            provider="OpenAI"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground dark:text-muted-foreground">
          API keys are stored in Supabase Edge Function secrets.{" "}
          <a
            href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/settings/functions`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-purple hover:underline"
          >
            Manage in Supabase Dashboard →
          </a>
        </p>
      </AdminCard>
    </>
  );
}

function InfoTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Bot;
}) {
  return (
    <div className="rounded-lg border border-border p-3 dark:border-white/5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Icon aria-hidden="true" className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground dark:text-primary-foreground">
        {value}
      </p>
    </div>
  );
}

function SecretRow({
  name,
  usedBy,
  provider,
}: {
  name: string;
  usedBy: string;
  provider: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 dark:border-white/5">
      <div className="min-w-0">
        <code className="text-xs font-semibold text-foreground dark:text-primary-foreground">
          {name}
        </code>
        <p className="mt-0.5 text-[11px] text-muted-foreground dark:text-muted-foreground">
          Used by: {usedBy}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:bg-white/10 dark:text-muted-foreground/80">
          {provider}
        </span>
        <span
          className="h-2 w-2 rounded-full bg-green-500"
          title="Configured"
        />
      </div>
    </div>
  );
}
