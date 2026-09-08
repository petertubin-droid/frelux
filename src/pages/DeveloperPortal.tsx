// =========================================================
// FRELUX PHASE 7, DEVELOPER PORTAL (/developers)
//
// The public face of the FRELUX AI API:
//   * API identity + documentation (§1): endpoints, auth, errors
//   * Capabilities & plans
//   * Authenticated: API key management (create / rotate / revoke)
//
// The raw key is shown EXACTLY ONCE at create/rotate, FRELUX
// stores only a SHA-256 hash. Docs state this honestly, together
// with the "no fabricated values" contract of the calculators.
// =========================================================

"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  rotateApiKey,
  getUsageSummary,
  getPlans,
  initializeApiPlanCheckout,
  type ApiKeyRow,
  type ApiKeyPlan,
  type UsageSummary,
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
    <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

export default function DeveloperPortal() {
  const { user, loading } = useAuth();
  const { success, error } = useToast();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [plans, setPlans] = useState<ApiKeyPlan[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPlan, setNewKeyPlan] = useState("free");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [upgradeBusy, setUpgradeBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      const [k, p, u] = await Promise.all([
        listApiKeys(),
        getPlans(),
        getUsageSummary(),
      ]);
      setKeys(k);
      setPlans(p);
      setUsage(u);
    } catch {
      error("Could not load your API data. Please retry.");
    } finally {
      setBusy(null);
    }
  }, [error]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <Terminal aria-hidden="true" className="h-8 w-8 text-brand-purple" />
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">
              FRELUX AI API
            </h1>
            <p className="text-sm text-muted-foreground">
              The official API of FRELUX construction &amp; property
              intelligence.
            </p>
          </div>
        </div>
      </header>

      {/* Quick start */}
      <section
        className="mb-8 rounded-xl border p-5"
        aria-labelledby="quickstart-heading"
      >
        <h2 id="quickstart-heading" className="mb-3 text-lg font-semibold">
          Quick start
        </h2>
        <CodeBlock>{`curl -X POST "https://hqhvlkunkdrxyuvziorm.supabase.co/functions/v1/frelix-api/v1/calculators/tyrolene_partition_area" \\
  -H "Authorization: Bearer FLX-YOUR-KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input":{"length":4,"width":3,"height":3}}'`}</CodeBlock>
        <p className="mt-3 text-sm text-muted-foreground">
          Authentication is a Bearer FRELUX API key (
          <code className="rounded bg-muted px-1">FLX-…</code>, exactly 32
          characters). Keys are hashed, store your key when you create it.
        </p>
      </section>

      {/* Endpoints */}
      <section className="mb-8" aria-labelledby="endpoints-heading">
        <h2 id="endpoints-heading" className="mb-3 text-lg font-semibold">
          Endpoints
        </h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Path</th>
                <th className="px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((e) => (
                <tr key={e.path} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{e.method}</td>
                  <td className="px-3 py-2 font-mono text-xs">{e.path}</td>
                  <td className="px-3 py-2">{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Honest contracts */}
      <section
        className="mb-8 grid gap-4 md:grid-cols-2"
        aria-label="API contracts"
      >
        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck
              aria-hidden="true"
              className="h-5 w-5 text-emerald-600"
            />
            <h3 className="font-semibold">Deterministic calculators</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Calculation results are produced only by the canonical FRELUX
            engines, the same engines the in-app calculators use. The API
            introduces no alternative math and never invents missing values:
            incomplete input returns a structured{" "}
            <code className="rounded bg-muted px-1">validation_failed</code>{" "}
            response.
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle
              aria-hidden="true"
              className="h-5 w-5 text-amber-600"
            />
            <h3 className="font-semibold">Honest knowledge boundaries</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Market prices are labeled OBSERVED vs CONFIGURED and are never
            presented as guaranteed current pricing. Regions without a FRELUX
            profile return an explicit "not available", another region's data
            is never silently substituted.
          </p>
        </div>
      </section>

      {/* Error codes */}
      <section className="mb-8" aria-labelledby="errors-heading">
        <h2 id="errors-heading" className="mb-3 text-lg font-semibold">
          Error codes
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {ERROR_CODES.map((e) => (
            <div key={e.code} className="rounded-lg border p-3">
              <p className="font-mono text-xs font-semibold">{e.code}</p>
              <p className="mt-1 text-xs text-muted-foreground">{e.meaning}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key manager */}
      <section aria-labelledby="keys-heading" className="rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound aria-hidden="true" className="h-5 w-5 text-brand-purple" />
          <h2 id="keys-heading" className="text-lg font-semibold">
            Your API keys
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2
              aria-hidden="true"
              className="h-6 w-6 animate-spin text-brand-purple"
            />
          </div>
        ) : !user ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sign in to create and manage your FRELUX API keys.
          </p>
        ) : (
          <>
            {/* Create */}
            <div className="mb-5 flex flex-col gap-2 sm:flex-row">
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. Production integration)"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                maxLength={100}
                aria-label="New API key name"
              />
              <select
                value={newKeyPlan}
                onChange={(e) => setNewKeyPlan(e.target.value)}
                className="rounded-lg border bg-background px-3 py-2 text-sm"
                aria-label="API plan"
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
                disabled={busy === "create" || newKeyName.trim().length === 0}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {busy === "create" ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  <Plus aria-hidden="true" className="h-4 w-4" />
                )}
                Create key
              </button>
            </div>

            {/* Raw key, exactly once */}
            {freshKey && (
              <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
                <p className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Copy this key now, FRELUX stores only a hash and cannot show
                  it again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded bg-muted px-2 py-1 text-xs">
                    {freshKey}
                  </code>
                  <button
                    type="button"
                    onClick={copyFreshKey}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                  >
                    {copied ? (
                      <Check aria-hidden="true" className="h-3 w-3" />
                    ) : (
                      <Copy aria-hidden="true" className="h-3 w-3" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            {/* Keys list */}
            {busy === "load" && keys.length === 0 ? (
              <div className="flex justify-center py-6">
                <Loader2
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin text-brand-purple"
                />
              </div>
            ) : keys.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No API keys yet. Create your first key above.
              </p>
            ) : (
              <ul className="space-y-3">
                {keys.map((k) => (
                  <li key={k.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{k.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {k.key_prefix}…
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          k.status === "active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {k.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Plan: {k.plan_key} · {k.rate_limit_per_minute}/min ·{" "}
                      {k.daily_quota}/day · {k.monthly_quota}/month
                      {usage?.perKeyThisMonth[k.id]
                        ? ` · ${usage.perKeyThisMonth[k.id]} requests this month`
                        : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleRotate(k.id)}
                        disabled={busy !== null || k.status === "revoked"}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs disabled:opacity-50"
                      >
                        {busy === `rotate-${k.id}` ? (
                          <Loader2
                            aria-hidden="true"
                            className="h-3 w-3 animate-spin"
                          />
                        ) : (
                          <RotateCcw aria-hidden="true" className="h-3 w-3" />
                        )}
                        Rotate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevoke(k.id)}
                        disabled={busy !== null || k.status === "revoked"}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-red-600 disabled:opacity-50"
                      >
                        {busy === `revoke-${k.id}` ? (
                          <Loader2
                            aria-hidden="true"
                            className="h-3 w-3 animate-spin"
                          />
                        ) : (
                          <Ban aria-hidden="true" className="h-3 w-3" />
                        )}
                        Revoke
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {usage && (
              <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                <RefreshCw aria-hidden="true" className="h-3 w-3" />
                Usage today: {usage.today} · this month: {usage.thisMonth}
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Plans & pricing (Phase 7 §17) ─────────────────────
          Paid plans are self-serve; enterprise/custom is
          contact-sales. Plan changes apply automatically to all
          your active keys once the signed payment webhook confirms
         , never from this page alone. */}
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
          <Crown
            aria-hidden="true"
            className="h-4 w-4 text-amber-500 dark:text-amber-300"
          />
          Plans &amp; pricing
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Upgrades are confirmed by the payment provider&#39;s signed webhook,
          then applied to every active key automatically.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            return (
              <div
                key={p.key}
                className="flex flex-col justify-between rounded-lg border bg-background p-4"
                data-testid="api-plan-card"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium">{p.name}</p>
                    {purchasable && (
                      <span title="Premium plan">
                        <Crown
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300"
                        />
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cfg.rateLimitPerMinute ?? "-"}/min ·{" "}
                    {cfg.dailyQuota ?? "-"}/day · {cfg.monthlyQuota ?? "-"}
                    /month
                  </p>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-semibold">
                    {purchasable
                      ? `$${priceMonthly}/mo`
                      : priceMonthly === 0
                        ? "Free"
                        : "Contact sales"}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleUpgrade(p.key)}
                    disabled={!purchasable || upgradeBusy !== null}
                    className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {upgradeBusy === p.key ? (
                      <Loader2
                        aria-hidden="true"
                        className="h-3 w-3 animate-spin"
                      />
                    ) : (
                      <Crown aria-hidden="true" className="h-3 w-3" />
                    )}
                    {p.key === "free" ? "Included" : "Upgrade"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
