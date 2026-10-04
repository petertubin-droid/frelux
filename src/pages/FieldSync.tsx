/**
 * FRELUX Field Sync — Offline-First Field Engine (Future Engine 17)
 *
 * For the artisan on site with no network: capture measurements,
 * materials used and progress notes; they queue on the device.
 * When connectivity returns, one tap syncs them to the server.
 *
 * - The queue and sync behaviour come ONLY from
 *   offline-field-engine.ts. This page renders; it never
 *   invents, caches or reorders anything itself.
 * - Every capture states its honest status: queued (with its
 *   captured time), or failed with the reason. Nothing is ever
 *   claimed synced that the server has not confirmed.
 * - Capacity and retention follow the admin-configured rules;
 *   eviction is reported, never silent.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import { useAuth } from "@/lib/auth";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import {
  fetchOfflineFieldRules,
  insertFieldCapture,
} from "@/lib/estimation/queries";
import {
  DEFAULT_FIELD_SYNC_RULES,
  FIELD_CAPTURE_KINDS,
  clearQueuedCaptures,
  enqueueFieldCapture,
  listQueuedCaptures,
  parseFieldSyncRules,
  queuedCaptureCount,
  removeQueuedCapture,
  syncFieldCaptures,
  type FieldCapture,
  type FieldCaptureKind,
  type FieldSyncRules,
  type SyncReport,
} from "@/lib/estimation/offline-field-engine";
import type { EstimationCalcRule } from "@/types/estimation";

const KIND_LABEL: Record<FieldCaptureKind, string> = {
  measurement: "Measurement",
  material_used: "Materials used",
  progress_note: "Progress note",
  photo_reference: "Photo reference",
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function FieldSync() {
  const { user } = useAuth();

  const [rules, setRules] = useState<FieldSyncRules>(DEFAULT_FIELD_SYNC_RULES);
  const [queue, setQueue] = useState<FieldCapture[]>([]);
  const [form, setForm] = useState({
    kind: "measurement" as FieldCaptureKind,
    project_label: "",
    detail: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useSeo({
    title: "Field Sync — Capture Site Work Offline | FRELUX PROJECT CALC",
    description:
      "Record measurements, materials and progress notes on site with no network. They queue on your device and sync when you're back online — nothing is lost, nothing is invented.",
  });

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Load admin-configured sync rules (cached offline-first like every engine)
  useEffect(() => {
    fetchOfflineFieldRules()
      .then(({ data, error }) => {
        if (error || !data) return; // offline or unconfigured: built-in defaults apply
        setRules(parseFieldSyncRules(data as unknown as EstimationCalcRule[]));
      })
      .catch(() => {});
  }, []);

  const refreshQueue = useCallback(() => {
    setQueue(listQueuedCaptures());
  }, []);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  const submitCapture = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!form.detail.trim()) {
      setFormError(
        "Write what you measured or used — an empty note records nothing.",
      );
      return;
    }
    const result = enqueueFieldCapture(
      {
        kind: form.kind,
        project_label: form.project_label,
        device_label: user
          ? (user.email?.split("@")[0] ?? "This device")
          : "This device",
        payload: { detail: form.detail.trim() },
      },
      rules,
    );
    track("field_capture_queued", { kind: form.kind });
    refreshQueue();
    setForm({ kind: form.kind, project_label: form.project_label, detail: "" });
    if (result.dropped) {
      setNotice(
        `Queue was full (${rules.max_queue}): the oldest capture "${result.dropped.project_label}" was removed to make space. Sync when you can.`,
      );
    }
  };

  const runSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncReport(null);
    setNotice(null);
    try {
      const persist = async (capture: FieldCapture) =>
        insertFieldCapture({
          id: capture.id,
          created_by: user?.id ?? null,
          device_label: capture.device_label,
          project_label: capture.project_label,
          entry_kind: capture.kind,
          payload: capture.payload,
          captured_at: capture.captured_at,
          queue_queued_at: capture.queued_at,
          queue_last_attempt: capture.last_attempt ?? null,
        });
      const report = await syncFieldCaptures(persist, rules);
      setSyncReport(report);
      track("field_sync_run", { synced: report.synced, failed: report.failed });
      refreshQueue();
    } catch (err) {
      setNotice(getSafeError(err));
    } finally {
      setSyncing(false);
    }
  }, [refreshQueue, rules, syncing, user]);

  // Auto-sync when connectivity returns and the admin allows it
  useEffect(() => {
    if (online && rules.auto_sync && queuedCaptureCount() > 0 && !syncing) {
      runSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, rules.auto_sync]);

  const summary = useMemo(() => {
    const byKind = FIELD_CAPTURE_KINDS.map((k) => ({
      kind: k,
      count: queue.filter((c) => c.kind === k).length,
    })).filter((x) => x.count > 0);
    return byKind;
  }, [queue]);

  return (
    <Container>
      <PageHeader
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "Field Sync" },
        ]}
        title="Field Sync"
        subtitle="Record site work with no network. Your captures queue on this device and sync when connectivity returns — honestly, one by one."
      />

      {/* Connectivity truth, stated plainly */}
      <div
        className={`mb-6 rounded-lg border p-4 text-sm ${
          online
            ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
            : "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400"
        }`}
        role="status"
      >
        {online
          ? "You are online. Captures sync when you tap Sync now — or automatically, per the admin settings."
          : "You are offline. Captures are saved on this device and will sync when you are back online. Nothing is lost by closing the page."}
      </div>

      {/* Capture form — works with zero connectivity */}
      <form
        onSubmit={submitCapture}
        className="mb-8 rounded-lg border bg-card p-5 shadow-sm"
        aria-label="Capture site work"
      >
        <h2 className="mb-4 text-lg font-semibold">New capture</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">What is it?</span>
            <select
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kind: e.target.value as FieldCaptureKind,
                }))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              {FIELD_CAPTURE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Job label (optional)</span>
            <input
              value={form.project_label}
              onChange={(e) =>
                setForm((f) => ({ ...f, project_label: e.target.value }))
              }
              placeholder="e.g. Ikeja duplex — room 2"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium">What happened on site?</span>
          <textarea
            value={form.detail}
            onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
            placeholder="e.g. Room 2 walls measured 4.2 m × 3.1 m, two coats done. Used 12 litres of satin."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
        {formError && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Save to device queue
          </button>
          <span className="text-xs text-muted-foreground">
            Works offline · queue keeps {rules.max_queue} captures for{" "}
            {rules.retention_days} days
          </span>
        </div>
      </form>

      <AdSlot slotKey="calculator_mid" className="mt-8" />

      {/* Sync controls + last report */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Queued captures ({queue.length})
          </h2>
          {summary.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {summary
                .map((s) => `${s.count} ${KIND_LABEL[s.kind].toLowerCase()}`)
                .join(" · ")}
            </p>
          )}
        </div>
        <button
          onClick={runSync}
          disabled={syncing || queue.length === 0}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {syncReport && (
        <div
          className="mb-6 rounded-lg border bg-muted/40 p-4 text-sm"
          role="status"
        >
          <p className="font-medium">Last sync</p>
          <p>
            {syncReport.synced} synced
            {syncReport.duplicates > 0 &&
              ` · ${syncReport.duplicates} already on the server (safe)`}
            {syncReport.failed > 0 &&
              ` · ${syncReport.failed} failed and still queued`}
            {syncReport.remaining > 0 && ` · ${syncReport.remaining} waiting`}
          </p>
          {syncReport.failed > 0 && (
            <p className="mt-1 text-muted-foreground">
              Failed captures stay on this device with the reason recorded. They
              will be retried on the next sync — nothing is dropped.
            </p>
          )}
        </div>
      )}

      {notice && (
        <div
          className="mb-6 rounded-lg border border-amber-600/30 bg-amber-600/10 p-4 text-sm text-amber-700 dark:text-amber-400"
          role="alert"
        >
          {notice}
        </div>
      )}

      {/* The queue itself — every capture with its honest status */}
      {queue.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nothing queued. Captures you record on site appear here until they are
          confirmed synced.
        </p>
      ) : (
        <ul className="space-y-3">
          {queue.map((capture) => (
            <li
              key={capture.id}
              className="rounded-lg border bg-card p-4 shadow-sm"
              data-testid="queued-capture"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {KIND_LABEL[capture.kind]} — {capture.project_label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Captured {timeAgo(capture.captured_at)} · on this device,
                    not synced yet
                  </p>
                  {capture.last_error && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Last sync attempt failed: kept in queue — will be retried
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-600/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                    Queued
                  </span>
                  <button
                    onClick={() => {
                      removeQueuedCapture(capture.id);
                      refreshQueue();
                    }}
                    className="text-xs text-muted-foreground underline"
                    aria-label={`Delete queued capture ${capture.project_label}`}
                  >
                    Discard
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm">
                {typeof capture.payload.detail === "string"
                  ? capture.payload.detail
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {queue.length > 0 && (
        <div className="mt-4 text-right">
          <button
            onClick={() => {
              clearQueuedCaptures();
              refreshQueue();
              setSyncReport(null);
            }}
            className="text-xs text-muted-foreground underline"
          >
            Discard all queued captures
          </button>
        </div>
      )}

      <AdSlot slotKey="calculator_native" className="mt-8" />

      {/* How it works — the honesty contract, in plain words */}
      <section className="mt-10 rounded-lg border bg-muted/30 p-5 text-sm">
        <h2 className="mb-2 font-semibold">How Field Sync works</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Captures are stored on this device only until the server confirms
            them. A capture is never marked synced unless the server accepted
            it.
          </li>
          <li>
            Each capture has a unique ID the server also uses, so a retry after
            a dropped connection can never record the same work twice.
          </li>
          <li>
            If the queue fills up, the oldest capture is removed — and you are
            told which one. Nothing is silently lost.
          </li>
          <li>
            This page needs no login. If you are signed in, your synced captures
            are linked to your account.
          </li>
        </ul>
      </section>

      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
