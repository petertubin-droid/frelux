/**
 * Admin pane: Labour Rates (Labour & Crew Engine)
 *
 * Full CRUD over labour_rates. Validation mirrors the DB
 * constraints exactly (positive output per worker-day from a
 * verifiable source) so an admin can never save a configuration
 * the engine would have to refuse or guess.
 */

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import {
  AdminHeader,
  AdminButton,
  AdminField,
  StateMessage,
  Toggle,
  AdminIconButton,
  AdminInput,
  AdminTextarea,
} from "@/components/admin/AdminUi";
import { AdminModal } from "@/components/admin/AdminModal";
import {
  fetchLabourRates,
  createLabourRate,
  updateLabourRate,
  deleteLabourRate,
} from "@/lib/estimation/queries";
import type { LabourRate } from "@/types/estimation";

interface RateForm {
  task_key: string;
  task_label: string;
  unit: string;
  output_per_worker_day: string;
  description: string;
  source_reference: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: RateForm = {
  task_key: "",
  task_label: "",
  unit: "",
  output_per_worker_day: "",
  description: "",
  source_reference: "",
  is_active: true,
  sort_order: "0",
};

function formFromRate(r: LabourRate): RateForm {
  return {
    task_key: r.task_key,
    task_label: r.task_label ?? "",
    unit: r.unit,
    output_per_worker_day: String(r.output_per_worker_day),
    description: r.description ?? "",
    source_reference: r.source_reference,
    is_active: r.is_active,
    sort_order: String(r.sort_order),
  };
}

// Validation mirroring the DB constraints + engine requirements
function validate(f: RateForm): string | null {
  if (!f.task_key.trim())
    return "Task key is required (e.g. screeding_wall, emulsion_painting).";
  if (!f.unit.trim()) return "Unit is required (e.g. sqm, m, item).";
  const output = Number(f.output_per_worker_day);
  if (!Number.isFinite(output) || output <= 0)
    return "Output per worker-day must be a positive number — the engine never invents a productivity figure.";
  if (!f.source_reference.trim())
    return "Source reference is required — productivity rates must be verifiable (contractor data, benchmark study or literature).";
  return null;
}

export default function AdminLabourRates() {
  const [rates, setRates] = useState<LabourRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<LabourRate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RateForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchLabourRates();
    if (error) setError(error.message);
    else {
      setRates(data);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (r: LabourRate) => {
    setEditing(r);
    setForm(formFromRate(r));
    setShowForm(true);
  };

  const save = async () => {
    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }
    if (form.is_active) {
      const clash = rates.find(
        (r) =>
          r.is_active &&
          r.id !== editing?.id &&
          r.task_key.trim().toLowerCase() ===
            form.task_key.trim().toLowerCase(),
      );
      if (clash) {
        setError(
          `An active rate already exists for '${clash.task_key}'. Deactivate it first or edit it — only one active rate per task keeps the engine deterministic.`,
        );
        return;
      }
    }
    setError(null);
    setSaving(true);
    const payload = {
      task_key: form.task_key.trim(),
      task_label: form.task_label.trim() === "" ? null : form.task_label.trim(),
      unit: form.unit.trim(),
      output_per_worker_day: Number(form.output_per_worker_day),
      description:
        form.description.trim() === "" ? null : form.description.trim(),
      source_reference: form.source_reference.trim(),
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await updateLabourRate(editing.id, payload)
      : await createLabourRate(payload);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setShowForm(false);
      setSuccess(
        editing ? "Rate updated." : `Rate added for ${payload.task_key}.`,
      );
      load();
    }
  };

  const remove = async (r: LabourRate) => {
    if (!window.confirm(`Delete the ${r.task_key} rate?`)) return;
    const { error } = await deleteLabourRate(r.id);
    if (error) setError(error.message);
    else {
      setSuccess("Rate deleted.");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Labour Rates"
        subtitle="Admin-configured labour productivity rates per finishing task (unit output per worker-day), each with a verifiable source. The labour engine applies the site-efficiency loss as a separate, labelled line — never folded into the base rate."
        action={
          <AdminButton onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Rate
          </AdminButton>
        }
      />

      {error && (
        <StateMessage
          type="error"
          title="Something went wrong"
          message={error}
        />
      )}
      {success && <StateMessage type="empty" title="Saved" message={success} />}
      {loading ? (
        <StateMessage type="loading" title="Loading" message="Loading rates…" />
      ) : rates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 h-6 w-6" />
          No labour rates configured yet. Add rates from verifiable sources
          (e.g. wall screeding at 40 sqm per worker-day from contractor data)
          and the Labour & Crew estimator can schedule any quantity of work.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Task</th>
                <th className="p-3">Unit</th>
                <th className="p-3">Output/worker-day</th>
                <th className="p-3">Source</th>
                <th className="p-3">Active</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium">
                    {r.task_key}
                    {r.task_label && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {r.task_label}
                      </span>
                    )}
                  </td>
                  <td className="p-3">{r.unit}</td>
                  <td className="p-3 font-mono">
                    {r.output_per_worker_day} {r.unit}/wd
                  </td>
                  <td className="max-w-48 truncate p-3 text-muted-foreground">
                    {r.source_reference}
                  </td>
                  <td className="p-3">
                    <Toggle
                      checked={r.is_active}
                      onChange={() =>
                        updateLabourRate(r.id, {
                          is_active: !r.is_active,
                        }).then(load)
                      }
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <AdminIconButton onClick={() => openEdit(r)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </AdminIconButton>
                      <AdminIconButton onClick={() => remove(r)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </AdminIconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? `Edit ${editing.task_key} rate` : "Add labour rate"}
      >
        <div className="space-y-4">
          <AdminField label="Task key * (e.g. screeding_wall)">
            <AdminInput
              value={form.task_key}
              onChange={(e) => setForm({ ...form, task_key: e.target.value })}
              placeholder="lowercase_with_underscores"
            />
          </AdminField>

          <AdminField label="Label (shown in UI)">
            <AdminInput
              value={form.task_label}
              onChange={(e) => setForm({ ...form, task_label: e.target.value })}
              placeholder="e.g. Wall screeding (per sqm)"
            />
          </AdminField>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Unit * (sqm, m, item…)">
              <AdminInput
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </AdminField>
            <AdminField label="Output per worker-day * (positive)">
              <AdminInput
                type="number"
                step="any"
                value={form.output_per_worker_day}
                onChange={(e) =>
                  setForm({ ...form, output_per_worker_day: e.target.value })
                }
                placeholder="e.g. 40"
              />
            </AdminField>
          </div>

          <AdminField label="Source reference *">
            <AdminInput
              value={form.source_reference}
              onChange={(e) =>
                setForm({ ...form, source_reference: e.target.value })
              }
              placeholder="e.g. FRELUX contractor benchmark 2025"
            />
          </AdminField>

          <AdminField label="Description">
            <AdminTextarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Optional context (what the rate covers)"
            />
          </AdminField>

          <AdminField label="Active">
            <Toggle
              checked={form.is_active}
              onChange={(v) => setForm({ ...form, is_active: v })}
            />
          </AdminField>

          <div className="flex justify-end gap-2">
            <AdminButton onClick={() => setShowForm(false)}>Cancel</AdminButton>
            <AdminButton onClick={save} variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </AdminButton>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
