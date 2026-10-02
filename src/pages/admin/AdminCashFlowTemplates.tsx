/**
 * Admin pane: Cash-Flow Templates (Cash-Flow Timeline Engine)
 *
 * Full CRUD over cash_flow_templates. Validation mirrors the
 * engine exactly: milestone percentages must sum to exactly
 * 100%, labels/offsets must be valid — so an admin can never
 * save a template the engine would have to refuse or guess.
 */

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
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
  fetchCashFlowTemplates,
  createCashFlowTemplate,
  updateCashFlowTemplate,
  deleteCashFlowTemplate,
} from "@/lib/estimation/queries";
import type { CashFlowTemplate, CashFlowMilestone } from "@/types/estimation";

interface TemplateForm {
  name: string;
  description: string;
  milestones: { label: string; percent: string; offset_months: string }[];
  is_default: boolean;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: TemplateForm = {
  name: "",
  description: "",
  milestones: [{ label: "", percent: "", offset_months: "" }],
  is_default: false,
  is_active: true,
  sort_order: "0",
};

function formFromTemplate(t: CashFlowTemplate): TemplateForm {
  return {
    name: t.name,
    description: t.description ?? "",
    milestones: t.milestones.map((m: CashFlowMilestone) => ({
      label: m.label,
      percent: String(m.percent),
      offset_months: String(m.offset_months),
    })),
    is_default: t.is_default,
    is_active: t.is_active,
    sort_order: String(t.sort_order),
  };
}

// Validation mirroring the engine: sum must be exactly 100
function validate(f: TemplateForm): string | null {
  if (!f.name.trim()) return "Template name is required.";
  let sum = 0;
  for (const m of f.milestones) {
    if (!m.label.trim()) return "Every milestone needs a label.";
    const p = Number(m.percent);
    if (!Number.isFinite(p) || p <= 0)
      return `Milestone '${m.label}' needs a positive percent.`;
    const o = Number(m.offset_months);
    if (!Number.isFinite(o) || o < 0)
      return `Milestone '${m.label}' needs a non-negative offset in months.`;
    sum += p;
  }
  if (Math.abs(sum - 100) > 1e-9)
    return `Milestone percentages sum to ${sum}% — they must sum to exactly 100%. The engine refuses anything else rather than silently adjusting.`;
  return null;
}

export default function AdminCashFlowTemplates() {
  const [templates, setTemplates] = useState<CashFlowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<CashFlowTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchCashFlowTemplates();
    if (error) setError(error.message);
    else {
      setTemplates(data);
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

  const openEdit = (t: CashFlowTemplate) => {
    setEditing(t);
    setForm(formFromTemplate(t));
    setShowForm(true);
  };

  const setMilestone = (
    i: number,
    patch: Partial<TemplateForm["milestones"][0]>,
  ) =>
    setForm((f) => ({
      ...f,
      milestones: f.milestones.map((m, idx) =>
        idx === i ? { ...m, ...patch } : m,
      ),
    }));

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
      description:
        form.description.trim() === "" ? null : form.description.trim(),
      milestones: form.milestones.map((m) => ({
        label: m.label.trim(),
        percent: Number(m.percent),
        offset_months: Number(m.offset_months),
      })),
      is_default: form.is_default,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await updateCashFlowTemplate(editing.id, payload)
      : await createCashFlowTemplate(payload);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setShowForm(false);
      setSuccess(
        editing ? "Template updated." : `Template '${payload.name}' saved.`,
      );
      load();
    }
  };

  const remove = async (t: CashFlowTemplate) => {
    if (!window.confirm(`Delete the ${t.name} template?`)) return;
    const { error } = await deleteCashFlowTemplate(t.id);
    if (error) setError(error.message);
    else {
      setSuccess("Template deleted.");
      load();
    }
  };

  const percentSum = form.milestones.reduce(
    (s, m) => s + (Number(m.percent) || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Cash-Flow Templates"
        subtitle="Admin-configured payment milestone templates (label, percent, months after start). Percentages must sum to exactly 100% — the engine refuses anything else rather than silently adjusting a payment plan."
        action={
          <AdminButton onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Template
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
          message="Loading templates…"
        />
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Wallet className="mx-auto mb-2 h-6 w-6" />
          No cash-flow templates configured yet. Add one (e.g. Mobilization 40%,
          Mid-project 35%, Completion 25%) and the Cash-Flow Timeline page can
          schedule any estimate total deterministically.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Milestones</th>
                <th className="p-3">Sum</th>
                <th className="p-3">Default</th>
                <th className="p-3">Active</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const sum = t.milestones.reduce(
                  (s, m) => s + Number(m.percent),
                  0,
                );
                return (
                  <tr key={t.id} className="border-t border-border">
                    <td className="p-3 font-medium">
                      {t.name}
                      {t.description && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {t.description}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {t.milestones
                        .map(
                          (m) =>
                            `${m.label} ${m.percent}% @${m.offset_months}m`,
                        )
                        .join(" · ")}
                    </td>
                    <td className="p-3 font-mono">{sum}%</td>
                    <td className="p-3">
                      <Toggle
                        checked={t.is_default}
                        onChange={() =>
                          updateCashFlowTemplate(t.id, {
                            is_default: !t.is_default,
                          }).then(load)
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Toggle
                        checked={t.is_active}
                        onChange={() =>
                          updateCashFlowTemplate(t.id, {
                            is_active: !t.is_active,
                          }).then(load)
                        }
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <AdminIconButton
                          onClick={() => openEdit(t)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </AdminIconButton>
                        <AdminIconButton
                          onClick={() => remove(t)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </AdminIconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? `Edit ${editing.name}` : "Add cash-flow template"}
      >
        <div className="space-y-4">
          <AdminField label="Template name * (e.g. Standard 40/35/25)">
            <AdminInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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

          <div className="space-y-2">
            <p className="text-sm font-medium">Milestones *</p>
            {form.milestones.map((m, i) => (
              <div
                key={i}
                className="grid gap-2 sm:grid-cols-[1fr_100px_120px_auto]"
              >
                <AdminInput
                  value={m.label}
                  onChange={(e) => setMilestone(i, { label: e.target.value })}
                  placeholder={`Milestone ${i + 1} label`}
                />
                <AdminInput
                  type="number"
                  value={m.percent}
                  onChange={(e) => setMilestone(i, { percent: e.target.value })}
                  placeholder="%"
                />
                <AdminInput
                  type="number"
                  value={m.offset_months}
                  onChange={(e) =>
                    setMilestone(i, { offset_months: e.target.value })
                  }
                  placeholder="months"
                />
                <AdminIconButton
                  title="Remove milestone"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      milestones: f.milestones.filter((_, idx) => idx !== i),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </AdminIconButton>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <AdminButton
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    milestones: [
                      ...f.milestones,
                      { label: "", percent: "", offset_months: "" },
                    ],
                  }))
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add milestone
              </AdminButton>
              <p
                className={
                  "text-sm font-mono " +
                  (Math.abs(percentSum - 100) < 1e-9
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive")
                }
              >
                Σ {percentSum}%
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Default template">
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
