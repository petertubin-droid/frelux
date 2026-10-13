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
} from "@/lib/credits";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ProfileCreditsWallet: React.FC = () => {
  const { user } = useAuth();
  const { wallet, refreshWallet } = useCredits();
  const [tasks, setTasks] = useState<CreditTask[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [adWatching, setAdWatching] = useState(false);
  const [adMessage, setAdMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadData = async () => {
    if (!user) return;
    setLoadingTasks(true);
    try {
      const [tList, txRes] = await Promise.all([
        getCreditTasks(),
        getCreditTransactions(user.id, { limit: 10 }),
      ]);
      setTasks(tList);
      setTransactions(txRes.transactions);
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
    setAdWatching(true);
    setAdMessage(null);
    try {
      // Calls centralized verify-rewarded-ad edge function with earn_credits mode
      const res = await verifyRewardedAd(
        "monetag",
        `profile_ad_${Date.now()}`,
        "earn_credits",
      );
      if (res.success) {
        setAdMessage(`Successfully earned ${res.creditsEarned ?? 5} credits!`);
        await refreshWallet();
        await loadData();
      } else {
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
      const res = await completeCreditTask(taskId);
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
            2 Ads = 1 Standard AI Use
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
        {/* Rewarded Ads Earning Section */}
        <div className="p-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">
                Watch Partner Ad to Earn Credits
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Watch an eligible sponsor ad to earn <strong>+5 credits</strong>{" "}
              directly into your account balance.
            </p>
            {adMessage && (
              <p className="text-xs font-medium text-primary mt-1">
                {adMessage}
              </p>
            )}
          </div>
          <button
            onClick={handleWatchAd}
            disabled={adWatching}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50"
          >
            {adWatching ? "Verifying Ad..." : "Watch Ad (+5 Credits)"}
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
                      {task.task_title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {task.task_description}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      +{task.credit_reward} Credits
                    </span>
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors"
                    >
                      Verify Task
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
                            {tx.description || tx.action}
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
