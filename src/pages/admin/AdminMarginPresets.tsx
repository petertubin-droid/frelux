/**
 * Admin pane: Margin Presets (Margin Engine)
 *
 * Full CRUD over margin_presets. Validation mirrors the DB
 * constraints exactly (positive margin, explicit basis) so an
 * admin can never save a configuration the engine would have
 * to refuse or guess.
 */

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Percent } from "lucide-react";
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
  fetchMarginPresets,
  createMarginPreset,
  updateMarginPreset,
  deleteMarginPreset,
} from "@/lib/estimation/queries";
import type { MarginPreset } from "@/types/estimation";

interface PresetForm {
  name: string;
  basis: "markup_on_cost" | "margin_on_price";
  margin_percent: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: PresetForm = {
  name: "",
  basis: "markup_on_cost",
  margin_percent: "",
  description: "",
  is_default: false,
  is_active: true,
  sort_order: "0",
};

function formFromPreset(p: MarginPreset): PresetForm {
  return {
    name: p.name,
    basis: p.basis,
    margin_percent: String(p.margin_percent),
    description: p.description ?? "",
    is_default: p.is_default,
    is_active: p.is_active,
    sort_order: String(p.sort_order),
  };
}

// Validation mirroring the DB constraints + engine requirements
function validate(f: PresetForm): string | null {
  if (!f.name.trim()) return "Preset name is required.";
  const margin = Number(f.margin_percent);
  if (!Number.isFinite(margin) || margin <= 0)
    return "Margin percent must be positive — the engine never prices at or below cost without an explicit percent.";
  if (f.basis === "margin_on_price" && margin >= 100)
    return "A margin-on-price percent of 100 or more is mathematically impossible — the engine would refuse it.";
  return null;
}

export default function AdminMarginPresets() {
  const [presets, setPresets] = useState<MarginPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<MarginPreset | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PresetForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchMarginPresets();
    if (error) setError(error.message);
    else {
      setPresets(data);
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

  const openEdit = (p: MarginPreset) => {
    setEditing(p);
    setForm(formFromPreset(p));
    setShowForm(true);
  };

  const save = async () => {
    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      basis: form.basis,
      margin_percent: Number(form.margin_percent),
      description:
        form.description.trim() === "" ? null : form.description.trim(),
      is_default: form.is_default,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await updateMarginPreset(editing.id, payload)
      : await createMarginPreset(payload);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setShowForm(false);
      setSuccess(
        editing ? "Preset updated." : `Preset '${payload.name}' saved.`,
      );
      load();
    }
  };

  const remove = async (p: MarginPreset) => {
    if (!window.confirm(`Delete the ${p.name} preset?`)) return;
    const { error } = await deleteMarginPreset(p.id);
    if (error) setError(error.message);
    else {
      setSuccess("Preset deleted.");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Margin Presets"
        subtitle="Admin-configured pricing presets with an explicit basis: markup on cost (profit = cost × %) or margin on price (price = cost ÷ (1 − %)). The margin engine never confuses the two — every quote shows which basis produced it."
        action={
          <AdminButton onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Preset
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
          message="Loading presets…"
        />
      ) : presets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Percent className="mx-auto mb-2 h-6 w-6" />
          No margin presets configured yet. Add pricing structures (e.g.
          Standard finishing, 25% markup on cost) and the margin calculator can
          price any base cost deterministically.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Basis</th>
                <th className="p-3">Margin</th>
                <th className="p-3">Default</th>
                <th className="p-3">Active</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {presets.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-medium">
                    {p.name}
                    {p.description && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {p.description}
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs">{p.basis}</td>
                  <td className="p-3 font-mono">{p.margin_percent}%</td>
                  <td className="p-3">
                    <Toggle
                      checked={p.is_default}
                      onChange={() =>
                        updateMarginPreset(p.id, {
                          is_default: !p.is_default,
                        }).then(load)
                      }
                    />
                  </td>
                  <td className="p-3">
                    <Toggle
                      checked={p.is_active}
                      onChange={() =>
                        updateMarginPreset(p.id, {
                          is_active: !p.is_active,
                        }).then(load)
                      }
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <AdminIconButton onClick={() => openEdit(p)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </AdminIconButton>
                      <AdminIconButton onClick={() => remove(p)} title="Delete">
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
        title={editing ? `Edit ${editing.name}` : "Add margin preset"}
      >
        <div className="space-y-4">
          <AdminField label="Preset name * (unique, e.g. Standard finishing)">
            <AdminInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </AdminField>

          <AdminField label="Basis * — which number the percent applies to">
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={form.basis}
              onChange={(e) =>
                setForm({
                  ...form,
                  basis: e.target.value as PresetForm["basis"],
                })
              }
            >
              <option value="markup_on_cost">
                Markup on cost (profit = cost × %)
              </option>
              <option value="margin_on_price">
                Margin on price (price = cost ÷ (1 − %))
              </option>
            </select>
          </AdminField>

          <AdminField label="Margin percent * (positive; < 100 for margin on price)">
            <AdminInput
              type="number"
              step="any"
              value={form.margin_percent}
              onChange={(e) =>
                setForm({ ...form, margin_percent: e.target.value })
              }
              placeholder="e.g. 25"
            />
          </AdminField>

          <AdminField label="Description">
            <AdminTextarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Optional context (what project types this fits)"
            />
          </AdminField>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Default preset">
              <Toggle
                checked={form.is_default}
                onChange={(v) => setForm({ ...form, is_default: v })}
              />
            </AdminField>
            <AdminField label="Active">
              <Toggle
                checked={form.is_active}
                onChange={(v) => setForm({ ...form, is_active: v })}
              />
            </AdminField>
          </div>

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
