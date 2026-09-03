"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Coins,
  PlayCircle,
  Gift,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Film,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getSupabase } from "@/lib/supabase-lazy";
import {
  getCreditWallet,
  getCreditTransactions,
  getRewardedAdConfig,
  getRewardedAdHistory,
  verifyRewardedAd,
  type CreditWallet as Wallet,
  type CreditTransaction,
  type RewardedAdCreditConfig,
  type RewardedAdCreditEvent,
  type EarnResult,
  type AiFeatureCost,
  getAiFeatureCost,
  spendAiCredits,
  unlockFeatureViaAd,
} from "@/lib/credits";
import { logAdEvent, hasRewardedAdProvider, fetchAdConfig } from "@/lib/ad-config";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";
import { getClientHash, REWARDED_AD_BRIDGES } from "@/lib/rewarded-access";

// ───────────────────────────────────────────────────────
// Main Credits Wallet Component
// ───────────────────────────────────────────────────────

export function CreditsWallet({ userId }: { userId: string }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [config, setConfig] = useState<RewardedAdCreditConfig | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [adHistory, setAdHistory] = useState<RewardedAdCreditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "history" | "ads">("overview");
  const [showEarnModal, setShowEarnModal] = useState(false);
  const [adProviderReady, _setAdProviderReady] = useState(false);
  const [todayEarned, setTodayEarned] = useState(0);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [w, tx, cfg, adHist] = await Promise.all([
      getCreditWallet(userId),
      getCreditTransactions(userId, { limit: 20 }),
      getRewardedAdConfig(),
      getRewardedAdHistory(20),
    ]);
    setWallet(w);
    setTransactions(tx.transactions);
    setConfig(cfg);
    setAdHistory(adHist);

    // Count today's earned
    const today = new Date().toISOString().split("T")[0];
    const todayCount = adHist.filter(
      (e) => e.created_at.startsWith(today) && e.status === "completed",
    ).length;
    setTodayEarned(todayCount);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2
          aria-hidden="true"
          className="h-6 w-6 animate-spin text-brand-purple"
        />
      </div>
    );
  }

  const dailyLimit = config?.daily_earn_limit ?? 10;
  const creditsPerAd = config?.credits_per_ad ?? 5;
  const canEarn =
    config?.is_enabled && todayEarned < dailyLimit && adProviderReady;

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-background p-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary-foreground/70">FRELUX Credits</p>
            <p className="mt-1 text-4xl font-bold">{wallet?.balance ?? 0}</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <Coins className="h-7 w-7 text-accent-green" />
          </div>
        </div>
        <div className="mt-4 flex gap-4 text-xs text-primary-foreground/60">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> Earned:{" "}
            {wallet?.total_earned ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5" /> Spent:{" "}
            {wallet?.total_spent ?? 0}
          </span>
        </div>
      </div>

      {/* Earn Credits Button */}
      {config?.is_enabled && (
        <Button variant="ghost"
          type="button"
          onClick={() => setShowEarnModal(true)}
          disabled={!canEarn}
          className={classNames(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all",
            canEarn
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "cursor-not-allowed bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground",
          )}
        >
          <PlayCircle className="h-5 w-5" />
          {canEarn
            ? `Watch Ad — +${creditsPerAd} Credits`
            : adProviderReady
              ? "Daily limit reached"
              : "Coming soon"}
        </Button>
      )}

      {/* Daily limit progress */}
      {config?.is_enabled && (
        <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-muted-foreground">
          <span>Today's ad earnings</span>
          <span className="font-medium">
            {todayEarned} / {dailyLimit}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border p-1 dark:border-white/10">
        {(
          [
            ["overview", "Overview"],
            ["history", "Transactions"],
            ["ads", "Ad History"],
          ] as const
        ).map(([key, label]) => (
          <Button variant="ghost"
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={classNames(
              "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
              tab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-card-foreground dark:text-muted-foreground dark:hover:text-primary-foreground",
            )}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border p-4 dark:border-white/10">
            <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
              How Credits Work
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground dark:text-muted-foreground">
              FRELUX Credits are your access currency for AI-powered features.
              Earn credits by watching short rewarded ads, then spend them to
              unlock AI tools like the Color Consultant, Building Estimator, and
              more.
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground/80">
                <Film className="h-3.5 w-3.5 text-brand-purple" />
                Watch a rewarded ad to earn {creditsPerAd} credits
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground/80">
                <Coins className="h-3.5 w-3.5 text-accent-green" />
                Spend credits on AI features (cost varies per feature)
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground/80">
                <Clock
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted-foreground"
                />
                Up to {dailyLimit} ad rewards per day
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No transactions yet
            </p>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 dark:border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={classNames(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      tx.amount > 0
                        ? "bg-accent-green/10"
                        : "bg-primary/10",
                    )}
                  >
                    {tx.amount > 0 ? (
                      <TrendingUp className="h-4 w-4 text-accent-green" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-brand-purple" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground dark:text-primary-foreground">
                      {tx.reason}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span
                  className={classNames(
                    "text-sm font-bold",
                    tx.amount > 0
                      ? "text-accent-green"
                      : "text-muted-foreground dark:text-muted-foreground",
                  )}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "ads" && (
        <div className="space-y-2">
          {adHistory.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No ad history yet
            </p>
          ) : (
            adHistory.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 dark:border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Film className="h-4 w-4 text-brand-purple" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground dark:text-primary-foreground">
                      {evt.ad_provider}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(evt.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {evt.status === "completed" ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="h-4 w-4 text-accent-green"
                    />
                  ) : (
                    <AlertCircle
                      aria-hidden="true"
                      className="h-4 w-4 text-red-400"
                    />
                  )}
                  <span className="text-xs font-bold text-accent-green">
                    +{evt.credits_awarded}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Earn modal */}
      {showEarnModal && (
        <EarnCreditsModal
          userId={userId}
          config={config}
          todayEarned={todayEarned}
          onClose={() => setShowEarnModal(false)}
          onEarned={(newBalance, earned) => {
            setWallet((w) =>
              w
                ? {
                    ...w,
                    balance: newBalance,
                    total_earned: (w.total_earned ?? 0) + earned,
                  }
                : w,
            );
            setTodayEarned((c) => c + 1);
            load();
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────
// Earn Credits Modal — Watch Ad → Earn Credits
// ───────────────────────────────────────────────────────

function EarnCreditsModal({
  userId: _userId,
  config,
  todayEarned,
  onClose,
  onEarned,
}: {
  userId: string;
  config: RewardedAdCreditConfig | null;
  todayEarned: number;
  onClose: () => void;
  onEarned: (newBalance: number, creditsEarned: number) => void;
}) {
  const [phase, setPhase] = useState<
    | "idle"
    | "loading"
    | "watching"
    | "verifying"
    | "success"
    | "error"
    | "limit"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [earnedAmount, setEarnedAmount] = useState(0);
  const _adEventIdRef = useState(
    () => "ad_" + Date.now() + "_" + Math.random().toString(36).slice(2),
  )[0];

  const creditsPerAd = config?.credits_per_ad ?? 5;
  const dailyLimit = config?.daily_earn_limit ?? 10;
  const remaining = dailyLimit - todayEarned;

  async function handleWatchAd() {
    if (!config?.is_enabled) {
      setErrorMsg("Rewarded ads are currently disabled.");
      setPhase("error");
      return;
    }

    // Check if a real ad provider is configured
    const providerReady = await hasRewardedAdProvider();
    if (!providerReady) {
      setErrorMsg("No ad provider is configured yet. Please check back later!");
      setPhase("error");
      return;
    }

    if (remaining <= 0) {
      setPhase("limit");
      return;
    }

    setPhase("loading");

    // Generate a unique ad event ID for this ad impression
    const adEventId =
      "ad_" + Date.now() + "_" + Math.random().toString(36).slice(2);

    // Log impression
    await logAdEvent({
      event_type: "impression",
      tool_key: "earn_credits",
      metadata: { ad_event_id: adEventId, mode: "earn_credits" },
    });

    setPhase("watching");

    // Find an active provider with a real client-side rewarded bridge
    // (e.g. Monetag). The ad must be shown from this tap — mobile browsers
    // block window-opening ad formats outside a direct user gesture —
    // then we pass a client attestation token to the server.
    try {
      const { providers } = await fetchAdConfig();
      const activeProvider = providers.find(
        (p) =>
          (p.provider_type === "rewarded" || p.provider_type === "mixed") &&
          p.is_active &&
          REWARDED_AD_BRIDGES[p.slug],
      );

      if (!activeProvider) {
        setErrorMsg("No ad provider is configured yet. Please check back later!");
        setPhase("error");
        return;
      }

      const adResult = await REWARDED_AD_BRIDGES[activeProvider.slug](
        activeProvider,
        { ymid: getClientHash(), toolKey: "earn_credits" },
      );

      setPhase("verifying");

      const adToken = `att_${activeProvider.slug}_${adResult.mode}_${Date.now()}`;
      const result: EarnResult = await verifyRewardedAd(
        activeProvider.slug,
        adEventId,
        "earn_credits",
        {
          source: "credits_wallet",
          ad_mode: adResult.mode,
          ...(adResult.estimatedPrice != null
            ? { estimated_price: adResult.estimatedPrice }
            : {}),
        },
        adToken,
      );

      if (result.success) {
        setEarnedAmount(result.creditsEarned ?? creditsPerAd);
        setPhase("success");

        // Log reward
        await logAdEvent({
          event_type: "reward",
          tool_key: "earn_credits",
          revenue_estimated: 0,
          metadata: {
            ad_event_id: adEventId,
            credits_earned: result.creditsEarned,
          },
        });

        onEarned(result.newBalance ?? 0, result.creditsEarned ?? creditsPerAd);
      } else {
        const msg =
          result.error ?? "Ad verification failed. No credits were added.";
        setErrorMsg(msg);
        setPhase("error");

        // Log error
        await logAdEvent({
          event_type: "error",
          tool_key: "earn_credits",
          metadata: {
            ad_event_id: adEventId,
            error: result.code ?? result.error,
          },
        });
      }
    } catch (e) {
      const msg = e instanceof Error && e.message
        ? e.message
        : "The ad could not be loaded. Please try again.";
      setErrorMsg(msg);
      setPhase("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl dark:bg-card">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-background p-6 text-primary-foreground">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Gift aria-hidden="true" className="h-6 w-6 text-accent-green" />
              <h2 className="text-lg font-bold">Earn FRELUX Credits</h2>
            </div>
            <Button variant="ghost"
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </Button>
          </div>
          <p className="mt-2 text-sm text-primary-foreground/70">
            Watch a short ad to earn {creditsPerAd} FRELUX Credits. Credits can
            be spent on AI features.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Daily limit indicator */}
          <div className="mb-4 flex items-center justify-between rounded-lg border border-border p-3 dark:border-white/10">
            <span className="text-xs text-muted-foreground dark:text-muted-foreground">
              Today's progress
            </span>
            <span className="text-xs font-bold text-foreground dark:text-primary-foreground">
              {todayEarned} / {dailyLimit}
            </span>
          </div>

          {phase === "idle" && (
            <>
              <Button variant="default"
                type="button"
                onClick={handleWatchAd}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors hover:/90"
              >
                <PlayCircle className="h-5 w-5" />
                Watch Ad — +{creditsPerAd} Credits
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground dark:text-muted-foreground">
                Credits are only awarded after the ad is fully watched and
                verified.
              </p>

              {/* Divider */}
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-muted dark:bg-white/10" />
                <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  or
                </span>
                <div className="h-px flex-1 bg-muted dark:bg-white/10" />
              </div>

              {/* Complete Offers — separate from Watch Ad */}
              <Link
                to="/rewards?tab=offerwall"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
              >
                <ExternalLink className="h-5 w-5" />
                Complete Offers — Earn More Credits
              </Link>
              <p className="mt-2 text-center text-xs text-muted-foreground dark:text-muted-foreground">
                Surveys, app installs, and other offers. Rewards vary by offer.
              </p>
            </>
          )}

          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2
                aria-hidden="true"
                className="h-8 w-8 animate-spin text-brand-purple"
              />
              <p className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground/80">
                Loading ad…
              </p>
            </div>
          )}

          {phase === "watching" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Film className="h-10 w-10 text-brand-purple" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground/80">
                Ad playing…
              </p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                Please keep this tab open.
              </p>
            </div>
          )}

          {phase === "verifying" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2
                aria-hidden="true"
                className="h-8 w-8 animate-spin text-brand-purple"
              />
              <p className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground/80">
                Verifying ad completion…
              </p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                Credits will be added if the ad was completed.
              </p>
            </div>
          )}

          {phase === "success" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-green/10">
                <CheckCircle2
                  aria-hidden="true"
                  className="h-8 w-8 text-accent-green"
                />
              </div>
              <p className="text-lg font-bold text-foreground dark:text-primary-foreground">
                +{earnedAmount} Credits!
              </p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Added to your FRELUX Credits balance.
              </p>
              <Button variant="ghost"
                type="button"
                onClick={onClose}
                className="mt-2 rounded-xl bg-accent-green px-6 py-2.5 text-sm font-bold text-primary-foreground -green/90"
              >
                Done
              </Button>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
                <AlertCircle
                  aria-hidden="true"
                  className="h-8 w-8 text-red-400"
                />
              </div>
              <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                Ad unavailable
              </p>
              <p className="text-center text-xs text-muted-foreground dark:text-muted-foreground">
                {errorMsg}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                No credits were added.
              </p>
              <Button variant="ghost"
                type="button"
                onClick={() => setPhase("idle")}
                className="mt-2 rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
              >
                Try Again
              </Button>
            </div>
          )}

          {phase === "limit" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted dark:bg-white/5">
                <Clock
                  aria-hidden="true"
                  className="h-8 w-8 text-muted-foreground"
                />
              </div>
              <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                Daily limit reached
              </p>
              <p className="text-center text-xs text-muted-foreground dark:text-muted-foreground">
                You've earned the maximum {dailyLimit} credits from ads today.
                Come back tomorrow!
              </p>
              <Button variant="ghost"
                type="button"
                onClick={onClose}
                className="mt-2 rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────
// AI Feature Gate — Shows cost, "Use Credits" and "Watch Ad to Unlock"
// ───────────────────────────────────────────────────────

export function AiFeatureGate({
  featureKey,
  featureName,
  onUnlocked,
  onClose,
}: {
  featureKey: string;
  featureName: string;
  onUnlocked: () => void;
  onClose: () => void;
}) {
  const [featureCost, setFeatureCost] = useState<AiFeatureCost | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [spending, setSpending] = useState(false);
  const [adUnlocking, setAdUnlocking] = useState(false);
  const [error, setError] = useState("");
  const [_success, setSuccess] = useState(false);
  const [mode, setMode] = useState<"choice" | "ad_watching" | "success">(
    "choice",
  );
  const [adProviderReady, setAdProviderReady] = useState(false);

  useEffect(() => {
    hasRewardedAdProvider().then(setAdProviderReady);
  }, []);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await (await getSupabase()).auth.getUser();
      if (!user) {
        setError("Authentication required");
        setLoading(false);
        return;
      }
      const [cost, w] = await Promise.all([
        getAiFeatureCost(featureKey),
        getCreditWallet(user.id),
      ]);
      // Import inline to avoid circular dep issues
      setFeatureCost(cost);
      setWallet(w);
      setLoading(false);
    })();
  }, [featureKey]);

  async function handleUseCredits() {
    if (!featureCost || !wallet) return;
    setSpending(true);
    setError("");

    const idempotencyKey = `${featureKey}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const result = await spendAiCredits(featureKey, idempotencyKey);

    setSpending(false);

    if (result.success) {
      setSuccess(true);
      setMode("success");
      setTimeout(() => {
        onUnlocked();
      }, 800);
    } else {
      if (result.code === "INSUFFICIENT_CREDITS") {
        setError(
          `Not enough credits. You need ${featureCost.credit_cost} but have ${result.currentBalance ?? 0}.`,
        );
      } else if (result.code === "DAILY_LIMIT") {
        setError("Daily usage limit reached for this feature.");
      } else {
        setError(result.error ?? "Failed to spend credits.");
      }
    }
  }

  async function handleWatchAd() {
    if (!featureCost) return;
    if (!adProviderReady) {
      setError("No ad provider is configured yet. Please check back later!");
      return;
    }
    setAdUnlocking(true);
    setError("");
    setMode("ad_watching");

    const adEventId =
      "ad_unlock_" + Date.now() + "_" + Math.random().toString(36).slice(2);

    await logAdEvent({
      event_type: "impression",
      tool_key: featureKey,
      metadata: { ad_event_id: adEventId, mode: "unlock_feature" },
    });

    // Simulate ad watch (real SDK replaces this)
    setTimeout(async () => {
      const result = await unlockFeatureViaAd(featureKey, "adsense", adEventId);

      setAdUnlocking(false);

      if (result.success) {
        setSuccess(true);
        setMode("success");
        await logAdEvent({
          event_type: "reward",
          tool_key: featureKey,
          metadata: { ad_event_id: adEventId, mode: "unlock_feature" },
        });
        setTimeout(() => {
          onUnlocked();
        }, 800);
      } else {
        setError(
          result.error ?? "Ad verification failed. Feature not unlocked.",
        );
        setMode("choice");
      }
    }, 3000);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative rounded-2xl bg-card p-8 dark:bg-card">
          <Loader2
            aria-hidden="true"
            className="h-8 w-8 animate-spin text-brand-purple"
          />
        </div>
      </div>
    );
  }

  if (mode === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md rounded-2xl bg-card p-8 dark:bg-card">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-green/10">
              <CheckCircle2
                aria-hidden="true"
                className="h-8 w-8 text-accent-green"
              />
            </div>
            <p className="text-lg font-bold text-foreground dark:text-primary-foreground">
              ✓ Unlocked
            </p>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              {featureName} is ready to use.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;
  const canAfford = balance >= (featureCost?.credit_cost ?? 0);
  const adAvailable = featureCost?.ad_unlock_enabled ?? false;
  const canWatchAd = adAvailable && adProviderReady;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl dark:bg-card">
        <div className="bg-gradient-to-br from-background to-primary p-6 text-primary-foreground">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-6 w-6 text-accent-green" />
              <h2 className="text-lg font-bold">{featureName}</h2>
            </div>
            <Button variant="ghost"
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </Button>
          </div>
          <p className="mt-2 text-sm text-primary-foreground/70">
            {featureCost?.description ??
              "Use FRELUX Credits to access this AI feature."}
          </p>
        </div>

        <div className="p-6">
          {/* Balance */}
          <div className="mb-4 flex items-center justify-between rounded-lg border border-border p-3 dark:border-white/10">
            <span className="text-xs text-muted-foreground dark:text-muted-foreground">
              Your balance
            </span>
            <span className="flex items-center gap-1 text-sm font-bold text-foreground dark:text-primary-foreground">
              <Coins className="h-3.5 w-3.5 text-accent-green" />
              {balance} Credits
            </span>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}

          {mode === "ad_watching" ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2
                aria-hidden="true"
                className="h-8 w-8 animate-spin text-brand-purple"
              />
              <p className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground/80">
                Playing ad…
              </p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                Feature will unlock after the ad completes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Use Credits button */}
              <Button variant="ghost"
                type="button"
                onClick={handleUseCredits}
                disabled={spending || !canAfford}
                className={classNames(
                  "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all",
                  canAfford && !spending
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "cursor-not-allowed bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground",
                )}
              >
                {spending ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin"
                  />
                ) : (
                  <Coins className="h-5 w-5" />
                )}
                {canAfford
                  ? `Use ${featureCost?.credit_cost ?? 0} Credits`
                  : `Need ${featureCost?.credit_cost ?? 0} Credits`}
              </Button>

              {/* Watch Ad to Unlock button */}
              {canWatchAd && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-muted dark:bg-white/10" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      OR
                    </span>
                    <div className="h-px flex-1 bg-muted dark:bg-white/10" />
                  </div>
                  <Button variant="default"
                    type="button"
                    onClick={handleWatchAd}
                    disabled={adUnlocking}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-purple/30 px-4 py-3 text-sm font-bold text-brand-purple transition-all hover:disabled:opacity-50 dark:text-brand-purple"
                  >
                    {adUnlocking ? (
                      <Loader2
                        aria-hidden="true"
                        className="h-5 w-5 animate-spin"
                      />
                    ) : (
                      <PlayCircle className="h-5 w-5" />
                    )}
                    Watch Ad to Unlock
                  </Button>
                </>
              )}

              {!canAfford && !canWatchAd && (
                <p className="text-center text-xs text-muted-foreground dark:text-muted-foreground">
                  Not enough credits. Watch ads from the Credits page to earn
                  more.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
