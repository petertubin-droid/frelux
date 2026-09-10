// =========================================================
// ADMIN — ARCHIE LEGAL DOCUMENT MANAGEMENT
//
// © 2026 FRENZY. All rights reserved.
//
// Owner-only console for the versioned legal corpus:
// draft → approve → publish with effective dates, revision
// history and audit trail. Published documents are never
// silently replaced — publishing archives the previous
// version and every step is audited.
// =========================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, History } from "lucide-react";
import {
  adminAllDocuments,
  adminSaveDraft,
  adminApprove,
  adminPublish,
  adminHistory,
  type AdminLegalDoc,
} from "@/lib/archie/legal-client";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  StateMessage,
  AdminInput,
  AdminTextarea,
} from "@/components/admin/AdminUi";
import { AdminModal } from "@/components/admin/AdminModal";

const DOC_LABELS: Record<string, string> = {
  terms_of_service: "Terms of Service",
  privacy_policy: "Privacy Policy",
  cookie_policy: "Cookie & Local Storage Policy",
  acceptable_use_policy: "Acceptable Use Policy",
  ai_disclosure: "AI Disclosure",
  ip_notice: "Intellectual Property Notice",
  third_party_disclosure: "Third-Party Services Disclosure",
  memory_data_rights_policy: "Memory & Data Rights Policy",
  connected_device_account_policy: "Connected Device & Account Policy",
  security_responsible_use_policy: "Security & Responsible Use Policy",
};

const STATUS_TONES: Record<AdminLegalDoc["status"], string> = {
  published: "bg-emerald-500/15 text-emerald-400",
  draft: "bg-yellow-500/20 text-yellow-500",
  approved: "bg-blue-500/15 text-blue-400",
  archived: "bg-muted text-muted-foreground",
};

export default function AdminArchieLegal() {
  const [documents, setDocuments] = useState<AdminLegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Editor state
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [busy, setBusy] = useState(false);

  // History modal
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [history, setHistory] = useState<{
    versions: AdminLegalDoc[];
    events: {
      id: string;
      version: number;
      event: string;
      actor: string | null;
      created_at: string;
    }[];
  } | null>(null);

  const latest = useMemo(() => {
    const byKey = new Map<string, AdminLegalDoc>();
    for (const d of documents)
      if (!byKey.has(d.doc_key)) byKey.set(d.doc_key, d); // ordered by version desc
    return byKey;
  }, [documents]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminAllDocuments();
    if (res.ok) setDocuments(res.data.documents);
    else setError(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    setBusy(true);
    setError(null);
    setStatus(null);
    const res = await fn();
    if (!res.ok && res.error) setError(res.error);
    else {
      setStatus(label);
      await load();
    }
    setBusy(false);
  }

  function openEditor(key: string) {
    const latestDoc = latest.get(key);
    setEditKey(key);
    setEditTitle(latestDoc?.title ?? DOC_LABELS[key] ?? key);
    setEditBody("");
  }

  async function saveDraft() {
    if (!editKey) return;
    if (!editTitle.trim() || !editBody.trim()) {
      setError("Title and body are both required.");
      return;
    }
    await run(
      "Draft saved. It must be approved and published before it goes live — published documents are never silently replaced.",
      () => adminSaveDraft(editKey, editTitle, editBody),
    );
    setEditKey(null);
  }

  async function openHistory(key: string) {
    setHistoryKey(key);
    setHistory(null);
    const res = await adminHistory(key);
    if (res.ok) setHistory(res.data);
    else setError(res.error);
  }

  return (
    <>
      <AdminHeader
        title="ARCHIE Legal & Governance"
        subtitle="Versioned legal documents with Owner approval, publication and audit trail. © 2026 FRENZY. All rights reserved."
      />
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}
      {status && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400">
          {status}
        </div>
      )}
      {loading ? (
        <StateMessage
          type="loading"
          title="Loading…"
          message="Fetching legal corpus."
        />
      ) : error ? (
        <StateMessage
          type="error"
          title="Legal corpus unavailable"
          message={`${error} The corpus is not shown — an error must never look like "never seeded" documents.`}
        />
      ) : (
        <div className="space-y-3">
          {Object.entries(DOC_LABELS).map(([key, label]) => {
            const doc = latest.get(key);
            return (
              <AdminCard
                key={key}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <FileText
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">
                        {label}
                      </h3>
                      {doc && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONES[doc.status]}`}
                        >
                          {doc.status} · v{doc.version}
                        </span>
                      )}
                      {!doc && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          never seeded
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {doc
                        ? doc.effective_date
                          ? `Effective ${doc.effective_date}`
                          : "No published effective date yet"
                        : "The document will appear here after the archie-legal function seeds the corpus."}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <AdminButton
                    variant="secondary"
                    onClick={() => openEditor(key)}
                  >
                    New draft
                  </AdminButton>
                  {documents
                    .filter(
                      (d) =>
                        d.doc_key === key &&
                        (d.status === "draft" || d.status === "approved"),
                    )
                    .map((d) => (
                      <span key={d.id} className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{`v${d.version} ${d.status}`}</span>
                        {d.status === "draft" && (
                          <AdminButton
                            variant="secondary"
                            onClick={() =>
                              run("Approved — publish to go live.", () =>
                                adminApprove(d.id),
                              )
                            }
                          >
                            Approve v{d.version}
                          </AdminButton>
                        )}
                        {d.status === "approved" && (
                          <AdminButton
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Publish v${d.version} of “${label}”? The current published version (if any) is archived and its revision history is preserved.`,
                                )
                              )
                                return;
                              run(
                                "Published with a new effective date; the previous version is archived, not replaced.",
                                () => adminPublish(d.id),
                              );
                            }}
                          >
                            Publish v{d.version}
                          </AdminButton>
                        )}
                      </span>
                    ))}
                  <AdminButton
                    variant="secondary"
                    onClick={() => openHistory(key)}
                  >
                    <History className="h-3.5 w-3.5" /> History
                  </AdminButton>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      {/* Draft editor */}
      {editKey && (
        <AdminModal
          open
          title={`New draft — ${DOC_LABELS[editKey] ?? editKey}`}
          onClose={() => setEditKey(null)}
        >
          <div className="space-y-3">
            <div>
              <label
                htmlFor="legal-edit-title"
                className="mb-1 block text-sm font-medium"
              >
                Title
              </label>
              <AdminInput
                id="legal-edit-title"
                value={editTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditTitle(e.target.value)
                }
              />
            </div>
            <div>
              <label
                htmlFor="legal-edit-body"
                className="mb-1 block text-sm font-medium"
              >
                Body (Markdown)
              </label>
              <AdminTextarea
                id="legal-edit-body"
                rows={16}
                value={editBody}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditBody(e.target.value)
                }
                placeholder="Full document text…"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave empty-and-cancel to abort. Saving creates the next version
                as a DRAFT — the currently published version stays live until a
                new version is approved and published.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <AdminButton variant="secondary" onClick={() => setEditKey(null)}>
                Cancel
              </AdminButton>
              <AdminButton onClick={saveDraft} disabled={busy}>
                {busy ? "Saving…" : "Save draft"}
              </AdminButton>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Revision history */}
      {historyKey && (
        <AdminModal
          open
          title={`Revision history — ${DOC_LABELS[historyKey] ?? historyKey}`}
          onClose={() => setHistoryKey(null)}
        >
          {!history ? (
            <StateMessage
              type="loading"
              title="Loading…"
              message="Fetching history."
            />
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-semibold">Versions</h4>
                <div className="space-y-1">
                  {history.versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-md border border-border/60 px-3 py-1.5 text-sm"
                    >
                      <span>
                        v{v.version} — {v.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONES[v.status]}`}
                      >
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold">Audit trail</h4>
                <div className="space-y-1">
                  {history.events.map((e) => (
                    <div key={e.id} className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()} —{" "}
                      <span className="font-semibold text-foreground">
                        {e.event}
                      </span>{" "}
                      (v{e.version})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </AdminModal>
      )}
    </>
  );
}
