/**
 * Admin pane: Contractor Credit Profiles (Contractor Credit-Score
 * Engine)
 *
 * Full CRUD over contractor_credit_profiles. Every profile needs a
 * verification reference (audited job records, warranty certificate
 * hashes, lender file) - the engine refuses to score a contractor
 * from unverified stats, and refuses zero verified jobs rather than
 * scoring them zero.
 */

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  fetchContractorCreditProfiles,
  createContractorCreditProfile,
  updateContractorCreditProfile,
  deleteContractorCreditProfile,
} from "@/lib/estimation/queries";
import type { ContractorCreditProfile } from "@/types/estimation";
import { getSafeError } from "@/lib/safeError";
import {
  AdminButton,
  AdminHeader,
  AdminField,
  AdminIconButton,
  AdminInput,
  StateMessage,
} from "@/components/admin/AdminUi";

interface ProfileForm {
  contractor_name: string;
  registration_number: string;
  verified_jobs: string;
  on_time_jobs: string;
  dispute_count: string;
  avg_estimate_error_pct: string;
  description: string;
  verification_reference: string;
  effective_date: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: ProfileForm = {
  contractor_name: "",
  registration_number: "",
  verified_jobs: "",
  on_time_jobs: "",
  dispute_count: "",
  avg_estimate_error_pct: "",
  description: "",
  verification_reference: "",
  effective_date: new Date().toISOString().slice(0, 10),
  is_active: true,
  sort_order: "0",
};

function formFromProfile(p: ContractorCreditProfile): ProfileForm {
  return {
    contractor_name: p.contractor_name,
    registration_number: p.registration_number ?? "",
    verified_jobs: String(p.verified_jobs),
    on_time_jobs: String(p.on_time_jobs),
    dispute_count: String(p.dispute_count),
    avg_estimate_error_pct: String(p.avg_estimate_error_pct),
    description: p.description ?? "",
    verification_reference: p.verification_reference,
    effective_date: p.effective_date?.slice(0, 10) ?? "",
    is_active: p.is_active,
    sort_order: String(p.sort_order),
  };
}

function validate(f: ProfileForm): string | null {
  if (!f.contractor_name.trim()) return "Contractor name is required.";
  const int = (raw: string, label: string) => {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0)
      return `${label} must be a whole number of zero or more.`;
    return null;
  };
  const e1 = int(f.verified_jobs, "Verified jobs");
  if (e1) return e1;
  const e2 = int(f.on_time_jobs, "On-time jobs");
  if (e2) return e2;
  const e3 = int(f.dispute_count, "Dispute count");
  if (e3) return e3;
  if (Number(f.on_time_jobs) > Number(f.verified_jobs))
    return "On-time jobs cannot exceed verified jobs.";
  const err = Number(f.avg_estimate_error_pct);
  if (!Number.isFinite(err) || err < 0 || err > 100)
    return "Average estimate error must be a percentage between 0 and 100.";
  if (!f.verification_reference.trim())
    return "Verification reference is required (audited job records, warranty certificate hashes, lender file).";
  return null;
}

export default function AdminCreditProfiles() {
  const [profiles, setProfiles] = useState<ContractorCreditProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContractorCreditProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await fetchContractorCreditProfiles();
    if (error)
      setError(
        getSafeError(error, "Failed to load contractor credit profiles."),
      );
    else setProfiles(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: ContractorCreditProfile) => {
    setEditing(p);
    setForm(formFromProfile(p));
    setModalOpen(true);
  };

  const save = async () => {
    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    const payload = {
      contractor_name: form.contractor_name.trim(),
      registration_number: form.registration_number.trim() || undefined,
      verified_jobs: Number(form.verified_jobs),
      on_time_jobs: Number(form.on_time_jobs),
      dispute_count: Number(form.dispute_count),
      avg_estimate_error_pct: Number(form.avg_estimate_error_pct),
      description: form.description.trim() || undefined,
      verification_reference: form.verification_reference.trim(),
      effective_date: form.effective_date || undefined,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await updateContractorCreditProfile(editing.id, payload)
      : await createContractorCreditProfile(payload);
    if (error) setError(getSafeError(error, "Failed to save the profile."));
    else {
      setModalOpen(false);
      setMessage(editing ? "Profile updated." : "Profile created.");
      load();
    }
  };

  const remove = async (p: ContractorCreditProfile) => {
    if (
      !window.confirm(
        `Delete the profile '${p.contractor_name}'? This cannot be undone.`,
      )
    )
      return;
    const { error } = await deleteContractorCreditProfile(p.id);
    if (error) setError(getSafeError(error, "Failed to delete the profile."));
    else {
      setMessage("Profile deleted.");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <AdminHeader
        title="Contractor Credit Profiles"
        subtitle="Admin-verified contractor job statistics: the data behind the Credit-Score Engine. Every profile needs a verification reference (audited job records, warranty certificate hashes, lender file); the engine refuses to score zero verified jobs rather than scoring them zero."
        action={
          <AdminButton onClick={openCreate}>
            <Plus className="mr-1 inline h-4 w-4" /> Add profile
          </AdminButton>
        }
      />

      {error && <StateMessage type="error" title="Error" message={error} />}
      {message && !error && (
        <StateMessage type="empty" title="Saved" message={message} />
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3">Contractor</th>
              <th className="p-3">Registration</th>
              <th className="p-3 text-right">Verified jobs</th>
              <th className="p-3 text-right">On time</th>
              <th className="p-3 text-right">Disputes</th>
              <th className="p-3 text-right">Avg error %</th>
              <th className="p-3">Verification reference</th>
              <th className="p-3">Effective</th>
              <th className="p-3">Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="p-6 text-center text-muted-foreground"
                >
                  No profiles configured yet. The Credit-Score Engine refuses to
                  score a contractor without verified stats: add profiles from
                  verifiable job records (audited files, warranty certificate
                  hashes).
                </td>
              </tr>
            ) : (
              profiles.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border dark:border-white/5"
                >
                  <td className="p-3">{p.contractor_name}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {p.registration_number ?? "N/A"}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {p.verified_jobs}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {p.on_time_jobs}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {p.dispute_count}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {p.avg_estimate_error_pct}
                  </td>
                  <td
                    className="max-w-[220px] truncate p-3 text-xs text-muted-foreground"
                    title={p.verification_reference}
                  >
                    {p.verification_reference}
                  </td>
                  <td className="p-3 text-xs">{p.effective_date}</td>
                  <td className="p-3 text-xs">{p.is_active ? "Yes" : "No"}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <AdminIconButton onClick={() => openEdit(p)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </AdminIconButton>
                      <AdminIconButton
                        onClick={() => remove(p)}
                        title="Delete"
                        variant="danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </AdminIconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-4 shadow-lg">
            <h2 className="mb-3 text-lg font-semibold">
              {editing ? "Edit profile" : "Add profile"}
            </h2>
            <div className="grid gap-3">
              <AdminField label="Contractor name">
                <AdminInput
                  value={form.contractor_name}
                  onChange={(e) => set("contractor_name", e.target.value)}
                />
              </AdminField>
              <AdminField label="Registration number (optional: CAC / guild)">
                <AdminInput
                  value={form.registration_number}
                  onChange={(e) => set("registration_number", e.target.value)}
                />
              </AdminField>
              <AdminField label="Verified jobs (whole number)">
                <AdminInput
                  type="number"
                  step="1"
                  min="0"
                  value={form.verified_jobs}
                  onChange={(e) => set("verified_jobs", e.target.value)}
                />
              </AdminField>
              <AdminField label="On-time jobs (≤ verified jobs)">
                <AdminInput
                  type="number"
                  step="1"
                  min="0"
                  value={form.on_time_jobs}
                  onChange={(e) => set("on_time_jobs", e.target.value)}
                />
              </AdminField>
              <AdminField label="Dispute count (whole number)">
                <AdminInput
                  type="number"
                  step="1"
                  min="0"
                  value={form.dispute_count}
                  onChange={(e) => set("dispute_count", e.target.value)}
                />
              </AdminField>
              <AdminField label="Average estimate error (0–100 %)">
                <AdminInput
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.avg_estimate_error_pct}
                  onChange={(e) =>
                    set("avg_estimate_error_pct", e.target.value)
                  }
                />
              </AdminField>
              <AdminField label="Verification reference (required: audited job records, warranty hashes, lender file)">
                <AdminInput
                  value={form.verification_reference}
                  onChange={(e) =>
                    set("verification_reference", e.target.value)
                  }
                />
              </AdminField>
              <AdminField label="Description (optional)">
                <AdminInput
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </AdminField>
              <AdminField label="Effective date">
                <AdminInput
                  type="date"
                  value={form.effective_date}
                  onChange={(e) => set("effective_date", e.target.value)}
                />
              </AdminField>
              <AdminField label="Sort order">
                <AdminInput
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => set("sort_order", e.target.value)}
                />
              </AdminField>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                />
                Active
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <AdminButton
                variant="secondary"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </AdminButton>
              <AdminButton onClick={save}>
                {editing ? "Save changes" : "Create profile"}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
