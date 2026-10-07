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
import { CloudOff } from "lucide-react";
import {
  fetchOfflineFieldRules,
  fetchFieldCaptureLog,
  type FieldCaptureLogRow,
} from "@/lib/estimation/queries";
import {
  parseFieldSyncRules,
  DEFAULT_FIELD_SYNC_RULES,
  type FieldSyncRules,
} from "@/lib/estimation/offline-field-engine";
import { getSafeError } from "@/lib/safeError";
import { AdminHeader, StateMessage } from "@/components/admin/AdminUi";

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
  const [rules, setRules] = useState<FieldSyncRules>(DEFAULT_FIELD_SYNC_RULES);
  const [captures, setCaptures] = useState<FieldCaptureLogRow[]>([]);
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
        if (rulesRes.data)
          setRules(parseFieldSyncRules(rulesRes.data as never));
        setCaptures(capturesRes.data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const byKind = captures.reduce<Record<string, number>>((acc, c) => {
    acc[c.entry_kind] = (acc[c.entry_kind] ?? 0) + 1;
    return acc;
  }, {});
  const retried = captures.filter((c) => c.queue_last_attempt).length;

  return (
    <div className="space-y-4">
      <AdminHeader
        title="Field Sync"
        subtitle="Offline-First Field Engine: captures recorded on site with no connectivity, synced to field_capture_log. Client UUID primary key makes sync idempotent."
      />

      {loading && (
        <StateMessage
          type="loading"
          title="Loading"
          message="Loading field sync data…"
        />
      )}
      {error && <StateMessage type="error" title="Error" message={error} />}
      {!loading && !error && (
        <>
          {/* Current behaviour rules: editable in Calc Rules */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-2 font-semibold">Current sync rules</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Auto-sync on reconnect</p>
                <p className="font-medium">
                  {rules.auto_sync ? "Yes" : "No: manual only"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Device queue capacity</p>
                <p className="font-medium">{rules.max_queue} captures</p>
              </div>
              <div>
                <p className="text-muted-foreground">Retention</p>
                <p className="font-medium">{rules.retention_days} days</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sync batch size</p>
                <p className="font-medium">{rules.sync_batch} per run</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Edit these in Estimation Config → Calc Rules, calculator type{" "}
              <code className="rounded bg-muted px-1">offline_field</code>.
            </p>
          </div>

          {/* Summary */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                Recent synced captures
              </p>
              <p className="text-2xl font-semibold">{captures.length}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">By kind</p>
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
              <p className="text-sm text-muted-foreground">Needed a retry</p>
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
              title="No captures yet"
              message="No field captures yet. They appear here the moment an artisan syncs work recorded on site."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table
                className="w-full text-sm"
                aria-label="Synced field captures"
              >
                <thead className="border-b bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Captured (field)</th>
                    <th className="p-3">Synced (server)</th>
                    <th className="p-3">Kind</th>
                    <th className="p-3">Job</th>
                    <th className="p-3">Device</th>
                    <th className="p-3">Record</th>
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
                            title="First sync attempt failed; retried successfully"
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
