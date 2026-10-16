import React, { useState, useEffect } from "react";
import { useCredits } from "@/lib/credits-context";
import { useAuth } from "@/lib/auth";
import {
  getCreditTasks,
  completeCreditTask,
  CreditTask,
  getCreditTransactions,
  CreditTransaction,
  verifyRewardedAd,
  MAX_ADS_PER_DAY,
  getTodayRewardedAdCount,
} from "@/lib/credits";
import { fetchAdConfig } from "@/lib/ad-config";
import { getBridgedAdCandidates, REWARDED_AD_BRIDGES } from "@/lib/rewarded-bridges";
import { getClientHash } from "@/lib/rewarded-access";
import {
  Coins,
  Sparkles,
  PlayCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ProfileCreditsWallet: React.FC = () => {
  const { user } = useAuth();
  const { wallet, refresh: refreshWallet } = useCredits();
  const [tasks, setTasks] = useState<CreditTask[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [adWatching, setAdWatching] = useState(false);
  const [adMessage, setAdMessage] = useState<string | null>(null);
  const [todayAdCount, setTodayAdCount] = useState<number>(0);
  const navigate = useNavigate();

  const isDailyAdLimitReached = todayAdCount >= MAX_ADS_PER_DAY;

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleWatchAd = async () => {
    if (!user) return;
    if (isDailyAdLimitReached) {
      setAdMessage(
        "Daily limit reached (maximum 4 ads per day). Come back tomorrow to earn more credits!",
      );
      return;
    }

    setAdWatching(true);
    setAdMessage(null);
    try {
      // Show an actual rewarded ad from the user's click before asking the
      // server to award credits. Never call verification with no ad view.
      const { providers } = await fetchAdConfig();
      const candidates = getBridgedAdCandidates(providers);
      let completedProvider: string | null = null;
      let adMode: string | null = null;
      let lastError = "No eligible rewarded advertisement is available.";
      for (const provider of candidates) {
        const bridge = REWARDED_AD_BRIDGES[provider.slug];
        if (!bridge) continue;
        try {
          const view = await bridge(provider, {
            ymid: getClientHash(),
            toolKey: "earn_credits",
          });
          if (view.valued !== true) {
            throw new Error("The ad provider did not confirm completion.");
          }
          completedProvider = provider.slug;
          adMode = view.mode;
          break;
        } catch (error) {
          lastError =
            error instanceof Error ? error.message : "The ad could not be loaded.";
        }
      }
      if (!completedProvider || !adMode) {
        setAdMessage(lastError);
        return;
      }

      const adEventId = `profile_ad_${user.id}_${Date.now()}`;
      const adToken = `att_${completedProvider}_${adMode}_${Date.now()}`;
      const res = await verifyRewardedAd(
        completedProvider,
        adEventId,
        "earn_credits",
        { source: "profile_wallet", ad_mode: adMode },
        adToken,
      );
      if (res.success) {
        setAdMessage(`Successfully earned ${res.creditsEarned ?? 5} credits!`);
        await refreshWallet();
        await loadData();
      } else {
        if (res.code === "DAILY_LIMIT") {
          setTodayAdCount(MAX_ADS_PER_DAY);
        }
        setAdMessage(
          res.error ||
            "No eligible rewarded advertisement available at this moment.",
        );
      }
    } catch (_e) {
      setAdMessage(
        "Unable to complete ad reward verification. Please try again later.",
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
      } else {
        alert(res.error || "Failed to complete task.");
      }
    } catch (_e) {
      alert("Error updating task.");
    }
  };

  return (
    <div className="border border-border/80 rounded-2xl bg-card p-6 shadow-sm mb-8">
      {/* Header & Balance */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              AI Credits & Rewards Wallet
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Centralized balance for all FRELUX AI tools (AI Building Estimation,
            Smart Color Assistant, Studio).
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/20 px-4 py-2.5 rounded-xl flex items-center gap-3">
          <div>
            <div className="text-[10px] uppercase font-semibold text-primary tracking-wider">
              Available Balance
            </div>
            <div className="text-2xl font-black text-primary">
              {wallet?.balance ?? 0}{" "}
              <span className="text-sm font-medium">Credits</span>
            </div>
          </div>
          <Coins className="w-8 h-8 text-primary/40" />
        </div>
      </div>

      {/* Credit Economics Notice */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-center">
          <div className="text-xs text-muted-foreground">
            Standard AI Operation
          </div>
          <div className="text-base font-bold text-foreground mt-0.5">
            10 Credits
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Uniform across all tools
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-center">
          <div className="text-xs text-muted-foreground">Rewarded Ad Grant</div>
          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            +5 Credits
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Max 4 ads daily ({todayAdCount}/4 watched)
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-center">
          <div className="text-xs text-muted-foreground">Pro Subscribers</div>
          <div className="text-base font-bold text-primary mt-0.5">
            Unlimited Access
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Exempt from credit spends
          </div>
        </div>
      </div>

      {/* Earn Credits Actions */}
      <div className="space-y-6">
        {/* Rewarded Ads Earning Section (Capped at 4 ads / day) */}
        <div className="p-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">
                Watch Partner Ad to Earn Credits
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {todayAdCount} / {MAX_ADS_PER_DAY} watched today
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isDailyAdLimitReached ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 inline" />
                  Daily limit reached (4/4 ads watched today, 20 credits
                  earned). Check back tomorrow, complete eligible tasks, or
                  purchase credit bundles.
                </span>
              ) : (
                <>
                  Watch an eligible sponsor ad to earn{" "}
                  <strong>+5 credits</strong> (you can watch{" "}
                  {MAX_ADS_PER_DAY - todayAdCount} more today).
                </>
              )}
            </p>
            {adMessage && (
              <p className="text-xs font-medium text-primary mt-1">
                {adMessage}
              </p>
            )}
          </div>
          <button
            onClick={handleWatchAd}
            disabled={adWatching || isDailyAdLimitReached}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adWatching
              ? "Verifying Ad..."
              : isDailyAdLimitReached
                ? `Daily Limit Reached (${MAX_ADS_PER_DAY}/${MAX_ADS_PER_DAY})`
                : "Watch Ad (+5 Credits)"}
          </button>
        </div>

        {/* Tasks Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              Eligible Reward Tasks
            </h3>
            <span className="text-xs text-muted-foreground">
              Earn credits by completing platform milestones
            </span>
          </div>

          <div className="space-y-2">
            {loadingTasks ? (
              <div className="text-xs text-muted-foreground py-4 text-center">
                Loading available reward tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                No active tasks available right now. Check back soon!
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
                      +{task.credit_reward} Credits
                    </span>
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={task.completed}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {task.completed ? "Completed" : "Verify Task"}
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
              <ShoppingCart className="w-5 h-5 text-foreground" />
              <h3 className="font-semibold text-sm text-foreground">
                Need More Credits or Unlimited Access?
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Purchase credit packages or subscribe to a monthly plan for
              uninterrupted AI estimations.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => navigate("/pricing")}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              Credit Bundles
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              Subscription Plans
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent AI Credit Activity
            </h3>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No recent credit activity found.
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
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-foreground">
                            {tx.reason}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()} at{" "}
                            {new Date(tx.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
                      >
                        {isPositive ? `+${tx.amount}` : tx.amount} Credits
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
