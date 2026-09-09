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
// Language registry, evolution memory and evolution settings are
// viewable in the Admin Control Center and the PWA Learning /
// Knowledge sections — both interfaces control the same ARCHIE.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import { buildApprovalView } from "@/lib/archie/evolution/change-request";
import { authorizeOwnerChange } from "@/lib/archie/mobile/owner-authorization";
import {
  fetchChangeRequests,
  transitionChangeRequestServer,
} from "@/lib/archie/evolution/persistence";
import type { EvolutionChangeRequest } from "@/lib/archie/evolution/types";

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setChanges(await fetchChangeRequests());
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
    <div className="mx-auto max-w-2xl px-4 py-4 md:py-6">
      <h1 className="text-lg font-semibold text-slate-100">Evolution</h1>
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

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {notice}
        </p>
      )}
      {loading && <p className="mt-4 text-xs text-slate-500">Loading…</p>}

      {/* ── Change requests ── */}
      <ul className="mt-4 space-y-2">
        {changes.map((cr) => {
          const open = expanded === cr.id;
          const view = buildApprovalView(cr);
          const isPending =
            cr.state === "AWAITING_OWNER" || cr.state === "PROPOSED";
          return (
            <li
              key={cr.id}
              className="rounded-xl border border-white/5 bg-white/[0.03]"
            >
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
