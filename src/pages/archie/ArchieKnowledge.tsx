// =========================================================
// FRELUX ARCHIE STAGE 2 — KNOWLEDGE VAULT
//
// Real knowledge-core overview with scope separation (§9)
// PLUS full Owner controls: inspect provenance, edit (new
// version, reason required), change scope, view version
// history, roll back to any prior version. Knowledge ≠
// authority — items inform answers but never change
// calculator configuration.
// =========================================================

import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import {
  KNOWLEDGE_SCOPES,
  type KnowledgeHistoryEntry,
  type KnowledgeItem,
  listKnowledgeHistory,
  listKnowledgeItems,
  rollbackKnowledgeItem,
  updateKnowledgeItem,
} from "@/lib/archie/stage2-knowledge-client";
import { FRELUX_SELF_GRANT } from "@/lib/archie/knowledge-core";

const DomainReasoning = lazy(
  () => import("@/components/archie/DomainReasoning"),
);

const SCOPES = [
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
] as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function ArchieKnowledge() {
  const [rows, setRows] = useState<KnowledgeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [history, setHistory] = useState<KnowledgeHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editTopic, setEditTopic] = useState("");
  const [editCapability, setEditCapability] = useState("");
  const [editScope, setEditScope] = useState<KnowledgeItem["scope"]>("USER");
  const [editScopeKey, setEditScopeKey] = useState("");
  const [editContent, setEditContent] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const items = await listKnowledgeItems();
      setRows(items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load knowledge.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })().catch(() => setError("Could not load knowledge."));
  }, [refresh]);

  async function openItem(item: KnowledgeItem) {
    if (openId === item.id) {
      setOpenId(null);
      return;
    }
    setOpenId(item.id);
    setEditTopic(item.topic);
    setEditCapability(item.capability);
    setEditScope(item.scope);
    setEditScopeKey(item.scope_key ?? "");
    setEditContent(JSON.stringify(item.content, null, 2));
    setReason("");
    setHistoryLoading(true);
    try {
      setHistory(await listKnowledgeHistory(item.id));
    } catch {
      setHistory([]);
    }
    setHistoryLoading(false);
  }

  async function saveEdit(item: KnowledgeItem) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      let content: Record<string, unknown> | undefined;
      if (editContent.trim()) {
        content = JSON.parse(editContent) as Record<string, unknown>;
      }
      await updateKnowledgeItem(
        item.id,
        {
          topic: editTopic.trim() || item.topic,
          capability: editCapability.trim() || item.capability,
          scope: editScope,
          scope_key: editScopeKey.trim() || null,
          ...(content !== undefined ? { content } : {}),
        },
        reason,
      );
      setNotice(
        `Saved as version ${item.version + 1} — the previous state is preserved in history.`,
      );
      await refresh();
      const fresh = await listKnowledgeHistory(item.id);
      setHistory(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Edit failed.");
    }
    setBusy(false);
  }

  async function rollback(item: KnowledgeItem, toVersion: number) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await rollbackKnowledgeItem(item.id, toVersion);
      setNotice(
        `Rolled back to version ${toVersion} (saved as a new version).`,
      );
      await refresh();
      setHistory(await listKnowledgeHistory(item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rollback failed.");
    }
    setBusy(false);
  }

  return (
    <div className="archie-fade-up mx-auto max-w-4xl px-4 py-4 md:py-6">
      <h1 className="archie-title-gradient text-lg font-semibold md:text-xl">
        Knowledge Vault
      </h1>
      <p className="text-xs text-slate-400">
        ARCHIE's knowledge core with strict scopes and full Owner controls.
        Every edit creates a new version with a recorded reason; every prior
        state is preserved and can be restored. Knowledge ≠ authority — items
        inform answers but never change calculator configuration.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SCOPES.map((s) => (
          <div key={s.key} className="rounded-lg archie-panel p-3">
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
      {notice && (
        <p role="status" className="mt-4 text-sm text-emerald-300">
          {notice}
        </p>
      )}
      {loading && (
        <p className="mt-4 text-xs text-slate-500">Loading knowledge…</p>
      )}

      <ul className="mt-4 space-y-1.5">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg archie-panel">
            <button
              type="button"
              onClick={() => openItem(r)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                {r.topic}
              </span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                {r.scope}
              </span>
              <span className="hidden rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 sm:inline">
                {r.evidence_state}
              </span>
              <span className="text-[10px] text-slate-500">v{r.version}</span>
              <span className="text-[10px] text-slate-500">
                {openId === r.id ? "▾" : "▸"}
              </span>
            </button>

            {openId === r.id && (
              <div
                className="space-y-3 border-t border-white/5 px-3 py-3"
                data-testid="knowledge-detail"
              >
                {/* Provenance */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-400">
                  <p>
                    Evidence:{" "}
                    <span className="text-slate-200">{r.evidence_state}</span>
                  </p>
                  <p>
                    Confidence:{" "}
                    <span className="text-slate-200">
                      {r.confidence ?? "—"}
                    </span>
                  </p>
                  <p>
                    Capability:{" "}
                    <span className="text-slate-200">{r.capability}</span>
                  </p>
                  <p>
                    Scope key:{" "}
                    <span className="text-slate-200">{r.scope_key ?? "—"}</span>
                  </p>
                  <p>
                    Approved:{" "}
                    <span className="text-slate-200">
                      {r.approved_by
                        ? formatDate(r.approved_date)
                        : "not approved"}
                    </span>
                  </p>
                  <p>
                    Last change:{" "}
                    <span className="text-slate-200">
                      {formatDate(r.updated_date)}
                    </span>
                  </p>
                  {r.change_reason && (
                    <p className="col-span-2">
                      Reason:{" "}
                      <span className="text-slate-200">{r.change_reason}</span>
                    </p>
                  )}
                </div>

                {/* Content preview */}
                <details>
                  <summary className="cursor-pointer text-[11px] text-slate-400">
                    Content (JSON)
                  </summary>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-black/30 p-2 text-[10px] text-slate-300">
                    {JSON.stringify(r.content, null, 2)}
                  </pre>
                </details>

                {/* Version history */}
                <div>
                  <p className="text-[11px] font-medium text-slate-300">
                    Version history (current: v{r.version})
                  </p>
                  {historyLoading ? (
                    <p className="text-[11px] text-slate-500">Loading…</p>
                  ) : history.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      No prior versions — this item has never been edited.
                    </p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {history.map((h) => (
                        <li
                          key={h.id}
                          className="flex items-center gap-2 text-[11px] text-slate-400"
                        >
                          <span className="text-slate-200">v{h.version}</span>
                          <span className="min-w-0 flex-1 truncate">
                            {h.change_reason ?? h.topic}
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => rollback(r, h.version)}
                            className="rounded-lg border border-white/10 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-white/5 disabled:opacity-50"
                          >
                            Restore
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Edit form — new version, reason required */}
                <div className="space-y-2 rounded-lg archie-panel p-3">
                  <p className="text-[11px] font-medium text-slate-300">
                    Edit as new version (reason required)
                  </p>
                  <input
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    placeholder="Topic"
                    className="w-full rounded-lg archie-input px-2 py-1.5 text-xs text-slate-200"
                  />
                  <input
                    value={editCapability}
                    onChange={(e) => setEditCapability(e.target.value)}
                    placeholder="Capability"
                    className="w-full rounded-lg archie-input px-2 py-1.5 text-xs text-slate-200"
                  />
                  <div className="flex flex-wrap gap-1">
                    {KNOWLEDGE_SCOPES.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setEditScope(s.key)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${
                          editScope === s.key
                            ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
                            : "border-white/10 text-slate-400"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {editScope !== "USER" && (
                    <input
                      value={editScopeKey}
                      onChange={(e) => setEditScopeKey(e.target.value)}
                      placeholder="Scope key (region / project / property id)"
                      className="w-full rounded-lg archie-input px-2 py-1.5 text-xs text-slate-200"
                    />
                  )}
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={6}
                    placeholder="Content (JSON)"
                    className="w-full rounded-lg archie-input px-2 py-1.5 font-mono text-[10px] text-slate-300"
                  />
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why are you changing this? (required)"
                    className="w-full rounded-lg archie-input px-2 py-1.5 text-xs text-slate-200"
                  />
                  <button
                    type="button"
                    disabled={busy || !reason.trim()}
                    onClick={() => saveEdit(r)}
                    className="archie-btn-primary rounded-lg bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
                  >
                    Save as new version
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!loading && rows.length === 0 && !error && (
        <p className="mt-4 text-sm text-slate-500">
          No knowledge items yet — teach ARCHIE from the Chat Center.
        </p>
      )}

      <div className="mt-8 rounded-lg archie-panel p-3">
        <p className="text-xs font-medium text-slate-200">
          Knowledge core grants
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          {FRELUX_SELF_GRANT.application_label} — scopes:{" "}
          {FRELUX_SELF_GRANT.scopes.join(", ") || "none"}. USER scope always
          requires explicit consent (
          {FRELUX_SELF_GRANT.user_scope_requires_consent ? "enforced" : "off"}),
          and grants list which domains an application may read; knowledge never
          crosses scopes.
        </p>
      </div>

      <div className="mt-8">
        <Suspense
          fallback={
            <p className="text-xs text-slate-500">Loading reasoning tools…</p>
          }
        >
          <DomainReasoning />
        </Suspense>
      </div>
    </div>
  );
}
