// =========================================================
// API Key Request Modal — Transaction & Guided Generation
//
// A guided, transaction-style modal for developers to create
// production or sandbox API keys with fine-grained scopes,
// quota entitlements, and payment upgrades when required.
// =========================================================

"use client";

import React, { useState } from "react";
import {
  Key,
  Shield,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  X,
  Loader2,
  Terminal,
  ArrowRight,
} from "lucide-react";
import { createApiKey, type CreatedKey } from "@/lib/frelix-api/portal-client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPlanKey?: string;
  onKeyCreated?: (created: CreatedKey) => void;
  onUpgrade?: (planKey: string) => Promise<void>;
  createKeyFn?: (
    name: string,
    planKey?: string,
    permissions?: string[],
  ) => Promise<CreatedKey>;
}

const AVAILABLE_SCOPES = [
  {
    id: "calculators",
    title: "Deterministic Engines",
    desc: "Screeding, Tiling, POP, Paint, Concrete, Roof Geometry takeoffs.",
    recommended: true,
  },
  {
    id: "chat",
    title: "AI Property Intelligence",
    desc: "Construction intelligence copilot and material takeoff analysis.",
    recommended: true,
  },
  {
    id: "market",
    title: "Market Price Intelligence",
    desc: "Verified regional building material pricing indexes.",
    recommended: false,
  },
  {
    id: "regions",
    title: "Regional Building Profiles",
    desc: "International market specifications and local codes.",
    recommended: false,
  },
];

const PLANS = [
  {
    key: "free",
    name: "Free Sandbox",
    price: "$0",
    period: "forever",
    monthlyQuota: "1,000 req/mo",
    rateLimit: "10 req/min",
    dailyQuota: "250 req/day",
    features: [
      "All 40+ canonical engines",
      "Zero fabrication math",
      "Community support",
    ],
  },
  {
    key: "developer",
    name: "Developer",
    price: "$19",
    period: "per month",
    monthlyQuota: "20,000 req/mo",
    rateLimit: "60 req/min",
    dailyQuota: "1,000 req/day",
    features: [
      "20,000 calculator calls",
      "1,500 AI calls included",
      "5% grace band included",
      "Sub-millisecond latency",
    ],
  },
  {
    key: "pro",
    name: "Pro Scale",
    price: "$79",
    period: "per month",
    badge: "Most Popular",
    monthlyQuota: "120,000 req/mo",
    rateLimit: "120 req/min",
    dailyQuota: "6,000 req/day",
    features: [
      "120,000 calculator calls",
      "8,000 AI calls included",
      "Commercial SaaS SLA",
      "Priority edge routing",
    ],
  },
  {
    key: "business",
    name: "Business",
    price: "$249",
    period: "per month",
    monthlyQuota: "500,000 req/mo",
    rateLimit: "300 req/min",
    dailyQuota: "25,000 req/day",
    features: [
      "500,000 calculator calls",
      "35,000 AI calls included",
      "Dedicated account manager",
      "99.99% uptime guarantee",
    ],
  },
];

export default function ApiKeyRequestModal({
  open,
  onOpenChange,
  userPlanKey = "free",
  onKeyCreated,
  onUpgrade,
  createKeyFn = createApiKey,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<"production" | "sandbox">(
    "production",
  );
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "calculators",
    "chat",
  ]);
  const [selectedPlan, setSelectedPlan] = useState<string>(
    userPlanKey || "free",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleScopeToggle = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId)
        ? prev.filter((s) => s !== scopeId)
        : [...prev, scopeId],
    );
  };

  const handleProceedToPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please specify a name for this API key.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleGenerateOrUpgrade = async () => {
    setError(null);
    setLoading(true);

    try {
      // If user selected an upgraded tier compared to their current active tier
      const needsUpgrade =
        selectedPlan !== "free" && selectedPlan !== userPlanKey && onUpgrade;

      if (needsUpgrade && onUpgrade) {
        await onUpgrade(selectedPlan);
        setLoading(false);
        return;
      }

      // Otherwise generate directly with chosen plan permissions
      const effectivePlan =
        userPlanKey && userPlanKey !== "free" ? userPlanKey : "free";
      const res = await createKeyFn(name.trim(), effectivePlan, selectedScopes);
      setCreatedKey(res);
      onKeyCreated?.(res);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleClose = () => {
    setName("");
    setStep(1);
    setCreatedKey(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-modal-title"
        className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl p-6 sm:p-8 text-foreground"
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <Key className="h-5 w-5" />
            </span>
            <h2
              id="api-key-modal-title"
              className="text-xl sm:text-2xl font-bold tracking-tight"
            >
              {step === 3 ? "API Key Generated" : "Request New API Key"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {step === 1 &&
              "Configure identity, environment, and capabilities for your new API key."}
            {step === 2 &&
              "Choose your transaction tier and request quota allocation."}
            {step === 3 &&
              "Save your raw secret key now. For your security, it is never displayed again."}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`}
          />
          <div
            className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`}
          />
          <div
            className={`h-1.5 flex-1 rounded-full ${step >= 3 ? "bg-primary" : "bg-muted"}`}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* STEP 1: KEY IDENTITY & SCOPES */}
        {step === 1 && (
          <form onSubmit={handleProceedToPlan} className="space-y-6">
            <div>
              <label
                htmlFor="modal-key-name"
                className="block text-sm font-semibold mb-1.5"
              >
                API Key Name
              </label>
              <input
                id="modal-key-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production ERP Ingestion, Staging Bot"
                aria-label="New API key name"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A human-readable label to identify this client in logs and
                audits.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Target Environment
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEnvironment("production")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    environment === "production"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-semibold text-sm flex items-center justify-between">
                    <span>Production</span>
                    {environment === "production" && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Live applications, full speed, high reliability.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEnvironment("sandbox")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    environment === "sandbox"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-semibold text-sm flex items-center justify-between">
                    <span>Development / Sandbox</span>
                    {environment === "sandbox" && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Local testing and staging environments.
                  </p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Granted Capabilities & Scopes
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_SCOPES.map((scope) => {
                  const active = selectedScopes.includes(scope.id);
                  return (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => handleScopeToggle(scope.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        active
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-background hover:bg-muted/30"
                      }`}
                    >
                      <div
                        className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                          active
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold">
                          {scope.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                          {scope.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <span>Continue to Quota & Tier</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: TIER SELECTION & TRANSACTION */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
              {PLANS.map((plan) => {
                const isCurrent = (userPlanKey || "free") === plan.key;
                const isSelected = selectedPlan === plan.key;
                return (
                  <div
                    key={plan.key}
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                        : "border-border hover:border-primary/30 bg-background"
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
                        {plan.badge}
                      </span>
                    )}
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-bold text-sm">{plan.name}</span>
                      <div className="text-right">
                        <span className="text-base font-extrabold">
                          {plan.price}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          /{plan.period === "forever" ? "mo" : "mo"}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-primary mt-2">
                      {plan.monthlyQuota}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Rate limit: {plan.rateLimit} • {plan.dailyQuota}
                    </div>

                    <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground border-t border-border pt-2">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent && (
                      <div className="mt-2 text-center py-1 rounded bg-muted text-[11px] font-semibold text-foreground">
                        Your Active Plan
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Transaction summary */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/30 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold">Selected Allocation:</span>{" "}
                <span className="text-foreground capitalize">
                  {selectedPlan} Tier
                </span>
                <span className="text-muted-foreground ml-2">
                  (5% zero-debt grace band included)
                </span>
              </div>
              <div className="font-bold text-sm">
                {PLANS.find((p) => p.key === selectedPlan)?.price || "$0"}
                <span className="text-[11px] font-normal text-muted-foreground">
                  /mo
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium"
              >
                Back
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleGenerateOrUpgrade}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {selectedPlan !== "free" &&
                  selectedPlan !== (userPlanKey || "free")
                    ? `Proceed to Checkout & Upgrade`
                    : `Generate Key Instantly`}
                </span>
                <Zap className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RAW KEY REVEAL (EXACTLY ONCE) */}
        {step === 3 && createdKey && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong className="block font-bold mb-0.5 text-sm">
                    Copy this key now, FRELUX stores only a hash and cannot show
                    it again.
                  </strong>
                  Store it securely in your secrets manager or environment file.
                  If lost, you will need to rotate the key.
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Secret API Key
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 rounded-lg border border-border bg-muted font-mono text-xs sm:text-sm text-foreground overflow-x-auto select-all">
                  {createdKey.rawKey}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1.5">
                <Terminal className="h-3.5 w-3.5" />
                <span>Quick Test (cURL)</span>
              </div>
              <pre className="p-3 rounded-lg border border-border bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
                {`curl -X GET "https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/frelix-api/v1/capabilities" \\
  -H "Authorization: Bearer ${createdKey.rawKey}"`}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Done & View in Portal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
