/**
 * Admin pane: Maintenance Profiles (Maintenance Schedule Engine)
 *
 * Full CRUD over maintenance_profiles. Validation mirrors the DB
 * constraints exactly (positive values, ordered ranges, interval
 * within service life, source_reference required) so an admin can
 * never save a configuration the engine would have to refuse or guess.
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
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminUi";
import { AdminModal } from "@/components/admin/AdminModal";
import {
  fetchMaintenanceProfiles,
  createMaintenanceProfile,
  updateMaintenanceProfile,
  deleteMaintenanceProfile,
} from "@/lib/estimation/queries";
import type { MaintenanceProfile } from "@/types/estimation";

interface ProfileForm {
  finish_category: string;
  surface_type: string;
  service_life_min_years: string;
  service_life_max_years: string;
  maintenance_interval_min_years: string;
  maintenance_interval_max_years: string;
  inspection_interval_years: string;
  maintenance_cost_factor: string;
  replacement_cost_factor: string;
  description: string;
  source_reference: string;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: ProfileForm = {
  finish_category: "",
  surface_type: "interior",
  service_life_min_years: "",
  service_life_max_years: "",
  maintenance_interval_min_years: "",
  maintenance_interval_max_years: "",
  inspection_interval_years: "",
  maintenance_cost_factor: "",
  replacement_cost_factor: "1",
  description: "",
  source_reference: "",
  is_active: true,
  sort_order: "0",
};

const SURFACE_TYPES = [
  "interior",
  "exterior",
  "wet_area",
  "ceiling",
  "floor",
  "any",
];

function formFromProfile(p: MaintenanceProfile): ProfileForm {
  const s = (v: number | string | null | undefined) =>
    v === null || v === undefined ? "" : String(v);
  return {
    finish_category: p.finish_category,
    surface_type: p.surface_type,
    service_life_min_years: s(p.service_life_min_years),
    service_life_max_years: s(p.service_life_max_years),
    maintenance_interval_min_years: s(p.maintenance_interval_min_years),
    maintenance_interval_max_years: s(p.maintenance_interval_max_years),
    inspection_interval_years: s(p.inspection_interval_years),
    maintenance_cost_factor: s(p.maintenance_cost_factor),
    replacement_cost_factor: s(p.replacement_cost_factor),
    description: p.description ?? "",
    source_reference: p.source_reference,
    is_active: p.is_active,
    sort_order: String(p.sort_order),
  };
}

// Client-side validation mirroring the DB constraints
function validate(f: ProfileForm): string | null {
  const lifeMin = Number(f.service_life_min_years);
  const lifeMax = Number(f.service_life_max_years);
  if (!f.finish_category.trim()) return "Finish category is required.";
  if (!Number.isFinite(lifeMin) || lifeMin <= 0)
    return "Service life (min) must be a positive number.";
  if (!Number.isFinite(lifeMax) || lifeMax <= 0)
    return "Service life (max) must be a positive number.";
  if (lifeMin > lifeMax) return "Service life min must not exceed max.";

  const intMin =
    f.maintenance_interval_min_years === ""
      ? null
      : Number(f.maintenance_interval_min_years);
  const intMax =
    f.maintenance_interval_max_years === ""
      ? null
      : Number(f.maintenance_interval_max_years);
  if (intMin !== null && intMin <= 0)
    return "Maintenance interval (min) must be positive.";
  if (intMax !== null && intMax <= 0)
    return "Maintenance interval (max) must be positive.";
  if ((intMin === null) !== (intMax === null))
    return "Maintenance interval needs both min and max, or neither (leave both empty for no intermediate cycle).";
  if (intMin !== null && intMax !== null) {
    if (intMin > intMax) return "Maintenance interval min must not exceed max.";
    if (intMax > lifeMin)
      return `Maintenance interval max (${intMax}) must fit inside the service life (min ${lifeMin}).`;
  }

  const insp =
    f.inspection_interval_years === ""
      ? null
      : Number(f.inspection_interval_years);
  if (insp !== null && insp <= 0)
    return "Inspection interval must be positive.";

  const maintFactor = Number(f.maintenance_cost_factor);
  if (!Number.isFinite(maintFactor) || maintFactor <= 0)
    return "Maintenance cost factor must be positive (e.g. 0.35 = 35%).";
  const replFactor = Number(f.replacement_cost_factor);
  if (!Number.isFinite(replFactor) || replFactor <= 0)
    return "Replacement cost factor must be positive (default 1).";

  if (!f.source_reference.trim())
    return "Source reference is required: maintenance data must be verifiable (standard, datasheet or trade source).";
  return null;
}

export default function AdminMaintenanceProfiles() {
  const [profiles, setProfiles] = useState<MaintenanceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<MaintenanceProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchMaintenanceProfiles();
    if (error) setError(error.message);
    else {
      setProfiles(data);
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

  const openEdit = (p: MaintenanceProfile) => {
    setEditing(p);
    setForm(formFromProfile(p));
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
      finish_category: form.finish_category.trim(),
      surface_type: form.surface_type,
      service_life_min_years: Number(form.service_life_min_years),
      service_life_max_years: Number(form.service_life_max_years),
      maintenance_interval_min_years:
        form.maintenance_interval_min_years === ""
          ? null
          : Number(form.maintenance_interval_min_years),
      maintenance_interval_max_years:
        form.maintenance_interval_max_years === ""
          ? null
          : Number(form.maintenance_interval_max_years),
      inspection_interval_years:
        form.inspection_interval_years === ""
          ? null
          : Number(form.inspection_interval_years),
      maintenance_cost_factor: Number(form.maintenance_cost_factor),
      replacement_cost_factor: Number(form.replacement_cost_factor),
      description:
        form.description.trim() === "" ? null : form.description.trim(),
      source_reference: form.source_reference.trim(),
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await updateMaintenanceProfile(editing.id, payload)
      : await createMaintenanceProfile(payload);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setShowForm(false);
    setSuccess(editing ? "Profile updated." : "Profile created.");
    load();
  };

  const remove = async (p: MaintenanceProfile) => {
    if (
      !window.confirm(
        `Delete the maintenance profile for ${p.finish_category} / ${p.surface_type}?`,
      )
    )
      return;
    const { error } = await deleteMaintenanceProfile(p.id);
    if (error) setError(error.message);
    else {
      setSuccess("Profile deleted.");
      load();
    }
  };

  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Maintenance Profiles"
        subtitle="Verified maintenance data per finish category and surface type: service lives, re-coat intervals, inspection cadence and cost factors. The Maintenance Planner refuses to schedule categories without a configured profile."
        action={
          <AdminButton onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Profile
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
          title="Loading…"
          message="Fetching maintenance profiles."
        />
      ) : profiles.length === 0 ? (
        <StateMessage
          type="empty"
          title="No maintenance profiles yet"
          message="Add verified data (e.g. paint / exterior with an 8–12 year service life from a manufacturer datasheet) to enable the Maintenance Planner."
        />
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Category / Surface</th>
              <th className="p-3">Service life</th>
              <th className="p-3">Maint. interval</th>
              <th className="p-3">Inspection</th>
              <th className="p-3">Cost factors</th>
              <th className="p-3">Source</th>
              <th className="p-3">Active</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-medium">
                  {p.finish_category}
                  <span className="block text-xs text-muted-foreground">
                    {p.surface_type}
                  </span>
                </td>
                <td className="p-3">
                  {p.service_life_min_years}–{p.service_life_max_years} yrs
                </td>
                <td className="p-3">
                  {p.maintenance_interval_min_years
                    ? `${p.maintenance_interval_min_years}–${p.maintenance_interval_max_years} yrs`
                    : "N/A"}
                </td>
                <td className="p-3">
                  {p.inspection_interval_years
                    ? `${p.inspection_interval_years} yr`
                    : "N/A"}
                </td>
                <td className="p-3">
                  ×{p.maintenance_cost_factor} / ×{p.replacement_cost_factor}
                </td>
                <td
                  className="p-3 max-w-40 truncate text-xs text-muted-foreground"
                  title={p.source_reference}
                >
                  {p.source_reference}
                </td>
                <td className="p-3">
                  <Toggle
                    checked={p.is_active}
                    onChange={async (v) => {
                      await updateMaintenanceProfile(p.id, { is_active: v });
                      load();
                    }}
                    label={`Active ${p.finish_category}`}
                  />
                </td>
                <td className="p-3 text-right">
                  <AdminIconButton
                    onClick={() => openEdit(p)}
                    aria-label={`Edit ${p.finish_category} profile`}
                  >
                    <Pencil className="h-4 w-4" />
                  </AdminIconButton>
                  <AdminIconButton
                    onClick={() => remove(p)}
                    aria-label={`Delete ${p.finish_category} profile`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </AdminIconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit maintenance profile" : "Add maintenance profile"}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Finish category *">
            <AdminInput
              value={form.finish_category}
              onChange={(e) => set("finish_category", e.target.value)}
              placeholder="paint, pop, tile, mineral_stone ..."
            />
          </AdminField>
          <AdminField label="Surface type *">
            <AdminSelect
              value={form.surface_type}
              onChange={(e) => set("surface_type", e.target.value)}
            >
              {SURFACE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField label="Service life: min (years) *">
            <AdminInput
              type="number"
              value={form.service_life_min_years}
              onChange={(e) => set("service_life_min_years", e.target.value)}
            />
          </AdminField>
          <AdminField label="Service life: max (years) *">
            <AdminInput
              type="number"
              value={form.service_life_max_years}
              onChange={(e) => set("service_life_max_years", e.target.value)}
            />
          </AdminField>
          <AdminField label="Maintenance interval: min (years)">
            <AdminInput
              type="number"
              value={form.maintenance_interval_min_years}
              onChange={(e) =>
                set("maintenance_interval_min_years", e.target.value)
              }
            />
          </AdminField>
          <AdminField label="Maintenance interval: max (years)">
            <AdminInput
              type="number"
              value={form.maintenance_interval_max_years}
              onChange={(e) =>
                set("maintenance_interval_max_years", e.target.value)
              }
            />
          </AdminField>
          <AdminField label="Inspection interval (years)">
            <AdminInput
              type="number"
              value={form.inspection_interval_years}
              onChange={(e) => set("inspection_interval_years", e.target.value)}
            />
          </AdminField>
          <AdminField label="Maintenance cost factor * (× installed cost)">
            <AdminInput
              type="number"
              value={form.maintenance_cost_factor}
              onChange={(e) => set("maintenance_cost_factor", e.target.value)}
              placeholder="0.35 = 35% of installed cost"
            />
          </AdminField>
          <AdminField label="Replacement cost factor * (× installed cost)">
            <AdminInput
              type="number"
              value={form.replacement_cost_factor}
              onChange={(e) => set("replacement_cost_factor", e.target.value)}
            />
          </AdminField>
          <AdminField label="Sort order">
            <AdminInput
              type="number"
              value={form.sort_order}
              onChange={(e) => set("sort_order", e.target.value)}
            />
          </AdminField>
          <div className="sm:col-span-2">
            <AdminField label="Description">
              <AdminTextarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="e.g. Exterior emulsion, coastal exposure"
              />
            </AdminField>
          </div>
          <div className="sm:col-span-2">
            <AdminField label="Source reference * (verified provenance)">
              <AdminTextarea
                value={form.source_reference}
                onChange={(e) => set("source_reference", e.target.value)}
                placeholder="Manufacturer datasheet, standard or trade source this data comes from"
              />
            </AdminField>
          </div>
          <AdminField label="Active">
            <Toggle
              checked={form.is_active}
              onChange={(v) => set("is_active", v)}
              label="Profile active"
            />
          </AdminField>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <AdminButton variant="secondary" onClick={() => setShowForm(false)}>
            Cancel
          </AdminButton>
          <AdminButton onClick={save} disabled={saving}>
            {saving
              ? "Saving..."
              : editing
                ? "Update profile"
                : "Create profile"}
          </AdminButton>
        </div>
      </AdminModal>
    </div>
  );
}
