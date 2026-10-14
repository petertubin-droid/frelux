/**
 * WorkflowTab — the premium global surface for the RFI / submittal /
 * change-order control plane (Global Operations Engine #7).
 *
 * Design contract (globalization-standard, matches the dashboard's
 * premium language):
 *  - Semantic theme tokens only (no hardcoded colors, dark-mode safe).
 *  - Currency via formatByCode with the project's OWN currency —
 *    no NGN assumption; dates via locale-safe toLocaleDateString.
 *  - Deterministic engine drives every button: only the transitions
 *    the state machine allows are rendered.
 *  - Immutable audit trail + revision history visible per document.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatByCode } from "@/lib/international/currency-format";
import {
  type WorkflowDocument,
  type WorkflowEvent,
  type WorkflowPriority,
  type WorkflowStatus,
  type WorkflowDocType,
  isOverdue,
  labelFor,
  nextStatuses,
  summarize,
} from "@/lib/workflow/workflow-engine";
import { Button } from "@/components/ui/shadcn/button";
import {
  isEmailNotifyActive,
  isPushNotifyActive,
} from "@/lib/workflow/notifications";
import {
  isWorkflowPushEnabled,
  isWorkflowPushSupported,
  subscribeWorkflowPush,
  unsubscribeWorkflowPush,
} from "@/lib/workflow/push";
import {
  addWorkflowComment,
  createWorkflowDocument,
  fetchProjectWorkflowDocuments,
  fetchWorkflowEvents,
  transitionWorkflowDocument,
} from "@/lib/workflow/queries";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  MessageSquarePlus,
  Plus,
  RefreshCw,
  Mail,
  Bell,
} from "lucide-react";

const STATUS_STYLES: Record<WorkflowStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  open: "bg-primary/10 text-primary",
  in_review: "bg-primary/10 text-primary",
  answered: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400",
  approved: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
  closed: "bg-muted text-muted-foreground",
};

const PRIORITY_STYLES: Record<WorkflowPriority, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-muted text-muted-foreground",
  high: "bg-amber-600/10 text-amber-600 dark:text-amber-400",
  urgent: "bg-destructive/10 text-destructive",
};

function StatusBadge({ status }: { status: WorkflowStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function PriorityDot({ priority }: { priority: WorkflowPriority }) {
  return (
    <span
      aria-label={`Priority: ${priority}`}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_STYLES[priority]}`}
    >
      {priority}
    </span>
  );
}

interface WorkflowTabProps {
  projectId: string;
  currency: string;
}

interface NewDocForm {
  doc_type: WorkflowDocType;
  title: string;
  description: string;
  priority: WorkflowPriority;
  assignee: string;
  due_date: string;
  amount: string;
}

const emptyForm: NewDocForm = {
  doc_type: "rfi",
  title: "",
  description: "",
  priority: "normal",
  assignee: "",
  due_date: "",
  amount: "",
};

export function WorkflowTab({ projectId, currency }: WorkflowTabProps) {
  const [docs, setDocs] = useState<WorkflowDocument[] | null>(null);
  const [filter, setFilter] = useState<WorkflowDocType | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, WorkflowEvent[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewDocForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [emailNotify, setEmailNotify] = useState<boolean | null>(null);
  const [pushConfigured, setPushConfigured] = useState<boolean | null>(null);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushNote, setPushNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date().toISOString(), []);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setDocs(await fetchProjectWorkflowDocuments(projectId));
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load workflow items",
      );
    } finally {
      setBusy(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Honest disclosure: are email notifications configured at
  // all? (Resend key active — build-time env or Integration
  // Center paste. Raw keys are never visible here.)
  useEffect(() => {
    let cancelled = false;
    isEmailNotifyActive()
      .then((active) => {
        if (!cancelled) setEmailNotify(active);
      })
      .catch(() => {
        if (!cancelled) setEmailNotify(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Honest disclosure for push: are VAPID keys configured at
  // all, and is THIS browser subscribed? Both can be false.
  useEffect(() => {
    let cancelled = false;
    isPushNotifyActive()
      .then((active) => {
        if (!cancelled) setPushConfigured(active);
      })
      .catch(() => {
        if (!cancelled) setPushConfigured(false);
      });
    if (isWorkflowPushSupported()) {
      isWorkflowPushEnabled()
        .then((enabled) => {
          if (!cancelled) setPushEnabled(enabled);
        })
        .catch(() => {
          if (!cancelled) setPushEnabled(false);
        });
    } else {
      setPushEnabled(false);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePush = useCallback(async () => {
    setPushBusy(true);
    setPushNote(null);
    try {
      if (pushEnabled) {
        await unsubscribeWorkflowPush();
        setPushEnabled(false);
        setPushNote("Push disabled on this browser");
      } else {
        const outcome = await subscribeWorkflowPush();
        if (outcome.ok) {
          setPushEnabled(true);
          setPushNote("This browser will receive workflow push alerts");
        } else if (outcome.reason === "not configured") {
          setPushConfigured(false);
          setPushNote(
            "Push is not configured yet — see Admin Integration Center",
          );
        } else if (outcome.reason === "denied") {
          setPushNote(
            "Browser blocked notifications — allow them in site settings",
          );
        } else if (outcome.reason === "unsupported") {
          setPushEnabled(false);
          setPushNote("This browser does not support Web Push");
        } else {
          setPushNote(outcome.detail ?? "Push subscription failed");
        }
      }
    } finally {
      setPushBusy(false);
    }
  }, [pushEnabled]);

  const visible = useMemo(
    () => (docs ?? []).filter((d) => filter === "all" || d.doc_type === filter),
    [docs, filter],
  );
  const summary = useMemo(() => summarize(docs ?? [], now), [docs, now]);

  async function openDocument(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!events[id]) {
      try {
        const list = await fetchWorkflowEvents(id);
        setEvents((prev) => ({ ...prev, [id]: list }));
      } catch {
        setEvents((prev) => ({ ...prev, [id]: [] }));
      }
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createWorkflowDocument({
        project_id: projectId,
        doc_type: form.doc_type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        assignee: form.assignee.trim() || null,
        due_date: form.due_date || null,
        amount:
          form.doc_type === "change_order" && form.amount
            ? Number(form.amount)
            : null,
        currency,
      });
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setSaving(false);
    }
  }

  async function onTransition(doc: WorkflowDocument, to: WorkflowStatus) {
    setSaving(true);
    try {
      await transitionWorkflowDocument(doc, to);
      // audit events refresh for that doc
      setEvents((prev) => {
        const next = { ...prev };
        delete next[doc.id];
        return next;
      });
      await load();
      if (expanded === doc.id) {
        setEvents((prev) => ({
          ...prev,
          [doc.id]: prev[doc.id] ?? [],
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transition failed");
    } finally {
      setSaving(false);
    }
  }

  async function onComment(doc: WorkflowDocument) {
    if (!commentDraft.trim()) return;
    setSaving(true);
    try {
      const note = commentDraft.trim();
      await addWorkflowComment(doc, note);
      setCommentDraft("");
      const optimistic: WorkflowEvent = {
        id: `local-${Date.now()}`,
        document_id: doc.id,
        event_type: "comment",
        from_status: null,
        to_status: null,
        actor: "owner",
        note,
        created_at: new Date().toISOString(),
      };
      setEvents((prev) => ({
        ...prev,
        [doc.id]: [...(prev[doc.id] ?? []), optimistic],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="RFIs needing action"
          value={summary.rfiOpen}
        />
        <SummaryTile
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Submittals in flight"
          value={summary.submittalOpen}
        />
        <SummaryTile
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Change orders open"
          value={summary.changeOrderOpen}
        />
        <SummaryTile
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Overdue"
          value={summary.overdue}
          accent={summary.overdue > 0 ? "destructive" : undefined}
        />
      </div>

      {emailNotify !== null && (
        <p
          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            emailNotify
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          }`}
          title={
            emailNotify
              ? "Status transitions send a confirmation email to the project owner"
              : "Paste a Resend key in Admin → Integration Center to enable email notifications"
          }
        >
          <Mail className="h-3.5 w-3.5" aria-hidden />
          {emailNotify
            ? "Email notifications active"
            : "Email notifications not configured"}
        </p>
      )}

      {pushConfigured !== null && pushEnabled !== null && (
        <span className="inline-flex w-fit flex-wrap items-center gap-2">
          <p
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              pushEnabled
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
            title={
              pushEnabled
                ? "Status transitions pop up on this browser"
                : !isWorkflowPushSupported()
                  ? "This browser cannot receive Web Push notifications"
                  : pushConfigured
                    ? "Enable push below to receive workflow alerts on this browser"
                    : "Paste VAPID keys in Admin Integration Center to enable push notifications"
            }
          >
            <Bell className="h-3.5 w-3.5" aria-hidden />
            {pushEnabled
              ? "Push notifications on"
              : !isWorkflowPushSupported()
                ? "Push not supported on this browser"
                : pushConfigured
                  ? "Push available, not enabled"
                  : "Push notifications not configured"}
          </p>
          {isWorkflowPushSupported() && pushConfigured && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={togglePush}
              disabled={pushBusy}
            >
              {pushBusy
                ? "..."
                : pushEnabled
                  ? "Disable push here"
                  : "Enable push on this browser"}
            </Button>
          )}
        </span>
      )}

      {pushNote && <p className="text-xs text-muted-foreground">{pushNote}</p>}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New workflow item
        </button>
        <div
          className="flex flex-wrap gap-1"
          role="tablist"
          aria-label="Filter by type"
        >
          {(["all", "rfi", "submittal", "change_order"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {f === "change_order" ? "change orders" : f}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={onCreate}
          className="grid gap-3 rounded-xl border bg-card p-5 shadow-sm sm:grid-cols-2"
        >
          <label className="text-sm sm:col-span-2">
            <span className="font-medium">Type</span>
            <select
              value={form.doc_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  doc_type: e.target.value as WorkflowDocType,
                }))
              }
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="rfi">RFI — request for information</option>
              <option value="submittal">Submittal — for review/approval</option>
              <option value="change_order">
                Change order — cost/scope change
              </option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium">Title</span>
            <input
              required
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder={
                form.doc_type === "rfi"
                  ? "Clarify slab thickness in zone B"
                  : form.doc_type === "submittal"
                    ? "Tile samples for master bath"
                    : "Add waterproofing to terrace slab"
              }
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium">Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Priority</span>
            <select
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  priority: e.target.value as WorkflowPriority,
                }))
              }
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Assign to</span>
            <input
              value={form.assignee}
              onChange={(e) =>
                setForm((f) => ({ ...f, assignee: e.target.value }))
              }
              placeholder="Site engineer, QS, client…"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Due date</span>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, due_date: e.target.value }))
              }
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
          {form.doc_type === "change_order" && (
            <label className="text-sm">
              <span className="font-medium">Amount ({currency})</span>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Document list */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center">
          <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">
            No{" "}
            {filter === "all"
              ? "workflow items"
              : labelFor(filter as WorkflowDocType).toLowerCase() + "s"}{" "}
            yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            RFIs, submittals and change orders keep the project auditable —
            every state change is recorded permanently.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((doc) => {
            const overdue = isOverdue(doc.due_date, doc.status, now);
            const next = nextStatuses(doc.doc_type, doc.status);
            const isOpen = expanded === doc.id;
            return (
              <li
                key={doc.id}
                className={`rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${
                  overdue ? "border-destructive/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold tracking-wide">
                        {doc.reference_code}
                      </span>
                      <StatusBadge status={doc.status} />
                      <PriorityDot priority={doc.priority} />
                      {overdue && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Overdue
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-semibold">{doc.title}</p>
                    {doc.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {doc.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {doc.assignee && <span>To: {doc.assignee}</span>}
                      {doc.due_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(
                            doc.due_date + "T00:00:00",
                          ).toLocaleDateString()}
                        </span>
                      )}
                      {doc.amount != null &&
                        doc.doc_type === "change_order" && (
                          <span className="font-medium text-foreground">
                            {formatByCode(doc.amount, doc.currency ?? currency)}
                          </span>
                        )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Rev {doc.revision_no}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDocument(doc.id)}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "Collapse details" : "Expand details"}
                    className="rounded-lg border p-2 text-muted-foreground hover:bg-accent"
                  >
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {/* Deterministic transition buttons */}
                    {next.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {next.map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={saving}
                            onClick={() => onTransition(doc, s)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors disabled:opacity-50 ${
                              s === "approved" || s === "answered"
                                ? "bg-emerald-600 text-white hover:bg-emerald-600/90 dark:text-white"
                                : s === "rejected"
                                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                          >
                            {s.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Audit timeline */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Audit trail
                      </h4>
                      <ol className="mt-2 space-y-2">
                        {(events[doc.id] ?? []).map((ev) => (
                          <li
                            key={ev.id}
                            className="flex items-start gap-2 text-xs"
                          >
                            <span
                              className="mt-1 h-2 w-2 shrink-0 rounded-full"
                              style={{ background: "var(--primary)" }}
                              aria-hidden="true"
                            />
                            <span className="text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {ev.event_type === "transition"
                                  ? `${ev.from_status} → ${ev.to_status}`
                                  : ev.event_type}
                              </span>{" "}
                              {ev.note ? `· ${ev.note} · ` : "· "}
                              {new Date(ev.created_at).toLocaleString()} · by{" "}
                              {ev.actor}
                            </span>
                          </li>
                        ))}
                        {(events[doc.id] ?? []).length === 0 && (
                          <li className="text-xs text-muted-foreground">
                            Loading history…
                          </li>
                        )}
                      </ol>
                    </div>

                    {/* Comment */}
                    <div className="flex gap-2">
                      <input
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder="Add a note to the record…"
                        className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => onComment(doc)}
                        disabled={saving || !commentDraft.trim()}
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                      >
                        <MessageSquarePlus className="h-4 w-4" /> Note
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "destructive";
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p
        className={`mt-2 text-2xl font-semibold ${
          accent === "destructive" && value > 0 ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default WorkflowTab;
