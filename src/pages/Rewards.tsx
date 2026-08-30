import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Gem,
  Flame,
  Gift,
  Trophy,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  FileDown,
  Calculator,
  Crown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits-context";
import { useToast } from "@/components/ui/Toast";
import { useSeo } from "@/lib/seo";
import { classNames } from "@/lib/utils";
import { AchievementBadges } from "@/components/ui/AchievementBadges";
import {
  getRewardCatalogue,
  getCreditTransactions,
  getCurrentWeeklyMission,
  getMissionProgress,
  redeemReward,
  getUnusedRewardGrantCount,
  getRewardedAdConfig,
  getRewardedAdHistory,
  verifyRewardedAd,
  type RewardItem,
  type CreditTransaction,
  type WeeklyMission,
  type MissionProgress,
  type RewardedAdCreditConfig,
  type RewardedAdCreditEvent,
} from "@/lib/credits";
import { getClientHash } from "@/lib/rewarded-access";
import { PlayCircle, Film } from "lucide-react";

// Icon mapping for reward types
const rewardIcon: Record<string, typeof Sparkles> = {
  ai_token: Sparkles,
  pdf_export: FileDown,
  calc_unlock: Calculator,
  premium_week: Crown,
};

export default function Rewards() {
  useSeo({
    title: "FRELUX Rewards — Earn Credits & Unlock Features",
    description:
      "Earn FRELUX Credits by using the platform, complete weekly missions, maintain activity streaks, and redeem rewards.",
    canonicalPath: "/rewards",
  });

  const { user, session } = useAuth();
  const { wallet, streak, loading, refresh } = useCredits();
  const { toast } = useToast();

  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [mission, setMission] = useState<WeeklyMission | null>(null);
  const [missionProgress, setMissionProgress] = useState<MissionProgress[]>([]);
  const [activeTab, setActiveTab] = useState<
    "rewards" | "achievements" | "history"
  >("rewards");
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [unusedAiTokens, setUnusedAiTokens] = useState(0);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [adConfig, setAdConfig] = useState<RewardedAdCreditConfig | null>(null);
  const [adHistory, setAdHistory] = useState<RewardedAdCreditEvent[]>([]);
  const [watchingAd, setWatchingAd] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setRewardsLoading(true);
    try {
      const [rwd, txs, mis, tokens, adCfg, adHist] = await Promise.all([
        getRewardCatalogue(),
        getCreditTransactions(user.id, { limit: 20 }),
        getCurrentWeeklyMission(),
        getUnusedRewardGrantCount(user.id, "ai_token"),
        getRewardedAdConfig(),
        getRewardedAdHistory(10),
      ]);
      setRewards(rwd);
      setTransactions(txs.transactions);
      setMission(mis);
      setUnusedAiTokens(tokens);
      setAdConfig(adCfg);
      setAdHistory(adHist);
      if (mis) {
        const prog = await getMissionProgress(user.id, mis.id);
        setMissionProgress(prog);
      }
    } catch (err) {
      console.error("[Rewards] Failed to load data:", err);
    } finally {
      setRewardsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRedeem(reward: RewardItem) {
    if (!user || !session) return;
    if (redeeming) return; // prevent double-click

    if ((wallet?.balance ?? 0) < reward.credit_cost) {
      toast({
        type: "warning",
        title: "Not enough credits",
        message: `You need ${reward.credit_cost} credits to redeem this.`,
      });
      return;
    }

    setRedeeming(reward.reward_key);
    const idempotencyKey = `redeem_${reward.reward_key}_${Date.now()}`;
    const result = await redeemReward(
      session.access_token,
      reward.reward_key,
      idempotencyKey,
      getClientHash(),
    );

    if (result.success) {
      const effectMessage =
        reward.reward_type === "ai_token"
          ? `${reward.name} redeemed — you now have an extra AI estimate ready to use next time.`
          : reward.reward_type === "calc_unlock"
            ? `${reward.name} redeemed — the Advanced Calculator is unlocked for 24 hours.`
            : `${reward.name} has been redeemed.`;
      toast({
        type: "success",
        title: "Reward Unlocked!",
        message: effectMessage,
      });
      await refresh();
      await loadData();
    } else {
      if (result.error === "already_redeemed") {
        toast({
          type: "info",
          title: "Already redeemed",
          message: "This reward was already processed.",
        });
      } else if (result.error === "insufficient_credits") {
        toast({
          type: "warning",
          title: "Insufficient credits",
          message: "You don't have enough credits.",
        });
      } else {
        toast({
          type: "error",
          title: "Redemption failed",
          message: result.error ?? "Please try again.",
        });
      }
    }
    setRedeeming(null);
  }

  async function handleWatchAd() {
    if (!user || watchingAd) return;
    if (!adConfig?.is_enabled) {
      toast({ type: "warning", title: "Ads unavailable", message: "Rewarded ads are currently disabled." });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const todayEarned = adHistory.filter(
      (e) => e.created_at.startsWith(today) && e.status === "completed",
    ).length;
    const dailyLimit = adConfig?.daily_earn_limit ?? 10;

    if (todayEarned >= dailyLimit) {
      toast({
        type: "info",
        title: "Daily limit reached",
        message: `You can earn up to ${dailyLimit} ad credits per day. Come back tomorrow!`,
      });
      return;
    }

    setWatchingAd(true);
    try {
      // Generate a unique ad event ID
      const adEventId = `ad_${user.id}_${Date.now()}`;
      const adProvider = "frelux_rewarded";

      const result = await verifyRewardedAd(adProvider, adEventId, "earn_credits");
      if (result.success) {
        toast({
          type: "success",
          title: `+${result.creditsEarned} Credits!`,
          message: result.message ?? "Credits earned from watching ad.",
        });
        await refresh();
        await loadData();
      } else {
        if (result.code === "ALREADY_AWARDED") {
          toast({ type: "info", title: "Already rewarded", message: "This ad has already been counted." });
        } else if (result.code === "DAILY_LIMIT") {
          toast({ type: "info", title: "Daily limit reached", message: result.error ?? "Come back tomorrow!" });
        } else {
          toast({ type: "error", title: "Ad not verified", message: result.error ?? "Please try again." });
        }
      }
    } catch {
      toast({ type: "error", title: "Ad failed", message: "Unable to verify ad. Please try again." });
    } finally {
      setWatchingAd(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Gem className="mx-auto h-12 w-12 text-brand-purple/40" />
        <h1 className="mt-4 text-2xl font-bold text-brand-navy dark:text-white">
          FRELUX Rewards
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Sign in to start earning credits and unlocking rewards.
        </p>
        <Link
          to="/login?redirect=/rewards"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-purple px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-purple dark:text-neutral-500"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to home
      </Link>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-brand-navy dark:text-white">
          FRELUX Rewards
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
          Earn credits, complete missions, and unlock premium features.
        </p>
      </div>

      {/* Credit balance + streak overview */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Credits */}
        <div className="rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-transparent p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-purple/10">
              <Gem className="h-6 w-6 text-brand-purple" />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">
                FRELUX Credits
              </p>
              <p className="text-3xl font-bold text-brand-navy dark:text-white">
                {loading ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-6 w-6 animate-spin"
                  />
                ) : (
                  balance
                )}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-neutral-500">
            <span>Earned: {wallet?.total_earned ?? 0}</span>
            <span>Spent: {wallet?.total_spent ?? 0}</span>
          </div>
        </div>

        {/* Streak */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-transparent p-6 dark:border-amber-500/20 dark:from-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/10">
              <Flame className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">
                Activity Streak
              </p>
              <p className="text-3xl font-bold text-brand-navy dark:text-white">
                {loading ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-6 w-6 animate-spin"
                  />
                ) : (
                  (streak?.current_streak ?? 0)
                )}
                <span className="ml-1 text-base font-normal text-neutral-500">
                  day{(streak?.current_streak ?? 0) === 1 ? "" : "s"}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-neutral-500">
            <span>Best: {streak?.longest_streak ?? 0} days</span>
            <span>7-day streak → +50 credits</span>
          </div>
        </div>
      </div>

      {/* Watch Ad to Earn Credits */}
      {adConfig?.is_enabled && (() => {
        const today = new Date().toISOString().split("T")[0];
        const todayEarned = adHistory.filter(
          (e) => e.created_at.startsWith(today) && e.status === "completed",
        ).length;
        const dailyLimit = adConfig?.daily_earn_limit ?? 10;
        const creditsPerAd = adConfig?.credits_per_ad ?? 5;
        const canEarn = todayEarned < dailyLimit;

        return (
          <div className="mb-6 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-transparent p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-purple/10">
                  <Film className="h-6 w-6 text-brand-purple" />
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-navy dark:text-white">
                    Watch Ad — Earn {creditsPerAd} Credits
                  </p>
                  <p className="text-xs text-neutral-500">
                    Today: {todayEarned} / {dailyLimit} ads watched
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleWatchAd}
                disabled={!canEarn || watchingAd}
                className={classNames(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                  canEarn && !watchingAd
                    ? "bg-brand-purple text-white hover:bg-brand-purple/90"
                    : "cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-white/5 dark:text-neutral-600",
                )}
              >
                {watchingAd ? (
                  <>
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    {canEarn ? `Watch Ad (+${creditsPerAd})` : "Daily limit reached"}
                  </>
                )}
              </button>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
              <div
                className="h-full rounded-full bg-brand-purple transition-all duration-500"
                style={{ width: `${Math.min((todayEarned / dailyLimit) * 100, 100)}%` }}
              />
            </div>
          </div>
        );
      })()}

      {/* Weekly Mission */}
      {mission && (
        <WeeklyMissionCard mission={mission} progress={missionProgress} />
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-neutral-200 dark:border-white/5">
        {(
          [
            { key: "rewards", label: "Rewards", icon: Gift },
            { key: "achievements", label: "Achievements", icon: Trophy },
            { key: "history", label: "History", icon: Clock },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={classNames(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              activeTab === tab.key
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-500",
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "rewards" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {unusedAiTokens > 0 && (
            <div className="col-span-full flex items-start gap-2 rounded-xl border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-accent-green"
              />
              <span>
                You have <strong>{unusedAiTokens}</strong> unused AI Estimate
                Token{unusedAiTokens > 1 ? "s" : ""} — it&apos;ll be used
                automatically next time you hit your daily AI limit.
              </span>
            </div>
          )}
          {rewardsLoading && (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-white/5 dark:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-white/10" />
                      <div className="mt-2 h-3 w-48 rounded bg-neutral-100 dark:bg-white/5" />
                    </div>
                    <div className="h-8 w-14 rounded-lg bg-neutral-200 dark:bg-white/10" />
                  </div>
                  <div className="mt-4 h-10 rounded-xl bg-neutral-200 dark:bg-white/10" />
                </div>
              ))}
            </>
          )}
          {!rewardsLoading && rewards.length === 0 && (
            <p className="col-span-full text-center text-sm text-neutral-500 py-8">
              No rewards available.
            </p>
          )}
          {!rewardsLoading &&
            rewards.map((reward) => {
              const canAfford = balance >= reward.credit_cost;
              const isRedeeming = redeeming === reward.reward_key;
              const Icon = rewardIcon[reward.reward_type] ?? Gift;
              return (
                <div
                  key={reward.id}
                  className={classNames(
                    "rounded-2xl border p-5 transition-all",
                    canAfford
                      ? "border-brand-purple/20 bg-white dark:border-brand-purple/20 dark:bg-brand-navy-mid"
                      : "border-neutral-200 bg-neutral-50 opacity-70 dark:border-white/5 dark:bg-white/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-1 items-start gap-3">
                      <div
                        className={classNames(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          reward.reward_type === "ai_token"
                            ? "bg-purple-50 text-purple-500 dark:bg-purple-500/10"
                            : reward.reward_type === "pdf_export"
                              ? "bg-blue-50 text-blue-500 dark:bg-blue-500/10"
                              : reward.reward_type === "calc_unlock"
                                ? "bg-amber-50 text-amber-500 dark:bg-amber-500/10"
                                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-brand-navy dark:text-white">
                          {reward.name}
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                          {reward.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-brand-purple/10 px-2.5 py-1.5">
                      <Gem className="h-3.5 w-3.5 text-brand-purple" />
                      <span className="text-sm font-bold text-brand-purple">
                        {reward.credit_cost}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={!canAfford || isRedeeming}
                    className={classNames(
                      "mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                      canAfford && !isRedeeming
                        ? "bg-brand-purple text-white hover:bg-brand-purple/90 press-scale"
                        : "bg-neutral-200 text-neutral-400 dark:bg-white/5 dark:text-neutral-500 cursor-not-allowed",
                    )}
                  >
                    {isRedeeming ? (
                      <>
                        <Loader2
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin"
                        />{" "}
                        Processing...
                      </>
                    ) : canAfford ? (
                      <>
                        <Gift aria-hidden="true" className="h-4 w-4" /> Redeem
                      </>
                    ) : (
                      <>
                        <Lock aria-hidden="true" className="h-4 w-4" /> Need{" "}
                        {reward.credit_cost - balance} more
                      </>
                    )}
                  </button>
                </div>
              );
            })}
        </div>
      )}

      {activeTab === "achievements" && <AchievementBadges />}

      {activeTab === "history" && (
        <TransactionHistory transactions={transactions} />
      )}
    </div>
  );
}

// =========================================================
// Weekly Mission Card
// =========================================================
function WeeklyMissionCard({
  mission,
  progress,
}: {
  mission: WeeklyMission;
  progress: MissionProgress[];
}) {
  const tasks = mission.mission_config.tasks ?? [];
  const completedCount = tasks.filter((t) =>
    progress.find((p) => p.task_key === t.key && p.completed),
  ).length;
  const totalTasks = tasks.length;
  const overallProgress =
    totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <div className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-transparent p-6 dark:border-blue-500/20 dark:from-blue-500/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <h3 className="text-base font-bold text-brand-navy dark:text-white">
            This Week's Mission
          </h3>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 dark:bg-blue-500/10">
          <Gem className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            +{mission.mission_config.reward_credits}
          </span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
          <span>
            {completedCount}/{totalTasks} completed
          </span>
          <span>{overallProgress}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-500/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task) => {
          const prog = progress.find((p) => p.task_key === task.key);
          const current = prog?.progress ?? 0;
          const done = prog?.completed ?? false;
          return (
            <div
              key={task.key}
              className="flex items-center gap-3 rounded-lg border border-blue-100 bg-white p-3 dark:border-blue-500/10 dark:bg-white/5"
            >
              <div
                className={classNames(
                  "flex h-6 w-6 items-center justify-center rounded-full",
                  done
                    ? "bg-blue-500 text-white"
                    : "bg-blue-50 text-blue-400 dark:bg-blue-500/10",
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-bold">{current}</span>
                )}
              </div>
              <span
                className={classNames(
                  "flex-1 text-sm",
                  done
                    ? "text-neutral-500 line-through"
                    : "text-neutral-700 dark:text-neutral-300",
                )}
              >
                {task.label}
              </span>
              <span className="text-xs text-neutral-500">
                {current}/{task.target}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================
// Transaction History
// =========================================================
function TransactionHistory({
  transactions,
}: {
  transactions: CreditTransaction[];
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-white/5 dark:bg-brand-navy-mid">
        <Clock className="mx-auto h-8 w-8 text-neutral-300" />
        <p className="mt-3 text-sm text-neutral-500">
          No transactions yet. Start earning credits!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/5">
      <div className="divide-y divide-neutral-100 dark:divide-white/5">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 bg-white px-4 py-3 dark:bg-brand-navy-mid"
          >
            <div
              className={classNames(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                tx.amount > 0
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-500/10",
              )}
            >
              {tx.amount > 0 ? "↓" : "↑"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                {tx.reason}
              </p>
              <p className="text-xs text-neutral-500">
                {new Date(tx.created_at).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="text-right">
              <p
                className={classNames(
                  "text-sm font-bold",
                  tx.amount > 0 ? "text-emerald-600" : "text-rose-500",
                )}
              >
                {tx.amount > 0 ? "+" : ""}
                {tx.amount}
              </p>
              <p className="text-[10px] text-neutral-500">
                Bal: {tx.balance_after}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
