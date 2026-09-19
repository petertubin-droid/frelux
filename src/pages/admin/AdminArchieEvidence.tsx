// =========================================================
// ARCHIE EVIDENCE & TRUTH ENGINE — ADMIN SURFACE (§27)
//
// The Evidence & Truth section of the ARCHIE Admin Control
// Center: WHAT ARCHIE knows, WHAT supports it, WHERE it
// came from, and WHAT remains unknown.
//
//   * Measured dashboard (archie_evidence_health() — real
//     counts, never estimates)
//   * Claims explorer with verification-state filter
//   * Claim inspector: provenance chains, evidence records
//     (with reliability basis), premises, conflicts
//   * Conflict records — represented, never auto-resolved
//   * Evidence-health checks with counts (claims without
//     evidence, inferences marked as facts, stale records…)
//
// READ-ONLY by design: verification and classification are
// the engine's honest server-side processes; the owner
// reviews here, ARCHIE's edge functions write.
//
// Gated by RequireAdmin on the /admin/archie-evidence route;
// RLS enforces admin-only reads.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  GitBranch,
  ShieldCheck,
  FileSearch,
} from "lucide-react";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminSelect,
} from "@/components/admin/AdminUi";
import {
  fetchEvidenceHealth,
  fetchClaimProvenance,
  listEvidenceClaims,
  listUnresolvedConflicts,
  STATE_STYLES,
  VERIFICATION_STATES,
  type EvidenceClaimRow,
  type EvidenceHealth,
} from "@/lib/archie/evidence-truth-client";

interface ConflictView {
  conflict: {
    id: string;
    kind: string;
    explanation_status: string;
    explanation: string | null;
    detected_at: string;
  };
  claimA: EvidenceClaimRow | null;
  claimB: EvidenceClaimRow | null;
}

interface ProvenanceView {
  claim: EvidenceClaimRow;
  evidence: Array<{
    record: {
      id: string;
      evidence_type: string;
      source_type: string;
      source_identity: string;
      content_label: string;
      reliability: { tier?: string; basis?: string } | null;
      provenance_chain: Array<{
        stage: string;
        detail: string;
        subsystem: string;
        at: string;
        transformation?: string;
      }>;
    };
    relation: string;
    note: string | null;
  }>;
  premises: Array<{ claim: EvidenceClaimRow; note: string | null }>;
  conflicts: Array<{ id: string; kind: string; explanation_status: string }>;
}

const PAGE_SIZE = 25;

export default function AdminArchieEvidence() {
  const [health, setHealth] = useState<EvidenceHealth | null>(null);
  const [rows, setRows] = useState<EvidenceClaimRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stateFilter, setStateFilter] = useState("");
  const [conflicts, setConflicts] = useState<ConflictView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspected, setInspected] = useState<ProvenanceView | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, list, conflictList] = await Promise.all([
        fetchEvidenceHealth(),
        listEvidenceClaims({
          state: stateFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
        listUnresolvedConflicts(),
      ]);
      setHealth(h);
      setRows(list.rows);
      setTotal(list.total);
      setConflicts(conflictList);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoading(false);
    }
  }, [stateFilter, page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openClaim = useCallback(async (claimId: string) => {
    setInspectLoading(true);
    setInspectError(null);
    try {
      const view = await fetchClaimProvenance(claimId);
      setInspected(view);
    } catch (e) {
      setInspectError(String((e as Error).message ?? e));
    } finally {
      setInspectLoading(false);
    }
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const healthIssues = health
    ? [
        {
          label: "Claims without evidence",
          value: health.claims_without_evidence,
          ok: health.claims_without_evidence === 0,
        },
        {
          label: "Orphaned evidence records",
          value: health.orphaned_evidence,
          ok: health.orphaned_evidence === 0,
        },
        {
          label: "Inferences marked as facts",
          value: health.inferred_marked_as_facts,
          ok: health.inferred_marked_as_facts === 0,
        },
        {
          label: "User claims auto-verified",
          value: health.user_provided_marked_verified,
          ok: health.user_provided_marked_verified === 0,
        },
        {
          label: "Claims missing retrieval time",
          value: health.claims_missing_retrieved_at,
          ok: health.claims_missing_retrieved_at === 0,
        },
        {
          label: "Stale (expired) claims",
          value: health.stale_claims,
          ok: health.stale_claims === 0,
        },
        {
          label: "Conflicts without explanation",
          value: health.conflicts_without_explanation,
          ok: health.conflicts_without_explanation === 0,
        },
      ]
    : [];

  return (
    <div>
      <AdminHeader
        title="Evidence & Truth"
        subtitle="What ARCHIE knows, what supports it, where it came from, and what remains unknown — measured, never estimated."
      />

      {error && (
        <div className="mx-6 mb-2 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <span className="ml-auto text-xs">
            The tables may still be initializing (new engine).
          </span>
        </div>
      )}

      {/* Measured dashboard */}
      {health && (
        <div className="grid grid-cols-2 gap-3 p-6 pt-4 md:grid-cols-4 xl:grid-cols-8">
          <StatTile label="Total claims" value={health.total_claims} />
          <StatTile
            label="Verified"
            value={health.verified_claims}
            tone="emerald"
          />
          <StatTile
            label="Supported"
            value={health.supported_claims}
            tone="sky"
          />
          <StatTile
            label="Inferred"
            value={health.inferred_claims}
            tone="indigo"
          />
          <StatTile
            label="User-provided"
            value={health.user_provided_claims}
            tone="violet"
          />
          <StatTile
            label="Conflicted"
            value={health.conflicted_claims}
            tone="amber"
          />
          <StatTile
            label="Outdated"
            value={health.outdated_claims}
            tone="orange"
          />
          <StatTile label="Unknown" value={health.unknown_claims} />
        </div>
      )}

      {health && (
        <div className="grid grid-cols-2 gap-3 px-6 pb-4 md:grid-cols-4">
          <StatTile
            label="Evidence records"
            value={health.evidence_records}
            icon={<FileSearch className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Distinct sources"
            value={health.evidence_sources}
            icon={<GitBranch className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Provenance chains"
            value={health.provenance_records}
            icon={<GitBranch className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Unresolved conflicts"
            value={health.conflicts_unresolved}
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            tone={health.conflicts_unresolved > 0 ? "amber" : undefined}
          />
        </div>
      )}

      <div className="grid gap-4 px-6 pb-10 xl:grid-cols-3">
        {/* Claims explorer */}
        <AdminCard className="xl:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
            Claims explorer
          </h3>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <AdminSelect
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All verification states</option>
              {VERIFICATION_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </AdminSelect>
            <span className="text-xs text-slate-500">
              {total} claim{total === 1 ? "" : "s"}
            </span>
            <AdminButton
              variant="secondary"
              onClick={() => void refresh()}
              className="ml-auto"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </AdminButton>
          </div>

          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No claims recorded yet. ARCHIE records claims on live chat turns
              once the engine is deployed and a knowledge-bearing message
              arrives.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">State</th>
                    <th className="py-2 pr-3">Claim</th>
                    <th className="py-2 pr-3">Domain</th>
                    <th className="py-2 pr-3">Updated</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-200/60 align-top last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                            STATE_STYLES[row.verification_state] ?? ""
                          }`}
                        >
                          {row.verification_state}
                        </span>
                      </td>
                      <td className="max-w-sm py-2 pr-3">
                        <p className="line-clamp-2 text-slate-800">
                          {row.statement}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {row.subject} · {row.predicate}
                          {row.object_value ? ` · ${row.object_value}` : ""}
                        </p>
                      </td>
                      <td className="py-2 pr-3 text-xs text-slate-500">
                        {row.domain}
                      </td>
                      <td className="py-2 pr-3 text-xs text-slate-500">
                        {new Date(row.updated_date).toLocaleString()}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => void openClaim(row.id)}
                          className="text-xs font-medium text-indigo-600 hover:underline"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <button
                className="disabled:text-slate-300"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                className="disabled:text-slate-300"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </AdminCard>

        <div className="flex flex-col gap-4">
          {/* Evidence health checks */}
          <AdminCard>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Evidence health checks
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              Real checks over stored records. Repairs that would alter meaning
              always require owner review — the engine never silently rewrites
              evidence.
            </p>
            <ul className="space-y-1.5 text-sm">
              {healthIssues.map((issue) => (
                <li
                  key={issue.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-slate-600">{issue.label}</span>
                  <span
                    className={`ml-2 rounded-md px-2 py-0.5 text-xs font-semibold ${
                      issue.ok
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {issue.value}
                  </span>
                </li>
              ))}
            </ul>
          </AdminCard>

          {/* Unresolved conflicts */}
          <AdminCard>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Conflicts ({conflicts.length} unresolved)
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              Contradictions are represented, never silently resolved — both
              sides keep their provenance for owner review.
            </p>
            {conflicts.length === 0 ? (
              <p className="text-sm text-slate-500">No unresolved conflicts.</p>
            ) : (
              <ul className="space-y-3">
                {conflicts.map(({ conflict, claimA, claimB }) => (
                  <li
                    key={conflict.id}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"
                  >
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                      {conflict.kind} · {conflict.explanation_status}
                    </p>
                    <p className="text-slate-700">
                      A: {claimA?.statement ?? "…"}
                    </p>
                    <p className="text-slate-700">
                      B: {claimB?.statement ?? "…"}
                    </p>
                    {conflict.explanation && (
                      <p className="mt-1 text-xs text-slate-500">
                        {conflict.explanation}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
      </div>

      {/* Claim inspector */}
      {(inspected || inspectLoading || inspectError) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
            {inspectLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : inspectError ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" /> {inspectError}
              </div>
            ) : inspected ? (
              <div>
                <button
                  onClick={() => setInspected(null)}
                  className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>

                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                      STATE_STYLES[inspected.claim.verification_state] ?? ""
                    }`}
                  >
                    {inspected.claim.verification_state}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    v{inspected.claim.version}
                  </span>
                  {inspected.claim.user_provided && (
                    <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-xs text-violet-600">
                      user-provided
                    </span>
                  )}
                  {inspected.claim.inferred && (
                    <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-600">
                      inferred
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {inspected.claim.statement}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {inspected.claim.subject} · {inspected.claim.predicate} ·{" "}
                  {inspected.claim.domain} · key{" "}
                  {inspected.claim.claim_key.slice(0, 18)}…
                </p>

                <h4 className="mt-6 mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <BadgeCheck className="h-4 w-4 text-indigo-500" /> Evidence (
                  {inspected.evidence.length})
                </h4>
                {inspected.evidence.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No evidence attached to this claim yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {inspected.evidence.map(({ record, relation }) => (
                      <li
                        key={record.id}
                        className="rounded-lg border border-slate-200 p-3 text-sm"
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                              relation === "CONTRADICTS"
                                ? "bg-red-500/10 text-red-600"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {relation}
                          </span>
                          <span className="text-xs font-medium text-slate-600">
                            {record.evidence_type}
                          </span>
                          <span className="text-xs text-slate-400">
                            {record.source_type} · {record.source_identity}
                          </span>
                        </div>
                        <p className="text-slate-700">{record.content_label}</p>
                        {record.reliability?.tier && (
                          <p className="mt-1 text-xs text-slate-500">
                            Reliability {record.reliability.tier} —{" "}
                            {record.reliability.basis}
                          </p>
                        )}
                        <div className="mt-2 rounded-md bg-slate-50 p-2">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Provenance chain (source → … )
                          </p>
                          <ol className="space-y-1 text-xs text-slate-600">
                            {record.provenance_chain?.map((step, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="font-mono text-slate-400">
                                  {i + 1}.
                                </span>
                                <span>
                                  <span className="font-medium text-slate-700">
                                    {step.stage}
                                  </span>{" "}
                                  — {step.detail}
                                  {step.transformation && (
                                    <span className="text-slate-400">
                                      {" "}
                                      ({step.transformation})
                                    </span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {inspected.premises.length > 0 && (
                  <>
                    <h4 className="mt-6 mb-2 text-sm font-semibold text-slate-800">
                      Premises ({inspected.premises.length})
                    </h4>
                    <ul className="space-y-2 text-sm">
                      {inspected.premises.map(({ claim }) => (
                        <li
                          key={claim.id}
                          className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-2"
                        >
                          <p className="text-slate-700">{claim.statement}</p>
                          <p className="text-[11px] text-slate-400">
                            {claim.verification_state}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {inspected.conflicts.length > 0 && (
                  <>
                    <h4 className="mt-6 mb-2 text-sm font-semibold text-amber-600">
                      Conflicts ({inspected.conflicts.length})
                    </h4>
                    <ul className="space-y-2 text-sm">
                      {inspected.conflicts.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-slate-700"
                        >
                          {c.kind} · explanation {c.explanation_status}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "sky" | "indigo" | "violet" | "amber" | "orange";
  icon?: React.ReactNode;
}) {
  const toneClass = tone
    ? {
        emerald: "text-emerald-600",
        sky: "text-sky-600",
        indigo: "text-indigo-600",
        violet: "text-violet-600",
        amber: "text-amber-600",
        orange: "text-orange-600",
      }[tone]
    : "text-slate-800";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
