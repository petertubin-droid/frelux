import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  AdminCard,
  AdminButton,
  AdminField,
  AdminIconButton,
  AdminInput,
  StateMessage,
  Toggle,
} from "@/components/admin/AdminUi";

/**
 * Surface conditions shown in the painting estimators.
 *
 * These rows come from `estimation_surface_conditions`, the table the
 * estimators themselves read (condition_key, name, description,
 * requires_preparation, primer_recommended, coverage_adjustment_factor,
 * is_active, sort_order).
 * This page used to render a hardcoded list whose keys did not exist in the
 * engine at all (new_wall, smooth, dirty…), with an Edit button that had no
 * handler, so an admin could neither see nor change what the calculators use.
 */

interface SurfaceConditionRow {
  id: string;
  condition_key: string;
  name: string;
  description: string | null;
  requires_preparation: boolean;
  primer_recommended: boolean;
  coverage_adjustment_factor: number | null;
  is_active: boolean;
  sort_order: number;
}

interface Draft {
  name: string;
  description: string;
  requires_preparation: boolean;
  primer_recommended: boolean;
  coverage_adjustment_factor: string;
  is_active: boolean;
  sort_order: string;
}

const toDraft = (row: SurfaceConditionRow): Draft => ({
  name: row.name,
  description: row.description ?? "",
  requires_preparation: row.requires_preparation,
  primer_recommended: row.primer_recommended,
  coverage_adjustment_factor: String(row.coverage_adjustment_factor ?? 1),
  is_active: row.is_active,
  sort_order: String(row.sort_order ?? 0),
});

export default function AdminSurfaceConditions() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<SurfaceConditionRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: loadError } = await supabase
        .from("estimation_surface_conditions")
        .select(
          "id, condition_key, name, description, requires_preparation, primer_recommended, coverage_adjustment_factor, is_active, sort_order",
        )
        .order("sort_order", { ascending: true });

      if (loadError) throw loadError;

      const list = (data ?? []) as SurfaceConditionRow[];
      setRows(list);
      setDrafts(Object.fromEntries(list.map((row) => [row.id, toDraft(row)])));
    } catch {
      setError(
        "Could not load surface conditions. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const dirty = (row: SurfaceConditionRow) => {
    const draft = drafts[row.id];
    if (!draft) return false;
    const saved = toDraft(row);
    return (Object.keys(saved) as (keyof Draft)[]).some(
      (key) => saved[key] !== draft[key],
    );
  };

  const save = async (row: SurfaceConditionRow) => {
    const draft = drafts[row.id];
    if (!draft) return;
    if (!draft.name.trim()) {
      setError("Give the condition a name before saving.");
      return;
    }
    const sortOrder = Number(draft.sort_order);
    if (!Number.isFinite(sortOrder)) {
      setError("Sort order must be a number.");
      return;
    }
    const coverage = Number(draft.coverage_adjustment_factor);
    if (
      draft.coverage_adjustment_factor.trim() === "" ||
      !Number.isFinite(coverage) ||
      coverage < 0.1 ||
      coverage > 2
    ) {
      setError(
        "Coverage factor must be between 0.10 and 2.00. Use 1.00 for full coverage.",
      );
      return;
    }

    setSavingId(row.id);
    setError("");
    setNotice("");
    try {
      const { error: saveError } = await supabase
        .from("estimation_surface_conditions")
        .update({
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          requires_preparation: draft.requires_preparation,
          primer_recommended: draft.primer_recommended,
          coverage_adjustment_factor: coverage,
          is_active: draft.is_active,
          sort_order: sortOrder,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (saveError) throw saveError;

      setRows((prev) =>
        prev
          .map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  name: draft.name.trim(),
                  description: draft.description.trim() || null,
                  requires_preparation: draft.requires_preparation,
                  primer_recommended: draft.primer_recommended,
                  coverage_adjustment_factor: coverage,
                  is_active: draft.is_active,
                  sort_order: sortOrder,
                }
              : item,
          )
          .sort((a, b) => a.sort_order - b.sort_order),
      );
      setDrafts((prev) => ({
        ...prev,
        [row.id]: {
          ...draft,
          name: draft.name.trim(),
          description: draft.description.trim(),
          coverage_adjustment_factor: String(coverage),
          sort_order: String(sortOrder),
        },
      }));
      setNotice(
        `Saved ${draft.name.trim()}. Estimators pick this up immediately.`,
      );
    } catch {
      setError(`Could not save ${draft.name.trim()}. Nothing was changed.`);
    } finally {
      setSavingId(null);
    }
  };

  const activeCount = rows.filter((row) => row.is_active).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("Surface Conditions")}
        description="The surface conditions the painting estimators offer, with the preparation and primer rules each one carries. Only active rows are shown to users."
      />

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {notice}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {loading ? (
        <StateMessage
          type="loading"
          title="Loading surface conditions…"
          message="Fetching the rows the estimators use."
        />
      ) : rows.length === 0 ? (
        <StateMessage
          type="empty"
          title="No surface conditions found"
          message="The estimation engine has no surface condition rows yet."
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
            {rows.length} condition{rows.length === 1 ? "" : "s"} ·{" "}
            {activeCount} active
          </p>

          <div className="space-y-3">
            {rows.map((row) => {
              const draft = drafts[row.id] ?? toDraft(row);
              const isDirty = dirty(row);
              return (
                <AdminCard key={row.id} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="max-w-full break-all rounded-full bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground dark:bg-white/10">
                        {row.condition_key}
                      </span>
                      {!row.is_active && (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          Hidden from users
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <AdminIconButton
                        aria-label={`Reset unsaved changes to ${row.name}`}
                        title="Reset"
                        onClick={() => patchDraft(row.id, toDraft(row))}
                        disabled={!isDirty || savingId === row.id}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      </AdminIconButton>
                      <AdminButton
                        onClick={() => void save(row)}
                        disabled={!isDirty || savingId === row.id}
                      >
                        {savingId === row.id ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Save className="h-4 w-4" aria-hidden="true" />
                        )}
                        Save
                      </AdminButton>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
                    <AdminField label="Name">
                      <AdminInput
                        value={draft.name}
                        onChange={(event) =>
                          patchDraft(row.id, { name: event.target.value })
                        }
                      />
                    </AdminField>
                    <AdminField label="Sort order">
                      <AdminInput
                        type="number"
                        value={draft.sort_order}
                        onChange={(event) =>
                          patchDraft(row.id, { sort_order: event.target.value })
                        }
                      />
                    </AdminField>
                  </div>

                  <AdminField
                    label="Coverage factor"
                    hint="1.00 = full coverage. 0.80 means the surface needs 20% more paint. This is the number that changes the estimate."
                  >
                    <AdminInput
                      type="number"
                      min={0.1}
                      max={2}
                      step={0.01}
                      value={draft.coverage_adjustment_factor}
                      onChange={(event) =>
                        patchDraft(row.id, {
                          coverage_adjustment_factor: event.target.value,
                        })
                      }
                    />
                  </AdminField>

                  <AdminField label="Description">
                    <AdminInput
                      value={draft.description}
                      onChange={(event) =>
                        patchDraft(row.id, { description: event.target.value })
                      }
                    />
                  </AdminField>

                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <Toggle
                      checked={draft.requires_preparation}
                      onChange={(value) =>
                        patchDraft(row.id, { requires_preparation: value })
                      }
                      label="Requires preparation"
                    />
                    <Toggle
                      checked={draft.primer_recommended}
                      onChange={(value) =>
                        patchDraft(row.id, { primer_recommended: value })
                      }
                      label="Primer recommended"
                    />
                    <Toggle
                      checked={draft.is_active}
                      onChange={(value) =>
                        patchDraft(row.id, { is_active: value })
                      }
                      label="Active"
                    />
                  </div>
                </AdminCard>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
