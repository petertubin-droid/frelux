import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {AdminHeader, AdminCard, StateMessage, AdminSelect} from '@/components/admin/AdminUi';
import type { DbProfile, DbUserPaidStatus } from '@/types/database';
import { classNames } from '@/lib/utils';
import { Crown, Clock, X, Check } from 'lucide-react';
import { AdminButton } from '@/components/admin/AdminUi';

type Status = 'loading' | 'ready' | 'error';

interface UserWithPaid extends DbProfile {
  paid_status?: DbUserPaidStatus | null;
}

const PLAN_OPTIONS = [
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Enterprise' },
];

const DURATION_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: '0', label: 'Lifetime (no expiry)' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithPaid[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState('pro');
  const [editDays, setEditDays] = useState('30');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (profileError) { setError(profileError.message); setStatus('error'); return; }

    // Also load paid statuses — admin can read all (RLS policy added in Phase 2a)
    const { data: paidData, error: paidError } = await supabase
      .from('user_paid_status')
      .select('*');
    // paidError is OK — table might be empty or RLS might not grant admin yet
    const paidMap = new Map<string, DbUserPaidStatus>();
    if (!paidError && paidData) {
      for (const p of paidData as DbUserPaidStatus[]) {
        paidMap.set(p.user_id, p);
      }
    }

    const merged = (profiles ?? []).map((p: DbProfile) => ({
      ...p,
      paid_status: paidMap.get(p.id) ?? null,
    }));

    setUsers(merged);
    setStatus('ready');
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSubscription(userId: string) {
    setSaving(true);
    const days = parseInt(editDays, 10);
    const paidUntil = days > 0
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      : null; // null = lifetime

    // Write to user_paid_status using admin upsert
    // Note: this requires the admin to have INSERT/UPDATE access via RLS
    const { error: upsertError } = await supabase
      .from('user_paid_status')
      .upsert({
        user_id: userId,
        is_paid: true,
        plan: editPlan,
        paid_until: paidUntil,
        payment_provider: 'admin_grant',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      setError(`Failed to update subscription: ${upsertError.message}`);
      setSaving(false);
      return;
    }

    setEditingId(null);
    setSaving(false);
    await load(); // refresh
  }

  async function revokeSubscription(userId: string) {
    if (!confirm('Revoke this user\'s subscription? They will lose access to all premium features.')) return;
    setSaving(true);
    const { error: updateError } = await supabase
      .from('user_paid_status')
      .upsert({
        user_id: userId,
        is_paid: false,
        plan: null,
        paid_until: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (updateError) {
      setError(`Failed to revoke: ${updateError.message}`);
    } else {
      await load();
    }
    setSaving(false);
  }

  function startEdit(u: UserWithPaid) {
    setEditingId(u.id);
    setEditPlan(u.paid_status?.plan || 'pro');
    setEditDays('30');
  }

  if (status === 'loading') return <><AdminHeader title="User Management" subtitle="View and manage user accounts & subscriptions." /><StateMessage type="loading" title="Loading…" message="Fetching users." /></>;
  if (status === 'error') return <><AdminHeader title="User Management" subtitle="View and manage user accounts & subscriptions." /><StateMessage type="error" title="Error" message={error} /></>;

  return (
    <>
      <AdminHeader title="User Management" subtitle="View and manage user accounts & subscriptions." />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <AdminCard>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="py-3 pr-4 font-semibold text-neutral-500 dark:text-neutral-400">Email</th>
                <th className="py-3 pr-4 font-semibold text-neutral-500 dark:text-neutral-400">Role</th>
                <th className="py-3 pr-4 font-semibold text-neutral-500 dark:text-neutral-400">Subscription</th>
                <th className="py-3 pr-4 font-semibold text-neutral-500 dark:text-neutral-400">Plan</th>
                <th className="py-3 pr-4 font-semibold text-neutral-500 dark:text-neutral-400">Expires</th>
                <th className="py-3 pr-4 font-semibold text-neutral-500 dark:text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-neutral-400 dark:text-neutral-500">No users yet.</td></tr>
              ) : users.map((u) => {
                const isActive = u.paid_status?.is_paid && (!u.paid_status?.paid_until || new Date(u.paid_status.paid_until) > new Date());
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="py-3 pr-4 font-medium text-brand-navy dark:text-white">{u.email}</td>
                    <td className="py-3 pr-4">
                      <span className={classNames(
                        'rounded-full px-2 py-0.5 text-xs font-semibold capitalize',
                        u.role === 'admin' ? 'bg-brand-purple/15 text-brand-purple' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/15 px-2 py-0.5 text-xs font-semibold text-accent-green">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      ) : u.paid_status?.is_paid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                          <Clock className="h-3 w-3" /> Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-400 dark:bg-neutral-800">
                          <X className="h-3 w-3" /> Free
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-300">
                      {isEditing ? (
                        <AdminSelect value={editPlan} onChange={(e) => setEditPlan(e.target.value)} className="rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800">
                          {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </AdminSelect>
                      ) : (
                        u.paid_status?.plan ? <span className="capitalize">{u.paid_status.plan}</span> : '—'
                      )}
                    </td>
                    <td className="py-3 pr-4 text-neutral-400 dark:text-neutral-500">
                      {isEditing ? (
                        <AdminSelect value={editDays} onChange={(e) => setEditDays(e.target.value)} className="rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800">
                          {DURATION_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </AdminSelect>
                      ) : u.paid_status?.paid_until ? (
                        new Date(u.paid_status.paid_until).toLocaleDateString()
                      ) : u.paid_status?.is_paid ? 'Lifetime' : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <AdminButton
                            onClick={() => saveSubscription(u.id)}
                            disabled={saving}
                            className="text-xs py-1"
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </AdminButton>
                          <AdminButton
                            variant="secondary"
                            onClick={() => setEditingId(null)}
                            className="text-xs py-1"
                          >
                            Cancel
                          </AdminButton>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AdminButton
                            variant="secondary"
                            onClick={() => startEdit(u)}
                            className="text-xs py-1 text-brand-purple hover:bg-brand-purple/5"
                          >
                            <Crown className="mr-1 inline h-3 w-3" />
                            {isActive ? 'Extend' : 'Grant'}
                          </AdminButton>
                          {isActive && (
                            <AdminButton
                              variant="danger"
                              onClick={() => revokeSubscription(u.id)}
                              disabled={saving}
                              className="text-xs py-1"
                            >
                              Revoke
                            </AdminButton>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-300">
        <p className="font-semibold">Subscription Management</p>
        <p className="mt-1">Grant, extend, or revoke premium access for any user. Paid subscribers get access to all FRELUX engineering tools, calculators, and AI features. Granting access requires the admin RLS policy on <code className="rounded bg-blue-100 px-1 dark:bg-blue-900/40">user_paid_status</code> table.</p>
      </div>
    </>
  );
}
