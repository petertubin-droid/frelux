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
import {
  ArchiePage,
  ArchiePanel,
  ArchieSectionTitle,
  ArchieBadge,
} from "@/components/archie/premium";

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

function stateTone(
  state: string,
): "warning" | "positive" | "critical" | "neutral" {
  if (state === "AWAITING_APPROVAL") return "warning";
  if (state === "APPROVED") return "positive";
  if (state === "REJECTED") return "critical";
  return "neutral";
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
    <ArchiePage
      title="Learning"
      subtitle="ARCHIE shows you what it believes it learned before anything is promoted. Review and approve candidates in the Training section — nothing here becomes knowledge on its own."
    >
      <ArchiePanel accent className="p-4 text-xs text-slate-300">
        <ArchieSectionTitle>Pipeline</ArchieSectionTitle>
        <p className="mt-1 text-slate-400">
          INPUT → EXTRACT → UNDERSTAND → STRUCTURE → VALIDATE → EVALUATE → SHOW
          OWNER → OWNER APPROVAL → VERSION → KNOWLEDGE
        </p>
        <p className="mt-2.5 font-medium text-amber-200/90">
          {awaiting.length} candidate(s) awaiting your approval
        </p>
      </ArchiePanel>

      {error && (
        <p role="alert" className="mt-4 text-sm text-amber-300">
          {error}
        </p>
      )}
      {loading && (
        <p className="mt-4 text-xs text-slate-500">Loading pipeline…</p>
      )}

      <ul className="mt-4 space-y-2">
        {items.map((i) => (
          <li key={i.id} className="archie-panel rounded-xl p-3.5">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                {i.title}
              </span>
              <ArchieBadge tone={stateTone(i.pipeline_state)}>
                {STATE_LABEL[i.pipeline_state] ?? i.pipeline_state}
              </ArchieBadge>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
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
    </ArchiePage>
  );
}
