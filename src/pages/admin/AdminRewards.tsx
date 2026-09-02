import { useState, useEffect, useCallback } from "react";
import {
  Gem,
  TrendingUp,
  AlertTriangle,
  Save,
  Loader2,
  Gift,
  Settings,
  Crown,
  Database,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { classNames } from "@/lib/utils";
import {
  adminGetAllWallets,
  adminGetAllTransactions,
  adminUpdateReward,
  adminUpdateSettings,
  adminAdjustCredits,
  adminSeedRewards,
  getRewardCatalogue,
  getRewardSettings,
  type CreditWallet,
  type CreditTransaction,
  type RewardItem,
  type RewardSettings as RSettings,
} from "@/lib/credits";
import { Button } from "@/components/ui/shadcn/button";

export default function AdminRewards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<
    "overview" | "rewards" | "settings" | "suspicious"
  >("overview");
  const [wallets, setWallets] = useState<CreditWallet[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [_settings, setSettings] = useState<RSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingReward, setEditingReward] = useState<
    Record<
      string,
      {
        name: string;
        description: string;
        credit_cost: number;
        is_enabled: boolean;
      }
    >
  >({});
  const [savingReward, setSavingReward] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<RSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [adjustingUser, setAdjustingUser] = useState("");
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [w, tx, rwd, s] = await Promise.all([
      adminGetAllWallets(50),
      adminGetAllTransactions(50),
      getRewardCatalogue(),
      getRewardSettings(),
    ]);
    setWallets(w);
    setTransactions(tx);
    setRewards(rwd);
    setSettings(s);
    setSettingsDraft(s);
    // Initialize editing state for rewards
    const edit: Record<
      string,
      {
        name: string;
        description: string;
        credit_cost: number;
        is_enabled: boolean;
      }
    > = {};
    rwd.forEach((r) => {
      edit[r.id] = {
        name: r.name,
        description: r.description,
        credit_cost: r.credit_cost,
        is_enabled: r.is_enabled,
      };
    });
    setEditingReward(edit);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveReward(rewardId: string) {
    setSavingReward(rewardId);
    const draft = editingReward[rewardId];
    if (!draft) {
      setSavingReward(null);
      return;
    }
    const ok = await adminUpdateReward(rewardId, draft);
    if (ok) {
      toast({ type: "success", title: "Reward updated" });
      await load();
    } else {
      toast({ type: "error", title: "Failed to update reward" });
    }
    setSavingReward(null);
  }

  async function handleSaveSettings() {
    if (!settingsDraft) return;
    setSavingSettings(true);
    const ok = await adminUpdateSettings({
      rewards_enabled: settingsDraft.rewards_enabled,
      weekly_mission_credits: settingsDraft.weekly_mission_credits,
      streak_7_day_credits: settingsDraft.streak_7_day_credits,
      streak_grace_days: settingsDraft.streak_grace_days,
    });
    if (ok) {
      toast({ type: "success", title: "Settings saved" });
      setSettings(settingsDraft);
    } else {
      toast({ type: "error", title: "Failed to save settings" });
    }
    setSavingSettings(false);
  }

  async function handleSeedRewards() {
    setSeeding(true);
    const result = await adminSeedRewards();
    if (result.success) {
      toast({
        type: "success",
        title: "Rewards seeded",
        message: result.message ?? "4 rewards created/updated successfully.",
      });
      await load();
    } else {
      toast({
        type: "error",
        title: "Seeding failed",
        message: result.error ?? "Unknown error",
      });
    }
    setSeeding(false);
  }

  async function handleAdjustCredits() {
    if (!user || !adjustingUser || !adjustAmount || !adjustReason) return;
    setAdjusting(true);
    const result = await adminAdjustCredits(
      user.id,
      adjustingUser,
      adjustAmount,
      adjustReason,
    );
    if (result.success) {
      toast({
        type: "success",
        title: "Credits adjusted",
        message: `New balance: ${result.newBalance}`,
      });
      setAdjustingUser("");
      setAdjustAmount(0);
      setAdjustReason("");
      await load();
    } else {
      toast({
        type: "error",
        title: "Adjustment failed",
        message: result.error ?? "Unknown error",
      });
    }
    setAdjusting(false);
  }

  // Suspicious activity: repeated reward events for same user
  const suspiciousTxs = transactions.filter((tx) => {
    // Find users with many admin_adjust or repeated same-reference transactions
    return (
      tx.type === "admin_adjust" ||
      (tx.reference_id &&
        transactions.filter((t) => t.reference_id === tx.reference_id).length >
          2)
    );
  });

  const totalCreditsInCirculation = wallets.reduce(
    (sum, w) => sum + w.balance,
    0,
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2
          aria-hidden="true"
          className="h-8 w-8 animate-spin text-brand-purple"
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground dark:text-primary-foreground">
        FRELUX Credits & Rewards
      </h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border dark:border-white/5">
        {(
          [
            { key: "overview", label: "Overview", icon: TrendingUp },
            { key: "rewards", label: "Reward Catalogue", icon: Gift },
            { key: "settings", label: "Settings", icon: Settings },
            {
              key: "suspicious",
              label: "Suspicious Activity",
              icon: AlertTriangle,
            },
          ] as const
        ).map((t) => (
          <Button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={classNames(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              tab === t.key
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-muted-foreground hover:text-card-foreground dark:text-muted-foreground",
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </Button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
              <p className="text-xs text-muted-foreground">
                Total Credits in Circulation
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-purple">
                {totalCreditsInCirculation}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
              <p className="text-xs text-muted-foreground">Active Wallets</p>
              <p className="mt-1 text-2xl font-bold text-foreground dark:text-primary-foreground">
                {wallets.length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
              <p className="text-xs text-muted-foreground">Recent Transactions</p>
              <p className="mt-1 text-2xl font-bold text-foreground dark:text-primary-foreground">
                {transactions.length}
              </p>
            </div>
          </div>

          {/* Admin credit adjustment */}
          <div className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
            <h3 className="mb-4 text-sm font-bold text-foreground dark:text-primary-foreground">
              Adjust User Credits
            </h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">
                  User ID
                </label>
                <input
                  type="text"
                  value={adjustingUser}
                  onChange={(e) => setAdjustingUser(e.target.value)}
                  placeholder="Paste user UUID"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                />
              </div>
              <div className="w-28">
                <label className="block text-xs text-muted-foreground mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) =>
                    setAdjustAmount(parseInt(e.target.value) || 0)
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason for adjustment"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                />
              </div>
              <Button variant="default"
                onClick={handleAdjustCredits}
                disabled={
                  adjusting || !adjustingUser || !adjustAmount || !adjustReason
                }
                className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {adjusting ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  "Adjust"
                )}
              </Button>
            </div>
          </div>

          {/* Top wallets */}
          <div className="rounded-xl border border-border bg-card dark:border-white/5 dark:bg-card">
            <h3 className="border-b border-border/50 px-5 py-3 text-sm font-bold text-foreground dark:border-white/5 dark:text-primary-foreground">
              User Credit Balances (Top 50)
            </h3>
            <div className="divide-y divide-border/50 dark:divide-white/5 max-h-96 overflow-y-auto">
              {wallets.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No wallets yet.
                </p>
              )}
              {wallets.map((w) => (
                <div
                  key={w.user_id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">
                      {w.user_id.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Earned: {w.total_earned} · Spent: {w.total_spent}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Gem
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-brand-purple"
                    />
                    <span className="text-sm font-bold text-brand-purple">
                      {w.balance}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="rounded-xl border border-border bg-card dark:border-white/5 dark:bg-card">
            <h3 className="border-b border-border/50 px-5 py-3 text-sm font-bold text-foreground dark:border-white/5 dark:text-primary-foreground">
              Recent Transactions (Top 50)
            </h3>
            <div className="divide-y divide-border/50 dark:divide-white/5 max-h-96 overflow-y-auto">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm text-card-foreground dark:text-muted-foreground/80">
                      {tx.reason}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.user_id.slice(0, 8)}... ·{" "}
                      {new Date(tx.created_at).toLocaleString("en-NG", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <span
                    className={classNames(
                      "text-sm font-bold",
                      tx.amount > 0 ? "text-emerald-600" : "text-rose-500",
                    )}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reward catalogue tab */}
      {tab === "rewards" && (
        <div className="space-y-4">
          {/* Seed button */}
          <div className="flex items-center justify-between rounded-xl border border-brand-purple/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-brand-purple" />
              <div>
                <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                  Reward Catalogue
                </p>
                <p className="text-xs text-muted-foreground">
                  {rewards.length} reward{rewards.length !== 1 ? "s" : ""} in
                  catalogue
                </p>
              </div>
            </div>
            <Button variant="default"
              onClick={handleSeedRewards}
              disabled={seeding}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors hover:/90 disabled:opacity-50"
            >
              {seeding ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Crown aria-hidden="true" className="h-4 w-4" />
              )}
              {seeding ? "Seeding..." : "Seed 4 Core Rewards"}
            </Button>
          </div>

          {/* Empty state */}
          {rewards.length === 0 && !seeding && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-500/20 dark:bg-amber-500/5">
              <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
              <p className="mt-3 text-sm text-card-foreground dark:text-muted-foreground/80">
                No rewards found in the database.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click "Seed 4 Core Rewards" above to create them.
              </p>
            </div>
          )}

          {rewards.map((reward) => {
            const draft = editingReward[reward.id];
            return (
              <div
                key={reward.id}
                className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={draft?.name ?? ""}
                      onChange={(e) =>
                        setEditingReward((p) => ({
                          ...p,
                          [reward.id]: {
                            ...p[reward.id],
                            name: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Credit Cost
                    </label>
                    <input
                      type="number"
                      value={draft?.credit_cost ?? 0}
                      onChange={(e) =>
                        setEditingReward((p) => ({
                          ...p,
                          [reward.id]: {
                            ...p[reward.id],
                            credit_cost: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      value={draft?.description ?? ""}
                      onChange={(e) =>
                        setEditingReward((p) => ({
                          ...p,
                          [reward.id]: {
                            ...p[reward.id],
                            description: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                      rows={2}
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft?.is_enabled ?? true}
                        onChange={(e) =>
                          setEditingReward((p) => ({
                            ...p,
                            [reward.id]: {
                              ...p[reward.id],
                              is_enabled: e.target.checked,
                            },
                          }))
                        }
                        className="rounded"
                      />
                      <span className="text-muted-foreground dark:text-muted-foreground/80">
                        Enabled
                      </span>
                    </label>
                    <Button
                      onClick={() => handleSaveReward(reward.id)}
                      disabled={savingReward === reward.id}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {savingReward === reward.id ? (
                        <Loader2
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin"
                        />
                      ) : (
                        <Save aria-hidden="true" className="h-4 w-4" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settings tab */}
      {tab === "settings" && settingsDraft && (
        <div className="max-w-lg space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
            <label className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={settingsDraft.rewards_enabled}
                onChange={(e) =>
                  setSettingsDraft((s) =>
                    s ? { ...s, rewards_enabled: e.target.checked } : s,
                  )
                }
                className="rounded"
              />
              <div>
                <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                  Rewards Enabled
                </p>
                <p className="text-xs text-muted-foreground">
                  Master toggle for the entire rewards system
                </p>
              </div>
            </label>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Weekly Mission Reward (credits)
                </label>
                <input
                  type="number"
                  value={settingsDraft.weekly_mission_credits}
                  onChange={(e) =>
                    setSettingsDraft((s) =>
                      s
                        ? {
                            ...s,
                            weekly_mission_credits:
                              parseInt(e.target.value) || 0,
                          }
                        : s,
                    )
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  7-Day Streak Reward (credits)
                </label>
                <input
                  type="number"
                  value={settingsDraft.streak_7_day_credits}
                  onChange={(e) =>
                    setSettingsDraft((s) =>
                      s
                        ? {
                            ...s,
                            streak_7_day_credits: parseInt(e.target.value) || 0,
                          }
                        : s,
                    )
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Streak Grace Days
                </label>
                <input
                  type="number"
                  value={settingsDraft.streak_grace_days}
                  onChange={(e) =>
                    setSettingsDraft((s) =>
                      s
                        ? {
                            ...s,
                            streak_grace_days: parseInt(e.target.value) || 0,
                          }
                        : s,
                    )
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                />
              </div>
            </div>

            <Button variant="default"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {savingSettings ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="h-4 w-4" />
              )}
              Save Settings
            </Button>
          </div>
        </div>
      )}

      {/* Suspicious activity tab */}
      {tab === "suspicious" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="flex items-center gap-2">
              <AlertTriangle
                aria-hidden="true"
                className="h-5 w-5 text-amber-500"
              />
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Reviewing {suspiciousTxs.length} flagged transactions
              </p>
            </div>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
              Shows admin adjustments and transactions with repeated reference
              IDs that may indicate abuse.
            </p>
          </div>
          {suspiciousTxs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No suspicious activity detected.
            </p>
          ) : (
            <div className="divide-y divide-border/50 dark:divide-white/5 rounded-xl border border-border dark:border-white/5">
              {suspiciousTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm text-card-foreground dark:text-muted-foreground/80">
                      {tx.reason}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.user_id.slice(0, 8)}... · {tx.type} · Ref:{" "}
                      {tx.reference_id?.slice(0, 20) ?? "N/A"}
                    </p>
                  </div>
                  <span
                    className={classNames(
                      "text-sm font-bold",
                      tx.amount > 0 ? "text-emerald-600" : "text-rose-500",
                    )}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
