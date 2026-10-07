/**
 * Admin pane: Solar Component Prices (Solar/PV Estimator)
 *
 * Full CRUD over solar_component_prices. Every price needs a
 * supplier-quote reference. A component without a configured
 * price is reported as unpriced by the estimator - never
 * invented, never silently zero-costed.
 *
 * Recognised keys (any other key is stored but ignored by the
 * engine): mounting_rail_per_m, mid_clamp, end_clamp,
 * mc4_connector_pair, dc_cable_per_m, ac_cable_per_m,
 * dc_breaker, ac_breaker, surge_protector, earthing_kit,
 * inverter_price_per_kw, battery_unit.
 */

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  fetchSolarComponentPrices,
  createSolarComponentPrice,
  updateSolarComponentPrice,
  deleteSolarComponentPrice,
} from "@/lib/estimation/queries";
import type { SolarComponentPrice } from "@/types/estimation";
import { getSafeError } from "@/lib/safeError";
import {
  AdminHeader,
  AdminButton,
  AdminField,
  StateMessage,
  AdminIconButton,
  AdminInput,
} from "@/components/admin/AdminUi";

const ENGINE_KEYS = [
  "mounting_rail_per_m",
  "mid_clamp",
  "end_clamp",
  "mc4_connector_pair",
  "dc_cable_per_m",
  "ac_cable_per_m",
  "dc_breaker",
  "ac_breaker",
  "surge_protector",
  "earthing_kit",
  "inverter_price_per_kw",
  "battery_unit",
] as const;

interface PriceForm {
  component_key: string;
  component_label: string;
  unit: string;
  price_naira: string;
  description: string;
  source_reference: string;
  effective_date: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: PriceForm = {
  component_key: "",
  component_label: "",
  unit: "",
  price_naira: "",
  description: "",
  source_reference: "",
  effective_date: new Date().toISOString().slice(0, 10),
  is_active: true,
  sort_order: "0",
};

function formFromPrice(p: SolarComponentPrice): PriceForm {
  return {
    component_key: p.component_key,
    component_label: p.component_label ?? "",
    unit: p.unit,
    price_naira: String(p.price_naira),
    description: p.description ?? "",
    source_reference: p.source_reference,
    effective_date: p.effective_date?.slice(0, 10) ?? "",
    is_active: p.is_active,
    sort_order: String(p.sort_order),
  };
}

function validate(f: PriceForm): string | null {
  if (!f.component_key.trim()) return "Component key is required.";
  if (
    !ENGINE_KEYS.includes(
      f.component_key.trim() as (typeof ENGINE_KEYS)[number],
    )
  )
    return `Unknown component key '${f.component_key}'. Recognised keys: ${ENGINE_KEYS.join(", ")}.`;
  if (!f.unit.trim()) return "Unit is required (e.g. m, unit, pair, kW).";
  const p = Number(f.price_naira);
  if (!Number.isFinite(p) || p < 0)
    return "Price must be zero or a positive number (₦).";
  if (!f.source_reference.trim())
    return "Source reference is required (supplier quote).";
  return null;
}

export default function AdminSolarPrices() {
  const [prices, setPrices] = useState<SolarComponentPrice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SolarComponentPrice | null>(null);
  const [form, setForm] = useState<PriceForm>(emptyForm);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await fetchSolarComponentPrices();
    if (error)
      setError(getSafeError(error, "Failed to load solar component prices."));
    else setPrices(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof PriceForm>(key: K, value: PriceForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: SolarComponentPrice) => {
    setEditing(p);
    setForm(formFromPrice(p));
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
      component_key: form.component_key.trim(),
      component_label: form.component_label.trim() || undefined,
      unit: form.unit.trim(),
      price_naira: Number(form.price_naira),
      description: form.description.trim() || undefined,
      source_reference: form.source_reference.trim(),
      effective_date: form.effective_date || undefined,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await updateSolarComponentPrice(editing.id, payload)
      : await createSolarComponentPrice(payload);
    if (error)
      setError(getSafeError(error, "Failed to save the component price."));
    else {
      setModalOpen(false);
      setMessage(
        editing ? "Component price updated." : "Component price created.",
      );
      load();
    }
  };

  const remove = async (p: SolarComponentPrice) => {
    if (
      !window.confirm(
        `Delete the price for '${p.component_key}'? This cannot be undone.`,
      )
    )
      return;
    const { error } = await deleteSolarComponentPrice(p.id);
    if (error)
      setError(getSafeError(error, "Failed to delete the component price."));
    else {
      setMessage("Component price deleted.");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <AdminHeader
        title="Solar Component Prices"
        subtitle="Component prices for the Solar/PV Estimator: rails, clamps, connectors, cables, breakers, surge protection, earthing, inverter per kW, battery units. Every price needs a supplier-quote reference; a component without a configured price is reported as unpriced by the estimator, never invented."
        action={
          <AdminButton onClick={openCreate}>
            <Plus className="mr-1 inline h-4 w-4" /> Add price
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
              <th className="p-3">Component</th>
              <th className="p-3">Label</th>
              <th className="p-3">Unit</th>
              <th className="p-3 text-right">₦ price</th>
              <th className="p-3">Supplier reference</th>
              <th className="p-3">Effective</th>
              <th className="p-3">Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {prices.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-6 text-center text-muted-foreground"
                >
                  No component prices configured yet. The estimator reports
                  quantities without prices and refuses to total an incomplete
                  estimate: add prices from supplier quotes.
                </td>
              </tr>
            ) : (
              prices.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border dark:border-white/5"
                >
                  <td className="p-3 font-mono text-xs">{p.component_key}</td>
                  <td className="p-3">{p.component_label ?? "N/A"}</td>
                  <td className="p-3 text-xs">{p.unit}</td>
                  <td className="p-3 text-right font-mono text-xs">
                    ₦{Number(p.price_naira).toLocaleString("en-NG")}
                  </td>
                  <td
                    className="max-w-[220px] truncate p-3 text-xs text-muted-foreground"
                    title={p.source_reference}
                  >
                    {p.source_reference}
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
              {editing ? "Edit component price" : "Add component price"}
            </h2>
            <div className="grid gap-3">
              <AdminField
                label={`Component key (one of: ${ENGINE_KEYS.slice(0, 4).join(", ")}, …)`}
              >
                <input
                  list="solar-component-keys"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={form.component_key}
                  onChange={(e) => set("component_key", e.target.value)}
                />
                <datalist id="solar-component-keys">
                  {ENGINE_KEYS.map((k) => (
                    <option key={k} value={k} />
                  ))}
                </datalist>
              </AdminField>
              <AdminField label="Human label (optional)">
                <AdminInput
                  value={form.component_label}
                  onChange={(e) => set("component_label", e.target.value)}
                />
              </AdminField>
              <AdminField label="Unit (e.g. m, unit, pair, kW)">
                <AdminInput
                  value={form.unit}
                  onChange={(e) => set("unit", e.target.value)}
                />
              </AdminField>
              <AdminField label="Price (₦, zero or positive)">
                <AdminInput
                  type="number"
                  step="1"
                  min="0"
                  value={form.price_naira}
                  onChange={(e) => set("price_naira", e.target.value)}
                />
              </AdminField>
              <AdminField label="Supplier quote reference (required)">
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
                {editing ? "Save changes" : "Create price"}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
