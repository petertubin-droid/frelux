/**
 * Admin pane: Carbon Factors (Embodied Carbon Engine)
 *
 * Full CRUD over carbon_factors. Validation mirrors the DB
 * constraints exactly (non-negative factor, category + unit +
 * source required) so an admin can never save a configuration
 * the engine would have to refuse or guess.
 *
 * The one-active-factor-per-category rule is enforced client-side
 * with a clear message (the DB partial unique index backs it up).
 */

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Leaf } from "lucide-react";
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
  fetchCarbonFactors,
  createCarbonFactor,
  updateCarbonFactor,
  deleteCarbonFactor,
} from "@/lib/estimation/queries";
import type { CarbonFactor } from "@/types/estimation";

interface FactorForm {
  category: string;
  category_label: string;
  unit: string;
  kg_co2e_per_unit: string;
  description: string;
  source_reference: string;
  effective_date: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: FactorForm = {
  category: "",
  category_label: "",
  unit: "",
  kg_co2e_per_unit: "",
  description: "",
  source_reference: "",
  effective_date: new Date().toISOString().slice(0, 10),
  is_active: true,
  sort_order: "0",
};

function formFromFactor(f: CarbonFactor): FactorForm {
  return {
    category: f.category,
    category_label: f.category_label ?? "",
    unit: f.unit,
    kg_co2e_per_unit: String(f.kg_co2e_per_unit),
    description: f.description ?? "",
    source_reference: f.source_reference,
    effective_date: f.effective_date?.slice(0, 10) ?? "",
    is_active: f.is_active,
    sort_order: String(f.sort_order),
  };
}

// Client-side validation mirroring the DB constraints
function validate(f: FactorForm): string | null {
  if (!f.category.trim())
    return "Category key is required (e.g. emulsion_paint, cement_bag).";
  if (!f.unit.trim()) return "Unit is required (e.g. litre, sqm, bag).";
  const kg = Number(f.kg_co2e_per_unit);
  if (!Number.isFinite(kg) || kg < 0)
    return "kgCO2e per unit must be zero or a positive number.";
  if (!f.source_reference.trim())
    return "Source reference is required: emission data must be verifiable (EPD, ICE database entry or literature).";
  if (!f.effective_date) return "Effective date is required.";
  return null;
}

export default function AdminCarbonFactors() {
  const [factors, setFactors] = useState<CarbonFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<CarbonFactor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FactorForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchCarbonFactors();
    if (error) setError(error.message);
    else {
      setFactors(data);
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

  const openEdit = (f: CarbonFactor) => {
    setEditing(f);
    setForm(formFromFactor(f));
    setShowForm(true);
  };

  const save = async () => {
    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }
    if (form.is_active) {
      const clash = factors.find(
        (f) =>
          f.is_active &&
          f.id !== editing?.id &&
          f.category.trim().toLowerCase() ===
            form.category.trim().toLowerCase(),
      );
      if (clash) {
        setError(
          `An active factor already exists for '${clash.category}'. Deactivate it first or edit it: only one active factor per category keeps the engine deterministic.`,
        );
        return;
      }
    }
    setError(null);
    setSaving(true);
    const payload = {
      category: form.category.trim(),
      category_label:
        form.category_label.trim() === "" ? null : form.category_label.trim(),
      unit: form.unit.trim(),
      kg_co2e_per_unit: Number(form.kg_co2e_per_unit),
      description:
        form.description.trim() === "" ? null : form.description.trim(),
      source_reference: form.source_reference.trim(),
      effective_date: form.effective_date,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await updateCarbonFactor(editing.id, payload)
      : await createCarbonFactor(payload);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setShowForm(false);
      setSuccess(
        editing ? "Factor updated." : `Factor added for ${payload.category}.`,
      );
      load();
    }
  };

  const remove = async (f: CarbonFactor) => {
    if (!window.confirm(`Delete the ${f.category} factor?`)) return;
    const { error } = await deleteCarbonFactor(f.id);
    if (error) setError(error.message);
    else {
      setSuccess("Factor deleted.");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Carbon Factors"
        subtitle="Admin-configured embodied carbon factors per material/finish category (kgCO2e per unit), each with a verifiable source (EPD, ICE database). The carbon engine excludes lines without a configured factor with a warning: it never guesses emissions."
        action={
          <AdminButton onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Factor
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
          message="Loading factors…"
        />
      ) : factors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Leaf className="mx-auto mb-2 h-6 w-6" />
          No carbon factors configured yet. Add factors from verifiable sources
          (e.g. emulsion_paint 2.5 kgCO2e/litre from an EPD) and the carbon
          estimator can compute emissions per estimate line.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Category</th>
                <th className="p-3">Unit</th>
                <th className="p-3">kgCO2e/unit</th>
                <th className="p-3">Effective</th>
                <th className="p-3">Source</th>
                <th className="p-3">Active</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {factors.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="p-3 font-medium">
                    {f.category}
                    {f.category_label && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {f.category_label}
                      </span>
                    )}
                  </td>
                  <td className="p-3">{f.unit}</td>
                  <td className="p-3 font-mono">
                    {Number(f.kg_co2e_per_unit)}
                  </td>
                  <td className="p-3">{f.effective_date?.slice(0, 10)}</td>
                  <td className="max-w-48 truncate p-3 text-muted-foreground">
                    {f.source_reference}
                  </td>
                  <td className="p-3">
                    <Toggle
                      checked={f.is_active}
                      onChange={() =>
                        updateCarbonFactor(f.id, {
                          is_active: !f.is_active,
                        }).then(load)
                      }
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <AdminIconButton onClick={() => openEdit(f)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </AdminIconButton>
                      <AdminIconButton onClick={() => remove(f)} title="Delete">
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
          editing ? `Edit ${editing.category} factor` : "Add carbon factor"
        }
      >
        <div className="space-y-4">
          <AdminField label="Category key * (e.g. emulsion_paint)">
            <AdminInput
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="lowercase_with_underscores"
            />
          </AdminField>

          <AdminField label="Label (shown in UI)">
            <AdminInput
              value={form.category_label}
              onChange={(e) =>
                setForm({ ...form, category_label: e.target.value })
              }
              placeholder="e.g. Emulsion paint (per litre)"
            />
          </AdminField>

          <AdminField label="Unit * (litre, sqm, bag, kg…)">
            <AdminInput
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </AdminField>

          <AdminField label="kgCO2e per unit * (zero or positive)">
            <AdminInput
              value={form.kg_co2e_per_unit}
              onChange={(e) =>
                setForm({ ...form, kg_co2e_per_unit: e.target.value })
              }
              placeholder="e.g. 2.5"
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
              placeholder="e.g. EPD 2025 average, ICE v3 entry"
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
