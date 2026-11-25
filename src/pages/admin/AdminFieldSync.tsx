/**
 * Admin pane: Field Sync (Engine 17)
 *
 * The offline sync behaviour rules (auto-sync, queue capacity,
 * retention, batch size) live in estimation_calc_rules and are
 * edited in the generic Calc Rules tab (Admin → Estimation
 * Config → Calc Rules, calculator_type 'offline_field') - same
 * as every rules-driven engine. This pane:
 *
 *  - shows the CURRENT rules (read-only, with where to edit them)
 *  - lists recently synced field captures, newest field work
 *    first, with device, job label, kind and captured/synced
 *    times - so admins can see what field work is flowing in
 *  - shows honest diagnostics: captures that needed multiple
 *    sync attempts (queue_last_attempt) are flagged
 */

import { useEffect, useState } from "react";
import { CheckCircle2, CloudOff, Save } from "lucide-react";
import {
  fetchOfflineFieldRules,
  fetchFieldCaptureLog,
  updateCalcRule,
  createCalcRule,
  type FieldCaptureLogRow,
} from "@/lib/estimation/queries";
import {
  parseFieldSyncRules,
  DEFAULT_FIELD_SYNC_RULES,
  type FieldSyncRules,
} from "@/lib/estimation/offline-field-engine";
import { getSafeError } from "@/lib/safeError";
import { AdminButton, AdminField, AdminHeader, AdminInput, StateMessage, Toggle } from "@/components/admin/AdminUi";
import type { EstimationCalcRule } from "@/types/estimation";
import { useLanguage } from "@/lib/i18n";

const KIND_LABEL: Record<FieldCaptureLogRow["entry_kind"], string> = {
  measurement: "Measurement",
  material_used: "Materials used",
  progress_note: "Progress note",
  photo_reference: "Photo reference",
};

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminFieldSync() {
  const { t } = useLanguage();
  const [rules, setRules] = useState<FieldSyncRules>(DEFAULT_FIELD_SYNC_RULES);
  const [captures, setCaptures] = useState<FieldCaptureLogRow[]>([]);
  const [ruleRows, setRuleRows] = useState<EstimationCalcRule[]>([]);
  const [savingRules, setSavingRules] = useState(false);
  const [savedRules, setSavedRules] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      const [rulesRes, capturesRes] = await Promise.all([
        fetchOfflineFieldRules(),
        fetchFieldCaptureLog(100),
      ]);
      if (!alive) return;
      if (rulesRes.error || capturesRes.error) {
        setError(getSafeError(rulesRes.error ?? capturesRes.error));
      } else {
        if (rulesRes.data) {
          setRuleRows(rulesRes.data);
          setRules(parseFieldSyncRules(rulesRes.data as never));
        }
        setCaptures(capturesRes.data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function saveRules() {
    setSavingRules(true);
    setError(null);
    setSavedRules(false);
    const values: Record<string, unknown> = {
      auto_sync: rules.auto_sync,
      max_queue: rules.max_queue,
      retention_days: rules.retention_days,
      sync_batch: rules.sync_batch,
    };
    for (const [rule_key, value] of Object.entries(values)) {
      const existing = ruleRows.find((row) => row.rule_key === rule_key);
      const result = existing
        ? await updateCalcRule(existing.id, { rule_value: { ...existing.rule_value, value } })
        : await createCalcRule({ rule_key, calculator_type: "offline_field", rule_value: { value }, rule_status: "admin_configured", is_active: true });
      if (result.error) {
        setError(getSafeError(result.error));
        setSavingRules(false);
        return;
      }
      if (result.data) {
        setRuleRows((rows) => [...rows.filter((row) => row.id !== result.data!.id), result.data!]);
      }
    }
    setSavingRules(false);
    setSavedRules(true);
    window.setTimeout(() => setSavedRules(false), 3000);
  }

  const byKind = captures.reduce<Record<string, number>>((acc, c) => {
    acc[c.entry_kind] = (acc[c.entry_kind] ?? 0) + 1;
    return acc;
  }, {});
  const retried = captures.filter((c) => c.queue_last_attempt).length;

  return (
    <div className="space-y-4">
      <AdminHeader
        title={t("Field Sync")}
        subtitle="Offline-First Field Engine: captures recorded on site with no connectivity, synced to field_capture_log. Client UUID primary key makes sync idempotent."
      />

      {loading && (
        <StateMessage
          type="loading"
          title={t("Loading")}
          message="Loading field sync data…"
        />
      )}
      {error && (
        <StateMessage type="error" title={t("Error")} message={error} />
      )}
      {!loading && !error && (
        <>
          {/* Field sync rules are editable here and saved to the shared calculation rules table. */}
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{t("Field sync rules")}</h3>
                <p className="text-xs text-muted-foreground">Changes apply to the shared offline_field configuration.</p>
              </div>
              <div className="flex items-center gap-2">
                {savedRules && <span className="text-sm text-emerald-600"><CheckCircle2 className="mr-1 inline h-4 w-4" />Saved</span>}
                <AdminButton onClick={saveRules} disabled={savingRules || rules.sync_batch > rules.max_queue}>
                  <Save className="h-4 w-4" />{savingRules ? "Saving…" : "Save rules"}
                </AdminButton>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Toggle srLabel="Auto-sync on reconnect" checked={rules.auto_sync} onChange={(v) => setRules((r) => ({ ...r, auto_sync: v }))} />
                <span className="text-sm">Auto-sync on reconnect</span>
              </div>
              <AdminField label="Device queue capacity" hint="1–10,000 captures">
                <AdminInput type="number" min={1} max={10000} step={1} value={rules.max_queue} onChange={(e) => setRules((r) => ({ ...r, max_queue: Math.max(1, Math.min(10000, Math.floor(Number(e.target.value) || 1))) }))} />
              </AdminField>
              <AdminField label="Retention" hint="1–3,650 days">
                <AdminInput type="number" min={1} max={3650} step={1} value={rules.retention_days} onChange={(e) => setRules((r) => ({ ...r, retention_days: Math.max(1, Math.min(3650, Math.floor(Number(e.target.value) || 1))) }))} />
              </AdminField>
              <AdminField label="Sync batch size" hint="Cannot exceed queue capacity">
                <AdminInput type="number" min={1} max={rules.max_queue} step={1} value={rules.sync_batch} onChange={(e) => setRules((r) => ({ ...r, sync_batch: Math.max(1, Math.min(r.max_queue, Math.floor(Number(e.target.value) || 1))) }))} />
              </AdminField>
            </div>
            {rules.sync_batch > rules.max_queue && <p role="alert" className="mt-2 text-sm text-destructive">Batch size cannot exceed queue capacity.</p>}
          </div>

          {/* Summary */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                {t("Recent synced captures")}
              </p>
              <p className="text-2xl font-semibold">{captures.length}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("By kind")}</p>
              <p className="text-sm font-medium">
                {Object.keys(byKind).length === 0
                  ? "None yet"
                  : Object.entries(byKind)
                      .map(
                        ([k, n]) =>
                          `${n} ${KIND_LABEL[k as FieldCaptureLogRow["entry_kind"]]}`,
                      )
                      .join(" · ")}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                {t("Needed a retry")}
              </p>
              <p className="text-2xl font-semibold">{retried}</p>
              {retried > 0 && (
                <p className="text-xs text-muted-foreground">
                  Synced after failed attempts: the queue kept them honestly.
                </p>
              )}
            </div>
          </div>

          {/* The captures */}
          {captures.length === 0 ? (
            <StateMessage
              type="empty"
              title={t("No captures yet")}
              message="No field captures yet. They appear here the moment an artisan syncs work recorded on site."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table
                className="w-full text-sm"
                aria-label={t("Synced field captures")}
              >
                <thead className="border-b bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">{t("Captured (field)")}</th>
                    <th className="p-3">{t("Synced (server)")}</th>
                    <th className="p-3">{t("Kind")}</th>
                    <th className="p-3">{t("Job")}</th>
                    <th className="p-3">{t("Device")}</th>
                    <th className="p-3">{t("Record")}</th>
                  </tr>
                </thead>
                <tbody>
                  {captures.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{fmt(c.captured_at)}</td>
                      <td className="p-3 text-muted-foreground">
                        {fmt(c.synced_at)}
                      </td>
                      <td className="p-3">{KIND_LABEL[c.entry_kind]}</td>
                      <td className="p-3">{c.project_label}</td>
                      <td className="p-3">
                        {c.device_label}
                        {c.queue_last_attempt && (
                          <span
                            className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-600/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400"
                            title={t(
                              "First sync attempt failed; retried successfully",
                            )}
                          >
                            <CloudOff className="h-3 w-3" /> retried
                          </span>
                        )}
                      </td>
                      <td className="max-w-xs truncate p-3 text-muted-foreground">
                        {typeof c.payload?.detail === "string"
                          ? c.payload.detail
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
