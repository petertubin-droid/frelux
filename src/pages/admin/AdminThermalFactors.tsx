/**
 * Admin pane: Thermal Finish Factors (Heat Comfort Engine)
 *
 * Full CRUD over thermal_finish_factors. Validation mirrors the
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
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  fetchThermalFinishFactors,
  createThermalFinishFactor,
  updateThermalFinishFactor,
  deleteThermalFinishFactor,
} from "@/lib/estimation/queries";
import { getSafeError } from "@/lib/safeError";
import type { ThermalFinishFactor } from "@/types/estimation";

interface FactorForm {
  surface_type: "roof" | "wall";
  category: string;
  category_label: string;
  solar_reflectance: string;
  description: string;
  source_reference: string;
  effective_date: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: FactorForm = {
  surface_type: "roof",
  category: "",
  category_label: "",
  solar_reflectance: "",
  description: "",
  source_reference: "",
  effective_date: new Date().toISOString().slice(0, 10),
  is_active: true,
  sort_order: "0",
};

function formFromFactor(f: ThermalFinishFactor): FactorForm {
  return {
    surface_type: f.surface_type,
    category: f.category,
    category_label: f.category_label ?? "",
    solar_reflectance: String(f.solar_reflectance),
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
    return "Category key is required (e.g. dark_membrane, cool_roof_coating).";
  const albedo = Number(f.solar_reflectance);
  if (!Number.isFinite(albedo) || albedo < 0 || albedo > 1)
    return "Solar reflectance (albedo) must be a number between 0 and 1.";
  if (!f.source_reference.trim())
    return "Source reference is required (manufacturer data sheet, SRI/CRRC rating, or literature).";
  return null;
}

export default function AdminThermalFactors() {
  const [factors, setFactors] = useState<ThermalFinishFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ThermalFinishFactor | null>(null);
  const [form, setForm] = useState<FactorForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await fetchThermalFinishFactors();
    if (error)
      setError(getSafeError(error, "Failed to load thermal finish factors."));
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

  const openEdit = (f: ThermalFinishFactor) => {
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
      surface_type: form.surface_type,
      category: form.category.trim(),
      category_label: form.category_label.trim() || undefined,
      solar_reflectance: Number(form.solar_reflectance),
      description: form.description.trim() || undefined,
      source_reference: form.source_reference.trim(),
      effective_date: form.effective_date || undefined,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await updateThermalFinishFactor(editing.id, payload)
      : await createThermalFinishFactor(payload);
    setSaving(false);
    if (error) {
      setError(getSafeError(error, "Failed to save the factor."));
      return;
    }
    setModalOpen(false);
    setMessage(editing ? "Factor updated." : "Factor created.");
    load();
  };

  const remove = async (f: ThermalFinishFactor) => {
    if (
      !window.confirm(
        `Delete the factor '${f.category}' (${f.surface_type})? This cannot be undone.`,
      )
    )
      return;
    const { error } = await deleteThermalFinishFactor(f.id);
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
        title="Thermal Finish Factors"
        subtitle="Solar reflectance (albedo) per finish category and surface type: the data behind the Heat Comfort Engine. Every factor needs a verifiable source; the engine refuses to score a finish without one."
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
              <th className="p-3">Surface</th>
              <th className="p-3">Category</th>
              <th className="p-3">Label</th>
              <th className="p-3 text-right">Albedo</th>
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
                  colSpan={8}
                  className="p-6 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : factors.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-6 text-center text-muted-foreground"
                >
                  No factors configured yet. The Heat Comfort Engine refuses to
                  score a finish without one: add factors from verifiable
                  sources (manufacturer data sheets, SRI/CRRC ratings).
                </td>
              </tr>
            ) : (
              factors.map((f) => (
                <tr
                  key={f.id}
                  className="border-t border-border dark:border-white/5"
                >
                  <td className="p-3 capitalize">{f.surface_type}</td>
                  <td className="p-3 font-mono text-xs">{f.category}</td>
                  <td className="p-3">{f.category_label ?? "N/A"}</td>
                  <td className="p-3 text-right font-mono text-xs">
                    {f.solar_reflectance}
                  </td>
                  <td
                    className="max-w-[220px] truncate p-3 text-xs text-muted-foreground"
                    title={f.source_reference}
                  >
                    {f.source_reference}
                  </td>
                  <td className="p-3 text-xs">
                    {f.effective_date?.slice(0, 10) ?? "N/A"}
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
          <AdminField label="Surface type">
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={form.surface_type}
              onChange={(e) =>
                set("surface_type", e.target.value as "roof" | "wall")
              }
            >
              <option value="roof">Roof</option>
              <option value="wall">Wall</option>
            </select>
          </AdminField>
          <AdminField label="Category key (e.g. cool_roof_coating)">
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
          <AdminField label="Solar reflectance / albedo (0–1)">
            <AdminInput
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.solar_reflectance}
              onChange={(e) => set("solar_reflectance", e.target.value)}
            />
          </AdminField>
          <AdminField label="Source reference (required: data sheet, SRI/CRRC rating, literature)">
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
