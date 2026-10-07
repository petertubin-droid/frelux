/**
 * Admin pane: Defects knowledge base (Defect Diagnosis Engine)
 *
 * Two-level CRUD: symptoms (defects) and their root causes
 * (defect_causes). Validation mirrors the DB constraints
 * exactly (severity enum, positive consumption) so an admin
 * can never save a configuration the engine would refuse
 * or silently guess from.
 */

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Stethoscope, ArrowLeft } from "lucide-react";
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
  fetchDefects,
  createDefect,
  updateDefect,
  deleteDefect,
  fetchDefectCauses,
  createDefectCause,
  updateDefectCause,
  deleteDefectCause,
} from "@/lib/estimation/queries";
import type { Defect, DefectCause } from "@/types/estimation";

const SEVERITIES: DefectCause["severity"][] = ["low", "medium", "high"];

export default function AdminDefects() {
  // ── symptom list ──
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── selected defect + its causes ──
  const [selected, setSelected] = useState<Defect | null>(null);
  const [causes, setCauses] = useState<DefectCause[]>([]);
  const [causesLoading, setCausesLoading] = useState(false);

  // ── defect form ──
  const [editingDefect, setEditingDefect] = useState<Defect | null>(null);
  const [showDefectForm, setShowDefectForm] = useState(false);
  const [defectForm, setDefectForm] = useState({
    symptom_key: "",
    symptom_label: "",
    description: "",
    is_active: true,
    sort_order: "0",
  });

  // ── cause form ──
  const [editingCause, setEditingCause] = useState<DefectCause | null>(null);
  const [showCauseForm, setShowCauseForm] = useState(false);
  const [causeForm, setCauseForm] = useState({
    cause_key: "",
    cause_label: "",
    root_cause: "",
    severity: "medium" as DefectCause["severity"],
    fix_summary: "",
    fix_material: "",
    fix_consumption_per_sqm: "",
    fix_unit: "",
    is_active: true,
    sort_order: "0",
  });

  const loadDefects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchDefects();
    if (error) setError(error.message);
    else {
      setDefects(data);
      setError(null);
    }
    setLoading(false);
  }, []);

  const loadCauses = useCallback(async (defectId: string) => {
    setCausesLoading(true);
    const { data, error } = await fetchDefectCauses(defectId);
    if (error) setError(error.message);
    else {
      setCauses(data);
      setError(null);
    }
    setCausesLoading(false);
  }, []);

  useEffect(() => {
    loadDefects();
  }, [loadDefects]);

  useEffect(() => {
    if (selected) loadCauses(selected.id);
    else setCauses([]);
  }, [selected, loadCauses]);

  // ── defect CRUD ──
  const openDefectCreate = () => {
    setEditingDefect(null);
    setDefectForm({
      symptom_key: "",
      symptom_label: "",
      description: "",
      is_active: true,
      sort_order: "0",
    });
    setShowDefectForm(true);
  };

  const openDefectEdit = (d: Defect) => {
    setEditingDefect(d);
    setDefectForm({
      symptom_key: d.symptom_key,
      symptom_label: d.symptom_label,
      description: d.description ?? "",
      is_active: d.is_active,
      sort_order: String(d.sort_order),
    });
    setShowDefectForm(true);
  };

  const saveDefect = async () => {
    if (!defectForm.symptom_key.trim() || !defectForm.symptom_label.trim()) {
      setError("Symptom key and label are both required.");
      return;
    }
    setError(null);
    const payload = {
      symptom_key: defectForm.symptom_key.trim(),
      symptom_label: defectForm.symptom_label.trim(),
      description:
        defectForm.description.trim() === ""
          ? null
          : defectForm.description.trim(),
      is_active: defectForm.is_active,
      sort_order: Number(defectForm.sort_order) || 0,
    };
    const { error } = editingDefect
      ? await updateDefect(editingDefect.id, payload)
      : await createDefect(payload);
    if (error) setError(error.message);
    else {
      setShowDefectForm(false);
      setSuccess(
        editingDefect
          ? "Symptom updated."
          : `Symptom '${payload.symptom_key}' saved.`,
      );
      loadDefects();
    }
  };

  const removeDefect = async (d: Defect) => {
    if (
      !window.confirm(
        `Delete ${d.symptom_label}? Its causes are deleted with it.`,
      )
    )
      return;
    const { error } = await deleteDefect(d.id);
    if (error) setError(error.message);
    else {
      setSuccess("Symptom deleted.");
      if (selected?.id === d.id) setSelected(null);
      loadDefects();
    }
  };

  // ── cause CRUD ──
  const openCauseCreate = () => {
    setEditingCause(null);
    setCauseForm({
      cause_key: "",
      cause_label: "",
      root_cause: "",
      severity: "medium",
      fix_summary: "",
      fix_material: "",
      fix_consumption_per_sqm: "",
      fix_unit: "",
      is_active: true,
      sort_order: "0",
    });
    setShowCauseForm(true);
  };

  const openCauseEdit = (c: DefectCause) => {
    setEditingCause(c);
    setCauseForm({
      cause_key: c.cause_key,
      cause_label: c.cause_label,
      root_cause: c.root_cause,
      severity: c.severity,
      fix_summary: c.fix_summary,
      fix_material: c.fix_material ?? "",
      fix_consumption_per_sqm:
        c.fix_consumption_per_sqm !== null
          ? String(c.fix_consumption_per_sqm)
          : "",
      fix_unit: c.fix_unit ?? "",
      is_active: c.is_active,
      sort_order: String(c.sort_order),
    });
    setShowCauseForm(true);
  };

  const saveCause = async () => {
    if (!selected) return;
    if (!causeForm.cause_key.trim() || !causeForm.cause_label.trim()) {
      setError("Cause key and label are both required.");
      return;
    }
    if (!causeForm.root_cause.trim() || !causeForm.fix_summary.trim()) {
      setError(
        "Root cause (the diagnosis) and fix summary are both required: the engine never ships a cause without them.",
      );
      return;
    }
    const consumption =
      causeForm.fix_consumption_per_sqm.trim() === ""
        ? null
        : Number(causeForm.fix_consumption_per_sqm);
    if (
      consumption !== null &&
      (!Number.isFinite(consumption) || consumption <= 0)
    ) {
      setError(
        "Consumption per sqm must be positive: or leave it empty for a qualitative fix (the engine never guesses quantities).",
      );
      return;
    }
    if (consumption !== null && !causeForm.fix_unit.trim()) {
      setError(
        "A unit (e.g. litre, kg) is required when a consumption rate is configured.",
      );
      return;
    }
    setError(null);
    const payload = {
      defect_id: selected.id,
      cause_key: causeForm.cause_key.trim(),
      cause_label: causeForm.cause_label.trim(),
      root_cause: causeForm.root_cause.trim(),
      severity: causeForm.severity,
      fix_summary: causeForm.fix_summary.trim(),
      fix_material:
        causeForm.fix_material.trim() === ""
          ? null
          : causeForm.fix_material.trim(),
      fix_consumption_per_sqm: consumption,
      fix_unit:
        causeForm.fix_unit.trim() === "" ? null : causeForm.fix_unit.trim(),
      is_active: causeForm.is_active,
      sort_order: Number(causeForm.sort_order) || 0,
    };
    const { error } = editingCause
      ? await updateDefectCause(editingCause.id, payload)
      : await createDefectCause(payload);
    if (error) setError(error.message);
    else {
      setShowCauseForm(false);
      setSuccess(
        editingCause ? "Cause updated." : `Cause '${payload.cause_key}' saved.`,
      );
      loadCauses(selected.id);
    }
  };

  const removeCause = async (c: DefectCause) => {
    if (!selected) return;
    if (!window.confirm(`Delete the ${c.cause_label} cause?`)) return;
    const { error } = await deleteDefectCause(c.id);
    if (error) setError(error.message);
    else {
      setSuccess("Cause deleted.");
      loadCauses(selected.id);
    }
  };

  return (
    <div className="space-y-6">
      {selected ? (
        <AdminHeader
          title={`Causes: ${selected.symptom_label}`}
          subtitle="Root causes for this symptom, ranked by your configured order (sort order = likelihood, your editorial call). A cause carries a fix quantity only when you configure a consumption rate: the engine never invents one."
          action={
            <div className="flex gap-2">
              <AdminButton onClick={() => setSelected(null)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> All symptoms
              </AdminButton>
              <AdminButton onClick={openCauseCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Cause
              </AdminButton>
            </div>
          }
        />
      ) : (
        <AdminHeader
          title="Defects"
          subtitle="Admin-configured defect symptoms and root causes with fix quantities. Select a symptom to manage its causes. The diagnosis engine refuses unknown symptoms and never invents consumption rates."
          action={
            <AdminButton onClick={openDefectCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Symptom
            </AdminButton>
          }
        />
      )}

      {error && (
        <StateMessage
          type="error"
          title="Something went wrong"
          message={error}
        />
      )}
      {success && <StateMessage type="empty" title="Saved" message={success} />}

      {!selected &&
        (loading ? (
          <StateMessage
            type="loading"
            title="Loading"
            message="Loading symptoms…"
          />
        ) : defects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Stethoscope className="mx-auto mb-2 h-6 w-6" />
            No defect symptoms configured yet. Add symptoms (e.g. efflorescence,
            paint flaking) and their root causes with fix summaries, and the
            diagnosis page can map any symptom deterministically.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Symptom</th>
                  <th className="p-3">Key</th>
                  <th className="p-3">Active</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {defects.map((d) => (
                  <tr
                    key={d.id}
                    className="cursor-pointer border-t border-border hover:bg-muted/30"
                    onClick={() => setSelected(d)}
                  >
                    <td className="p-3 font-medium">
                      {d.symptom_label}
                      {d.description && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {d.description}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">{d.symptom_key}</td>
                    <td className="p-3">
                      <Toggle
                        checked={d.is_active}
                        onChange={() =>
                          updateDefect(d.id, { is_active: !d.is_active }).then(
                            loadDefects,
                          )
                        }
                      />
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <AdminIconButton
                          onClick={() => setSelected(d)}
                          title="Manage causes"
                        >
                          <Stethoscope className="h-4 w-4" />
                        </AdminIconButton>
                        <AdminIconButton
                          onClick={() => openDefectEdit(d)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </AdminIconButton>
                        <AdminIconButton
                          onClick={() => removeDefect(d)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </AdminIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {selected &&
        (causesLoading ? (
          <StateMessage
            type="loading"
            title="Loading"
            message="Loading causes…"
          />
        ) : causes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No causes configured for this symptom yet. The engine refuses to
            guess a diagnosis: add at least one root cause to make it
            diagnosable.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Cause</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Fix</th>
                  <th className="p-3">Consumption</th>
                  <th className="p-3">Active</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {causes.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-3 font-medium">
                      {c.cause_label}
                      <span className="block max-w-md text-xs font-normal text-muted-foreground">
                        {c.root_cause}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">{c.severity}</td>
                    <td className="max-w-48 truncate p-3 text-muted-foreground">
                      {c.fix_summary}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {c.fix_consumption_per_sqm !== null ? (
                        `${c.fix_consumption_per_sqm} ${c.fix_unit ?? "?"}/sqm`
                      ) : (
                        <span className="text-muted-foreground">
                          qualitative
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <Toggle
                        checked={c.is_active}
                        onChange={() =>
                          updateDefectCause(c.id, {
                            is_active: !c.is_active,
                          }).then(() => loadCauses(selected.id))
                        }
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <AdminIconButton
                          onClick={() => openCauseEdit(c)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </AdminIconButton>
                        <AdminIconButton
                          onClick={() => removeCause(c)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </AdminIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {/* ── symptom form ── */}
      <AdminModal
        open={showDefectForm}
        onClose={() => setShowDefectForm(false)}
        title={
          editingDefect
            ? `Edit ${editingDefect.symptom_label}`
            : "Add defect symptom"
        }
      >
        <div className="space-y-4">
          <AdminField label="Symptom key * (e.g. efflorescence)">
            <AdminInput
              value={defectForm.symptom_key}
              onChange={(e) =>
                setDefectForm({ ...defectForm, symptom_key: e.target.value })
              }
              placeholder="lowercase_with_underscores"
            />
          </AdminField>
          <AdminField label="Label * (what the visitor sees)">
            <AdminInput
              value={defectForm.symptom_label}
              onChange={(e) =>
                setDefectForm({ ...defectForm, symptom_label: e.target.value })
              }
              placeholder="e.g. White salty deposits on walls"
            />
          </AdminField>
          <AdminField label="Description">
            <AdminTextarea
              value={defectForm.description}
              onChange={(e) =>
                setDefectForm({ ...defectForm, description: e.target.value })
              }
              placeholder="What the symptom looks like"
            />
          </AdminField>
          <AdminField label="Active">
            <Toggle
              checked={defectForm.is_active}
              onChange={(v) => setDefectForm({ ...defectForm, is_active: v })}
            />
          </AdminField>
          <div className="flex justify-end gap-2">
            <AdminButton onClick={() => setShowDefectForm(false)}>
              Cancel
            </AdminButton>
            <AdminButton onClick={saveDefect} variant="primary">
              Save
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* ── cause form ── */}
      <AdminModal
        open={showCauseForm}
        onClose={() => setShowCauseForm(false)}
        title={
          editingCause
            ? `Edit ${editingCause.cause_label}`
            : `Add cause: ${selected?.symptom_label ?? ""}`
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Cause key * (unique per symptom)">
              <AdminInput
                value={causeForm.cause_key}
                onChange={(e) =>
                  setCauseForm({ ...causeForm, cause_key: e.target.value })
                }
                placeholder="e.g. salt_migration"
              />
            </AdminField>
            <AdminField label="Label *">
              <AdminInput
                value={causeForm.cause_label}
                onChange={(e) =>
                  setCauseForm({ ...causeForm, cause_label: e.target.value })
                }
                placeholder="e.g. Salt migration through masonry"
              />
            </AdminField>
          </div>
          <AdminField label="Root cause *: the diagnosis text">
            <AdminTextarea
              value={causeForm.root_cause}
              onChange={(e) =>
                setCauseForm({ ...causeForm, root_cause: e.target.value })
              }
              placeholder="What is actually happening"
            />
          </AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Severity *">
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={causeForm.severity}
                onChange={(e) =>
                  setCauseForm({
                    ...causeForm,
                    severity: e.target.value as DefectCause["severity"],
                  })
                }
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Sort order (rank = likelihood, your call)">
              <AdminInput
                type="number"
                value={causeForm.sort_order}
                onChange={(e) =>
                  setCauseForm({ ...causeForm, sort_order: e.target.value })
                }
              />
            </AdminField>
          </div>
          <AdminField label="Fix summary *: what to do about it">
            <AdminTextarea
              value={causeForm.fix_summary}
              onChange={(e) =>
                setCauseForm({ ...causeForm, fix_summary: e.target.value })
              }
            />
          </AdminField>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Fix quantity (optional: leave empty for a qualitative fix; the
              engine never guesses quantities)
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <AdminField label="Material">
                <AdminInput
                  value={causeForm.fix_material}
                  onChange={(e) =>
                    setCauseForm({ ...causeForm, fix_material: e.target.value })
                  }
                  placeholder="e.g. Stabilising primer"
                />
              </AdminField>
              <AdminField label="Consumption /sqm">
                <AdminInput
                  type="number"
                  step="any"
                  value={causeForm.fix_consumption_per_sqm}
                  onChange={(e) =>
                    setCauseForm({
                      ...causeForm,
                      fix_consumption_per_sqm: e.target.value,
                    })
                  }
                  placeholder="e.g. 0.25"
                />
              </AdminField>
              <AdminField label="Unit">
                <AdminInput
                  value={causeForm.fix_unit}
                  onChange={(e) =>
                    setCauseForm({ ...causeForm, fix_unit: e.target.value })
                  }
                  placeholder="e.g. litre, kg"
                />
              </AdminField>
            </div>
          </div>
          <AdminField label="Active">
            <Toggle
              checked={causeForm.is_active}
              onChange={(v) => setCauseForm({ ...causeForm, is_active: v })}
            />
          </AdminField>
          <div className="flex justify-end gap-2">
            <AdminButton onClick={() => setShowCauseForm(false)}>
              Cancel
            </AdminButton>
            <AdminButton onClick={saveCause} variant="primary">
              Save
            </AdminButton>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
