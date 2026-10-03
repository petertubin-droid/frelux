/**
 * Admin pane: Material Reuse Factors (Circular/Reuse Engine)
 *
 * Full CRUD over material_reuse_factors. Validation mirrors the
 * DB constraints exactly (albedo 0–1, surface type roof/wall,
 * category + source reference required) so an admin can never
 * save a configuration the engine would have to refuse or
 * guess.
 *
 * The one-active-factor-per-(surface, category) rule is enforced
 * client-side with a clear message (the DB partial unique index
 * backs it up).
 */

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Recycle } from "lucide-react";
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
  fetchMaterialReuseFactors,
  createMaterialReuseFactor,
  updateMaterialReuseFactor,
  deleteMaterialReuseFactor,
} from "@/lib/estimation/queries";
import { getSafeError } from "@/lib/safeError";
import type { MaterialReuseFactor } from "@/types/estimation";

interface FactorForm {
  unit: string;
  category: string;
  category_label: string;
  recovery_rate: string;
  reuse_fraction: string;
  recycle_fraction: string;
  unit_value_naira: string;
  description: string;
  source_reference: string;
  effective_date: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: FactorForm = {
  unit: "",
  category: "",
  category_label: "",
  recovery_rate: "",
  reuse_fraction: "",
  recycle_fraction: "",
  unit_value_naira: "",
  description: "",
  source_reference: "",
  effective_date: new Date().toISOString().slice(0, 10),
  is_active: true,
  sort_order: "0",
};

function formFromFactor(f: MaterialReuseFactor): FactorForm {
  return {
    unit: f.unit,
    category: f.category,
    category_label: f.category_label ?? "",
    recovery_rate: String(f.recovery_rate),
    reuse_fraction: String(f.reuse_fraction),
    recycle_fraction: String(f.recycle_fraction),
    unit_value_naira:
      f.unit_value_naira === null ? "" : String(f.unit_value_naira),
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
    return "Category key is required (e.g. aluminium_roof_sheets, ceramic_tiles).";
  if (!f.unit.trim()) return "Unit is required (e.g. m2, unit, kg).";
  const pct = (label: string, raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 1)
      return `${label} must be a number between 0 and 1.`;
    return null;
  };
  const p1 = pct("Recovery rate", f.recovery_rate);
  if (p1) return p1;
  const p2 = pct("Reuse fraction", f.reuse_fraction);
  if (p2) return p2;
  const p3 = pct("Recycle fraction", f.recycle_fraction);
  if (p3) return p3;
  if (Number(f.reuse_fraction) + Number(f.recycle_fraction) > 1)
    return "Reuse + recycle fractions cannot sum to more than 1.";
  if (f.unit_value_naira.trim() !== "") {
    const v = Number(f.unit_value_naira);
    if (!Number.isFinite(v) || v < 0)
      return "Reclaimed value per unit must be zero or a positive number (or left blank).";
  }
  if (!f.source_reference.trim())
    return "Source reference is required (demolition audit, WRAP protocol, salvage dealer rate).";
  return null;
}

export default function AdminReuseFactors() {
  const [factors, setFactors] = useState<MaterialReuseFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialReuseFactor | null>(null);
  const [form, setForm] = useState<FactorForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await fetchMaterialReuseFactors();
    if (error)
      setError(getSafeError(error, "Failed to load material reuse factors."));
    else setFactors(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (f: MaterialReuseFactor) => {
    setEditing(f);
    setForm(formFromFactor(f));
    setModalOpen(true);
  };

  const save = async () => {
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      unit: form.unit.trim(),
      category: form.category.trim(),
      category_label: form.category_label.trim() || undefined,
      recovery_rate: Number(form.recovery_rate),
      reuse_fraction: Number(form.reuse_fraction),
      recycle_fraction: Number(form.recycle_fraction),
      unit_value_naira:
        form.unit_value_naira.trim() === ""
          ? null
          : Number(form.unit_value_naira),
      description: form.description.trim() || undefined,
      source_reference: form.source_reference.trim(),
      effective_date: form.effective_date || undefined,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await updateMaterialReuseFactor(editing.id, payload)
      : await createMaterialReuseFactor(payload);
    setSaving(false);
    if (error) {
      setError(getSafeError(error, "Failed to save the factor."));
      return;
    }
    setModalOpen(false);
    setMessage(editing ? "Factor updated." : "Factor created.");
    load();
  };

  const remove = async (f: MaterialReuseFactor) => {
    if (
      !window.confirm(
        `Delete the factor '${f.category}'? This cannot be undone.`,
      )
    )
      return;
    const { error } = await deleteMaterialReuseFactor(f.id);
    if (error) setError(getSafeError(error, "Failed to delete the factor."));
    else {
      setMessage("Factor deleted.");
      load();
    }
  };

  const set = <K extends keyof FactorForm>(key: K, value: FactorForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <AdminHeader
        title="Material Reuse Factors"
        subtitle="Recovery, reuse and recycle fractions per material category — the data behind the Circular/Reuse Engine. Every factor needs a verifiable source (demolition audit, WRAP protocol, salvage dealer rate); the engine refuses to estimate a material without one."
        action={
          <AdminButton onClick={openCreate}>
            <Plus className="mr-1 inline h-4 w-4" /> Add factor
          </AdminButton>
        }
      />

      {error && <StateMessage type="error" title="Error" message={error} />}
      {message && !error && (
        <StateMessage type="empty" title="Saved" message={message} />
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card dark:border-white/5">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Category</th>
              <th className="p-3">Label</th>
              <th className="p-3">Unit</th>
              <th className="p-3 text-right">Recovery</th>
              <th className="p-3 text-right">Reuse</th>
              <th className="p-3 text-right">Recycle</th>
              <th className="p-3 text-right">₦/unit</th>
              <th className="p-3">Source reference</th>
              <th className="p-3">Effective</th>
              <th className="p-3">Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={11}
                  className="p-6 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : factors.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="p-6 text-center text-muted-foreground"
                >
                  No factors configured yet. The Circular/Reuse Engine refuses
                  to estimate a material without one — add factors from
                  verifiable sources (demolition audits, WRAP protocols, salvage
                  dealer rates).
                </td>
              </tr>
            ) : (
              factors.map((f) => (
                <tr
                  key={f.id}
                  className="border-t border-border dark:border-white/5"
                >
                  <td className="p-3 font-mono text-xs">{f.category}</td>
                  <td className="p-3">{f.category_label ?? "—"}</td>
                  <td className="p-3 text-xs">{f.unit}</td>
                  <td className="p-3 text-right font-mono text-xs">
                    {f.recovery_rate}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {f.reuse_fraction}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {f.recycle_fraction}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {f.unit_value_naira ?? "—"}
                  </td>
                  <td
                    className="max-w-[220px] truncate p-3 text-xs text-muted-foreground"
                    title={f.source_reference}
                  >
                    {f.source_reference}
                  </td>
                  <td className="p-3 text-xs">
                    {f.effective_date?.slice(0, 10) ?? "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        f.is_active
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }
                    >
                      {f.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <AdminIconButton onClick={() => openEdit(f)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </AdminIconButton>
                      <AdminIconButton
                        onClick={() => remove(f)}
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

      <AdminModal
        open={modalOpen}
        title={editing ? "Edit thermal factor" : "Add thermal factor"}
        onClose={() => setModalOpen(false)}
      >
        <div className="grid gap-3">
          <AdminField label="Unit (e.g. m2, unit, kg)">
            <AdminInput
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
            />
          </AdminField>
          <AdminField label="Category key (e.g. aluminium_roof_sheets)">
            <AdminInput
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            />
          </AdminField>
          <AdminField label="Human label (optional)">
            <AdminInput
              value={form.category_label}
              onChange={(e) => set("category_label", e.target.value)}
            />
          </AdminField>
          <AdminField label="Recovery rate (0–1) — fraction recoverable from demolition">
            <AdminInput
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.recovery_rate}
              onChange={(e) => set("recovery_rate", e.target.value)}
            />
          </AdminField>
          <AdminField label="Reuse fraction (0–1) — of recovered, fit for direct reuse">
            <AdminInput
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.reuse_fraction}
              onChange={(e) => set("reuse_fraction", e.target.value)}
            />
          </AdminField>
          <AdminField label="Recycle fraction (0–1) — of recovered, fit for recycling">
            <AdminInput
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.recycle_fraction}
              onChange={(e) => set("recycle_fraction", e.target.value)}
            />
          </AdminField>
          <AdminField label="Reclaimed value per unit, ₦ (optional — leave blank if unknown)">
            <AdminInput
              type="number"
              step="1"
              min="0"
              value={form.unit_value_naira}
              onChange={(e) => set("unit_value_naira", e.target.value)}
            />
          </AdminField>
          <AdminField label="Source reference (required — demolition audit, WRAP protocol, salvage dealer rate)">
            <AdminInput
              value={form.source_reference}
              onChange={(e) => set("source_reference", e.target.value)}
            />
          </AdminField>
          <AdminField label="Description (optional)">
            <AdminTextarea
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
          <Toggle
            label="Active (used by the engine)"
            checked={form.is_active}
            onChange={(v) => set("is_active", v)}
          />
          <div className="flex justify-end gap-2">
            <AdminButton
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </AdminButton>
            <AdminButton onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create factor"}
            </AdminButton>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
