import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminHeader, AdminCard, StateMessage } from '@/components/admin/AdminUi';
import type { DbProfile } from '@/types/database';

type Status = 'loading' | 'ready' | 'error';

export default function AdminUsers() {
  const [users, setUsers] = useState<DbProfile[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) { setError(error.message); setStatus('error'); return; }
      setUsers((data ?? []) as DbProfile[]);
      setStatus('ready');
    }
    load();
  }, []);

  if (status === 'loading') return <><AdminHeader title="User Management" subtitle="View and manage user accounts." /><StateMessage type="loading" title="Loading…" message="Fetching users." /></>;
  if (status === 'error') return <><AdminHeader title="User Management" subtitle="View and manage user accounts." /><StateMessage type="error" title="Error" message={error} /></>;

  return (
    <>
      <AdminHeader title="User Management" subtitle="View and manage user accounts." />
      <AdminCard>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="py-3 pr-4 font-semibold text-neutral-500">Email</th>
                <th className="py-3 pr-4 font-semibold text-neutral-500">Role</th>
                <th className="py-3 pr-4 font-semibold text-neutral-500">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={3} className="py-8 text-center text-neutral-400">No users yet.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-neutral-100 last:border-0">
                  <td className="py-3 pr-4 font-medium text-brand-navy">{u.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${u.role === 'admin' ? 'bg-brand-purple/15 text-brand-purple' : 'bg-neutral-100 text-neutral-500'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-neutral-400">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </>
  );
}
