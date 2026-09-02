"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Coins,
  Film,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Save,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { classNames } from "@/lib/utils";
import {
  adminGetAllWallets,
  adminGetAllTransactions,
  adminGetAllFeatureCosts,
  adminUpdateFeatureCost,
  adminUpdateAdConfig,
  adminGetRewardedAdConfig,
  adminGetAllAdCreditEvents,
  adminGetAllAiFeatureUsage,
  adminAdjustCreditsV2,
  type CreditWallet,
  type CreditTransaction,
  type AiFeatureCost,
  type RewardedAdCreditConfig,
  type RewardedAdCreditEvent,
} from "@/lib/credits";
import { Button } from "@/components/ui/shadcn/button";

type Tab =
  "overview" | "features" | "ad_config" | "transactions" | "users" | "audit";

export default function AdminCreditsAds() {
  const { user: _user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [wallets, setWallets] = useState<CreditWallet[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [features, setFeatures] = useState<AiFeatureCost[]>([]);
  const [adConfig, setAdConfig] = useState<RewardedAdCreditConfig | null>(null);
  const [adEvents, setAdEvents] = useState<RewardedAdCreditEvent[]>([]);
  const [aiUsage, setAiUsage] = useState<
    Array<{
      id: string;
      user_id: string;
      feature_key: string;
      credits_spent: number;
      unlocked_via_ad: boolean;
      created_at: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [editingFeature, setEditingFeature] = useState<
    Record<string, Partial<AiFeatureCost>>
  >({});
  const [savingFeature, setSavingFeature] = useState<string | null>(null);
  const [adConfigDraft, setAdConfigDraft] =
    useState<RewardedAdCreditConfig | null>(null);
  const [savingAdConfig, setSavingAdConfig] = useState(false);
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [w, tx, feat, cfg, adEvt, usage] = await Promise.all([
      adminGetAllWallets(100),
      adminGetAllTransactions(100),
      adminGetAllFeatureCosts(),
      adminGetRewardedAdConfig(),
      adminGetAllAdCreditEvents(100),
      adminGetAllAiFeatureUsage(100),
    ]);
    setWallets(w);
    setTransactions(tx);
    setFeatures(feat);
    setAdConfig(cfg);
    setAdConfigDraft(cfg);
    setAdEvents(adEvt);
    setAiUsage(usage);
    const edit: Record<string, Partial<AiFeatureCost>> = {};
    feat.forEach((f) => {
      edit[f.id] = { ...f };
    });
    setEditingFeature(edit);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Stats
  const totalIssued = wallets.reduce((s, w) => s + (w.total_earned ?? 0), 0);
  const totalConsumed = wallets.reduce((s, w) => s + (w.total_spent ?? 0), 0);
  const totalAdsCompleted = adEvents.filter(
    (e) => e.status === "completed",
  ).length;
  const totalCreditsFromAds = adEvents
    .filter((e) => e.status === "completed")
    .reduce((s, e) => s + e.credits_awarded, 0);

  async function handleSaveFeature(id: string) {
    setSavingFeature(id);
    const draft = editingFeature[id];
    if (!draft) {
      setSavingFeature(null);
      return;
    }
    const ok = await adminUpdateFeatureCost(id, draft);
    if (ok) {
      toast({ type: "success", title: "Feature cost updated" });
      await load();
    } else {
      toast({ type: "error", title: "Failed to update" });
    }
    setSavingFeature(null);
  }

  async function handleSaveAdConfig() {
    if (!adConfigDraft) return;
    setSavingAdConfig(true);
    const ok = await adminUpdateAdConfig({
      credits_per_ad: adConfigDraft.credits_per_ad,
      daily_earn_limit: adConfigDraft.daily_earn_limit,
      cooldown_seconds: adConfigDraft.cooldown_seconds,
      min_interval_seconds: adConfigDraft.min_interval_seconds,
      is_enabled: adConfigDraft.is_enabled,
    });
    if (ok) {
      toast({ type: "success", title: "Ad config updated" });
      await load();
    } else {
      toast({ type: "error", title: "Failed to update config" });
    }
    setSavingAdConfig(false);
  }

  async function handleAdjust() {
    if (!adjustUserId || !adjustReason.trim()) {
      toast({ type: "error", title: "User ID and reason are required" });
      return;
    }
    setAdjusting(true);
    const result = await adminAdjustCreditsV2(
      adjustUserId,
      adjustAmount,
      adjustReason,
    );
    if (result.success) {
      toast({
        type: "success",
        title: `Credits adjusted. New balance: ${result.newBalance}`,
      });
      setAdjustUserId("");
      setAdjustAmount(0);
      setAdjustReason("");
      await load();
    } else {
      toast({
        type: "error",
        title: result.error ?? "Failed to adjust credits",
      });
    }
    setAdjusting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  const tabs: [Tab, string][] = [
    ["overview", "Overview"],
    ["features", "AI Feature Costs"],
    ["ad_config", "Ad Config"],
    ["transactions", "Transactions"],
    ["users", "User Balances"],
    ["audit", "Audit & Fraud"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground dark:text-primary-foreground">
          Credits & Rewarded Ads
        </h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground">
          FRELUX Credits wallet, AI feature costs, and rewarded ad management.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Coins className="h-4 w-4 text-accent-green" />}
          label="Total Issued"
          value={totalIssued}
        />
        <StatCard
          icon={<TrendingDown className="h-4 w-4 text-brand-purple" />}
          label="Total Consumed"
          value={totalConsumed}
        />
        <StatCard
          icon={<Film className="h-4 w-4 text-brand-purple" />}
          label="Ads Completed"
          value={totalAdsCompleted}
        />
        <StatCard
          icon={<TrendingUp aria-hidden="true" className="h-4 w-4 text-accent-green" />}
          label="Credits from Ads"
          value={totalCreditsFromAds}
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border p-1 dark:border-white/10">
        {tabs.map(([key, label]) => (
          <Button variant="ghost"
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={classNames(
              "rounded-lg px-3 py-2 text-xs font-semibold transition-all",
              tab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-card-foreground dark:text-muted-foreground dark:hover:text-primary-foreground",
            )}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4 dark:border-white/10">
            <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
              System Status
            </h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground dark:text-muted-foreground">
                  Rewarded Ads
                </span>
                <span
                  className={classNames(
                    "font-semibold",
                    adConfig?.is_enabled ? "text-accent-green" : "text-red-400",
                  )}
                >
                  {adConfig?.is_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground dark:text-muted-foreground">
                  Credits per ad
                </span>
                <span className="font-semibold text-foreground dark:text-primary-foreground">
                  {adConfig?.credits_per_ad ?? 5}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground dark:text-muted-foreground">
                  Daily earn limit
                </span>
                <span className="font-semibold text-foreground dark:text-primary-foreground">
                  {adConfig?.daily_earn_limit ?? 10}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground dark:text-muted-foreground">
                  Active AI features
                </span>
                <span className="font-semibold text-foreground dark:text-primary-foreground">
                  {features.filter((f) => f.is_enabled).length} /{" "}
                  {features.length}
                </span>
              </div>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="rounded-xl border border-border p-4 dark:border-white/10">
            <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
              Recent Transactions
            </h3>
            <div className="mt-3 space-y-2">
              {transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                      {tx.reason}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={classNames(
                      "font-bold",
                      tx.amount > 0 ? "text-accent-green" : "text-brand-purple",
                    )}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount}
                  </span>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-xs text-muted-foreground">No transactions yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Feature Costs */}
      {tab === "features" && (
        <div className="space-y-3">
          {features.map((f) => {
            const draft = editingFeature[f.id] ?? {};
            return (
              <div
                key={f.id}
                className="rounded-xl border border-border p-4 dark:border-white/10"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground">
                      Feature Name
                    </label>
                    <input
                      value={draft.feature_name ?? f.feature_name}
                      onChange={(e) =>
                        setEditingFeature((s) => ({
                          ...s,
                          [f.id]: { ...s[f.id], feature_name: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground">
                      Credit Cost
                    </label>
                    <input
                      type="number"
                      value={draft.credit_cost ?? f.credit_cost}
                      onChange={(e) =>
                        setEditingFeature((s) => ({
                          ...s,
                          [f.id]: {
                            ...s[f.id],
                            credit_cost: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground">
                      Daily Usage Limit (0=unlimited)
                    </label>
                    <input
                      type="number"
                      value={draft.daily_usage_limit ?? f.daily_usage_limit}
                      onChange={(e) =>
                        setEditingFeature((s) => ({
                          ...s,
                          [f.id]: {
                            ...s[f.id],
                            daily_usage_limit: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground">
                      Description
                    </label>
                    <input
                      value={draft.description ?? f.description ?? ""}
                      onChange={(e) =>
                        setEditingFeature((s) => ({
                          ...s,
                          [f.id]: { ...s[f.id], description: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground/80">
                    <input
                      type="checkbox"
                      checked={draft.requires_credits ?? f.requires_credits}
                      onChange={(e) =>
                        setEditingFeature((s) => ({
                          ...s,
                          [f.id]: {
                            ...s[f.id],
                            requires_credits: e.target.checked,
                          },
                        }))
                      }
                      className="h-3.5 w-3.5 rounded"
                    />
                    Requires Credits
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground/80">
                    <input
                      type="checkbox"
                      checked={draft.ad_unlock_enabled ?? f.ad_unlock_enabled}
                      onChange={(e) =>
                        setEditingFeature((s) => ({
                          ...s,
                          [f.id]: {
                            ...s[f.id],
                            ad_unlock_enabled: e.target.checked,
                          },
                        }))
                      }
                      className="h-3.5 w-3.5 rounded"
                    />
                    Ad Unlock Enabled
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground/80">
                    <input
                      type="checkbox"
                      checked={draft.is_enabled ?? f.is_enabled}
                      onChange={(e) =>
                        setEditingFeature((s) => ({
                          ...s,
                          [f.id]: { ...s[f.id], is_enabled: e.target.checked },
                        }))
                      }
                      className="h-3.5 w-3.5 rounded"
                    />
                    Enabled
                  </label>
                </div>
                <Button variant="ghost"
                  type="button"
                  onClick={() => handleSaveFeature(f.id)}
                  disabled={savingFeature === f.id}
                  className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingFeature === f.id ? (
                    <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Ad Config */}
      {tab === "ad_config" && adConfigDraft && (
        <div className="rounded-xl border border-border p-4 dark:border-white/10">
          <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
            Rewarded Ad Credit Configuration
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground">
                Credits per Ad
              </label>
              <input
                type="number"
                value={adConfigDraft.credits_per_ad}
                onChange={(e) =>
                  setAdConfigDraft({
                    ...adConfigDraft,
                    credits_per_ad: parseInt(e.target.value) || 1,
                  })
                }
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground">
                Daily Earn Limit
              </label>
              <input
                type="number"
                value={adConfigDraft.daily_earn_limit}
                onChange={(e) =>
                  setAdConfigDraft({
                    ...adConfigDraft,
                    daily_earn_limit: parseInt(e.target.value) || 1,
                  })
                }
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground">
                Cooldown (seconds)
              </label>
              <input
                type="number"
                value={adConfigDraft.cooldown_seconds}
                onChange={(e) =>
                  setAdConfigDraft({
                    ...adConfigDraft,
                    cooldown_seconds: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground">
                Min Interval Between Ads (seconds)
              </label>
              <input
                type="number"
                value={adConfigDraft.min_interval_seconds}
                onChange={(e) =>
                  setAdConfigDraft({
                    ...adConfigDraft,
                    min_interval_seconds: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground/80">
              <input
                type="checkbox"
                checked={adConfigDraft.is_enabled}
                onChange={(e) =>
                  setAdConfigDraft({
                    ...adConfigDraft,
                    is_enabled: e.target.checked,
                  })
                }
                className="h-3.5 w-3.5 rounded"
              />
              Rewarded Ads Enabled
            </label>
          </div>
          <Button variant="default"
            type="button"
            onClick={handleSaveAdConfig}
            disabled={savingAdConfig}
            className="mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold hover:/90 disabled:opacity-50"
          >
            {savingAdConfig ? (
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            Save Configuration
          </Button>
        </div>
      )}

      {/* Transactions */}
      {tab === "transactions" && (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg border border-border p-3 dark:border-white/10"
            >
              <div>
                <p className="text-xs font-semibold text-foreground dark:text-primary-foreground">
                  {tx.reason}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {tx.type} • {new Date(tx.created_at).toLocaleString()} •
                  Balance: {tx.balance_after}
                </p>
                {tx.reference_id && (
                  <p className="text-[10px] text-muted-foreground">
                    Ref: {tx.reference_id}
                  </p>
                )}
              </div>
              <span
                className={classNames(
                  "text-sm font-bold",
                  tx.amount > 0 ? "text-accent-green" : "text-brand-purple",
                )}
              >
                {tx.amount > 0 ? "+" : ""}
                {tx.amount}
              </span>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No transactions
            </p>
          )}
        </div>
      )}

      {/* User Balances */}
      {tab === "users" && (
        <div className="space-y-4">
          {/* Manual adjustment */}
          <div className="rounded-xl border border-border p-4 dark:border-white/10">
            <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
              Manual Credit Adjustment
            </h3>
            <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
              Adjust a user's FRELUX Credits. A reason is mandatory.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input
                placeholder="User ID (UUID)"
                value={adjustUserId}
                onChange={(e) => setAdjustUserId(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-xs dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
              <input
                type="number"
                placeholder="Amount (+/-)"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                className="rounded-lg border border-border px-3 py-2 text-xs dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
              <input
                placeholder="Reason (required)"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-xs dark:border-white/10 dark:bg-background dark:text-primary-foreground"
              />
            </div>
            <Button variant="default"
              type="button"
              onClick={handleAdjust}
              disabled={adjusting}
              className="mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold hover:/90 disabled:opacity-50"
            >
              {adjusting ? (
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Coins className="h-3.5 w-3.5" />
              )}
              Adjust Credits
            </Button>
          </div>

          {/* Wallet list */}
          <div className="space-y-2">
            {wallets.map((w) => (
              <div
                key={w.user_id}
                className="flex items-center justify-between rounded-lg border border-border p-3 dark:border-white/10"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground dark:text-primary-foreground">
                    {w.user_id.slice(0, 8)}…
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Earned: {w.total_earned} • Spent: {w.total_spent}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-sm font-bold text-foreground dark:text-primary-foreground">
                  <Coins className="h-3.5 w-3.5 text-accent-green" />
                  {w.balance}
                </span>
              </div>
            ))}
            {wallets.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No wallets
              </p>
            )}
          </div>
        </div>
      )}

      {/* Audit & Fraud Monitoring */}
      {tab === "audit" && (
        <div className="space-y-4">
          {/* Ad credit events */}
          <div className="rounded-xl border border-border p-4 dark:border-white/10">
            <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
              Rewarded Ad Events
            </h3>
            <div className="mt-3 space-y-2">
              {adEvents.slice(0, 20).map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                      {evt.ad_provider}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {new Date(evt.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={classNames(
                        "font-semibold",
                        evt.status === "completed"
                          ? "text-accent-green"
                          : "text-red-400",
                      )}
                    >
                      {evt.status}
                    </span>
                    {evt.credits_awarded > 0 && (
                      <span className="font-bold text-accent-green">
                        +{evt.credits_awarded}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {adEvents.length === 0 && (
                <p className="text-xs text-muted-foreground">No ad events</p>
              )}
            </div>
          </div>

          {/* AI feature usage */}
          <div className="rounded-xl border border-border p-4 dark:border-white/10">
            <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
              AI Feature Usage
            </h3>
            <div className="mt-3 space-y-2">
              {aiUsage.slice(0, 20).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                      {u.feature_key}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {new Date(u.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.unlocked_via_ad ? (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-purple">
                        Ad
                      </span>
                    ) : (
                      <span className="rounded bg-accent-green/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent-green">
                        {u.credits_spent}cr
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {aiUsage.length === 0 && (
                <p className="text-xs text-muted-foreground">No usage records</p>
              )}
            </div>
          </div>

          {/* Fraud indicators */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
                Fraud Monitoring
              </h3>
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground dark:text-muted-foreground/80">
              <p>
                • Duplicate ad events are prevented by the{" "}
                <code>UNIQUE(user_id, ad_provider, ad_event_id)</code>{" "}
                constraint.
              </p>
              <p>
                • Daily earn limit: {adConfig?.daily_earn_limit ?? 10} credits
                per user per day.
              </p>
              <p>
                • Min interval between ad rewards:{" "}
                {adConfig?.min_interval_seconds ?? 30} seconds.
              </p>
              <p>
                • All credit awards/deductions use atomic PostgreSQL functions
                with idempotency protection.
              </p>
              <p>
                • Client-side credit costs are never trusted — the server reads
                costs from <code>ai_feature_costs</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border p-3 dark:border-white/10">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-1 text-xl font-bold text-foreground dark:text-primary-foreground">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
