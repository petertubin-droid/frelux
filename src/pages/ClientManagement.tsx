import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import {
  getClients, createClient, updateClient, deleteClient,
  getClientCommunications, addClientCommunication, deleteClientCommunication,
  getClientProjects,
} from '@/lib/crm';
import type { DbClient, DbClientCommunication } from '@/types/database';
import { Users, Plus, Mail, Phone, MapPin, Trash2, Edit, X, MessageCircle, Phone as PhoneIcon, Calendar, FileText, Loader2, Building2 } from 'lucide-react';
import { getSafeError } from "@/lib/safeError";
import { Button } from "@/components/ui/shadcn/button";

export default function ClientManagement() {
  const { user } = useAuth();
  const [clients, setClients] = useState<DbClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<DbClient | null>(null);

  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', address: '', notes: '' });

  const loadClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getClients(user.id);
      setClients(data);
    } catch (e) {
      setError(getSafeError(e, 'Failed to load clients'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadClients(); }, [loadClients]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      if (editingId) {
        await updateClient(editingId, user.id, form);
      } else {
        await createClient(user.id, form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', company: '', email: '', phone: '', address: '', notes: '' });
      await loadClients();
    } catch (e) {
      setError(getSafeError(e, 'Failed to save client'));
    }
  }

  async function handleDelete(id: string) {
    if (!user || !confirm('Delete this client? This cannot be undone.')) return;
    try {
      await deleteClient(id, user.id);
      await loadClients();
      if (selectedClient?.id === id) setSelectedClient(null);
    } catch (e) {
      setError(getSafeError(e, 'Failed to delete client'));
    }
  }

  function handleEdit(client: DbClient) {
    setForm({
      name: client.name,
      company: client.company ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
    });
    setEditingId(client.id);
    setShowForm(true);
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <PageHeader title="Client Management" subtitle="Sign in to manage your clients." />
        <p className="mt-8 text-center text-muted-foreground">Please sign in to access the CRM.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Client Management"
        subtitle="Track clients, project history, communications, and documents."
      />

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={() => setError(null)} className="mt-2 text-xs underline">Dismiss</Button>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        <Button
          onClick={() => { setForm({ name: '', company: '', email: '', phone: '', address: '', notes: '' }); setEditingId(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">{editingId ? 'Edit Client' : 'New Client'}</h3>
            <Button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}>
              <X aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground">Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Company</label>
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground">Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="default" type="submit" className="rounded-lg px-6 py-2 text-sm font-medium">
              {editingId ? 'Update' : 'Create'}
            </Button>
            <Button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
              className="rounded-lg border px-6 py-2 text-sm">Cancel</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-brand-purple" /></div>
      ) : clients.length === 0 ? (
        <div className="mt-8 rounded-lg border p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No clients yet. Add your first client to get started.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={() => handleEdit(client)}
              onDelete={() => handleDelete(client.id)}
              onSelect={() => setSelectedClient(client)}
            />
          ))}
        </div>
      )}

      {selectedClient && user && (
        <ClientDetailDrawer
          client={selectedClient}
          userId={user.id}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}

function ClientCard({ client, onEdit, onDelete, onSelect }: {
  client: DbClient;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
}) {
  return (
    <div className="rounded-lg border p-4 transition-colors hover:border-brand-purple/30">
      <div className="flex items-start justify-between">
        <div className="cursor-pointer" onClick={onSelect}>
          <h3 className="font-semibold text-foreground">{client.name}</h3>
          {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" onClick={onEdit} className="rounded p-1.5"><Edit aria-hidden="true" className="h-4 w-4" /></Button>
          <Button variant="ghost" onClick={onDelete} className="rounded p-1.5"><Trash2 aria-hidden="true" className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {client.email && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Mail aria-hidden="true" className="h-3 w-3" /> {client.email}</p>}
        {client.phone && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Phone aria-hidden="true" className="h-3 w-3" /> {client.phone}</p>}
        {client.address && <p className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin aria-hidden="true" className="h-3 w-3" /> {client.address}</p>}
      </div>
      {client.notes && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{client.notes}</p>}
      <Button onClick={onSelect} className="mt-3 text-xs font-medium text-brand-purple hover:underline">View details →</Button>
    </div>
  );
}

function ClientDetailDrawer({ client, userId, onClose }: {
  client: DbClient;
  userId: string;
  onClose: () => void;
}) {
  const [communications, setCommunications] = useState<DbClientCommunication[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; status: string; total_project_cost: number; currency_symbol: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCommForm, setShowCommForm] = useState(false);
  const [commForm, setCommForm] = useState({ type: 'note' as DbClientCommunication['type'], subject: '', body: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [comms, projs] = await Promise.all([
        getClientCommunications(client.id),
        getClientProjects(userId, client.name),
      ]);
      setCommunications(comms);
      setProjects(projs as typeof projects);
    } catch (e) {
      if (import.meta.env.DEV) console.error('Failed to load client details:', e);
    } finally {
      setLoading(false);
    }
  }, [client.id, client.name, userId]);

  useEffect(() => { load(); }, [load]);

  async function handleAddComm(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addClientCommunication(client.id, userId, commForm);
      setCommForm({ type: 'note', subject: '', body: '' });
      setShowCommForm(false);
      await load();
    } catch (e) {
      if (import.meta.env.DEV) console.error('Failed to add communication:', e);
    }
  }

  async function handleDeleteComm(id: string) {
    try {
      await deleteClientCommunication(id, userId);
      await load();
    } catch (e) {
      if (import.meta.env.DEV) console.error('Failed to delete:', e);
    }
  }

  const commIcons = { call: PhoneIcon, email: Mail, whatsapp: MessageCircle, meeting: Calendar, note: FileText };
  const statusColors: Record<string, string> = {
    draft: 'text-amber-600', in_progress: 'text-blue-600', on_hold: 'text-orange-600',
    completed: 'text-emerald-600', archived: 'text-muted-foreground',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 sm:items-center sm:justify-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">{client.name}</h2>
            {client.company && <p className="text-sm text-muted-foreground flex items-center gap-1"><Building2 aria-hidden="true" className="h-4 w-4" /> {client.company}</p>}
          </div>
          <Button onClick={onClose}><X aria-hidden="true" className="h-5 w-5 text-muted-foreground" /></Button>
        </div>

        <div className="mt-4 space-y-1">
          {client.email && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Mail aria-hidden="true" className="h-4 w-4" /> {client.email}</p>}
          {client.phone && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Phone aria-hidden="true" className="h-4 w-4" /> {client.phone}</p>}
          {client.address && <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin aria-hidden="true" className="h-4 w-4" /> {client.address}</p>}
          {client.notes && <p className="mt-3 rounded-lg border p-3 text-sm">{client.notes}</p>}
        </div>

        {/* Project History */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">Project History</h3>
          {loading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          ) : projects.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No projects linked to this client.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{p.currency_symbol}{(p.total_project_cost ?? 0).toLocaleString()}</p>
                    <p className={`text-xs ${statusColors[p.status] ?? ''}`}>{p.status.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Communications */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Communication History</h3>
            <Button onClick={() => setShowCommForm(!showCommForm)} className="text-xs font-medium text-brand-purple">
              {showCommForm ? 'Cancel' : '+ Log'}
            </Button>
          </div>

          {showCommForm && (
            <form onSubmit={handleAddComm} className="mt-2 space-y-2 rounded-lg border p-3">
              <select value={commForm.type} onChange={(e) => setCommForm({ ...commForm, type: e.target.value as DbClientCommunication['type'] })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="note">Note</option>
                <option value="call">Phone Call</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="meeting">Meeting</option>
              </select>
              <input value={commForm.subject} onChange={(e) => setCommForm({ ...commForm, subject: e.target.value })}
                placeholder="Subject..." className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
              <textarea rows={2} value={commForm.body} onChange={(e) => setCommForm({ ...commForm, body: e.target.value })}
                placeholder="Details..." className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
              <Button variant="default" type="submit" className="rounded-lg px-4 py-1.5 text-sm font-medium">Save</Button>
            </form>
          )}

          {loading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          ) : communications.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No communications logged yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {communications.map((comm) => {
                const Icon = commIcons[comm.type];
                return (
                  <div key={comm.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" />
                    <div className="flex-1">
                      {comm.subject && <p className="text-sm font-medium text-foreground">{comm.subject}</p>}
                      {comm.body && <p className="text-sm text-muted-foreground">{comm.body}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(comm.created_at).toLocaleString()}</p>
                    </div>
                    <Button onClick={() => handleDeleteComm(comm.id)} className="rounded p-1 hover:bg-accent">
                      <Trash2 aria-hidden="true" className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
