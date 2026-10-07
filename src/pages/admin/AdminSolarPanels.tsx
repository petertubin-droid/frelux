/**
 * Admin pane: Solar Panel Models (Solar/PV Estimator)
 *
 * Full CRUD over solar_panel_models. Every model needs a
 * manufacturer datasheet reference - the estimator refuses to run
 * without a configured model, and never guesses wattage or
 * dimensions. The price is optional and honestly reported as
 * unpriced when absent.
 */

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  fetchSolarPanelModels,
  createSolarPanelModel,
  updateSolarPanelModel,
  deleteSolarPanelModel,
} from "@/lib/estimation/queries";
import type { SolarPanelModel } from "@/types/estimation";
import { getSafeError } from "@/lib/safeError";
import {
  AdminHeader,
  AdminButton,
  AdminField,
  StateMessage,
  AdminIconButton,
  AdminInput,
} from "@/components/admin/AdminUi";

interface PanelForm {
  model_name: string;
  watt_peak: string;
  length_m: string;
  width_m: string;
  unit_price_naira: string;
  description: string;
  source_reference: string;
  effective_date: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: PanelForm = {
  model_name: "",
  watt_peak: "",
  length_m: "",
  width_m: "",
  unit_price_naira: "",
  description: "",
  source_reference: "",
  effective_date: new Date().toISOString().slice(0, 10),
  is_active: true,
  sort_order: "0",
};

function formFromModel(m: SolarPanelModel): PanelForm {
  return {
    model_name: m.model_name,
    watt_peak: String(m.watt_peak),
    length_m: String(m.length_m),
    width_m: String(m.width_m),
    unit_price_naira:
      m.unit_price_naira === null ? "" : String(m.unit_price_naira),
    description: m.description ?? "",
    source_reference: m.source_reference,
    effective_date: m.effective_date?.slice(0, 10) ?? "",
    is_active: m.is_active,
    sort_order: String(m.sort_order),
  };
}

function validate(f: PanelForm): string | null {
  if (!f.model_name.trim()) return "Model name is required.";
  const wp = Number(f.watt_peak);
  if (!Number.isFinite(wp) || wp <= 0)
    return "Watt peak must be a positive number (from the datasheet).";
  const len = Number(f.length_m);
  const wid = Number(f.width_m);
  if (!Number.isFinite(len) || len <= 0 || !Number.isFinite(wid) || wid <= 0)
    return "Panel length and width must be positive numbers in metres (from the datasheet).";
  if (f.unit_price_naira.trim() !== "") {
    const p = Number(f.unit_price_naira);
    if (!Number.isFinite(p) || p < 0)
      return "Panel price must be zero or a positive number (or left blank if unknown).";
  }
  if (!f.source_reference.trim())
    return "Source reference is required (manufacturer datasheet).";
  return null;
}

export default function AdminSolarPanels() {
  const [models, setModels] = useState<SolarPanelModel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SolarPanelModel | null>(null);
  const [form, setForm] = useState<PanelForm>(emptyForm);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await fetchSolarPanelModels();
    if (error)
      setError(getSafeError(error, "Failed to load solar panel models."));
    else setModels(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof PanelForm>(key: K, value: PanelForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (m: SolarPanelModel) => {
    setEditing(m);
    setForm(formFromModel(m));
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
      model_name: form.model_name.trim(),
      watt_peak: Number(form.watt_peak),
      length_m: Number(form.length_m),
      width_m: Number(form.width_m),
      unit_price_naira:
        form.unit_price_naira.trim() === ""
          ? null
          : Number(form.unit_price_naira),
      description: form.description.trim() || undefined,
      source_reference: form.source_reference.trim(),
      effective_date: form.effective_date || undefined,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await updateSolarPanelModel(editing.id, payload)
      : await createSolarPanelModel(payload);
    if (error) setError(getSafeError(error, "Failed to save the panel model."));
    else {
      setModalOpen(false);
      setMessage(editing ? "Panel model updated." : "Panel model created.");
      load();
    }
  };

  const remove = async (m: SolarPanelModel) => {
    if (
      !window.confirm(
        `Delete the panel model '${m.model_name}'? This cannot be undone.`,
      )
    )
      return;
    const { error } = await deleteSolarPanelModel(m.id);
    if (error)
      setError(getSafeError(error, "Failed to delete the panel model."));
    else {
      setMessage("Panel model deleted.");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <AdminHeader
        title="Solar Panel Models"
        subtitle="Panel specs (wattage, dimensions, price) for the Solar/PV Estimator. Every model needs a manufacturer datasheet reference: the estimator refuses to run without one and never guesses panel specs. A blank price is reported as unpriced, never invented."
        action={
          <AdminButton onClick={openCreate}>
            <Plus className="mr-1 inline h-4 w-4" /> Add model
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
              <th className="p-3">Model</th>
              <th className="p-3 text-right">Wp</th>
              <th className="p-3 text-right">Length (m)</th>
              <th className="p-3 text-right">Width (m)</th>
              <th className="p-3 text-right">₦ / panel</th>
              <th className="p-3">Datasheet reference</th>
              <th className="p-3">Effective</th>
              <th className="p-3">Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="p-6 text-center text-muted-foreground"
                >
                  No panel models configured yet. The Solar/PV Estimator refuses
                  to run without one: add models from manufacturer datasheets.
                </td>
              </tr>
            ) : (
              models.map((m) => (
                <tr
                  key={m.id}
                  className="border-t border-border dark:border-white/5"
                >
                  <td className="p-3">{m.model_name}</td>
                  <td className="p-3 text-right font-mono text-xs">
                    {m.watt_peak}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {m.length_m}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {m.width_m}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {m.unit_price_naira ?? "N/A"}
                  </td>
                  <td
                    className="max-w-[220px] truncate p-3 text-xs text-muted-foreground"
                    title={m.source_reference}
                  >
                    {m.source_reference}
                  </td>
                  <td className="p-3 text-xs">{m.effective_date}</td>
                  <td className="p-3 text-xs">{m.is_active ? "Yes" : "No"}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <AdminIconButton onClick={() => openEdit(m)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </AdminIconButton>
                      <AdminIconButton
                        onClick={() => remove(m)}
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
              {editing ? "Edit panel model" : "Add panel model"}
            </h2>
            <div className="grid gap-3">
              <AdminField label="Model name">
                <AdminInput
                  value={form.model_name}
                  onChange={(e) => set("model_name", e.target.value)}
                />
              </AdminField>
              <AdminField label="Watt peak (Wp, from the datasheet)">
                <AdminInput
                  type="number"
                  step="1"
                  min="1"
                  value={form.watt_peak}
                  onChange={(e) => set("watt_peak", e.target.value)}
                />
              </AdminField>
              <AdminField label="Length (m)">
                <AdminInput
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.length_m}
                  onChange={(e) => set("length_m", e.target.value)}
                />
              </AdminField>
              <AdminField label="Width (m)">
                <AdminInput
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.width_m}
                  onChange={(e) => set("width_m", e.target.value)}
                />
              </AdminField>
              <AdminField label="Price per panel, ₦ (optional: leave blank if unknown)">
                <AdminInput
                  type="number"
                  step="1"
                  min="0"
                  value={form.unit_price_naira}
                  onChange={(e) => set("unit_price_naira", e.target.value)}
                />
              </AdminField>
              <AdminField label="Datasheet reference (required)">
                <AdminInput
                  value={form.source_reference}
                  onChange={(e) => set("source_reference", e.target.value)}
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
                {editing ? "Save changes" : "Create model"}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
