// =========================================================
// FRELUX ARCHIE — MIGRATION CENTER (spec §11, §12, §13)
//
// Owner Control → Migration Center. The single privileged
// surface for ARCHIE Portable Continuity:
//   * CREATE BACKUP — recoverable snapshot of portable state
//   * CREATE MIGRATION PACKAGE — package for moving ARCHIE to
//     a PC / VPS / cloud server
//   * VERIFY PACKAGE — integrity check of any package file
//   * RESTORE ARCHIE — verified, owner-authorized restore
//   * VIEW MIGRATION HISTORY — the audit trail
//
// Every status displayed here represents a REAL operation.
// Package export uses the browser's File System Access API
// when available (owner can pick a mounted USB drive), and a
// normal browser download otherwise — the UI says which.
// =========================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase-lazy";
import { getSafeError } from "@/lib/safeError";
import {
  ARCHIE_VERSION,
  MIGRATION_COMPATIBILITY_VERSION,
  buildMigrationPackage,
  exportCapability,
  exportPackage,
} from "@/lib/archie/migration/package-builder";
import {
  SUPPORTED_COMPATIBILITY_VERSION,
  unzipPackage,
  verifyPackage,
  type UnzippedPackage,
} from "@/lib/archie/migration/verify";
import {
  buildRestorePlan,
  executeRestore,
} from "@/lib/archie/migration/restore";
import {
  fetchMigrationHistory,
  recordMigration,
} from "@/lib/archie/migration/history";
import { getOrCreateInstallation } from "@/lib/archie/migration/identity";
import { authorizeOwnerChange } from "@/lib/archie/mobile/owner-authorization";
import type {
  MigrationHistoryRecord,
  MigrationPhase,
  MigrationProgress,
  PackageVerificationResult,
  RestoreMemoryMode,
  RestorePlan,
} from "@/lib/archie/migration/types";

type Panel = "overview" | "history";

interface SizeCounts {
  conversations: number | null;
  knowledge: number | null;
  languageProfiles: number | null;
  languageEntries: number | null;
  evolutionChanges: number | null;
  evolutionLessons: number | null;
}

async function countRows(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabase>>>,
  table: string,
): Promise<number | null> {
  try {
    const { count } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    return count;
  } catch {
    return null;
  }
}

export default function ArchieMigration() {
  const [panel, setPanel] = useState<Panel>("overview");
  const [appVersion, setAppVersion] = useState<string>("…");
  const [environmentLabel, setEnvironmentLabel] = useState<string>("…");
  const [projectRef, setProjectRef] = useState<string>("");
  const [sizes, setSizes] = useState<SizeCounts>({
    conversations: null,
    knowledge: null,
    languageProfiles: null,
    languageEntries: null,
    evolutionChanges: null,
    evolutionLessons: null,
  });
  const [history, setHistory] = useState<MigrationHistoryRecord[]>([]);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [lastMigration, setLastMigration] = useState<string | null>(null);

  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const cancelRef = useRef(false);
  const [message, setMessage] = useState<{
    kind: "info" | "error" | "success";
    text: string;
  } | null>(null);
  const [capability] = useState(exportCapability());

  // Owner-authorization dialog state
  const [authDialog, setAuthDialog] = useState<{
    op: "BACKUP" | "MIGRATE" | "RESTORE";
    secret: string;
    reviewed: boolean;
    busy: boolean;
  } | null>(null);

  // Restore flow state
  const [verification, setVerification] =
    useState<PackageVerificationResult | null>(null);
  const [unzipped, setUnzipped] = useState<UnzippedPackage | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMemoryMode>(
    "KEEP_EXISTING_MEMORY",
  );
  const [plan, setPlan] = useState<RestorePlan | null>(null);

  const load = useCallback(async () => {
    try {
      const supabase = await getSupabase();
      setAppVersion(
        (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "dev",
      );
      // SupabaseClient#supabaseUrl is protected in supabase-js v2 —
      // derive the project ref from the same env var the client uses.
      const url =
        (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
      setProjectRef(url.replace(/^https:\/\//, "").split(".")[0]);
      const installation = await getOrCreateInstallation(supabase);
      setEnvironmentLabel(installation.environmentLabel);
      const [
        conversations,
        knowledge,
        languageProfiles,
        languageEntries,
        evolutionChanges,
        evolutionLessons,
      ] = await Promise.all([
        countRows(supabase, "frelux_archie_conversations"),
        countRows(supabase, "frelux_knowledge_items"),
        countRows(supabase, "archie_language_profiles"),
        countRows(supabase, "archie_language_entries"),
        countRows(supabase, "archie_change_requests"),
        countRows(supabase, "archie_evolution_memory"),
      ]);
      setSizes({
        conversations,
        knowledge,
        languageProfiles,
        languageEntries,
        evolutionChanges,
        evolutionLessons,
      });
      const h = await fetchMigrationHistory(supabase, 50);
      setHistory(h);
      setLastBackup(
        h.find((r) => r.mode === "BACKUP" && r.status === "EXPORTED")
          ?.createdAt ?? null,
      );
      setLastMigration(
        h.find((r) => r.mode === "MIGRATE" && r.status === "EXPORTED")
          ?.createdAt ?? null,
      );
    } catch (err) {
      setMessage({
        kind: "error",
        text: getSafeError(err, "Could not load migration status."),
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startExport(mode: "BACKUP" | "MIGRATE") {
    setMessage(null);
    setAuthDialog({ op: mode, secret: "", reviewed: false, busy: false });
  }

  async function confirmExport(): Promise<void> {
    const dialog = authDialog;
    if (!dialog) return;
    if (dialog.op === "RESTORE") return; // restore is dispatched to confirmRestore
    setAuthDialog({ ...dialog, busy: true });
    cancelRef.current = false;
    try {
      const supabase = await getSupabase();
      const mode: "BACKUP" | "MIGRATE" = dialog.op;

      // ---- Owner authorization gate (spec §8) ----
      const auth = await authorizeOwnerChange({
        changeKind: "ARCHIE_MIGRATION",
        target: `archie-migration-package:${mode.toLowerCase()}`,
        beforeState: { mode, portableState: "live" },
        afterState: { mode, package: "to be created" },
        testsPassed: false,
        reason: `Create ARCHIE ${mode.toLowerCase()} package (portable continuity).`,
        secret: dialog.secret,
        engineeringReviewCompleted: dialog.reviewed,
      });
      if (!auth.ok || !auth.authorization) {
        setAuthDialog(null);
        setMessage({
          kind: "error",
          text: auth.error ?? "Owner authorization failed.",
        });
        setProgress({
          phase: "FAILED",
          fraction: null,
          detail: "Owner authorization failed.",
        });
        return;
      }

      const built = await buildMigrationPackage({
        supabase,
        mode,
        appVersion,
        databaseProjectRef: projectRef,
        ownerAuthorizationId: auth.authorization.id,
        onProgress: setProgress,
        isCancelled: () => cancelRef.current,
      });

      const exported = await exportPackage(
        built.pkg,
        built.checksumsJson,
        built.filename,
        setProgress,
      );
      await recordMigration({
        supabase,
        packageId: built.pkg.manifest.packageId,
        mode,
        status: "EXPORTED",
        sourceEnvironment: environmentLabel,
        destinationEnvironment:
          exported.capability === "file-system-access"
            ? "owner-selected destination (external storage possible)"
            : "browser download (owner copies to external storage)",
        archieVersion: ARCHIE_VERSION,
        ownerAuthorizationRecordId: auth.authorization?.id ?? null,
        events: ["CREATED", "VERIFIED", "EXPORTED"],
        verificationResult: "verified",
        componentsIncluded: built.pkg.manifest.includedComponents,
        componentsExcluded: built.pkg.manifest.excludedComponents.map(
          (e) => e.id,
        ),
        errors: [],
      }).catch(() => undefined);
      await load();
      setMessage({
        kind: "success",
        text: `${mode === "BACKUP" ? "Backup" : "Migration package"} ${built.filename} created and exported.`,
      });
    } catch (err) {
      const text = getSafeError(err, "Export failed.");
      setProgress({
        phase: /cancel/i.test(text) ? "CANCELLED" : "FAILED",
        fraction: null,
        detail: text,
      });
      setMessage({ kind: "error", text });
      const supabase = await getSupabase().catch(() => null);
      if (supabase) {
        await recordMigration({
          supabase,
          packageId: "unknown",
          mode: dialog.op,
          status: /cancel/i.test(text) ? "CANCELLED" : "FAILED",
          sourceEnvironment: environmentLabel,
          destinationEnvironment: "—",
          archieVersion: ARCHIE_VERSION,
          ownerAuthorizationRecordId: null,
          events: [/cancel/i.test(text) ? "CANCELLED" : "FAILED"],
          verificationResult: null,
          errors: [text],
        }).catch(() => undefined);
      }
    } finally {
      setAuthDialog(null);
    }
  }

  // ---- Verify / Restore ----
  async function onPackageFile(file: File, forRestore: boolean): Promise<void> {
    setMessage(null);
    setVerification(null);
    setUnzipped(null);
    setPlan(null);
    cancelRef.current = false;
    try {
      const zipBytes = new Uint8Array(await file.arrayBuffer());
      const result = await verifyPackage(zipBytes);
      setVerification(result);
      if (!result.ok) {
        // spec §7: STOP — tell the owner exactly why.
        setProgress({
          phase: "FAILED",
          fraction: null,
          detail: "Package failed verification.",
        });
        return;
      }
      const parsed = unzipPackage(zipBytes);
      setUnzipped(parsed);
      if (forRestore) {
        setRestoreMode("KEEP_EXISTING_MEMORY");
        setPlan(
          buildRestorePlan({
            unzipped: parsed,
            memoryMode: "KEEP_EXISTING_MEMORY",
          }),
        );
      }
    } catch (err) {
      setVerification({
        ok: false,
        manifest: null,
        errors: [getSafeError(err, "Package could not be read.")],
        warnings: [],
      });
    }
  }

  async function confirmRestore(): Promise<void> {
    const dialog = authDialog;
    if (!dialog || dialog.op !== "RESTORE" || !unzipped || !plan) return;
    setAuthDialog({ ...dialog, busy: true });
    cancelRef.current = false;
    try {
      const supabase = await getSupabase();
      const auth = await authorizeOwnerChange({
        changeKind: "ARCHIE_MIGRATION",
        target: `archie-restore:${unzipped.manifest.packageId}`,
        beforeState: { memoryMode: restoreMode, steps: plan.steps.length },
        afterState: { restore: "verified package", memoryMode: restoreMode },
        testsPassed: true, // package verification IS the test gate
        reason: `Restore ARCHIE from package ${unzipped.manifest.packageId}.`,
        secret: dialog.secret,
        engineeringReviewCompleted: dialog.reviewed,
      });
      if (!auth.ok) {
        setAuthDialog(null);
        setMessage({
          kind: "error",
          text: auth.error ?? "Owner authorization failed.",
        });
        return;
      }
      setProgress({
        phase: "IMPORTING",
        fraction: null,
        detail: "Restoring portable state…",
      });
      const outcome = await executeRestore(
        { supabase, unzipped, verificationOk: true, memoryMode: restoreMode },
        plan,
        (detail) => setProgress({ phase: "IMPORTING", fraction: null, detail }),
      );
      await recordMigration({
        supabase,
        packageId: unzipped.manifest.packageId,
        mode: "RESTORE",
        status: outcome.ok ? "RESTORED" : "FAILED",
        sourceEnvironment: unzipped.manifest.sourceEnvironment.platform,
        destinationEnvironment: environmentLabel,
        archieVersion: unzipped.manifest.archieVersion,
        ownerAuthorizationRecordId: auth.authorization?.id ?? null,
        events: outcome.ok
          ? ["IMPORTING", "RESTORED"]
          : ["IMPORTING", "FAILED"],
        verificationResult: "verified",
        restorationResult: outcome.ok
          ? `restored ${outcome.restoredTables.map((t) => `${t.table}:${t.count}`).join(", ")}`
          : `failed: ${outcome.failedTables.map((t) => `${t.table}: ${t.error}`).join("; ")}`,
        componentsIncluded: plan.steps.map((s) => s.targetTable),
        componentsExcluded: plan.skipped.map((s) => s.component),
        errors: outcome.failedTables.map((t) => `${t.table}: ${t.error}`),
      });
      await load();
      setProgress(
        outcome.ok
          ? {
              phase: "COMPLETE",
              fraction: 1,
              detail:
                "Restore complete. This environment is registered as PENDING OWNER APPROVAL — approve it from Devices.",
            }
          : {
              phase: "FAILED",
              fraction: null,
              detail: `Restore stopped: ${outcome.failedTables[0]?.error ?? "unknown error"}. Existing data was NOT destroyed (upsert-merge only).`,
            },
      );
    } catch (err) {
      const text = getSafeError(err, "Restore failed.");
      setProgress({ phase: "FAILED", fraction: null, detail: text });
      setMessage({ kind: "error", text });
    } finally {
      setAuthDialog(null);
    }
  }

  const busy =
    progress !== null &&
    [
      "PREPARING",
      "COLLECTING",
      "PACKAGING",
      "VERIFYING",
      "EXPORTING",
      "IMPORTING",
    ].includes(progress.phase);

  return (
    <div className="archie-fade-up mx-auto max-w-4xl px-4 py-4 md:py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="archie-title-gradient text-lg font-semibold md:text-xl">
            Migration Center
          </h1>
          <p className="text-xs text-slate-400">
            ARCHIE portable continuity — backup, migrate, verify, restore.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setPanel("overview")}
            className={`rounded-full px-3 py-1 ${panel === "overview" ? "bg-white/10 text-slate-100" : "text-slate-400"}`}
          >
            Overview
          </button>
          <button
            onClick={() => setPanel("history")}
            className={`rounded-full px-3 py-1 ${panel === "history" ? "bg-white/10 text-slate-100" : "text-slate-400"}`}
          >
            History
          </button>
        </div>
      </div>

      {message && (
        <p
          role="alert"
          className={`mt-3 rounded-lg border p-3 text-sm ${
            message.kind === "error"
              ? "border-red-400/20 bg-red-400/5 text-red-300"
              : message.kind === "success"
                ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
                : "border-white/10 bg-white/[0.03] text-slate-300"
          }`}
        >
          {message.text}
        </p>
      )}

      {progress && (
        <div className="mt-3 rounded-lg archie-panel p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-100">
              {progress.phase === "COMPLETE" ? "Complete" : progress.phase}
            </span>
            {busy && (
              <button
                onClick={() => {
                  cancelRef.current = true;
                }}
                className="rounded border border-white/15 px-2 py-0.5 text-xs text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">{progress.detail}</p>
          {progress.fraction !== null && (
            <div className="mt-2 h-1 rounded bg-white/10">
              <div
                className="h-1 rounded bg-emerald-400 transition-all"
                style={{ width: `${Math.round(progress.fraction * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {panel === "overview" && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="ARCHIE version" value={ARCHIE_VERSION} />
          <Stat label="FRELUX version" value={appVersion} />
          <Stat label="Environment" value={environmentLabel} />
          <Stat
            label="Memory (conversations / knowledge)"
            value={`${sizes.conversations ?? "?"} / ${sizes.knowledge ?? "?"}`}
          />
          <Stat
            label="Language memory (profiles / entries)"
            value={`${sizes.languageProfiles ?? "?"} / ${sizes.languageEntries ?? "?"}`}
          />
          <Stat
            label="Evolution (changes / lessons)"
            value={`${sizes.evolutionChanges ?? "?"} / ${sizes.evolutionLessons ?? "?"}`}
          />
          <Stat
            label="Last backup"
            value={
              lastBackup ? new Date(lastBackup).toLocaleString() : "none yet"
            }
          />
          <Stat
            label="Last migration package"
            value={
              lastMigration
                ? new Date(lastMigration).toLocaleString()
                : "none yet"
            }
          />
          <Stat
            label="Compatibility"
            value={`format v${MIGRATION_COMPATIBILITY_VERSION} (supports ≤ v${SUPPORTED_COMPATIBILITY_VERSION})`}
          />
        </div>
      )}

      {panel === "history" ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] text-slate-400">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Mode</th>
                <th className="p-2">Status</th>
                <th className="p-2">Package</th>
                <th className="p-2">Destination</th>
                <th className="p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-3 text-slate-500">
                    No migration operations recorded yet.
                  </td>
                </tr>
              )}
              {history.map((h) => (
                <tr
                  key={h.id}
                  className="border-t border-white/5 text-slate-300"
                >
                  <td className="p-2 whitespace-nowrap">
                    {new Date(h.createdAt).toLocaleString()}
                  </td>
                  <td className="p-2">{h.mode}</td>
                  <td className="p-2">{h.status}</td>
                  <td className="p-2 font-mono text-[10px]">
                    {h.packageId.slice(0, 8)}
                  </td>
                  <td className="p-2">{h.destinationEnvironment}</td>
                  <td className="p-2">
                    {h.errors.length > 0
                      ? h.errors[0]
                      : (h.restorationResult ??
                        h.verificationResult ??
                        (h.ownerAuthorizationRecordId
                          ? "owner authorized"
                          : "—"))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ActionCard
              title="Create backup"
              description="Recoverable snapshot of ARCHIE's portable state — memory, language memory, evolution history, configuration."
              disabled={busy}
              onClick={() => startExport("BACKUP")}
            />
            <ActionCard
              title="Create migration package"
              description="Portable package for moving ARCHIE to a PC, VPS or cloud server — adds container definitions and restore documentation."
              disabled={busy}
              onClick={() => startExport("MIGRATE")}
            />
          </div>

          <div className="mt-3 rounded-lg archie-panel p-3 text-xs text-slate-400">
            Export method:{" "}
            {capability === "file-system-access"
              ? "this browser supports direct file saving — you can pick a mounted USB drive as the destination."
              : "standard browser download — copy the file to your USB/external storage manually."}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg archie-panel p-3">
              <p className="text-sm font-medium text-slate-100">
                Verify a package
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Check any ARCHIE package file for integrity, compatibility and
                secrets — without restoring anything.
              </p>
              <label className="mt-2 inline-block cursor-pointer rounded bg-white/10 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/15">
                Choose package file…
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPackageFile(f, false);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="rounded-lg archie-panel p-3">
              <p className="text-sm font-medium text-slate-100">
                Restore ARCHIE
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Verified, owner-authorized restore of portable state. Existing
                data is never deleted (upsert-merge only).
              </p>
              <label className="mt-2 inline-block cursor-pointer rounded bg-white/10 px-3 py-1.5 text-xs text-slate-100 hover:bg-white/15">
                Choose package to restore…
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPackageFile(f, true);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          {verification && (
            <div
              className={`mt-3 rounded-lg border p-3 text-sm ${
                verification.ok
                  ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
                  : "border-red-400/20 bg-red-400/5 text-red-300"
              }`}
            >
              <p className="font-medium">
                {verification.ok
                  ? `Package verified — ${verification.manifest?.packageType} ${verification.manifest?.packageId.slice(0, 8)}, ARCHIE ${verification.manifest?.archieVersion}, created ${verification.manifest ? new Date(verification.manifest.createdAt).toLocaleString() : "?"}`
                  : "Package FAILED verification — restoration is not possible."}
              </p>
              <ul className="mt-1 list-disc pl-4 text-xs">
                {verification.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {verification.warnings.map((w, i) => (
                  <li key={`w${i}`}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {verification?.ok && plan && unzipped && (
            <div className="mt-3 rounded-lg archie-panel p-3">
              <p className="text-sm font-medium text-slate-100">Restore plan</p>
              <div className="mt-2 flex gap-2 text-xs">
                <button
                  onClick={() => {
                    setRestoreMode("KEEP_EXISTING_MEMORY");
                    setPlan(
                      buildRestorePlan({
                        unzipped,
                        memoryMode: "KEEP_EXISTING_MEMORY",
                      }),
                    );
                  }}
                  className={`rounded-full px-3 py-1 ${restoreMode === "KEEP_EXISTING_MEMORY" ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-slate-300"}`}
                >
                  Keep existing memory
                </button>
                <button
                  onClick={() => {
                    setRestoreMode("RESTORE_PORTABLE_SNAPSHOT");
                    setPlan(
                      buildRestorePlan({
                        unzipped,
                        memoryMode: "RESTORE_PORTABLE_SNAPSHOT",
                      }),
                    );
                  }}
                  className={`rounded-full px-3 py-1 ${restoreMode === "RESTORE_PORTABLE_SNAPSHOT" ? "bg-amber-400/20 text-amber-300" : "bg-white/10 text-slate-300"}`}
                >
                  Restore portable snapshot
                </button>
              </div>
              <ul className="mt-2 list-disc pl-4 text-xs text-slate-300">
                {plan.steps.map((s, i) => (
                  <li key={i}>{s.description}</li>
                ))}
                {plan.skipped.map((s, i) => (
                  <li key={`s${i}`} className="text-slate-500">
                    Skipped: {s.component} — {s.reason}
                  </li>
                ))}
              </ul>
              {plan.steps.length > 0 && (
                <button
                  disabled={busy}
                  onClick={() =>
                    setAuthDialog({
                      op: "RESTORE",
                      secret: "",
                      reviewed: false,
                      busy: false,
                    })
                  }
                  className="mt-3 archie-btn-primary rounded-lg bg-amber-400/90 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-300 disabled:opacity-40"
                >
                  Authorize and restore
                </button>
              )}
            </div>
          )}
        </>
      )}

      {authDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl archie-input p-4">
            <p className="text-sm font-medium text-slate-100">
              Owner authorization required
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {authDialog.op === "RESTORE"
                ? "Restoring ARCHIE is a privileged operation. Type your owner secret to authorize this restore."
                : `Creating an ARCHIE ${authDialog.op.toLowerCase()} package exports portable state. Type your owner secret to authorize.`}
            </p>
            <input
              type="password"
              autoFocus
              value={authDialog.secret}
              onChange={(e) =>
                setAuthDialog({ ...authDialog, secret: e.target.value })
              }
              className="mt-3 w-full rounded border border-white/15 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="Owner secret"
              autoComplete="off"
            />
            <label className="mt-3 flex items-start gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={authDialog.reviewed}
                onChange={(e) =>
                  setAuthDialog({ ...authDialog, reviewed: e.target.checked })
                }
                className="mt-0.5"
              />
              I have reviewed what this operation packages/restores, and I
              understand a migration package never contains secrets or owner
              authority.
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setAuthDialog(null)}
                className="rounded px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                disabled={
                  authDialog.busy ||
                  authDialog.secret.length < 12 ||
                  !authDialog.reviewed
                }
                onClick={() => {
                  if (authDialog.op === "RESTORE") void confirmRestore();
                  else void confirmExport();
                }}
                className="rounded bg-emerald-400/90 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-emerald-300 disabled:opacity-40"
              >
                {authDialog.busy ? "Authorizing…" : "Authorize"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg archie-panel p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm text-slate-100">{value}</p>
    </div>
  );
}

function ActionCard({
  title,
  description,
  onClick,
  disabled,
}: {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg archie-panel p-3">
      <p className="text-sm font-medium text-slate-100">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className="mt-2 rounded bg-emerald-400/90 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-emerald-300 disabled:opacity-40"
      >
        {title}
      </button>
    </div>
  );
}
