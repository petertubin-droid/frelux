import { downloadCsv } from "@/lib/export-utils";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X, Check, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminField,
  StateMessage,
  Toggle,
  AdminInput,
  AdminIconButton,
  AdminSelect,
} from "@/components/admin/AdminUi";
import { classNames } from "@/lib/utils";
import type {
  DbPopMaterial,
  PopWorkflowType,
  PopMaterialCategory,
  PopQuantityBasis,
} from "@/types/database";
import { useLanguage } from "@/lib/i18n";
import { formatByCode } from "@/lib/international/currency-format";
import { getCountryCurrency } from "@/lib/international/countries";

type Status = "loading" | "ready" | "error";

function getPopCurrency(m: { workflow?: string; market?: string }): string {
  if (m.workflow === "international" && m.market) {
    return getCountryCurrency(m.market) ?? "USD";
  }
  return m.workflow === "international" ? "USD" : "NGN";
}


const categories: PopMaterialCategory[] = [
  "primary",
  "finishing",
  "decorative",
  "framework",
  "ceiling_boards",
  "fasteners",
  "equipment",
  "labour",
];
const workflows: PopWorkflowType[] = ["nigeria", "international"];

export default function AdminPopMaterials() {
  const { t } = useLanguage();
  const [materials, setMaterials] = useState<DbPopMaterial[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [filterWf, setFilterWf] = useState<PopWorkflowType>("nigeria");
  const [editing, setEditing] = useState<DbPopMaterial | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setStatus("loading");
    const { data, error } = await supabase
      .from("pop_materials")
      .select("*")
      .order("workflow")
      .order("category")
      .order("sort_order");
    if (error) {
      setError(error.message);
      setStatus("error");
      return;
    }
    setMaterials((data ?? []) as DbPopMaterial[]);
    setStatus("ready");
  }

  async function handleSave(mat: Partial<DbPopMaterial>) {
    if (saving) return;
    // Validate numeric fields before saving
    const validated = { ...mat };
    const perWorker = validated.quantity_basis === "per_worker";
    const perDay = validated.quantity_basis === "per_day";
    if (perDay) {
      // Hire is days × units × day rate. Coverage has no meaning here, so a
      // save must not leave a stray area figure the engine would ignore anyway.
      validated.coverage_rate = 0;
      validated.per_day_rate = Math.max(0, Number(validated.per_day_rate) || 0);
    }
    if ("coverage_rate" in validated && !perWorker && !perDay)
      validated.coverage_rate = Math.max(
        0.1,
        Number(validated.coverage_rate) || 0.1,
      );
    if (perWorker) {
      // A crew item is priced by rate per worker, so keep area coverage at
      // zero rather than inventing one, and never a negative rate.
      validated.coverage_rate = 0;
      validated.per_worker_rate = Math.max(
        0,
        Number(validated.per_worker_rate) || 0,
      );
      // The cut half carries its own price; never let a save blank it, or the
      // engine falls back to charging whole boards for a one-worker job.
      if (validated.split_unit_price !== undefined) {
        validated.split_unit_price = Math.max(
          0,
          Number(validated.split_unit_price) || 0,
        );
      }
    }
    if ("package_size" in validated)
      validated.package_size = Math.max(1, Number(validated.package_size) || 1);
    if ("unit_price" in validated)
      validated.unit_price = Math.max(0, Number(validated.unit_price) || 0);
    if ("labour_rate_per_sqm" in validated)
      validated.labour_rate_per_sqm = Math.max(
        0,
        Number(validated.labour_rate_per_sqm) || 0,
      );
    setSaveError(null);
    setSaving(true);
    const { error } = editing
      ? await supabase
          .from("pop_materials")
          .update({ ...validated, updated_at: new Date().toISOString() })
          .eq("id", editing.id)
      : await supabase.from("pop_materials").insert(validated);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setShowEditor(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this material?")) return;
    setSaveError(null);
    const { error } = await supabase
      .from("pop_materials")
      .delete()
      .eq("id", id);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleToggleActive(mat: DbPopMaterial) {
    await supabase
      .from("pop_materials")
      .update({ is_active: !mat.is_active })
      .eq("id", mat.id);
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === mat.id ? { ...m, is_active: !m.is_active } : m,
      ),
    );
  }

  function handleExport() {
    const columns = [
      { header: "workflow", key: "workflow" },
      { header: "category", key: "category" },
      { header: "name", key: "name" },
      { header: "unit", key: "unit" },
      { header: "coverage_rate", key: "coverage_rate" },
      { header: "coverage_unit", key: "coverage_unit" },
      { header: "package_size", key: "package_size" },
      { header: "package_unit", key: "package_unit" },
      { header: "unit_price", key: "unit_price" },
      { header: "labour_rate_per_sqm", key: "labour_rate_per_sqm" },
      { header: "is_optional", key: "is_optional" },
      { header: "is_active", key: "is_active" },
      { header: "sort_order", key: "sort_order" },
    ];
    downloadCsv(
      "pop_materials",
      materials as unknown as Record<string, unknown>[],
      columns,
    );
  }

  const filtered = materials.filter((m) => m.workflow === filterWf);

  if (status === "loading")
    return (
      <>
        <AdminHeader
          title={t("POP Materials")}
          subtitle={t("Manage POP ceiling material library and pricing.")}
        />
        <StateMessage
          type="loading"
          title={t("Loading…")}
          message="Fetching materials."
        />
      </>
    );
  if (status === "error")
    return (
      <>
        <AdminHeader
          title={t("POP Materials")}
          subtitle={t("Manage POP ceiling material library and pricing.")}
        />
        <StateMessage type="error" title={t("Error")} message={error} />
      </>
    );

  return (
    <>
      <AdminHeader
        title={t("POP Materials")}
        subtitle={t("Manage POP ceiling material library and pricing.")}
        action={
          <div className="flex gap-2">
            <AdminButton onClick={handleExport}>
              <Download aria-hidden="true" className="h-4 w-4" /> {t("Export")}
            </AdminButton>
            <AdminButton
              onClick={() => {
                setEditing(null);
                setShowEditor(true);
              }}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />{" "}
              {t("Add Material")}
            </AdminButton>
          </div>
        }
      />
      {saveError && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
          role="alert"
        >
          {saveError}
        </div>
      )}

      <div className="mb-4 inline-flex rounded-lg border border-border bg-card dark:border-white/5 dark:bg-card p-1">
        {workflows.map((wf) => (
          <AdminButton
            key={wf}
            type="button"
            onClick={() => setFilterWf(wf)}
            className={classNames(
              "rounded-md px-4 py-2 text-sm font-semibold capitalize transition-all",
              filterWf === wf
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-brand-purple",
            )}
          >
            {wf}
          </AdminButton>
        ))}
      </div>

      {!showEditor && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <StateMessage
              type="empty"
              title={t("No materials")}
              message="Add materials for this workflow."
            />
          ) : (
            categories.map((cat) => {
              const catItems = filtered.filter((m) => m.category === cat);
              if (catItems.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
                    {cat.replace(/_/g, " ")}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {catItems.map((mat) => (
                      <div key={mat.id} className="card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-xs font-bold text-foreground dark:text-primary-foreground">
                                {mat.name}
                              </p>
                              {mat.is_optional && (
                                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                                  {t("Opt")}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground dark:text-muted-foreground">
                              {mat.quantity_basis === "per_day" ? (
                                <>
                                  {mat.per_day_rate ?? 0} {mat.package_unit} per
                                  day · {formatByCode(mat.unit_price, getPopCurrency(mat))} a day
                                </>
                              ) : mat.quantity_basis === "per_worker" ? (
                                <>
                                  {mat.per_worker_rate ?? 0} {mat.package_unit}{" "}
                                  per worker · {formatByCode(mat.unit_price, getPopCurrency(mat))}
                                  {mat.split_unit_price
                                    ? ` (half ${formatByCode(mat.split_unit_price, getPopCurrency(mat))})`
                                    : ""}
                                </>
                              ) : (
                                <>
                                  {mat.coverage_rate} {mat.coverage_unit} ·{" "}
                                  {mat.package_size}
                                  {mat.package_unit} · {formatByCode(mat.unit_price, getPopCurrency(mat))}
                                </>
                              )}
                            </p>
                          </div>
                          <span
                            className={classNames(
                              "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                              mat.is_active
                                ? "bg-accent-green/15 text-accent-green"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {mat.is_active ? "On" : "Off"}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 dark:border-white/5">
                          <Toggle
                            srLabel="{`Active: ${mat.name}`}"
                            checked={mat.is_active}
                            onChange={() => handleToggleActive(mat)}
                          />
                          <div className="flex items-center gap-0.5">
                            <AdminIconButton
                              aria-label={`Edit ${mat.name}`}
                              variant="ghost"
                              type="button"
                              onClick={() => {
                                setEditing(mat);
                                setShowEditor(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </AdminIconButton>
                            <AdminIconButton
                              aria-label={`Delete ${mat.name}`}
                              variant="danger"
                              type="button"
                              onClick={() => handleDelete(mat.id)}
                            >
                              <Trash2 aria-hidden="true" className="h-3 w-3" />
                            </AdminIconButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showEditor && (
        <MaterialEditor
          material={editing}
          defaultWorkflow={filterWf}
          onSave={handleSave}
          onCancel={() => {
            setShowEditor(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function MaterialEditor({
  material,
  defaultWorkflow,
  onSave,
  onCancel,
}: {
  material: DbPopMaterial | null;
  defaultWorkflow: PopWorkflowType;
  onSave: (data: Partial<DbPopMaterial>) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    workflow: material?.workflow ?? defaultWorkflow,
    category: material?.category ?? "primary",
    name: material?.name ?? "",
    unit: material?.unit ?? "bag",
    coverage_rate: material?.coverage_rate ?? 1,
    coverage_unit: material?.coverage_unit ?? "m²",
    quantity_basis: (material?.quantity_basis ?? "area") as PopQuantityBasis,
    per_worker_rate: material?.per_worker_rate ?? 0,
    split_unit_price: material?.split_unit_price ?? 0,
    per_day_rate: material?.per_day_rate ?? 0,
    package_size: material?.package_size ?? 1,
    package_unit: material?.package_unit ?? "unit",
    unit_price: material?.unit_price ?? 0,
    labour_rate_per_sqm: material?.labour_rate_per_sqm ?? 0,
    is_optional: material?.is_optional ?? false,
    is_active: material?.is_active ?? true,
    sort_order: material?.sort_order ?? 0,
  });

  return (
    <AdminCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
          {material ? "Edit Material" : "New Material"}
        </h2>
        <AdminIconButton
          variant="ghost"
          type="button"
          onClick={onCancel}
          aria-label="Close"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </AdminIconButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Name">
          <AdminInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </AdminField>
        <AdminField label="Workflow">
          <AdminSelect
            value={form.workflow}
            onChange={(e) =>
              setForm({ ...form, workflow: e.target.value as PopWorkflowType })
            }
          >
            {workflows.map((w) => (
              <option key={w} value={w} className="capitalize">
                {w}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        <AdminField label="Category">
          <AdminSelect
            value={form.category}
            onChange={(e) =>
              setForm({
                ...form,
                category: e.target.value as PopMaterialCategory,
              })
            }
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        <AdminField label="Unit">
          <AdminInput
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
        </AdminField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField
          label="Quantity basis"
          hint={
            form.quantity_basis === "per_day"
              ? "Days on site × hire units, at the day rate"
              : form.quantity_basis === "per_worker"
                ? "Workers × units per worker"
                : "Ceiling area ÷ coverage rate"
          }
        >
          <AdminSelect
            value={form.quantity_basis ?? "area"}
            onChange={(e) => {
              const basis = e.target.value as PopQuantityBasis;
              setForm({
                ...form,
                quantity_basis: basis,
                // A hire line reads as days, so default the unit with it.
                package_unit:
                  basis === "per_day" && !form.package_unit.trim()
                    ? "day"
                    : form.package_unit,
              });
            }}
          >
            <option value="area">Area</option>
            <option value="per_worker">Per worker</option>
            <option value="per_day">Per day (hire)</option>
          </AdminSelect>
        </AdminField>
        {form.quantity_basis === "per_day" ? (
          <AdminField
            label="Hire units per day"
            hint="One tower, one mixer. Price below is the day rate."
          >
            <AdminInput
              type="number"
              step="0.1"
              value={form.per_day_rate ?? 0}
              onChange={(e) =>
                setForm({ ...form, per_day_rate: Number(e.target.value) })
              }
            />
          </AdminField>
        ) : (
          <AdminField label="Coverage Rate">
            <AdminInput
              type="number"
              step="0.1"
              value={form.coverage_rate}
              onChange={(e) =>
                setForm({ ...form, coverage_rate: Number(e.target.value) })
              }
            />
          </AdminField>
        )}
        <AdminField label="Coverage Unit">
          <AdminInput
            value={form.coverage_unit}
            onChange={(e) =>
              setForm({ ...form, coverage_unit: e.target.value })
            }
          />
        </AdminField>
        <AdminField label="Package Size">
          <AdminInput
            type="number"
            step="0.1"
            value={form.package_size}
            onChange={(e) =>
              setForm({ ...form, package_size: Number(e.target.value) })
            }
          />
        </AdminField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Package Unit">
          <AdminInput
            value={form.package_unit}
            onChange={(e) => setForm({ ...form, package_unit: e.target.value })}
          />
        </AdminField>
        <AdminField label={`Unit Price (${getPopCurrency(form)})`}>
          <AdminInput
            type="number"
            value={form.unit_price}
            onChange={(e) =>
              setForm({ ...form, unit_price: Number(e.target.value) })
            }
          />
        </AdminField>
        <AdminField label={`Labour Rate/m² (${getPopCurrency(form)})`}>
          <AdminInput
            type="number"
            value={form.labour_rate_per_sqm}
            onChange={(e) =>
              setForm({ ...form, labour_rate_per_sqm: Number(e.target.value) })
            }
          />
        </AdminField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Sort Order">
          <AdminInput
            type="number"
            value={form.sort_order}
            onChange={(e) =>
              setForm({ ...form, sort_order: Number(e.target.value) })
            }
          />
        </AdminField>
        <label className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
          <AdminInput
            type="checkbox"
            checked={form.is_optional}
            onChange={(e) =>
              setForm({ ...form, is_optional: e.target.checked })
            }
            className="h-4 w-4 rounded border-border text-brand-purple"
          />{" "}
          {t("Optional")}
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
          <AdminInput
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-border text-brand-purple"
          />{" "}
          {t("Active")}
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <AdminButton onClick={onCancel}>{t("Cancel")}</AdminButton>
        <AdminButton onClick={() => onSave(form)} disabled={!form.name.trim()}>
          <Check aria-hidden="true" className="h-4 w-4" /> {t("Save")}
        </AdminButton>
      </div>
    </AdminCard>
  );
}
