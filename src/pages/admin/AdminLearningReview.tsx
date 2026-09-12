import { useEffect, useState, useCallback } from "react";
import {
  Brain,
  ShieldAlert,
  FileCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Send,
} from "lucide-react";
import {
  AdminHeader,
  AdminButton,
  AdminSelect,
} from "@/components/admin/AdminUi";
import { useAuth } from "@/lib/auth";
import {
  fetchLearningRecords,
  fetchRecordAudit,
  reviewRecord,
  advanceRecord,
  rollbackKnowledgeForRecord,
  submitArchieReference,
  capabilityIsMath,
} from "@/lib/learning/learning-client";

const STATUSES = [
  "ALL",
  "ARCHIE_RECEIVED",
  "CANDIDATE",
  "VERIFYING",
  "EVALUATING",
  "READY_FOR_REVIEW",
  "APPROVED",
  "REJECTED",
  "DEFERRED",
];

interface Record_ {
  id: string;
  source: string;
  source_type: string | null;
  provider: string | null;
  model_version: string | null;
  topic: string;
  capability: string;
  request_context: string | null;
  recommendation: string | null;
  conclusion: string | null;
  evidence: string[];
  cited_sources: string[];
  assumptions: string[];
  proposed_scope: string;
  scope_key: string | null;
  confidence: number | null;
  verification_status: string;
  evaluation_status: string;
  lifecycle_status: string;
  created_by: string | null;
  created_date: string;
  provenance: Record<string, unknown>;
}

export default function AdminLearningReview() {
  const { user } = useAuth();
  const [records, setRecords] = useState<Record_[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [audit, setAudit] = useState<Array<Record<string, unknown>>>([]);
  const [actionReason, setActionReason] = useState("");
  const [engineeringReviewed, setEngineeringReviewed] = useState(false);
  const [scopeExplicit, setScopeExplicit] = useState(false);

  // ARCHIE submission form
  const [archieTopic, setArchieTopic] = useState("");
  const [archieCapability, setArchieCapability] =
    useState("ux_recommendations");
  const [archieScope, setArchieScope] = useState("GLOBAL");
  const [archieScopeKey, setArchieScopeKey] = useState("");
  const [archieRecommendation, setArchieRecommendation] = useState("");
  const [archieConclusion, setArchieConclusion] = useState("");
  const [archieEvidence, setArchieEvidence] = useState("");
  const [archieConfidence, setArchieConfidence] = useState("0.8");
  const [submitting, setSubmitting] = useState(false);

  // Record actual outcome
  const [outcomeCapability, setOutcomeCapability] = useState("build_to_roof");
  const [outcomeSubject, setOutcomeSubject] = useState("");
  const [outcomeEstimated, setOutcomeEstimated] = useState("");
  const [outcomeActual, setOutcomeActual] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchLearningRecords(statusFilter);
      setRecords(rows as unknown as Record_[]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load learning records",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openRecord = useCallback(
    async (id: string) => {
      if (expanded === id) {
        setExpanded(null);
        return;
      }
      setExpanded(id);
      try {
        setAudit(await fetchRecordAudit(id));
      } catch {
        setAudit([]);
      }
    },
    [expanded],
  );

  const act = useCallback(
    async (
      fn: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    ) => {
      setError(null);
      setNotice(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Action failed");
      else {
        setNotice(res.message ?? "Done");
        setActionReason("");
        await load();
      }
    },
    [load],
  );

  const submitArchie = useCallback(async () => {
    if (!archieTopic.trim() || !archieRecommendation.trim()) {
      setError("Topic and recommendation are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const res = await submitArchieReference({
      source: "ARCHIE",
      source_type: "CHATGPT_REFERENCE",
      provider: "OPENAI",
      topic: archieTopic.trim(),
      capability: archieCapability,
      recommendation: archieRecommendation.trim(),
      conclusion: archieConclusion.trim() || undefined,
      evidence: archieEvidence
        ? archieEvidence
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      proposed_scope: archieScope,
      scope_key: archieScopeKey.trim() || undefined,
      confidence: Number(archieConfidence) || undefined,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(`Ingestion rejected (${res.code ?? "ERROR"}): ${res.message}`);
    } else {
      setNotice(res.message);
      setArchieTopic("");
      setArchieRecommendation("");
      setArchieConclusion("");
      setArchieEvidence("");
      await load();
    }
  }, [
    archieTopic,
    archieCapability,
    archieRecommendation,
    archieConclusion,
    archieEvidence,
    archieScope,
    archieScopeKey,
    archieConfidence,
    load,
  ]);

  const submitOutcome = useCallback(async () => {
    setError(null);
    setNotice(null);
    if (!outcomeSubject.trim() || !outcomeEstimated || !outcomeActual) {
      setError("Subject, estimated and actual values are required.");
      return;
    }
    const { recordActualOutcome } =
      await import("@/lib/learning/learning-client");
    const res = await recordActualOutcome({
      capability: outcomeCapability,
      subject: outcomeSubject.trim(),
      estimatedValue: outcomeEstimated,
      actualValue: outcomeActual,
    });
    if (!res.ok) setError(res.error ?? "Failed to record outcome");
    else {
      setNotice(
        `Outcome recorded (delta ${(100 * (res.delta ?? 0)).toFixed(1)}%).`,
      );
      setOutcomeSubject("");
      setOutcomeEstimated("");
      setOutcomeActual("");
    }
  }, [outcomeCapability, outcomeSubject, outcomeEstimated, outcomeActual]);

  const badge = (status: string) => {
    if (status === "APPROVED")
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "REJECTED") return "bg-red-100 text-red-800 border-red-200";
    if (status === "DEFERRED")
      return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "READY_FOR_REVIEW")
      return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-muted text-card-foreground border-border";
  };

  return (
    <div>
      <AdminHeader
        title="Learning Review"
        subtitle="Unified Learning Engine, ARCHIE reference intelligence, Gemini/OpenAI signals, user corrections and project outcomes. Nothing enters production knowledge without human approval."
      />
      <div className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        {/* ARCHIE ingestion */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Send className="h-4 w-4" /> Ingest ARCHIE reference material
            (authenticated ingestion)
          </h2>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="Topic"
              value={archieTopic}
              onChange={(e) => setArchieTopic(e.target.value)}
            />
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="Capability (e.g. ux_recommendations)"
              value={archieCapability}
              onChange={(e) => setArchieCapability(e.target.value)}
            />
            <AdminSelect
              value={archieScope}
              onChange={(e) => setArchieScope(e.target.value)}
            >
              {["GLOBAL", "REGIONAL", "PROJECT", "PROPERTY", "USER"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </AdminSelect>
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="Scope key (market, e.g. NG)"
              value={archieScopeKey}
              onChange={(e) => setArchieScopeKey(e.target.value)}
            />
          </div>
          <textarea
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            rows={2}
            placeholder="Recommendation (conclusions only, no chain-of-thought)"
            value={archieRecommendation}
            onChange={(e) => setArchieRecommendation(e.target.value)}
          />
          <textarea
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            rows={2}
            placeholder="Conclusion (optional)"
            value={archieConclusion}
            onChange={(e) => setArchieConclusion(e.target.value)}
          />
          <div className="grid gap-2 md:grid-cols-2">
            <textarea
              className="rounded-md border px-2 py-1.5 text-sm"
              rows={2}
              placeholder={"Evidence (one per line)"}
              value={archieEvidence}
              onChange={(e) => setArchieEvidence(e.target.value)}
            />
            <div className="flex items-end gap-2">
              <input
                className="rounded-md border px-2 py-1.5 text-sm w-24"
                placeholder="0.0-1.0"
                value={archieConfidence}
                onChange={(e) => setArchieConfidence(e.target.value)}
              />
              <AdminButton onClick={submitArchie} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit for review"}
              </AdminButton>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Enters as ARCHIE_RECEIVED → CANDIDATE → VERIFYING → EVALUATING →
            READY_FOR_REVIEW → human APPROVE/REJECT/DEFER. Ingestion alone can
            never promote knowledge.
          </p>
        </section>

        {/* Actual outcome */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileCheck className="h-4 w-4" /> Record an actual project outcome
            (prediction vs reality)
          </h2>
          <div className="grid gap-2 md:grid-cols-4">
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="Capability"
              value={outcomeCapability}
              onChange={(e) => setOutcomeCapability(e.target.value)}
            />
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="Subject (e.g. Stage 3 blocks)"
              value={outcomeSubject}
              onChange={(e) => setOutcomeSubject(e.target.value)}
            />
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="Estimated value"
              value={outcomeEstimated}
              onChange={(e) => setOutcomeEstimated(e.target.value)}
            />
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="Actual value"
              value={outcomeActual}
              onChange={(e) => setOutcomeActual(e.target.value)}
            />
          </div>
          <AdminButton onClick={submitOutcome}>Record outcome</AdminButton>
        </section>

        {/* Records */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Brain className="h-4 w-4" /> Learning records ({records.length})
            </h2>
            <div className="flex items-center gap-2">
              <AdminSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </AdminSelect>
              <AdminButton onClick={load}>
                <RefreshCw className="h-4 w-4" />
              </AdminButton>
            </div>
          </div>

          {loading && (
            <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
              Loading…
            </div>
          )}

          {!loading && records.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No learning records for this filter yet.
            </p>
          )}

          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="rounded-md border">
                <button
                  className="w-full flex items-center justify-between gap-2 p-3 text-left"
                  onClick={() => openRecord(r.id)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.topic}
                      {capabilityIsMath(r.capability) && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700">
                          <ShieldAlert className="h-3 w-3" /> deterministic math
                          , engineering review required
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.source} · {r.provider ?? "-"}{" "}
                      {r.model_version ? `(${r.model_version})` : ""} ·{" "}
                      {r.capability} · scope {r.proposed_scope}
                      {r.scope_key ? `/${r.scope_key}` : ""} · conf{" "}
                      {r.confidence ?? "-"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${badge(r.lifecycle_status)}`}
                  >
                    {r.lifecycle_status}
                  </span>
                  {expanded === r.id ? (
                    <ChevronUp className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  )}
                </button>

                {expanded === r.id && (
                  <div className="border-t p-3 space-y-3">
                    <dl className="grid gap-2 text-xs md:grid-cols-2">
                      <div>
                        <dt className="font-medium">Source type</dt>
                        <dd>{r.source_type ?? "-"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Verification</dt>
                        <dd>{r.verification_status}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Evaluation</dt>
                        <dd>{r.evaluation_status}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Submitted by</dt>
                        <dd>{r.created_by ?? "-"}</dd>
                      </div>
                    </dl>
                    {r.request_context && (
                      <div>
                        <p className="text-xs font-medium">Context</p>
                        <p className="text-xs whitespace-pre-wrap">
                          {r.request_context}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium">Recommendation</p>
                      <p className="text-xs whitespace-pre-wrap">
                        {r.recommendation ?? "-"}
                      </p>
                    </div>
                    {r.conclusion && (
                      <div>
                        <p className="text-xs font-medium">Conclusion</p>
                        <p className="text-xs whitespace-pre-wrap">
                          {r.conclusion}
                        </p>
                      </div>
                    )}
                    {r.evidence?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium">Evidence</p>
                        <ul className="list-disc pl-4 text-xs">
                          {r.evidence.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.assumptions?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium">Assumptions</p>
                        <ul className="list-disc pl-4 text-xs">
                          {r.assumptions.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.cited_sources?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium">Cited sources</p>
                        <ul className="list-disc pl-4 text-xs">
                          {r.cited_sources.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(r.provenance?.sanitizer_flags) &&
                      (r.provenance.sanitizer_flags as string[]).length > 0 && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                          Injection flags on this record:{" "}
                          {(r.provenance.sanitizer_flags as string[]).join(
                            ", ",
                          )}{" "}
                          , review the quarantined text carefully before any
                          approval.
                        </div>
                      )}
                    {audit.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Audit trail</p>
                        <ul className="text-xs space-y-1">
                          {audit.map((a, i) => (
                            <li key={i} className="text-muted-foreground">
                              {String(a.action)} :{" "}
                              {String(a.created_date ?? "")} :{" "}
                              {String(
                                (a.details as Record<string, unknown>)
                                  ?.reason ?? "",
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-2 border-t pt-2">
                      <input
                        className="w-full rounded-md border px-2 py-1.5 text-sm"
                        placeholder="Reason / change justification (required for approval)"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                      />
                      {capabilityIsMath(r.capability) && (
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={engineeringReviewed}
                            onChange={(e) =>
                              setEngineeringReviewed(e.target.checked)
                            }
                          />
                          Engineering review completed (mandatory for
                          deterministic math capabilities)
                        </label>
                      )}
                      {r.proposed_scope === "GLOBAL" && (
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={scopeExplicit}
                            onChange={(e) => setScopeExplicit(e.target.checked)}
                          />
                          Explicit GLOBAL-scope approval (independently
                          verified)
                        </label>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <AdminButton
                          onClick={() =>
                            act(() =>
                              advanceRecord(
                                r.id,
                                "CANDIDATE",
                                actionReason || "triage",
                              ),
                            )
                          }
                        >
                          Advance → Candidate
                        </AdminButton>
                        <AdminButton
                          onClick={() =>
                            act(() =>
                              advanceRecord(
                                r.id,
                                "VERIFYING",
                                actionReason || "verification",
                              ),
                            )
                          }
                        >
                          Verify
                        </AdminButton>
                        <AdminButton
                          onClick={() =>
                            act(() =>
                              advanceRecord(
                                r.id,
                                "EVALUATING",
                                actionReason || "evaluation",
                              ),
                            )
                          }
                        >
                          Evaluate
                        </AdminButton>
                        <AdminButton
                          onClick={() =>
                            act(() =>
                              advanceRecord(
                                r.id,
                                "READY_FOR_REVIEW",
                                actionReason || "ready",
                              ),
                            )
                          }
                        >
                          Ready for review
                        </AdminButton>
                        <AdminButton
                          onClick={() =>
                            act(() =>
                              reviewRecord({
                                recordId: r.id,
                                action: "REQUEST_VERIFICATION",
                                reason: actionReason || "request",
                              }),
                            )
                          }
                        >
                          Request verification
                        </AdminButton>
                        <AdminButton
                          onClick={() =>
                            act(() =>
                              reviewRecord({
                                recordId: r.id,
                                action: "APPROVE",
                                reason: actionReason || "approved",
                                engineeringReviewed,
                                scopeExplicitlyApproved: scopeExplicit,
                                independentlyVerified: scopeExplicit,
                              }),
                            )
                          }
                        >
                          Approve
                        </AdminButton>
                        <AdminButton
                          onClick={() =>
                            act(() =>
                              reviewRecord({
                                recordId: r.id,
                                action: "REJECT",
                                reason: actionReason || "rejected",
                              }),
                            )
                          }
                        >
                          Reject
                        </AdminButton>
                        <AdminButton
                          onClick={() =>
                            act(() =>
                              reviewRecord({
                                recordId: r.id,
                                action: "DEFER",
                                reason: actionReason || "deferred",
                              }),
                            )
                          }
                        >
                          Defer
                        </AdminButton>
                      </div>
                      {r.lifecycle_status === "APPROVED" && (
                        <AdminButton
                          onClick={() =>
                            act(() =>
                              rollbackKnowledgeForRecord(
                                r.id,
                                actionReason || "rollback",
                              ),
                            )
                          }
                        >
                          Roll back knowledge
                        </AdminButton>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          Signed in as {user?.email ?? "unknown"}. AI can never approve its own
          learning; deterministic engine math requires the full VERIFY →
          ENGINEERING REVIEW → REGRESSION TEST → HUMAN APPROVAL → VERSIONED
          DEPLOYMENT process.
        </p>
      </div>
    </div>
  );
}
