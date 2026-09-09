// =========================================================
// FRELUX ARCHIE STAGE 1 — LEARNING CENTER
//
// The real learning pipeline (Phase 6.5/8): INPUT → EXTRACT
// → UNDERSTAND → STRUCTURE → VALIDATE → EVALUATE → SHOW OWNER
// → OWNER APPROVAL → VERSION → KNOWLEDGE (spec §8).
// Candidates created through chat ("Teach ARCHIE") land here
// as AWAITING_APPROVAL — never auto-promoted.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  listLearningIngestions,
  type ArchieLearningIngestion,
} from "@/lib/archie/stage1-client";

const STATE_LABEL: Record<string, string> = {
  RECEIVED: "Received",
  EXTRACTING: "Extracting",
  EXTRACTED: "Extracted",
  STRUCTURED: "Structured",
  VALIDATED: "Validated",
  EVALUATED: "Evaluated",
  AWAITING_APPROVAL: "Awaiting your approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function stateColor(state: string) {
  if (state === "AWAITING_APPROVAL") return "text-amber-300";
  if (state === "APPROVED") return "text-emerald-300";
  if (state === "REJECTED") return "text-red-300";
  return "text-slate-400";
}

export default function ArchieLearning() {
  const [items, setItems] = useState<ArchieLearningIngestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listLearningIngestions());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const awaiting = items.filter(
    (i) => i.pipeline_state === "AWAITING_APPROVAL",
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 md:py-6">
      <h1 className="text-lg font-semibold text-slate-100">Learning</h1>
      <p className="text-xs text-slate-400">
        ARCHIE shows you what it believes it learned before anything is
        promoted. Review and approve candidates in the Training section —
        nothing here becomes knowledge on its own.
      </p>

      <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.03] p-3 text-xs text-slate-300">
        <p className="font-medium text-slate-200">Pipeline</p>
        <p className="mt-1 text-slate-400">
          INPUT → EXTRACT → UNDERSTAND → STRUCTURE → VALIDATE → EVALUATE → SHOW
          OWNER → OWNER APPROVAL → VERSION → KNOWLEDGE
        </p>
        <p className="mt-2 text-amber-200/80">
          {awaiting.length} candidate(s) awaiting your approval
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-amber-300">
          {error}
        </p>
      )}
      {loading && (
        <p className="mt-4 text-xs text-slate-500">Loading pipeline…</p>
      )}

      <ul className="mt-4 space-y-1.5">
        {items.map((i) => (
          <li
            key={i.id}
            className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                {i.title}
              </span>
              <span className={`text-[10px] ${stateColor(i.pipeline_state)}`}>
                {STATE_LABEL[i.pipeline_state] ?? i.pipeline_state}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {i.domain} · {i.input_type} · {i.candidate_count} candidate(s)
            </p>
          </li>
        ))}
      </ul>
      {!loading && items.length === 0 && !error && (
        <p className="mt-4 text-sm text-slate-500">
          Nothing in the learning pipeline yet. Use "Teach" in the Chat Center
          to queue your first candidate.
        </p>
      )}
    </div>
  );
}
