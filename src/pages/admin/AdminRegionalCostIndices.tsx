/**
 * Admin pane: Regional Cost Indices (Regional Cost Index Engine)
 *
 * Full CRUD over regional_cost_indices. Validation mirrors the DB
 * constraints exactly (positive factor, state + category required,
 * source_reference mandatory) so an admin can never save a
 * configuration the engine would have to refuse or guess.
 *
 * The unique-active-per-(state,category) rule is enforced client-side
 * with a clear message (the DB partial unique index backs it up).
 */

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import {
  AdminHeader,
  AdminButton,
  AdminField,
  StateMessage,
  Toggle,
  AdminIconButton,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminUi";
import { AdminModal } from "@/components/admin/AdminModal";
import {
  fetchRegionalCostIndices,
  createRegionalCostIndex,
  updateRegionalCostIndex,
  deleteRegionalCostIndex,
} from "@/lib/estimation/queries";
import type { RegionalCostIndex } from "@/types/estimation";

interface IndexForm {
  country: string;
  state: string;
  category: string;
  cost_factor: string;
  description: string;
  source_reference: string;
  effective_date: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: IndexForm = {
  country: "NG",
  state: "",
  category: "general",
  cost_factor: "",
  description: "",
  source_reference: "",
  effective_date: new Date().toISOString().slice(0, 10),
  is_active: true,
  sort_order: "0",
};

const CATEGORIES = ["general", "labour", "materials"];

const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

function formFromIndex(i: RegionalCostIndex): IndexForm {
  return {
    country: i.country ?? "NG",
    state: i.state,
    category: i.category,
    cost_factor: String(i.cost_factor),
    description: i.description ?? "",
    source_reference: i.source_reference,
    effective_date: i.effective_date?.slice(0, 10) ?? "",
    is_active: i.is_active,
    sort_order: String(i.sort_order),
  };
}

// Client-side validation mirroring the DB constraints
function validate(f: IndexForm): string | null {
  if (!f.state.trim()) return "State is required.";
  const factor = Number(f.cost_factor);
  if (!Number.isFinite(factor) || factor <= 0)
    return "Cost factor must be a positive number (1.00 = national baseline).";
  if (!f.source_reference.trim())
    return "Source reference is required: every regional factor must be verifiable (market survey, supplier price list or trade source).";
  if (!f.effective_date) return "Effective date is required.";
  return null;
}

export default function AdminRegionalCostIndices() {
  const [indices, setIndices] = useState<RegionalCostIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<RegionalCostIndex | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<IndexForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchRegionalCostIndices();
    if (error) setError(error.message);
    else {
      setIndices(data);
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

  const openEdit = (i: RegionalCostIndex) => {
    setEditing(i);
    setForm(formFromIndex(i));
    setShowForm(true);
  };

  const save = async () => {
    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }
    // Unique active index per (state, category) - enforced client-side
    // with a clear message; the DB partial unique index backs it up.
    if (form.is_active) {
      const clash = indices.find(
        (i) =>
          i.is_active &&
          i.id !== editing?.id &&
          (i.country ?? "NG").toUpperCase() ===
            form.country.trim().toUpperCase() &&
          i.state.trim().toLowerCase() === form.state.trim().toLowerCase() &&
          i.category === form.category,
      );
      if (clash) {
        setError(
          `An active ${form.category} index already exists for ${clash.country ?? "NG"}/${clash.state}. Deactivate it first or edit it: only one active index per country/state/category keeps the engine deterministic.`,
        );
        return;
      }
    }
    setError(null);
    setSaving(true);
    const payload = {
      country: form.country.trim().toUpperCase() || "NG",
      state: form.state.trim(),
      category: form.category,
      cost_factor: Number(form.cost_factor),
      description:
        form.description.trim() === "" ? null : form.description.trim(),
      source_reference: form.source_reference.trim(),
      effective_date: form.effective_date,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await updateRegionalCostIndex(editing.id, payload)
      : await createRegionalCostIndex(payload);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setShowForm(false);
      setSuccess(
        editing ? "Index updated." : `Index added for ${payload.state}.`,
      );
      load();
    }
  };

  const remove = async (i: RegionalCostIndex) => {
    if (
      !window.confirm(
        `Delete the ${i.country ?? "NG"}/${i.state} / ${i.category} index?`,
      )
    )
      return;
    const { error } = await deleteRegionalCostIndex(i.id);
    if (error) setError(error.message);
    else {
      setSuccess("Index deleted.");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Regional Cost Indices"
        subtitle="Admin-configured cost factors per Nigerian state and category (labour, materials, general). 1.00 = national baseline. Every factor requires a verifiable source. The estimation engine applies these deterministically: state+category → state general → national baseline, warning on every fallback."
        action={
          <AdminButton onClick={openCreate} variant="primary">
            <Plus className="h-4 w-4" /> Add Index
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
        <StateMessage
          type="loading"
          title="Loading"
          message="Loading indices…"
        />
      ) : indices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <MapPin className="mx-auto mb-2 h-6 w-6" />
          No regional cost indices configured yet. Add factors from verifiable
          sources (e.g. Lagos labour 1.25) and every calculator will be able to
          produce state-accurate costs.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Country / State</th>
                <th className="p-3">Category</th>
                <th className="p-3">Factor</th>
                <th className="p-3">Effective</th>
                <th className="p-3">Source</th>
                <th className="p-3">Active</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {indices.map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="p-3 font-medium">
                    {i.country ?? "NG"} / {i.state}
                  </td>
                  <td className="p-3">{i.category}</td>
                  <td className="p-3 font-mono">
                    {Number(i.cost_factor).toFixed(2)}
                  </td>
                  <td className="p-3">{i.effective_date?.slice(0, 10)}</td>
                  <td className="max-w-48 truncate p-3 text-muted-foreground">
                    {i.source_reference}
                  </td>
                  <td className="p-3">
                    <Toggle
                      checked={i.is_active}
                      onChange={() =>
                        updateRegionalCostIndex(i.id, {
                          is_active: !i.is_active,
                        }).then(load)
                      }
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <AdminIconButton onClick={() => openEdit(i)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </AdminIconButton>
                      <AdminIconButton onClick={() => remove(i)} title="Delete">
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
        title={
          editing
            ? `Edit ${editing.country ?? "NG"}/${editing.state} index`
            : "Add regional cost index"
        }
      >
        <div className="space-y-4">
          <AdminField label="Country *">
            <AdminSelect
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            >
              <option value="NG">Nigeria (NG)</option>
              <option value="GH">Ghana (GH)</option>
              <option value="KE">Kenya (KE)</option>
              <option value="ZA">South Africa (ZA)</option>
            </AdminSelect>
          </AdminField>

          <AdminField label="State / Region *">
            {form.country === "NG" ? (
              <AdminSelect
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              >
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </AdminSelect>
            ) : (
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="Region name, e.g. Greater Accra"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
            )}
          </AdminField>

          <AdminField label="Category">
            <AdminSelect
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </AdminSelect>
          </AdminField>

          <AdminField label="Cost factor * (1.00 = national baseline)">
            <AdminInput
              value={form.cost_factor}
              onChange={(e) =>
                setForm({ ...form, cost_factor: e.target.value })
              }
              placeholder="e.g. 1.25 (25% above national average)"
            />
          </AdminField>

          <AdminField label="Effective date">
            <AdminInput
              type="date"
              value={form.effective_date}
              onChange={(e) =>
                setForm({ ...form, effective_date: e.target.value })
              }
            />
          </AdminField>

          <AdminField label="Source reference *">
            <AdminInput
              value={form.source_reference}
              onChange={(e) =>
                setForm({ ...form, source_reference: e.target.value })
              }
              placeholder="e.g. Q3 2026 Lagos market survey"
            />
          </AdminField>

          <AdminField label="Description">
            <AdminTextarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Optional context (what the factor covers)"
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
