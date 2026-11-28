// =========================================================
// API Key Request Modal — Transaction & Guided Generation
//
// A guided, transaction-style modal for developers to create
// production or sandbox API keys with fine-grained scopes,
// quota entitlements, and payment upgrades when required.
// =========================================================

"use client";

import React, { useState, useMemo } from "react";
import {
  Key,
  CheckCircle2,
  Copy,
  Check,
  X,
  Loader2,
  Terminal,
  ArrowRight,
  Crown,
  Play,
} from "lucide-react";
import {
  createApiKey,
  type CreatedKey,
  type ApiKeyPlan,
} from "@/lib/frelix-api/portal-client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPlanKey?: string;
  plans?: ApiKeyPlan[];
  onKeyCreated?: (created: CreatedKey) => void;
  onUpgrade?: (planKey: string) => Promise<void>;
  onTestInPlayground?: (key: string) => void;
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

// Fallback seed plans if plans table is loading
const SEED_PLANS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    monthlyQuota: "1,000 req/mo",
    rateLimit: "10 req/min",
    dailyQuota: "50 req/day",
    features: [
      "All canonical engines",
      "Zero fabrication math",
      "5% grace band included",
    ],
  },
  {
    key: "developer",
    name: "Developer",
    price: "$19",
    period: "per month",
    monthlyQuota: "25,000 req/mo",
    rateLimit: "60 req/min",
    dailyQuota: "1,000 req/day",
    features: [
      "25,000 calculator calls",
      "2,000 AI calls included",
      "7 regional markets (NG, US, GB...)",
      "5% grace band included",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$49",
    period: "per month",
    monthlyQuota: "100,000 req/mo",
    rateLimit: "120 req/min",
    dailyQuota: "5,000 req/day",
    features: [
      "100,000 calculator calls",
      "10,000 AI calls included",
      "Full market price index access",
      "Priority edge execution",
    ],
  },
  {
    key: "business",
    name: "Business",
    price: "$199",
    period: "per month",
    monthlyQuota: "500,000 req/mo",
    rateLimit: "300 req/min",
    dailyQuota: "20,000 req/day",
    features: [
      "500,000 calculator calls",
      "50,000 AI calls included",
      "All regional markets & feedback API",
      "High-throughput edge routing",
    ],
  },
];

export default function ApiKeyRequestModal({
  open,
  onOpenChange,
  userPlanKey = "free",
  plans = [],
  onKeyCreated,
  onUpgrade,
  onTestInPlayground,
  createKeyFn = createApiKey,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
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

  // Derive plans dynamically from DB if available
  const displayPlans = useMemo(() => {
    if (plans && plans.length > 0) {
      return plans
        .filter((p) => p.active && p.key !== "custom")
        .map((p) => {
          const rawPlan = p as unknown as Record<string, unknown>;
          const cfg = (p.config ?? {}) as Record<string, unknown>;
          const priceMonthly = cfg.priceMonthly ?? rawPlan.priceMonthly;
          const isPaid = typeof priceMonthly === "number" && priceMonthly > 0;
          const isFree = priceMonthly === 0;
          const priceStr = isPaid
            ? `$${priceMonthly}`
            : isFree
              ? "$0"
              : "Custom";
          const periodStr = isPaid
            ? "per month"
            : isFree
              ? "forever"
              : "contact sales";

          const mQuota = cfg.monthlyQuota ?? rawPlan.monthlyQuota;
          const rLimit =
            cfg.rateLimitPerMinute ?? rawPlan.rateLimitPerMinute;
          const dQuota = cfg.dailyQuota ?? rawPlan.dailyQuota;

          const monthlyQuotaStr = mQuota
            ? `${Number(mQuota).toLocaleString()} req/mo`
            : "Custom quota";
          const rateLimitStr = rLimit ? `${rLimit} req/min` : "Custom rate";
          const dailyQuotaStr = dQuota
            ? `${Number(dQuota).toLocaleString()} req/day`
            : "Custom daily";

          const features = Array.isArray(cfg.features)
            ? (cfg.features as string[]).slice(0, 4)
            : [
                "Canonical calculation engines",
                "Zero fabrication math",
                "5% grace band included",
              ];

          return {
            key: p.key,
            name: p.name,
            price: priceStr,
            period: periodStr,
            monthlyQuota: monthlyQuotaStr,
            rateLimit: rateLimitStr,
            dailyQuota: dailyQuotaStr,
            features,
          };
        });
    }
    return SEED_PLANS;
  }, [plans]);

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
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <Key className="h-4 w-4" />
            <span>Developer Credentials</span>
          </div>
          <h2
            id="api-key-modal-title"
            className="text-xl sm:text-2xl font-bold tracking-tight"
          >
            {step === 1 && "Create a New API Key"}
            {step === 2 && "Confirm Quota & Entitlement Tier"}
            {step === 3 && "Key Created Successfully"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {step === 1 &&
              "Configure API key name, environment, and capability access scopes."}
            {step === 2 &&
              "Review quota limits and rate limits attached to your subscription."}
            {step === 3 &&
              "Store your raw key securely. Frelux stores only a SHA-256 hash and cannot show it again."}
          </p>
        </div>

        {/* Progress Stepper */}
        <div className="mb-6 flex items-center gap-2 border-b border-border pb-4">
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold ${
              step >= 1 ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                step >= 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              1
            </span>
            <span>Scopes &amp; Name</span>
          </div>
          <div className="h-px w-6 bg-border" />
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold ${
              step >= 2 ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                step >= 2
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </span>
            <span>Tier Quota</span>
          </div>
          <div className="h-px w-6 bg-border" />
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold ${
              step === 3 ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                step === 3
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              3
            </span>
            <span>Credentials</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: Name & Scopes ── */}
        {step === 1 && (
          <form onSubmit={handleProceedToPlan} className="space-y-5">
            <div>
              <label
                htmlFor="modal-key-name"
                className="block text-xs font-semibold mb-1.5"
              >
                Key Name / Service Identifier
              </label>
              <input
                id="modal-key-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Production Backend or CI Runner"
                maxLength={100}
                autoFocus
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                A human-friendly label to identify where this key is integrated.
              </p>
            </div>

            <div>
              <span id="permission-scopes-label" className="block text-xs font-semibold mb-2">
                Permission Scopes
              </span>
              <div role="group" aria-labelledby="permission-scopes-label" className="grid gap-2.5 sm:grid-cols-2">
                {AVAILABLE_SCOPES.map((scope) => {
                  const checked = selectedScopes.includes(scope.id);
                  return (
                    <button
                      type="button"
                      key={scope.id}
                      onClick={() => handleScopeToggle(scope.id)}
                      className={`text-left cursor-pointer rounded-xl border p-3 transition-all ${
                        checked
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{scope.title}</span>
                        <input
                          type="checkbox"
                          id={`scope-${scope.id}`}
                          aria-label={scope.title}
                          checked={checked}
                          onChange={() => {}}
                          tabIndex={-1}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary pointer-events-none"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {scope.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
              >
                <span>Continue to Quota</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 2: Tier Quotas & Upgrades ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 max-h-[340px] overflow-y-auto pr-1">
              {displayPlans.map((plan) => {
                const isSelected = selectedPlan === plan.key;
                const isUserCurrent = userPlanKey === plan.key;
                const needsUpgrade = plan.key !== "free" && !isUserCurrent;

                return (
                  <button
                    type="button"
                    key={plan.key}
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`text-left cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold">{plan.name}</span>
                        {isUserCurrent && (
                          <span className="text-[10px] font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            Current Plan
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 my-1">
                        <span className="text-lg font-extrabold">
                          {plan.price}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          /{plan.period}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {plan.rateLimit} · {plan.monthlyQuota}
                      </p>
                      <ul className="mt-2.5 space-y-1">
                        {plan.features.map((feat, i) => (
                          <li
                            key={i}
                            className="text-[11px] flex items-center gap-1.5 text-muted-foreground"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {needsUpgrade && (
                      <div className="mt-3 pt-2 border-t border-border flex items-center gap-1 text-[11px] text-amber-500 font-semibold">
                        <Crown className="h-3 w-3" />
                        <span>Requires subscription upgrade</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleGenerateOrUpgrade}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : selectedPlan !== "free" && selectedPlan !== userPlanKey ? (
                  <>
                    <Crown className="h-3.5 w-3.5" />
                    <span>
                      Upgrade to {selectedPlan.toUpperCase()} &amp; Issue Key
                    </span>
                  </>
                ) : (
                  <>
                    <Key className="h-3.5 w-3.5" />
                    <span>Generate API Key</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Key Issued & Ready ── */}
        {step === 3 && createdKey && (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span>API Key Ready to Use</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Copy this key now. FRELUX stores only a SHA-256 hash and cannot
                display this raw secret again.
              </p>

              <div className="mt-3 flex items-center gap-2 bg-background border border-border rounded-lg p-2.5 font-mono text-xs">
                <span className="flex-1 truncate font-bold text-foreground">
                  {createdKey.rawKey}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Canonical Integration Example */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" />
                <span>Quick Test cURL</span>
              </div>
              <pre className="overflow-x-auto rounded-lg border bg-muted/60 p-3 text-[11px] font-mono leading-relaxed text-foreground">
                <code>{`curl -X POST https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/frelix-api/v1/calculators/screeding \\
  -H "Authorization: Bearer ${createdKey.rawKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"input":{"length":6,"width":5,"thickness_mm":25,"mix_ratio":"1:4"}}'`}</code>
              </pre>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              {onTestInPlayground && (
                <button
                  type="button"
                  onClick={() => {
                    onTestInPlayground(createdKey.rawKey);
                    handleClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Test in Live Sandbox</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="ml-auto px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
