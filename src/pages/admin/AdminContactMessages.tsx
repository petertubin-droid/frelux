import { useEffect, useState } from 'react';
import { Mail, Trash2, CheckCircle2, Archive } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {AdminHeader, AdminButton, StateMessage, AdminIconButton} from '@/components/admin/AdminUi';
import { AdminModal } from '@/components/admin/AdminModal';
import { classNames } from '@/lib/utils';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-accent-yellow/20 text-accent-yellow',
  read: 'bg-blue-100 text-blue-700',
  replied: 'bg-accent-green/15 text-accent-green',
  archived: 'bg-muted text-muted-foreground',
};

export default function AdminContactMessages() {
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ContactMessage | null>(null);

  async function load() {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    setItems((data ?? []) as ContactMessage[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('contact_messages').update({ status }).eq('id', id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    setViewing((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
  }

  async function del(id: string) {
    const { error } = await supabase.from('contact_messages').delete().eq('id', id);
    if (error) { setError(error.message); return; }
    setItems((prev) => prev.filter((m) => m.id !== id));
    setViewing(null);
  }

  return (
    <>
      <AdminHeader title="Contact Messages" subtitle="Submissions from the public contact form." />
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading ? <StateMessage type="loading" title="Loading…" message="Fetching contact messages." />
        : items.length === 0 ? <StateMessage type="empty" title="No messages" message="Contact form submissions will appear here." />
        : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="card p-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground truncate">{item.subject}</h3>
                      <span className={classNames('rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', STATUS_STYLES[item.status] ?? STATUS_STYLES.new)}>{item.status}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground dark:text-muted-foreground">{item.name} · {item.email} · {new Date(item.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <AdminButton variant="secondary" onClick={() => { setViewing(item); if (item.status === 'new') updateStatus(item.id, 'read'); }}><Mail className="h-3.5 w-3.5" /> View</AdminButton>
                  <AdminIconButton variant="danger" type="button" onClick={() => del(item.id)}  aria-label="Delete"><Trash2 className="h-4 w-4" /></AdminIconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      {viewing && (
        <AdminModal open onClose={() => setViewing(null)} title={viewing.subject} maxWidth="max-w-2xl">
            <div className="space-y-1 text-sm text-muted-foreground dark:text-muted-foreground">
              <p><span className="font-semibold text-card-foreground dark:text-muted-foreground/80">From:</span> {viewing.name} ({viewing.email})</p>
              <p><span className="font-semibold text-card-foreground dark:text-muted-foreground/80">Date:</span> {new Date(viewing.created_at).toLocaleString()}</p>
            </div>
            <div className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm text-card-foreground dark:bg-card-foreground/90 dark:text-muted-foreground/60">{viewing.message}</div>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <a href={`mailto:${viewing.email}?subject=Re: ${encodeURIComponent(viewing.subject)}`}>
                <AdminButton variant="secondary"><Mail className="h-4 w-4" /> Reply by email</AdminButton>
              </a>
              {viewing.status !== 'replied' && <AdminButton variant="secondary" onClick={() => updateStatus(viewing.id, 'replied')}><CheckCircle2 className="h-4 w-4" /> Mark replied</AdminButton>}
              {viewing.status !== 'archived' && <AdminButton variant="secondary" onClick={() => updateStatus(viewing.id, 'archived')}><Archive className="h-4 w-4" /> Archive</AdminButton>}
            </div>
        </AdminModal>
      )}
    </>
  );
}
