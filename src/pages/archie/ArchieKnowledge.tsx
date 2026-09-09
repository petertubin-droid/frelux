// =========================================================
// FRELUX ARCHIE STAGE 1 — KNOWLEDGE CENTER
//
// Real knowledge-core overview with scope separation
// (spec §9): Owner-private never becomes global FRELUX
// knowledge without explicit approval flows.
// =========================================================

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-lazy";

interface KnowledgeRow {
  topic: string;
  capability: string;
  scope: "GLOBAL" | "REGIONAL" | "PROJECT" | "PROPERTY" | "USER";
  evidence_state: string;
  version: number;
  status: string;
}

const SCOPES: Array<{
  key: KnowledgeRow["scope"];
  label: string;
  note: string;
}> = [
  {
    key: "USER",
    label: "Owner Private",
    note: "Only you. Never shared, never global.",
  },
  { key: "PROJECT", label: "Project", note: "Scoped to a single project." },
  { key: "PROPERTY", label: "Property", note: "Scoped to a single property." },
  {
    key: "REGIONAL",
    label: "Regional",
    note: "Region knowledge (state, market area).",
  },
  {
    key: "GLOBAL",
    label: "FRELUX Approved / Global",
    note: "Approved for all FRELUX users.",
  },
];

export default function ArchieKnowledge() {
  const [rows, setRows] = useState<KnowledgeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSupabase()
      .then((supabase) =>
        supabase
          .from("frelux_knowledge_items")
          .select("topic, capability, scope, evidence_state, version, status")
          .order("created_date", { ascending: false })
          .limit(60),
      )
      .then(({ data, error: e }) => {
        if (cancelled) return;
        if (e) setError(e.message);
        else setRows((data ?? []) as KnowledgeRow[]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 md:py-6">
      <h1 className="text-lg font-semibold text-slate-100">Knowledge</h1>
      <p className="text-xs text-slate-400">
        ARCHIE's knowledge core with strict scopes. Knowledge ≠ authority —
        items inform answers but never change calculator configuration.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SCOPES.map((s) => (
          <div
            key={s.key}
            className="rounded-lg border border-white/5 bg-white/[0.03] p-3"
          >
            <p className="text-sm font-medium text-slate-200">{s.label}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{s.note}</p>
            <p className="mt-1 text-xs text-amber-200/80">
              {rows.filter((r) => r.scope === s.key).length} item(s)
            </p>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-amber-300">
          {error}
        </p>
      )}
      {loading && (
        <p className="mt-4 text-xs text-slate-500">Loading knowledge…</p>
      )}

      <ul className="mt-4 space-y-1.5">
        {rows.map((r, i) => (
          <li
            key={`${r.topic}-${i}`}
            className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
              {r.topic}
            </span>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
              {r.scope}
            </span>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
              {r.evidence_state}
            </span>
            <span className="text-[10px] text-slate-500">v{r.version}</span>
          </li>
        ))}
      </ul>
      {!loading && rows.length === 0 && !error && (
        <p className="mt-4 text-sm text-slate-500">
          No knowledge items yet — teach ARCHIE from the Chat Center.
        </p>
      )}
    </div>
  );
}
