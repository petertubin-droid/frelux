// =========================================================
// FRELUX ARCHIE STAGE 1 — LEARNING CENTER
//
// The learning pipeline (Phase 6.5/8): INPUT → EXTRACT
// → UNDERSTAND → STRUCTURE → VALIDATE → EVALUATE → VERSION
// → KNOWLEDGE. Owner directive 2026-09-14: knowledge learning
// needs NO approval step — teaching is stored directly with
// owner-taught provenance. This page shows everything ARCHIE
// has learned, with remove/reject controls and a jump into
// Training for corrections and rollback of stored knowledge.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  listLearningIngestions,
  type ArchieLearningIngestion,
} from "@/lib/archie/stage1-client";
import { getSupabase } from "@/lib/supabase-lazy";
import { Link } from "react-router-dom";
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

  async function removeItem(id: string) {
    if (!window.confirm("Remove this learning record?")) return;
    const supabase = await getSupabase();
    const { error } = await supabase
      .from("frelux_archie_ingestions")
      .delete()
      .eq("id", id);
    if (error) setError(error.message);
    else await load();
  }

  return (
    <ArchiePage
      title="Learning"
      subtitle="Everything ARCHIE learns from you is stored directly as knowledge — no approval step. This is the full record: review it, correct it in Training, or remove anything wrong."
    >
      <ArchiePanel accent className="p-4 text-xs text-slate-300">
        <ArchieSectionTitle>Pipeline</ArchieSectionTitle>
        <p className="mt-1 text-slate-400">
          INPUT → EXTRACT → UNDERSTAND → STRUCTURE → VALIDATE → EVALUATE →
          VERSION → KNOWLEDGE — teaching is stored on your authority, correct
          or remove it here any time
        </p>
        {awaiting.length > 0 && (
          <p className="mt-2.5 font-medium text-amber-200/90">
            {awaiting.length} older candidate(s) still in the pre-approval
            state — approve them in{" "}
            <Link to="/archie/training" className="underline underline-offset-2">
              Training
            </Link>{" "}
            or reject below
          </p>
        )}
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
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              {i.pipeline_state === "AWAITING_APPROVAL" && (
                <Link
                  to="/archie/training"
                  className="rounded-lg bg-amber-400/90 px-2.5 py-1 font-medium text-slate-900 hover:bg-amber-300"
                >
                  Approve in Training
                </Link>
              )}
              {i.pipeline_state !== "REJECTED" && (
                <button
                  type="button"
                  onClick={() => void removeItem(i.id)}
                  className="rounded-lg border border-rose-400/30 px-2.5 py-1 text-rose-300 hover:bg-rose-400/10"
                >
                  Remove
                </button>
              )}
              <Link
                to="/archie/training"
                className="rounded-lg border border-white/10 px-2.5 py-1 text-slate-400 hover:bg-white/5"
              >
                Correct in Training
              </Link>
            </div>
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
