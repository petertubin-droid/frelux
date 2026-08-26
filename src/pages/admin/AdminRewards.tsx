import { useState, useEffect, useCallback } from 'react';
import { Gem, TrendingUp, AlertTriangle, Save, Loader2, Gift, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { classNames } from '@/lib/utils';
import {
  adminGetAllWallets,
  adminGetAllTransactions,
  adminUpdateReward,
  adminUpdateSettings,
  adminAdjustCredits,
  getRewardCatalogue,
  getRewardSettings,
  type CreditWallet,
  type CreditTransaction,
  type RewardItem,
  type RewardSettings as RSettings,
} from '@/lib/credits';

export default function AdminRewards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'overview' | 'rewards' | 'settings' | 'suspicious'>('overview');
  const [wallets, setWallets] = useState<CreditWallet[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [_settings, setSettings] = useState<RSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingReward, setEditingReward] = useState<Record<string, { name: string; description: string; credit_cost: number; is_enabled: boolean }>>({});
  const [savingReward, setSavingReward] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<RSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [adjustingUser, setAdjustingUser] = useState('');
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

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
    const edit: Record<string, { name: string; description: string; credit_cost: number; is_enabled: boolean }> = {};
    rwd.forEach((r) => { edit[r.id] = { name: r.name, description: r.description, credit_cost: r.credit_cost, is_enabled: r.is_enabled }; });
    setEditingReward(edit);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSaveReward(rewardId: string) {
    setSavingReward(rewardId);
    const draft = editingReward[rewardId];
    if (!draft) { setSavingReward(null); return; }
    const ok = await adminUpdateReward(rewardId, draft);
    if (ok) {
      toast({ type: 'success', title: 'Reward updated' });
      await load();
    } else {
      toast({ type: 'error', title: 'Failed to update reward' });
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
      toast({ type: 'success', title: 'Settings saved' });
      setSettings(settingsDraft);
    } else {
      toast({ type: 'error', title: 'Failed to save settings' });
    }
    setSavingSettings(false);
  }

  async function handleAdjustCredits() {
    if (!user || !adjustingUser || !adjustAmount || !adjustReason) return;
    setAdjusting(true);
    const result = await adminAdjustCredits(user.id, adjustingUser, adjustAmount, adjustReason);
    if (result.success) {
      toast({ type: 'success', title: 'Credits adjusted', message: `New balance: ${result.newBalance}` });
      setAdjustingUser(''); setAdjustAmount(0); setAdjustReason('');
      await load();
    } else {
      toast({ type: 'error', title: 'Adjustment failed', message: result.error ?? 'Unknown error' });
    }
    setAdjusting(false);
  }

  // Suspicious activity: repeated reward events for same user
  const suspiciousTxs = transactions.filter(tx => {
    // Find users with many admin_adjust or repeated same-reference transactions
    return tx.type === 'admin_adjust' || (tx.reference_id && transactions.filter(t => t.reference_id === tx.reference_id).length > 2);
  });

  const totalCreditsInCirculation = wallets.reduce((sum, w) => sum + w.balance, 0);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-brand-purple" /></div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-brand-navy dark:text-white">FRELUX Credits & Rewards</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-neutral-200 dark:border-white/5">
        {([
          { key: 'overview', label: 'Overview', icon: TrendingUp },
          { key: 'rewards', label: 'Reward Catalogue', icon: Gift },
          { key: 'settings', label: 'Settings', icon: Settings },
          { key: 'suspicious', label: 'Suspicious Activity', icon: AlertTriangle },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={classNames(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
              tab === t.key ? 'border-brand-purple text-brand-purple' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-500'
            )}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
              <p className="text-xs text-neutral-500">Total Credits in Circulation</p>
              <p className="mt-1 text-2xl font-bold text-brand-purple">{totalCreditsInCirculation}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
              <p className="text-xs text-neutral-500">Active Wallets</p>
              <p className="mt-1 text-2xl font-bold text-brand-navy dark:text-white">{wallets.length}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
              <p className="text-xs text-neutral-500">Recent Transactions</p>
              <p className="mt-1 text-2xl font-bold text-brand-navy dark:text-white">{transactions.length}</p>
            </div>
          </div>

          {/* Admin credit adjustment */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
            <h3 className="mb-4 text-sm font-bold text-brand-navy dark:text-white">Adjust User Credits</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="block text-xs text-neutral-500 mb-1">User ID</label>
                <input
                  type="text" value={adjustingUser}
                  onChange={e => setAdjustingUser(e.target.value)}
                  placeholder="Paste user UUID"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                />
              </div>
              <div className="w-28">
                <label className="block text-xs text-neutral-500 mb-1">Amount</label>
                <input
                  type="number" value={adjustAmount}
                  onChange={e => setAdjustAmount(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-neutral-500 mb-1">Reason</label>
                <input
                  type="text" value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="Reason for adjustment"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                />
              </div>
              <button
                onClick={handleAdjustCredits}
                disabled={adjusting || !adjustingUser || !adjustAmount || !adjustReason}
                className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {adjusting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : 'Adjust'}
              </button>
            </div>
          </div>

          {/* Top wallets */}
          <div className="rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid">
            <h3 className="border-b border-neutral-100 px-5 py-3 text-sm font-bold text-brand-navy dark:border-white/5 dark:text-white">
              User Credit Balances (Top 50)
            </h3>
            <div className="divide-y divide-neutral-100 dark:divide-white/5 max-h-96 overflow-y-auto">
              {wallets.length === 0 && <p className="px-5 py-8 text-center text-sm text-neutral-500">No wallets yet.</p>}
              {wallets.map((w) => (
                <div key={w.user_id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-xs font-mono text-neutral-500">{w.user_id.slice(0, 8)}...</p>
                    <p className="text-xs text-neutral-500">Earned: {w.total_earned} · Spent: {w.total_spent}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Gem aria-hidden="true" className="h-3.5 w-3.5 text-brand-purple" />
                    <span className="text-sm font-bold text-brand-purple">{w.balance}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="rounded-xl border border-neutral-200 bg-white dark:border-white/5 dark:bg-brand-navy-mid">
            <h3 className="border-b border-neutral-100 px-5 py-3 text-sm font-bold text-brand-navy dark:border-white/5 dark:text-white">
              Recent Transactions (Top 50)
            </h3>
            <div className="divide-y divide-neutral-100 dark:divide-white/5 max-h-96 overflow-y-auto">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{tx.reason}</p>
                    <p className="text-xs text-neutral-500">
                      {tx.user_id.slice(0, 8)}... · {new Date(tx.created_at).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                  <span className={classNames('text-sm font-bold', tx.amount > 0 ? 'text-emerald-600' : 'text-rose-500')}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reward catalogue tab */}
      {tab === 'rewards' && (
        <div className="space-y-4">
          {rewards.map((reward) => {
            const draft = editingReward[reward.id];
            return (
              <div key={reward.id} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Name</label>
                    <input
                      type="text" value={draft?.name ?? ''}
                      onChange={e => setEditingReward(p => ({ ...p, [reward.id]: { ...p[reward.id], name: e.target.value } }))}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Credit Cost</label>
                    <input
                      type="number" value={draft?.credit_cost ?? 0}
                      onChange={e => setEditingReward(p => ({ ...p, [reward.id]: { ...p[reward.id], credit_cost: parseInt(e.target.value) || 0 } }))}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-neutral-500 mb-1">Description</label>
                    <textarea
                      value={draft?.description ?? ''}
                      onChange={e => setEditingReward(p => ({ ...p, [reward.id]: { ...p[reward.id], description: e.target.value } }))}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                      rows={2}
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox" checked={draft?.is_enabled ?? true}
                        onChange={e => setEditingReward(p => ({ ...p, [reward.id]: { ...p[reward.id], is_enabled: e.target.checked } }))}
                        className="rounded"
                      />
                      <span className="text-neutral-600 dark:text-neutral-300">Enabled</span>
                    </label>
                    <button
                      onClick={() => handleSaveReward(reward.id)}
                      disabled={savingReward === reward.id}
                      className="flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {savingReward === reward.id ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settings tab */}
      {tab === 'settings' && settingsDraft && (
        <div className="max-w-lg space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
            <label className="flex items-center gap-3 mb-4">
              <input
                type="checkbox" checked={settingsDraft.rewards_enabled}
                onChange={e => setSettingsDraft(s => s ? { ...s, rewards_enabled: e.target.checked } : s)}
                className="rounded"
              />
              <div>
                <p className="text-sm font-semibold text-brand-navy dark:text-white">Rewards Enabled</p>
                <p className="text-xs text-neutral-500">Master toggle for the entire rewards system</p>
              </div>
            </label>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Weekly Mission Reward (credits)</label>
                <input
                  type="number" value={settingsDraft.weekly_mission_credits}
                  onChange={e => setSettingsDraft(s => s ? { ...s, weekly_mission_credits: parseInt(e.target.value) || 0 } : s)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">7-Day Streak Reward (credits)</label>
                <input
                  type="number" value={settingsDraft.streak_7_day_credits}
                  onChange={e => setSettingsDraft(s => s ? { ...s, streak_7_day_credits: parseInt(e.target.value) || 0 } : s)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Streak Grace Days</label>
                <input
                  type="number" value={settingsDraft.streak_grace_days}
                  onChange={e => setSettingsDraft(s => s ? { ...s, streak_grace_days: parseInt(e.target.value) || 0 } : s)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-brand-navy dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="mt-4 flex items-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingSettings ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Suspicious activity tab */}
      {tab === 'suspicious' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="flex items-center gap-2">
              <AlertTriangle aria-hidden="true" className="h-5 w-5 text-amber-500" />
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Reviewing {suspiciousTxs.length} flagged transactions
              </p>
            </div>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
              Shows admin adjustments and transactions with repeated reference IDs that may indicate abuse.
            </p>
          </div>
          {suspiciousTxs.length === 0 ? (
            <p className="text-center text-sm text-neutral-500 py-8">No suspicious activity detected.</p>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-white/5 rounded-xl border border-neutral-200 dark:border-white/5">
              {suspiciousTxs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{tx.reason}</p>
                    <p className="text-xs text-neutral-500">
                      {tx.user_id.slice(0, 8)}... · {tx.type} · Ref: {tx.reference_id?.slice(0, 20) ?? 'N/A'}
                    </p>
                  </div>
                  <span className={classNames('text-sm font-bold', tx.amount > 0 ? 'text-emerald-600' : 'text-rose-500')}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
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
