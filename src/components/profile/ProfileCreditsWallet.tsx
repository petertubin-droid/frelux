import React, { useState, useEffect, useCallback } from "react";
import { useCredits } from "@/lib/credits-context";
import { useAuth } from "@/lib/auth";
import {
  AI_CREDIT_COST,
  CREDITS_PER_AD,
  MAX_ADS_PER_DAY,
  getCreditTasks,
  completeCreditTask,
  CreditTask,
  getCreditTransactions,
  CreditTransaction,
  getTodayRewardedAdCount,
} from "@/lib/credits";
import { fetchAdConfig, hasRewardedAdProvider } from "@/lib/ad-config";
import {
  getCreditRewardCandidates,
  REWARDED_AD_BRIDGES,
} from "@/lib/rewarded-bridges";
import { getClientHash } from "@/lib/rewarded-access";
import {
  Coins,
  PlayCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ShoppingCart,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/components/ui/Toast";

export const ProfileCreditsWallet: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    wallet,
    refresh: refreshWallet,
    loading: walletLoading,
  } = useCredits();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<CreditTask[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [adWatching, setAdWatching] = useState(false);
  const [adMessage, setAdMessage] = useState<string | null>(null);
  const [adProviderReady, setAdProviderReady] = useState(false);
  const [todayAdCount, setTodayAdCount] = useState<number>(0);
  const navigate = useNavigate();

  const isDailyAdLimitReached = todayAdCount >= MAX_ADS_PER_DAY;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoadingTasks(true);
    try {
      const [tList, txRes, adCount] = await Promise.all([
        getCreditTasks(user.id),
        getCreditTransactions(user.id, { limit: 10 }),
        getTodayRewardedAdCount(user.id),
      ]);
      setTasks(tList);
      setTransactions(txRes.transactions);
      setTodayAdCount(adCount);
    } catch (err) {
      console.error("Failed to load profile credits data:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    hasRewardedAdProvider().then(setAdProviderReady);
  }, []);

  const handleWatchAd = async () => {
    if (!user || adWatching || !adProviderReady || isDailyAdLimitReached)
      return;
    setAdWatching(true);
    setAdMessage(null);
    try {
      const { providers } = await fetchAdConfig();
      const provider = getCreditRewardCandidates(providers)[0];
      if (!provider || provider.slug !== "ayet_studios") {
        setAdMessage(
          t("No server-verified video provider is available right now."),
        );
        return;
      }
      const result = await REWARDED_AD_BRIDGES.ayet_studios(provider, {
        ymid: getClientHash(),
        toolKey: "earn_credits",
      });
      if (!result.verifiedCreditsEarned || !result.verifiedBalance) {
        setAdMessage(
          t(
            "ayeT has not confirmed the reward yet. No credits were added by this page.",
          ),
        );
        return;
      }
      await refreshWallet();
      await loadData();
      setAdMessage(
        `ayeT securely verified the video. +${result.verifiedCreditsEarned} credits added.`,
      );
    } catch (error) {
      setAdMessage(
        error instanceof Error
          ? error.message
          : t("The rewarded video could not be verified."),
      );
    } finally {
      setAdWatching(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      const res = await completeCreditTask(user.id, taskId);
      if (res.success) {
        await refreshWallet();
        await loadData();
        toast({
          type: "success",
          title: t("Task completed"),
          message: t("Credits have been added to your balance."),
        });
      } else {
        toast({
          type: "error",
          title: t("Task verification failed"),
          message: res.error || t("Failed to complete task. Please try again."),
        });
      }
    } catch (_e) {
      toast({
        type: "error",
        title: t("Task error"),
        message: t("An error occurred while updating the task."),
      });
    }
  };

  return (
    <div className="border border-border/80 rounded-2xl bg-card p-6 shadow-sm mb-8">
      {/* Header & Balance */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-bold text-foreground">
              {t("AI Credits & Rewards Wallet")}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t(
              "Centralized balance for all FRELUX AI tools (AI Building Estimation, Smart Color Assistant, Studio).",
            )}
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/20 px-4 py-2.5 rounded-xl flex items-center gap-3">
          <div>
            <div className="text-[11px] uppercase font-semibold text-primary tracking-wider">
              {t("Available Balance")}
            </div>
            {walletLoading ? (
              <div className="flex items-center gap-1.5 py-1 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span className="text-xs text-muted-foreground">
                  {t("Loading...")}
                </span>
              </div>
            ) : wallet !== null ? (
              <div className="text-2xl font-black text-primary">
                {wallet.balance}{" "}
                <span className="text-sm font-medium">{t("Credits")}</span>
              </div>
            ) : (
              <div className="text-sm font-semibold text-muted-foreground py-1">
                {t("Balance unavailable")}
              </div>
            )}
          </div>
          <Coins className="w-8 h-8 text-primary/40" aria-hidden="true" />
        </div>
      </div>

      {/* Credit Economics Notice */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-center">
          <div className="text-xs text-muted-foreground">
            {t("Standard AI Operation")}
          </div>
          <div className="text-base font-bold text-foreground mt-0.5">
            {AI_CREDIT_COST} {t("Credits")}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {t("Uniform across all tools")}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-center">
          <div className="text-xs text-muted-foreground">
            {t("Rewarded Ad Grant")}
          </div>
          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            +{CREDITS_PER_AD} {t("Credits")}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Max {MAX_ADS_PER_DAY} ads daily ({todayAdCount}/{MAX_ADS_PER_DAY}{" "}
            watched)
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-center">
          <div className="text-xs text-muted-foreground">
            {t("Pro Subscribers")}
          </div>
          <div className="text-base font-bold text-primary mt-0.5">
            {t("Standard AI Included")}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {t("Standard tools exempt from credit deductions")}
          </div>
        </div>
      </div>

      {/* Earn Credits Actions */}
      <div className="space-y-6">
        {/* Rewarded Ads Earning Section */}
        <div className="p-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" aria-hidden="true" />
              <h3 className="font-semibold text-sm text-foreground">
                {t("Watch Partner Ad to Earn Credits")}
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {todayAdCount} / {MAX_ADS_PER_DAY} {t("watched today")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isDailyAdLimitReached ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertCircle
                    className="w-3.5 h-3.5 inline"
                    aria-hidden="true"
                  />
                  {`Daily limit reached (${todayAdCount}/${MAX_ADS_PER_DAY} ads watched today, ${MAX_ADS_PER_DAY * CREDITS_PER_AD} credits earned). Check back tomorrow, complete eligible tasks, or purchase credit bundles.`}
                </span>
              ) : (
                <>
                  {adProviderReady
                    ? `You can watch ${MAX_ADS_PER_DAY - todayAdCount} more today.`
                    : t(
                        "Secure server verification is not configured yet. Ad rewards are temporarily unavailable.",
                      )}
                </>
              )}
            </p>
            {adMessage && (
              <p
                className="text-xs font-medium text-primary mt-1"
                role="status"
              >
                {adMessage}
              </p>
            )}
          </div>
          <button
            onClick={handleWatchAd}
            disabled={adWatching || isDailyAdLimitReached || !adProviderReady}
            aria-busy={adWatching}
            aria-label={
              adWatching
                ? t("Verifying Ad...")
                : isDailyAdLimitReached
                  ? `${t("Daily Limit Reached")} (${MAX_ADS_PER_DAY}/${MAX_ADS_PER_DAY})`
                  : adProviderReady
                    ? `${t("Watch Ad")} (+${CREDITS_PER_AD} ${t("Credits")})`
                    : t("Ads Temporarily Unavailable")
            }
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adWatching
              ? t("Verifying Ad...")
              : isDailyAdLimitReached
                ? `${t("Daily Limit Reached")} (${MAX_ADS_PER_DAY}/${MAX_ADS_PER_DAY})`
                : adProviderReady
                  ? `${t("Watch Ad")} (+${CREDITS_PER_AD} ${t("Credits")})`
                  : t("Ads Temporarily Unavailable")}
          </button>
        </div>

        {/* Tasks Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-primary" aria-hidden="true" />
              {t("Eligible Reward Tasks")}
            </h3>
            <span className="text-xs text-muted-foreground">
              {t("Earn credits by completing platform milestones")}
            </span>
          </div>

          <div className="space-y-2">
            {loadingTasks ? (
              <div className="text-xs text-muted-foreground py-4 text-center">
                {t("Loading available reward tasks...")}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                {t("No active tasks available right now. Check back soon!")}
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border border-border flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      {task.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {task.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      +{task.credit_reward} {t("Credits")}
                    </span>
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={task.completed}
                      aria-label={`${task.completed ? t("Completed") : t("Verify Task")}: ${task.title}`}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {task.completed ? t("Completed") : t("Verify Task")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Buy Credits / Upgrade Section */}
        <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShoppingCart
                className="w-5 h-5 text-foreground"
                aria-hidden="true"
              />
              <h3 className="font-semibold text-sm text-foreground">
                {t("Need More Credits or Pro Subscription?")}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                "Purchase credit packages or subscribe to a monthly plan for uninterrupted AI estimations.",
              )}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => navigate("/pricing")}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              {t("Credit Bundles")}
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              {t("Subscription Plans")}
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Clock
                className="w-4 h-4 text-muted-foreground"
                aria-hidden="true"
              />
              {t("Recent AI Credit Activity")}
            </h3>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                {t("No recent credit activity found.")}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {isPositive ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <ArrowDownLeft
                              className="w-3.5 h-3.5"
                              aria-hidden="true"
                            />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                            <ArrowUpRight
                              className="w-3.5 h-3.5"
                              aria-hidden="true"
                            />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-foreground">
                            {tx.reason}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}{" "}
                            at{" "}
                            {new Date(tx.created_at).toLocaleTimeString(
                              undefined,
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
                      >
                        {isPositive ? `+${tx.amount}` : tx.amount}{" "}
                        {t("Credits")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
