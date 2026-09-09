// =========================================================
// FRELUX ARCHIE PWA — EVOLUTION CONTROL CENTER (mobile)
//
// The owner's mobile control surface for ARCHIE self-evolution,
// mirroring the Admin Evolution Control Center through the SAME
// backend (evolution/persistence, archie-owner-auth):
//   * Change Request approval / rejection / execution / rollback
//   * Full evidence: what, why, files, diff, risk, tests,
//     security & data impact, rollback plan (§4)
//
// Every decision requires the owner secret, verified server-side
// (PBKDF2) — this page NEVER treats a typed command or a
// recommendation as authorization. ARCHIE cannot approve its own
// modification (spec §§4, §9, §10).
//
// ALSO includes the mobile Evolution settings editor (language
// learning, self-modification, protected paths, risk ceiling)
// and the Language Registry — same backend as Admin, one ARCHIE.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import { buildApprovalView } from "@/lib/archie/evolution/change-request";
import { authorizeOwnerChange } from "@/lib/archie/mobile/owner-authorization";
import {
  fetchChangeRequests,
  fetchEvolutionSettings,
  fetchLanguageProfiles,
  saveEvolutionSettings,
  transitionChangeRequestServer,
} from "@/lib/archie/evolution/persistence";
import { DEFAULT_EVOLUTION_SETTINGS } from "@/lib/archie/evolution/settings";
import { Switch } from "@/components/ui/shadcn/switch";
import type {
  EvolutionChangeRequest,
  EvolutionSettings,
  LanguageProfile,
} from "@/lib/archie/evolution/types";

const STATE_LABELS: Record<string, string> = {
  PROPOSED: "Proposed",
  AWAITING_OWNER: "Awaiting you",
  AUTHORIZED: "Authorized",
  STAGING: "Staging",
  TESTING: "Testing",
  PASSED: "Tests passed",
  FAILED: "Tests failed",
  EXECUTED: "Executed",
  ROLLED_BACK: "Rolled back",
  REJECTED: "Rejected",
};

function stateColor(state: string) {
  if (state === "AWAITING_OWNER" || state === "PROPOSED")
    return "text-amber-300";
  if (state === "AUTHORIZED" || state === "PASSED" || state === "EXECUTED")
    return "text-emerald-300";
  if (state === "FAILED" || state === "ROLLED_BACK" || state === "REJECTED")
    return "text-red-300";
  return "text-slate-400";
}

export default function ArchieEvolution() {
  const [changes, setChanges] = useState<EvolutionChangeRequest[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Settings + registry
  const [view, setView] = useState<"changes" | "settings" | "registry">(
    "changes",
  );
  const [settings, setSettings] = useState<EvolutionSettings>(
    DEFAULT_EVOLUTION_SETTINGS,
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [languages, setLanguages] = useState<LanguageProfile[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [crs, s, langs] = await Promise.all([
        fetchChangeRequests(),
        fetchEvolutionSettings(),
        fetchLanguageProfiles().catch(() => null),
      ]);
      if (crs.ok) setChanges(crs.data);
      else setError(crs.error);
      if (s.ok) setSettings(s.data);
      if (langs?.ok) setLanguages(langs.data);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load change requests",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Settings save — same validated upsert as Admin. ──
  const saveSettings = useCallback(async () => {
    setSavingSettings(true);
    setError("");
    setNotice("");
    try {
      const result = await saveEvolutionSettings({
        ...settings,
        updatedAt: new Date().toISOString(),
      });
      if (result.ok) {
        setSettings(result.data);
        setNotice("Evolution settings saved.");
      } else {
        setError(result.error);
      }
    } finally {
      setSavingSettings(false);
    }
  }, [settings]);

  // ── Owner-gated decisions — every one requires the owner
  // secret and produces a server-verified authorization record,
  // exactly like the Admin console. Nothing is self-approved. ──
  const decide = useCallback(
    async (
      cr: EvolutionChangeRequest,
      decision: "authorize" | "reject" | "execute" | "rollback",
    ) => {
      setError("");
      setNotice("");
      const actionLabel = {
        authorize: `authorize staging of ${cr.crNumber}`,
        reject: `reject ${cr.crNumber}`,
        execute: `authorize PRODUCTION execution of ${cr.crNumber}`,
        rollback: `roll back ${cr.crNumber}`,
      }[decision];

      let resultingCommit: string | undefined;
      if (decision === "execute") {
        const sha = window.prompt(
          `Production execution of ${cr.crNumber}: enter the resulting Git commit SHA (the merged/approved commit).`,
        );
        if (!sha || !sha.trim()) return;
        resultingCommit = sha.trim();
      }

      const secret = window.prompt(
        `ARCHIE Evolution — ${actionLabel}\n\nEnter the owner authorization secret. It is verified server-side (archie-owner-auth, PBKDF2) and never stored on this device.`,
      );
      if (!secret || !secret.trim()) return;

      setBusy(true);
      try {
        const auth = await authorizeOwnerChange({
          secret,
          changeKind: "CODE_CHANGE",
          target: cr.crNumber,
          currentVersion: cr.archieVersion,
          proposedVersion: resultingCommit ?? cr.crNumber,
          beforeState: { cr: cr.crNumber, state: cr.state },
          afterState: { cr: cr.crNumber, decision },
          testsPassed:
            cr.testResults?.summary === "all_passed" ||
            decision === "reject" ||
            decision === "rollback",
          rollbackRef: cr.rollbackPlan,
          reason: `Evolution decision (${decision}) on ${cr.crNumber}: ${cr.title}`,
        });
        if (!auth.ok || !auth.authorization) {
          setError(
            auth.error ??
              "Server-side owner verification failed — no approval recorded.",
          );
          return;
        }
        const recordId = auth.authorization.id;
        const res = await transitionChangeRequestServer(
          cr,
          decision,
          recordId,
          resultingCommit,
        );
        if (!res.ok) {
          setError(res.error ?? "State transition failed");
          return;
        }
        setNotice(
          `${cr.crNumber}: ${actionLabel} — recorded with server-verified authorization.`,
        );
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Decision failed");
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const pending = changes.filter(
    (c) => c.state === "AWAITING_OWNER" || c.state === "PROPOSED",
  );

  return (
    <div className="archie-fade-up mx-auto max-w-2xl px-4 py-4 md:py-6">
      <h1 className="archie-title-gradient text-lg font-semibold md:text-xl">
        Evolution
      </h1>
      <p className="text-xs text-slate-400">
        ARCHIE's self-evolution — every change request, tested and reviewed by
        you before anything touches production. ARCHIE can never authorize its
        own modification.
      </p>
      {pending.length > 0 && (
        <p className="mt-2 text-xs text-amber-200/80">
          {pending.length} change request(s) awaiting your decision
        </p>
      )}

      {/* View tabs */}
      <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg archie-panel p-1">
        {(["changes", "settings", "registry"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-2 py-2 text-xs font-medium capitalize ${
              view === v ? "bg-brand-purple text-white" : "text-slate-400"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {notice}
        </p>
      )}
      {loading && <p className="mt-4 text-xs text-slate-500">Loading…</p>}

      {/* ── Settings ── */}
      {view === "settings" && (
        <div className="mt-4 space-y-3">
          <div className="space-y-3 rounded-xl archie-panel p-3">
            <p className="text-xs font-medium text-slate-200">
              Language learning
            </p>
            {(
              [
                ["language.enabled", "Language learning"],
                ["language.autoLearning", "Auto learning"],
                ["language.autoMemory", "Auto memory"],
                ["language.externalResearch", "External research"],
                ["language.dialectLearning", "Dialect learning"],
                [
                  "language.requireApprovalBeforePermanentMemory",
                  "Approval before permanent memory",
                ],
              ] as const
            ).map(([path, label]) => (
              <label
                key={path}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-xs text-slate-300">{label}</span>
                <Switch
                  checked={
                    (settings.language as unknown as Record<string, boolean>)[
                      path.split(".")[1]
                    ]
                  }
                  onCheckedChange={(val) =>
                    setSettings((s) => ({
                      ...s,
                      language: { ...s.language, [path.split(".")[1]]: val },
                    }))
                  }
                />
              </label>
            ))}
            <label className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-300">
                Min confidence for permanent memory (0–1)
              </span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={settings.language.minConfidenceThreshold}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    language: {
                      ...s.language,
                      minConfidenceThreshold: Number(e.target.value),
                    },
                  }))
                }
                className="w-20 rounded-lg archie-input px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
          </div>

          <div className="space-y-3 rounded-xl archie-panel p-3">
            <p className="text-xs font-medium text-slate-200">
              Self-modification
            </p>
            {(
              [
                ["selfCodeAnalysis", "Self code analysis"],
                ["automaticChangeProposals", "Automatic change proposals"],
                ["stagingPermission", "Staging permission"],
                ["productionModification", "Production modification"],
                ["requireExplicitApproval", "Require explicit approval"],
                [
                  "automaticRollback",
                  "Automatic rollback on failed validation",
                ],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-xs text-slate-300">{label}</span>
                <Switch
                  checked={settings.selfModification[key]}
                  onCheckedChange={(val) =>
                    setSettings((s) => ({
                      ...s,
                      selfModification: { ...s.selfModification, [key]: val },
                    }))
                  }
                />
              </label>
            ))}
            <label className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-300">
                Max change risk allowed
              </span>
              <select
                value={settings.selfModification.maxChangeRiskAllowed}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    selfModification: {
                      ...s.selfModification,
                      maxChangeRiskAllowed: e.target
                        .value as typeof s.selfModification.maxChangeRiskAllowed,
                    },
                  }))
                }
                className="w-28 rounded-lg archie-input px-2 py-1.5 text-sm text-slate-100"
              >
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <p className="text-xs text-slate-300">
                Protected paths (one per line)
              </p>
              <textarea
                value={settings.selfModification.protectedPaths.join("\n")}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    selfModification: {
                      ...s.selfModification,
                      protectedPaths: e.target.value
                        .split("\n")
                        .map((p) => p.trim())
                        .filter(Boolean),
                    },
                  }))
                }
                rows={3}
                className="mt-1 w-full rounded-lg archie-input px-2 py-1.5 text-xs text-slate-100"
              />
            </div>
          </div>

          <button
            onClick={() => void saveSettings()}
            disabled={savingSettings}
            className="w-full rounded-lg bg-brand-purple px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {savingSettings ? "Saving…" : "Save evolution settings"}
          </button>
          <p className="text-[10px] leading-relaxed text-slate-500">
            Production modification stays owner-gated regardless: ARCHIE can
            stage and test, but every production execution still requires the
            server-verified owner secret (archie-owner-auth). Same settings
            record as FRELUX Admin — changes are shared everywhere.
          </p>
        </div>
      )}

      {/* ── Language registry ── */}
      {view === "registry" && (
        <ul className="mt-4 space-y-2">
          {languages.map((l) => (
            <li key={l.id} className="rounded-xl archie-panel p-3">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
                  {l.name}
                  {l.nativeName && l.nativeName !== l.name && (
                    <span className="text-slate-400"> · {l.nativeName}</span>
                  )}
                </span>
                <span
                  className={`text-[10px] ${
                    l.verificationStatus === "CONFIRMED"
                      ? "text-emerald-300"
                      : l.verificationStatus === "REJECTED"
                        ? "text-red-300"
                        : "text-amber-300"
                  }`}
                >
                  {l.verificationStatus}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {l.registryStatus} · v{l.version}
                {l.isoCode ? ` · ${l.isoCode}` : ""}
                {l.confidence != null &&
                  ` · ${(l.confidence * 100).toFixed(0)}% confidence`}
              </p>
              {l.regions.length > 0 && (
                <p className="mt-1 text-[11px] text-slate-400">
                  {l.regions.join(", ")}
                </p>
              )}
            </li>
          ))}
          {!loading && !languages.length && !error && (
            <li className="py-6 text-center text-xs text-slate-500">
              No languages in the registry yet.
            </li>
          )}
        </ul>
      )}

      {/* ── Change requests ── */}
      <ul className={`mt-4 space-y-2 ${view === "changes" ? "" : "hidden"}`}>
        {changes.map((cr) => {
          const open = expanded === cr.id;
          const view = buildApprovalView(cr);
          const isPending =
            cr.state === "AWAITING_OWNER" || cr.state === "PROPOSED";
          return (
            <li key={cr.id} className="rounded-xl archie-panel">
              <button
                onClick={() => setExpanded(open ? null : cr.id)}
                className="flex w-full items-center gap-2 px-3 py-3 text-left"
                aria-expanded={open}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-100">
                    <span className="text-slate-400">{cr.crNumber}</span>{" "}
                    {cr.title}
                  </p>
                  <p className="mt-0.5 text-[11px]">
                    <span className={stateColor(cr.state)}>
                      {STATE_LABELS[cr.state] ?? cr.state}
                    </span>
                    <span className="text-slate-500">
                      {" "}
                      · risk {view.risk} · v{cr.archieVersion}
                    </span>
                  </p>
                </div>
                <span className="text-slate-500" aria-hidden="true">
                  {open ? "▲" : "▼"}
                </span>
              </button>

              {open && (
                <div className="space-y-2 border-t border-white/5 px-3 py-3 text-[11px] leading-relaxed text-slate-300">
                  <p>
                    <span className="text-slate-500">What:</span>{" "}
                    {view.whatWillChange}
                  </p>
                  <p>
                    <span className="text-slate-500">Why:</span> {view.why}
                  </p>
                  {view.filesAffected.length > 0 && (
                    <p>
                      <span className="text-slate-500">Files:</span>{" "}
                      {view.filesAffected.join(", ")}
                    </p>
                  )}
                  {view.diff && (
                    <pre className="overflow-x-auto rounded-lg bg-slate-950 p-2 text-[10px] text-slate-300">
                      {view.diff.slice(0, 2000)}
                    </pre>
                  )}
                  {view.testResults && (
                    <p>
                      <span className="text-slate-500">Tests:</span>{" "}
                      {view.testResults.summary}
                    </p>
                  )}
                  {view.securityImpact && (
                    <p className="text-amber-200/80">
                      Security impact: {view.securityImpact}
                    </p>
                  )}
                  {view.dataImpact && (
                    <p className="text-amber-200/80">
                      Data impact: {view.dataImpact}
                    </p>
                  )}
                  <p>
                    <span className="text-slate-500">Rollback plan:</span>{" "}
                    {view.rollbackPlan}
                  </p>
                  {cr.resultingCommit && (
                    <p className="text-emerald-300/80">
                      Commit: {cr.resultingCommit}
                    </p>
                  )}

                  {isPending && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => void decide(cr, "authorize")}
                        disabled={busy}
                        className="rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Authorize staging
                      </button>
                      <button
                        onClick={() => void decide(cr, "reject")}
                        disabled={busy}
                        className="rounded-lg bg-red-600/80 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {cr.state === "AUTHORIZED" && (
                    <div className="pt-2">
                      <button
                        onClick={() => void decide(cr, "execute")}
                        disabled={busy}
                        className="w-full rounded-lg bg-brand-purple px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Authorize PRODUCTION execution
                      </button>
                    </div>
                  )}
                  {cr.state === "EXECUTED" && (
                    <div className="pt-2">
                      <button
                        onClick={() => void decide(cr, "rollback")}
                        disabled={busy}
                        className="w-full rounded-lg bg-red-600/80 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Roll back
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {!loading && !changes.length && !error && (
          <li className="py-6 text-center text-xs text-slate-500">
            No change requests yet. ARCHIE proposes; you decide.
          </li>
        )}
      </ul>

      <p className="mt-6 text-[10px] leading-relaxed text-slate-500">
        Lifecycle: PROPOSED → AWAITING_OWNER → AUTHORIZED → STAGING → TESTING →
        PASSED/FAILED → EXECUTED → ROLLED_BACK if necessary. Every decision is
        verified server-side (archie-owner-auth, PBKDF2) and produces an
        immutable authorization record. Both this app and FRELUX Admin control
        the same ARCHIE — changes made anywhere are reflected everywhere.
      </p>
    </div>
  );
}
