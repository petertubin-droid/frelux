// =========================================================
// ARCHIE PRIVACY & MEMORY RIGHTS (PWA)
//
// © 2026 FRENZY. All rights reserved.
//
// REAL privacy controls, not placeholders: consent toggles
// that gate live features (personalization gates the
// cognitive engine's persistent memory; voice gates the ears
// function), a working memory browser (search / correct /
// delete), real retention pruning, real data export, and
// deletion requests recorded and audited. Every button here
// performs a real backend operation.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import { Search, Trash2, Pencil, Download, Clock, Ban } from "lucide-react";
import {
  fetchConsents,
  setConsent,
  searchMemory,
  correctMemory,
  deleteMemory,
  deleteMemorySubject,
  clearConversations,
  exportMyData,
  requestDeletion,
  myRightsRequests,
  type PrivacyConsent,
  type MemoryFact,
  type RightsRequest,
} from "@/lib/archie/legal-client";
import {
  ArchiePage,
  ArchieSectionTitle,
  ArchieBadge,
} from "@/components/archie/premium";

function consentOn(consents: PrivacyConsent[], key: string): boolean {
  const c = consents.find((x) => x.consent_key === key);
  if (!c) return true; // unset = feature available (settings shown here)
  return c.granted === true && c.revoked_at === null;
}

export default function ArchiePrivacy() {
  const [consents, setConsents] = useState<PrivacyConsent[]>([]);
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [query, setQuery] = useState("");
  const [requests, setRequests] = useState<RightsRequest[]>([]);
  const [retentionDays, setRetentionDays] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const reloadMemory = useCallback(async (q: string) => {
    const res = await searchMemory(q);
    if (res.ok) {
      setFacts(res.data.facts);
      if (res.data.pruned > 0) {
        setStatus(
          `Retention applied: pruned ${res.data.pruned} outdated unvalidated entr${res.data.pruned === 1 ? "y" : "ies"}.`,
        );
      }
    } else setError(res.error);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, r] = await Promise.all([fetchConsents(), myRightsRequests()]);
    if (c.ok) {
      setConsents(c.data.consents);
      const ret = c.data.consents.find(
        (x) => x.consent_key === "memory_retention",
      );
      if (ret?.value?.days) setRetentionDays(String(ret.value.days));
    } else setError(c.error);
    if (r.ok) setRequests(r.data.requests);
    await reloadMemory("");
    setLoading(false);
  }, [reloadMemory]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string } | { ok: boolean }>,
    after?: () => void,
  ) {
    setBusy(true);
    setError(null);
    setStatus(null);
    const res = await fn();
    if (!res.ok && "error" in res && res.error) setError(res.error);
    else setStatus(label);
    after?.();
    setBusy(false);
  }

  async function toggleConsent(key: string, on: boolean) {
    await run(
      on
        ? "Consent granted."
        : "Consent revoked — the corresponding feature is now gated off.",
      () => setConsent(key, on),
      () => load(),
    );
  }

  async function saveRetention() {
    const days = parseInt(retentionDays, 10);
    if (!Number.isFinite(days) || days < 1) {
      setError("Retention must be a positive number of days.");
      return;
    }
    await run(
      `Retention set to ${days} days. Unvalidated memories older than this are pruned.`,
      () => setConsent("memory_retention", true, { days }),
      () => reloadMemory(query),
    );
  }

  async function doExport() {
    setBusy(true);
    const res = await exportMyData();
    if (res.ok) {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `archie-personal-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Personal data exported (machine-readable JSON).");
    } else setError(res.error);
    setBusy(false);
  }

  async function startCorrect(f: MemoryFact) {
    setEditing(f.id);
    setEditValue(JSON.stringify(f.object, null, 2));
  }

  async function saveCorrect(id: string) {
    try {
      const parsed = JSON.parse(editValue);
      await run(
        "Memory corrected — the previous value is preserved in its audit history.",
        () => correctMemory(id, parsed),
        () => {
          setEditing(null);
          reloadMemory(query);
        },
      );
    } catch {
      setError("Invalid JSON value.");
    }
  }

  return (
    <ArchiePage
      title="Privacy & Memory Rights"
      subtitle="Real controls over your data: consents that gate live features, memory you can view, correct, delete and export. Deletion is real deletion."
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}
      {status && (
        <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          {status}
        </div>
      )}

      {/* -------------------- Consents -------------------- */}
      <ArchieSectionTitle>Consents</ArchieSectionTitle>
      <div className="mb-8 space-y-2">
        {[
          {
            key: "personalization_memory",
            label: "Memory-based personalization",
            desc: "OFF runs the cognitive engine without loading or storing persistent memory for your requests.",
          },
          {
            key: "voice_audio",
            label: "Voice / audio processing",
            desc: "OFF disables ARCHIE's ears (audio transcription) until re-enabled.",
          },
          {
            key: "web_research",
            label: "Web research",
            desc: "Standing consent for owner-authorized web research from trusted sources.",
          },
        ].map((c) => (
          <div
            key={c.key}
            className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card/50 p-4"
          >
            <div>
              <div className="text-sm font-semibold text-foreground">
                {c.label}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {c.desc}
              </div>
            </div>
            <button
              role="switch"
              aria-checked={consentOn(consents, c.key)}
              disabled={busy}
              onClick={() => toggleConsent(c.key, !consentOn(consents, c.key))}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${consentOn(consents, c.key) ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${consentOn(consents, c.key) ? "left-[22px]" : "left-0.5"}`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* -------------------- Retention -------------------- */}
      <ArchieSectionTitle>Memory retention</ArchieSectionTitle>
      <div className="mb-8 flex flex-wrap items-end gap-2 rounded-lg border border-border/60 bg-card/50 p-4">
        <div className="min-w-40">
          <div className="text-sm font-semibold text-foreground">
            Prune unvalidated memories older than
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Validated (owner-confirmed) knowledge is kept.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
            className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
            aria-label="Retention days"
          />
          <span className="text-sm text-muted-foreground">days</span>
          <button
            onClick={saveRetention}
            disabled={busy}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Clock aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{" "}
            Apply
          </button>
        </div>
      </div>

      {/* -------------------- Memory browser -------------------- */}
      <ArchieSectionTitle>Memory browser</ArchieSectionTitle>
      <div className="mb-2 flex gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memory by meaning, subject or content…"
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm"
            onKeyDown={(e) => e.key === "Enter" && reloadMemory(query)}
          />
        </div>
        <button
          onClick={() => reloadMemory(query)}
          disabled={busy}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Search
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading memory…</p>
      ) : (
        <div className="mb-8 space-y-2">
          {facts.length === 0 && (
            <p className="text-sm text-muted-foreground">No memories found.</p>
          )}
          {facts.map((f) => (
            <div
              key={f.id}
              className="rounded-lg border border-border/60 bg-card/50 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-foreground">
                  {f.subject}{" "}
                  <span className="text-muted-foreground">
                    → {f.predicate} →
                  </span>{" "}
                  <span className="font-mono text-xs">
                    {editing === f.id ? "" : JSON.stringify(f.object)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArchieBadge
                    tone={f.status === "validated" ? "positive" : "neutral"}
                  >
                    {f.status} · {(f.confidence * 100).toFixed(0)}%
                  </ArchieBadge>
                  <button
                    onClick={() => startCorrect(f)}
                    disabled={busy}
                    aria-label="Correct memory"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      run(
                        "Memory deleted — permanently.",
                        () => deleteMemory(f.id),
                        () => reloadMemory(query),
                      )
                    }
                    disabled={busy}
                    aria-label="Delete memory"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-red-400"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {editing === f.id && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-border bg-background p-2 font-mono text-xs"
                    aria-label="New value (JSON)"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveCorrect(f.id)}
                      disabled={busy}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    >
                      Save correction
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* -------------------- Export & deletion -------------------- */}
      <ArchieSectionTitle>Export & deletion</ArchieSectionTitle>
      <div className="mb-8 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 p-4">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Export personal data
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Machine-readable JSON: memories, conversations, consents.
            </div>
          </div>
          <button
            onClick={doExport}
            disabled={busy}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Download aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{" "}
            Export
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 p-4">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Delete a memory category
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Enter a subject to delete all matching memories — real deletion.
            </div>
          </div>
          <div className="flex gap-2">
            <input
              id="delete-subject-input"
              type="text"
              placeholder="Subject…"
              className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                const el = document.getElementById(
                  "delete-subject-input",
                ) as HTMLInputElement | null;
                const subject = el?.value?.trim();
                if (!subject) {
                  setError("Enter a subject to delete.");
                  return;
                }
                run(
                  `Deleted all memories matching “${subject}”.`,
                  () => deleteMemorySubject(subject),
                  () => {
                    if (el) el.value = "";
                    reloadMemory(query);
                  },
                );
              }}
              disabled={busy}
              className="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{" "}
              Delete category
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 p-4">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Clear conversation memory
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Deletes your ARCHIE conversations and messages — real deletion.
            </div>
          </div>
          <button
            onClick={() => {
              if (
                !window.confirm(
                  "Delete ALL ARCHIE conversations and messages? This cannot be undone.",
                )
              )
                return;
              run(
                "Conversation memory cleared.",
                () => clearConversations(),
                () => load(),
              );
            }}
            disabled={busy}
            className="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            <Trash2 aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{" "}
            Clear
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 p-4">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Request account / data deletion
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Recorded and audited; the Owner executes and records completion.
            </div>
          </div>
          <button
            onClick={() =>
              run(
                "Deletion request recorded. It will be reviewed and its completion written to the audit trail.",
                () => requestDeletion("delete_account"),
                () => load(),
              )
            }
            disabled={busy}
            className="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            <Ban aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{" "}
            Request deletion
          </button>
        </div>
      </div>

      {/* -------------------- Request status -------------------- */}
      {requests.length > 0 && (
        <>
          <ArchieSectionTitle>Your rights requests</ArchieSectionTitle>
          <div className="mb-8 space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 p-3 text-sm"
              >
                <span className="font-medium text-foreground">
                  {r.kind.replace(/_/g, " ")}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {new Date(r.requested_at).toLocaleDateString()}
                  <ArchieBadge
                    tone={
                      r.status === "completed"
                        ? "positive"
                        : r.status === "rejected"
                          ? "critical"
                          : "warning"
                    }
                  >
                    {r.status}
                  </ArchieBadge>
                  {r.result_note && <span>{r.result_note}</span>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">
        © 2026 FRENZY. All rights reserved. Your memory never leaks to another
        account; owner memory is separately protected. See the Memory &amp; Data
        Rights Policy on the Legal page.
      </p>
    </ArchiePage>
  );
}
