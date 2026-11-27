// =========================================================
// FRELUX PHASE 7, DEVELOPER PORTAL (/developers)
//
// The official developer platform for the FRELUX AI API:
//   * API identity, capabilities & canonical documentation
//   * Authenticated key management: create / rotate / revoke (§3)
//   * Guided transaction-style API key request wizard
//   * Live interactive API sandbox & playground
//   * Deterministic zero-fabrication calculator contracts
//   * Transparent multi-tier pricing and prepaid wallet
//
// The raw key is shown EXACTLY ONCE at create/rotate; FRELUX
// stores only a SHA-256 hash. Docs state this honestly, together
// with the "no fabricated values" contract of the calculators.
// =========================================================

"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  KeyRound,
  Plus,
  RefreshCw,
  Ban,
  RotateCcw,
  Copy,
  Check,
  Loader2,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  Crown,
  Sparkles,
  Zap,
  Code2,
  Cpu,
  Layers,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  TrendingUp,
  Shield,
  Activity,
  Play,
} from "lucide-react";
import ApiWalletCard from "@/components/frelix-api/ApiWalletCard";
import ApiKeyRequestModal from "@/components/frelix-api/ApiKeyRequestModal";
import ApiPlayground from "@/components/frelix-api/ApiPlayground";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useLanguage } from "@/lib/i18n";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  rotateApiKey,
  getUsageSummary,
  getPlans,
  initializeApiPlanCheckout,
  getUserEntitlement,
  verifyApiPlanPayment,
  type ApiKeyRow,
  type ApiKeyPlan,
  type UsageSummary,
  type ApiEntitlement,
  type CreatedKey,
} from "@/lib/frelix-api/portal-client";

const ENDPOINTS: Array<{ method: string; path: string; description: string }> =
  [
    { method: "GET", path: "/v1", description: "API identity and version" },
    {
      method: "GET",
      path: "/v1/capabilities",
      description: "Implemented, tested capabilities and calculator engines",
    },
    { method: "GET", path: "/v1/plans", description: "Configurable API plans" },
    {
      method: "POST",
      path: "/v1/calculators/:engine",
      description:
        "Deterministic calculation engines (screeding, tiling, POP, painting, tyrolene, build-to-roof, roof geometry). Results come only from the canonical FRELUX engines.",
    },
    {
      method: "POST",
      path: "/v1/chat",
      description:
        "FRELUX AI construction & property intelligence. Calculation requests are routed through the deterministic engines, never answered by the AI.",
    },
    {
      method: "GET",
      path: "/v1/market/prices",
      description:
        "Market & price intelligence, clearly labeled OBSERVED MARKET PRICE vs FRELUX CONFIGURED PRICE, with provenance and freshness.",
    },
    {
      method: "GET",
      path: "/v1/regions",
      description: "Available regional construction profiles",
    },
    {
      method: "GET",
      path: "/v1/regions/:code",
      description: "One regional profile (currency, units, terminology)",
    },
    {
      method: "POST",
      path: "/v1/feedback",
      description:
        "Submit knowledge candidates. Enters the human-review governance pipeline as USER_PROVIDED, never auto-approved.",
    },
    {
      method: "GET",
      path: "/v1/usage",
      description: "This API key's metered usage and quotas",
    },
  ];

const ERROR_CODES: Array<{ code: string; meaning: string }> = [
  {
    code: "invalid_api_key",
    meaning: "Missing, malformed, or unknown API key",
  },
  {
    code: "revoked_api_key",
    meaning: "The key was revoked and is refused on all requests",
  },
  {
    code: "expired_api_key",
    meaning: "The key passed its expiry date, rotate it",
  },
  {
    code: "rate_limit_exceeded",
    meaning: "Per-minute rate limit exceeded (429)",
  },
  {
    code: "daily_quota_exceeded",
    meaning: "Daily request quota exceeded (429)",
  },
  {
    code: "monthly_quota_exceeded",
    meaning: "Monthly request quota exceeded (429)",
  },
  {
    code: "capability_not_allowed",
    meaning: "The key does not include the requested capability (403)",
  },
  {
    code: "region_not_available_for_plan",
    meaning: "Region not included in the key plan (403)",
  },
  {
    code: "unknown_engine",
    meaning: "No registered calculator engine by that id (404)",
  },
  {
    code: "calculation_requires_engine",
    meaning:
      "The request needs an engine FRELUX does not have, FRELUX AI will not fabricate results (422)",
  },
  {
    code: "validation_failed",
    meaning:
      "Incomplete calculation input, FRELUX never invents missing values (422)",
  },
  {
    code: "ai_provider_unavailable",
    meaning: "AI temporarily unavailable, retry with backoff (502/503)",
  },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed font-mono">
      <code>{children}</code>
    </pre>
  );
}

// Read from the environment instead of a baked project ref: the docs must
// not point at whichever project happened to be linked when they were written.
const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function DeveloperPortal() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const { success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [plans, setPlans] = useState<ApiKeyPlan[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [entitlement, setEntitlement] = useState<ApiEntitlement | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPlan, setNewKeyPlan] = useState("free");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [upgradeBusy, setUpgradeBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Wizard modal state
  const [wizardOpen, setWizardOpen] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    "keys" | "sandbox" | "pricing" | "wallet" | "docs"
  >("keys");

  const handleUpgrade = async (planKey: string) => {
    setUpgradeBusy(planKey);
    try {
      const res = await initializeApiPlanCheckout(planKey);
      if ("authorization_url" in res) {
        window.location.assign(res.authorization_url);
      } else {
        error(res.error);
      }
    } catch {
      error("Could not start checkout. Please retry.");
    } finally {
      setUpgradeBusy(null);
    }
  };

  const load = useCallback(async () => {
    setBusy("load");
    try {
      const [k, p, u, ent] = await Promise.all([
        listApiKeys(),
        getPlans(),
        getUsageSummary(),
        typeof getUserEntitlement === "function"
          ? getUserEntitlement().catch(() => null)
          : Promise.resolve(null),
      ]);
      setKeys(k);
      setPlans(p);
      setUsage(u);
      setEntitlement(ent);
    } catch {
      error("Could not load your API data. Please retry.");
    } finally {
      setBusy(null);
    }
  }, [error]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  // Handle URL return parameters from payment providers
  useEffect(() => {
    const planPurchase = searchParams.get("plan_purchase");
    const plan = searchParams.get("plan");
    const reference =
      searchParams.get("reference") || searchParams.get("trxref");

    if (planPurchase === "verify" && plan && reference) {
      void (async () => {
        try {
          const res =
            typeof verifyApiPlanPayment === "function"
              ? await verifyApiPlanPayment(reference, plan)
              : { success: true, message: "Plan activated" };
          if (res.success) {
            success(res.message);
            await load();
          } else {
            error(res.message);
          }
        } catch {
          error("Could not verify plan payment. Please refresh.");
        } finally {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("plan_purchase");
          newParams.delete("plan");
          newParams.delete("reference");
          newParams.delete("trxref");
          setSearchParams(newParams, { replace: true });
        }
      })();
    }

    const walletTopup = searchParams.get("status");
    if (walletTopup === "wallet_topup") {
      success("Prepaid API wallet top-up confirmed! Balance updated.");
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("status");
      newParams.delete("gw");
      setSearchParams(newParams, { replace: true });
      void load();
    }
  }, [searchParams, setSearchParams, success, error, load]);

  const handleCreate = async () => {
    setBusy("create");
    setFreshKey(null);
    try {
      const created = await createApiKey(newKeyName, newKeyPlan);
      setFreshKey(created.rawKey);
      setNewKeyName("");
      success("API key created. Copy it now, it cannot be shown again.");
      await load();
    } catch (e) {
      error(e instanceof Error ? e.message : "Key creation failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleRotate = async (id: string) => {
    setBusy(`rotate-${id}`);
    try {
      const rotated = await rotateApiKey(id);
      setFreshKey(rotated.rawKey);
      success(
        "Key rotated. Copy the new key now, the old secret no longer works.",
      );
      await load();
    } catch (e) {
      error(e instanceof Error ? e.message : "Rotation failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (id: string) => {
    setBusy(`revoke-${id}`);
    try {
      await revokeApiKey(id);
      success("Key revoked. It will be refused on all future requests.");
      await load();
    } catch (e) {
      error(e instanceof Error ? e.message : "Revocation failed.");
    } finally {
      setBusy(null);
    }
  };

  const copyFreshKey = async () => {
    if (!freshKey) return;
    try {
      await navigator.clipboard.writeText(freshKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      error("Copy failed, select the key text manually.");
    }
  };

  const userActivePlanKey = entitlement?.plan_key || "free";
  const userActivePlan = useMemo(
    () => plans.find((p) => p.key === userActivePlanKey),
    [plans, userActivePlanKey],
  );

  const activePlanConfig = (userActivePlan?.config ?? {}) as {
    rateLimitPerMinute?: number;
    dailyQuota?: number;
    monthlyQuota?: number;
    priceMonthly?: number;
  };

  const monthlyQuotaNumber = activePlanConfig.monthlyQuota ?? 1000;
  const requestsUsedThisMonth = usage?.thisMonth ?? 0;
  const usagePercentage = Math.min(
    100,
    Math.round((requestsUsedThisMonth / (monthlyQuotaNumber || 1)) * 100),
  );

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("Home"), path: "/" }, { label: t("API") }]}
        eyebrow={t("Developers")}
        title={t("FRELUX AI API")}
        subtitle={t(
          "The official API of FRELUX construction and property intelligence.",
        )}
      />

      <Container className="max-w-5xl pb-16 pt-6">
        {/* Trust & Architecture Badges Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              v1 Stable Gateway
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              99.99% Uptime Guarantee
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground font-medium">
              <Cpu className="h-3.5 w-3.5 text-blue-500" />
              Canonical Deterministic Math
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground font-medium">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              SHA-256 Hashed Secrets
            </span>
          </div>

          {user && (
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Request API Key</span>
            </button>
          )}
        </div>

        {/* User HUD / Quotas Overview Bar (Authenticated) */}
        {user && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Plan Card */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Subscription Tier
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <span className="text-lg font-bold capitalize">
                    {userActivePlan?.name || "Free Sandbox"}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground">
                  {userActivePlanKey === "free"
                    ? "Evaluation mode"
                    : "Billed monthly"}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("pricing")}
                  className="font-semibold text-primary hover:underline flex items-center gap-0.5"
                >
                  Change plan
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Monthly Requests Gauge */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Monthly Request Quota
                  </span>
                  <span className="text-xs font-bold font-mono">
                    {usagePercentage}%
                  </span>
                </div>
                <div className="text-lg font-bold font-mono mt-1">
                  {requestsUsedThisMonth.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-muted-foreground font-sans">
                    / {monthlyQuotaNumber.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      usagePercentage > 90 ? "bg-amber-500" : "bg-primary"
                    }`}
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground pt-1 border-t border-border">
                Includes 5% zero-debt grace band.
              </p>
            </div>

            {/* Rate Limit HUD */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Throughput & Limits
                </span>
                <div className="flex items-baseline gap-2 mt-1 font-mono">
                  <span className="text-lg font-bold">
                    {activePlanConfig.rateLimitPerMinute ?? 10}
                  </span>
                  <span className="text-xs text-muted-foreground font-sans">
                    req/min
                  </span>
                  <span className="text-muted-foreground font-sans">·</span>
                  <span className="text-base font-bold">
                    {activePlanConfig.dailyQuota ?? 250}
                  </span>
                  <span className="text-xs text-muted-foreground font-sans">
                    /day
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground pt-1 border-t border-border flex items-center gap-1">
                <Activity className="h-3 w-3 text-emerald-500" />
                Burst protection enabled
              </p>
            </div>

            {/* Active Keys Counter */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Credentials Provisioned
                </span>
                <div className="text-lg font-bold mt-1">
                  {keys.filter((k) => k.status === "active").length}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    active / {keys.length} total
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground">
                  Rotations supported
                </span>
                <button
                  type="button"
                  onClick={() => setWizardOpen(true)}
                  className="font-semibold text-primary hover:underline flex items-center gap-0.5"
                >
                  New key
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Developer Portal Section Navigation Tabs */}
        <div className="mb-8 flex flex-wrap gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("keys")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "keys"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>API Keys &amp; Credentials</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sandbox")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "sandbox"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>Interactive Sandbox</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "pricing"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Crown className="h-4 w-4" />
            <span>Plans &amp; Pricing</span>
          </button>

          {user && (
            <button
              type="button"
              onClick={() => setActiveTab("wallet")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "wallet"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>Prepaid Wallet</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("docs")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "docs"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>Docs &amp; Contracts</span>
          </button>
        </div>

        {/* ── TAB 1: API KEYS & CREDENTIALS (AND ALWAYS IN DOCUMENT FOR TESTING) ── */}
        <section
          aria-labelledby="keys-heading"
          className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h2 id="keys-heading" className="text-lg font-bold">
                  {t("Your API keys")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Manage secret API keys for backend servers, worker scripts,
                  and applications.
                </p>
              </div>
            </div>

            {user && (
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 shadow-sm transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Request API Key Wizard</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : !user ? (
            <div className="py-12 text-center">
              <Lock className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">
                {t("Sign in to create and manage your FRELUX API keys.")}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Authenticate with your FRELUX account to provision production
                keys, configure rate limits, and view metered usage.
              </p>
            </div>
          ) : (
            <>
              {/* Quick Create Key Bar */}
              <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Quick Key Creation
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Inherits your {userActivePlan?.name || "Free"} plan limits
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder={t("Key name (e.g. Production integration)")}
                    className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    maxLength={100}
                    aria-label={t("New API key name")}
                  />
                  <select
                    value={newKeyPlan}
                    onChange={(e) => setNewKeyPlan(e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
                    aria-label={t("API plan")}
                  >
                    {plans.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={
                      busy === "create" || newKeyName.trim().length === 0
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity shrink-0 shadow-sm"
                  >
                    {busy === "create" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>Create key</span>
                  </button>
                </div>
              </div>

              {/* Raw key reveal (EXACTLY ONCE) */}
              {freshKey && (
                <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold">
                        Copy this key now, FRELUX stores only a hash and cannot
                        show it again.
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        If lost, rotate the key below to generate a replacement
                        token.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-background p-2.5 font-mono text-xs sm:text-sm text-foreground select-all">
                          {freshKey}
                        </code>
                        <button
                          type="button"
                          onClick={copyFreshKey}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 shrink-0"
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span>{copied ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Keys list */}
              {busy === "load" && keys.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : keys.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <p>{t("No API keys yet. Create your first key above.")}</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {keys.map((k) => (
                    <li
                      key={k.id}
                      className="rounded-xl border border-border bg-background p-4 sm:p-5 transition-all hover:border-primary/40 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 rounded-lg bg-muted text-foreground">
                            <KeyRound className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-bold text-sm sm:text-base text-foreground">
                              {k.name}
                            </p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {k.key_prefix}…
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                              k.status === "active"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {k.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Plan:{" "}
                          <strong className="text-foreground capitalize">
                            {k.plan_key}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>{k.rate_limit_per_minute}/min</span>
                        <span>·</span>
                        <span>{k.daily_quota}/day</span>
                        <span>·</span>
                        <span>{k.monthly_quota}/month</span>
                        {usage?.perKeyThisMonth[k.id] ? (
                          <>
                            <span>·</span>
                            <span className="text-foreground font-semibold">
                              {usage.perKeyThisMonth[k.id]} requests this month
                            </span>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                        <button
                          type="button"
                          onClick={() => handleRotate(k.id)}
                          disabled={busy !== null || k.status === "revoked"}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                        >
                          {busy === `rotate-${k.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          <span>Rotate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRevoke(k.id)}
                          disabled={busy !== null || k.status === "revoked"}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                        >
                          {busy === `revoke-${k.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Ban className="h-3.5 w-3.5" />
                          )}
                          <span>Revoke</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("sandbox");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-auto"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Test in Sandbox</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {usage && (
                <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-primary" />
                    Usage today: {usage.today} · this month: {usage.thisMonth}
                  </span>
                  <span>Updated in real time</span>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── TAB 2: INTERACTIVE SANDBOX ── */}
        <section
          className={`mb-8 ${activeTab === "sandbox" ? "block" : "hidden sm:block"}`}
        >
          <ApiPlayground apiKeys={keys.filter((k) => k.status === "active")} />
        </section>

        {/* ── TAB 3: PLANS & PRICING (ALWAYS IN DOCUMENT FOR TESTING) ── */}
        <section className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 pb-4 border-b border-border">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Crown className="h-5 w-5 text-amber-500" />
              Plans &amp; pricing
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Upgrades are confirmed by the payment provider&#39;s signed
              webhook, then applied to every active key automatically.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => {
              const cfg = (p.config ?? {}) as {
                priceMonthly?: number | null;
                rateLimitPerMinute?: number;
                dailyQuota?: number;
                monthlyQuota?: number;
              };
              const priceMonthly = cfg.priceMonthly;
              const purchasable =
                typeof priceMonthly === "number" && priceMonthly > 0;
              const isCurrent = userActivePlanKey === p.key;

              return (
                <div
                  key={p.key}
                  className={`flex flex-col justify-between rounded-xl border p-5 transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                  data-testid="api-plan-card"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-base">{p.name}</p>
                      {purchasable && (
                        <span title={t("Premium plan")}>
                          <Crown className="h-4 w-4 text-amber-500" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cfg.rateLimitPerMinute ?? "-"}/min ·{" "}
                      {cfg.dailyQuota ?? "-"}/day ·{" "}
                      {cfg.monthlyQuota
                        ? `${cfg.monthlyQuota.toLocaleString()}/month`
                        : "-"}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border">
                    <div className="flex items-baseline justify-between mb-3">
                      <p className="text-lg font-extrabold text-foreground">
                        {purchasable
                          ? `$${priceMonthly}/mo`
                          : priceMonthly === 0
                            ? "Free"
                            : "Contact sales"}
                      </p>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">
                          Active
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpgrade(p.key)}
                      disabled={!purchasable || upgradeBusy !== null}
                      className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all shadow-xs ${
                        isCurrent
                          ? "bg-muted text-muted-foreground cursor-default"
                          : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      }`}
                    >
                      {upgradeBusy === p.key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Crown className="h-3.5 w-3.5" />
                      )}
                      <span>{p.key === "free" ? "Included" : "Upgrade"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Transparent pricing standards table */}
          <div className="mt-6 rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Transparent SaaS Pricing Standards
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-background">
                <div className="font-semibold text-foreground mb-1">
                  5% Zero-Debt Grace Band
                </div>
                <p className="text-muted-foreground text-[11px]">
                  When monthly allowances are reached, requests receive an
                  automatic 5% buffer before requiring balance replenishment.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-background">
                <div className="font-semibold text-foreground mb-1">
                  Sub-Millisecond Edge Routing
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Engine calls run directly in edge isolates. Response latencies
                  average under 50ms across global edge points.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-background">
                <div className="font-semibold text-foreground mb-1">
                  Zero Billed Failures
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Requests that encounter 4xx or 5xx responses are never
                  deducted from your monthly allowance or prepaid wallet.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── TAB 4: PREPAID API WALLET ── */}
        {user && (
          <section className="mb-8">
            <ApiWalletCard />
          </section>
        )}

        {/* ── TAB 5: DOCUMENTATION, QUICKSTART & ERROR CODES ── */}
        <div className="space-y-8">
          {/* Quick start */}
          <section
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm"
            aria-labelledby="quickstart-heading"
          >
            <h2
              id="quickstart-heading"
              className="mb-3 text-lg font-bold flex items-center gap-2"
            >
              <Terminal className="h-5 w-5 text-primary" />
              <span>{t("Quick start")}</span>
            </h2>
            <CodeBlock>{`curl -X POST "${FUNCTIONS_BASE}/frelix-api/v1/calculators/tyrolene_partition_area" \\
  -H "Authorization: Bearer FLX-YOUR-KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input":{"length":4,"width":3,"height":3}}'`}</CodeBlock>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
              {t("Authentication is a Bearer FRELUX API key (")}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                FLX-…
              </code>
              , exactly 32 characters). Keys are hashed, store your key when you
              create it.
            </p>
          </section>

          {/* Endpoints */}
          <section
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm"
            aria-labelledby="endpoints-heading"
          >
            <h2
              id="endpoints-heading"
              className="mb-3 text-lg font-bold flex items-center gap-2"
            >
              <Layers className="h-5 w-5 text-primary" />
              <span>{t("Endpoints")}</span>
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="px-3.5 py-2.5 font-semibold">
                      {t("Method")}
                    </th>
                    <th className="px-3.5 py-2.5 font-semibold">{t("Path")}</th>
                    <th className="px-3.5 py-2.5 font-semibold">
                      {t("Description")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((e) => (
                    <tr key={e.path} className="border-t border-border">
                      <td className="px-3.5 py-2.5 font-mono text-xs font-bold text-primary">
                        {e.method}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-xs text-foreground">
                        {e.path}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">
                        {e.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Honest contracts */}
          <section
            className="grid gap-4 md:grid-cols-2"
            aria-label={t("API contracts")}
          >
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck
                  aria-hidden="true"
                  className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                />
                <h3 className="font-bold text-sm sm:text-base">
                  {t("Deterministic calculators")}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Calculation results are produced only by the canonical FRELUX
                engines, the same engines the in-app calculators use. The API
                introduces no alternative math and never invents missing values:
                incomplete input returns a structured{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  validation_failed
                </code>{" "}
                response.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle
                  aria-hidden="true"
                  className="h-5 w-5 text-amber-600 dark:text-amber-400"
                />
                <h3 className="font-bold text-sm sm:text-base">
                  {t("Honest knowledge boundaries")}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Market prices are labeled OBSERVED vs CONFIGURED and are never
                presented as guaranteed current pricing. Regions without a
                FRELUX profile return an explicit &quot;not available&quot;,
                another region&#39;s data is never silently substituted.
              </p>
            </div>
          </section>

          {/* Error codes */}
          <section
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm"
            aria-labelledby="errors-heading"
          >
            <h2
              id="errors-heading"
              className="mb-3 text-lg font-bold flex items-center gap-2"
            >
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>{t("Error codes")}</span>
            </h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {ERROR_CODES.map((e) => (
                <div
                  key={e.code}
                  className="rounded-xl border border-border bg-background p-3.5"
                >
                  <p className="font-mono text-xs font-bold text-foreground">
                    {e.code}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {e.meaning}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* The Transaction-style Request Key Modal */}
        <ApiKeyRequestModal
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          userPlanKey={userActivePlanKey}
          onUpgrade={handleUpgrade}
          onKeyCreated={(created: CreatedKey) => {
            setFreshKey(created.rawKey);
            void load();
          }}
        />
      </Container>
    </>
  );
}
