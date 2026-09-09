// =========================================================
// FRELUX ARCHIE STAGE 2 — PEOPLE (FAMILY / TRUSTED NETWORK)
//
// Owner-facing surface of the trusted-people subsystem:
// ADD FAMILY invitation flow (code shown once), pending
// request review, explicit permission configuration, access
// expiry, suspend/revoke/remove. Nothing is auto-granted;
// every mutation goes through the archie-family edge
// function's server-side Owner check (spec §§25-27).
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  ACCESS_OPTIONS,
  PEOPLE_PERMISSIONS,
  PEOPLE_RELATIONS,
  type ArchiePerson,
  approvePerson,
  invitePerson,
  listPeople,
  removePerson,
  updatePerson,
} from "@/lib/archie/stage2-people-client";
import { recordAuditEvent } from "@/lib/archie/stage1-client";

type Phase =
  | { kind: "idle" }
  | { kind: "invited"; code: string; expiresAt: string; note: string };

const STATUS_STYLE: Record<ArchiePerson["status"], string> = {
  PENDING_INVITE:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  PENDING_REQUEST:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  ACTIVE: "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  SUSPENDED:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  REVOKED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

export default function ArchiePeople() {
  const [people, setPeople] = useState<ArchiePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<string>("FAMILY");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  // approval panel per person
  const [approvalFor, setApprovalFor] = useState<string | null>(null);
  const [draftPerms, setDraftPerms] = useState<string[]>([]);
  const [draftAccess, setDraftAccess] = useState<number>(24 * 7);

  const refresh = useCallback(async () => {
    const res = await listPeople();
    if (!res.ok) setError(res.error ?? "Could not load the people network.");
    else setPeople(res.people ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })().catch(() => setError("Could not load the people network."));
  }, [refresh]);

  async function handleInvite() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const res = await invitePerson(trimmed, relation);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPhase({
      kind: "invited",
      code: res.code,
      expiresAt: res.expiresAt,
      note: res.note,
    });
    setName("");
    await refresh();
  }

  function openApproval(person: ArchiePerson) {
    setApprovalFor(person.id);
    setDraftPerms([]); // Owner starts from ZERO — nothing auto-granted (§26)
    setDraftAccess(24 * 7);
  }

  async function handleApprove() {
    if (!approvalFor || busy) return;
    setBusy(true);
    const hours = draftAccess === 0 ? null : draftAccess;
    const res = await approvePerson(approvalFor, draftPerms, hours);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Approval failed.");
    else {
      setNotice(
        "Person activated with exactly the permissions you configured.",
      );
      setApprovalFor(null);
      await recordAuditEvent("archie.people.approved_via_ui", "INFO", {
        people_id: approvalFor,
      });
    }
    await refresh();
  }

  async function handleStatus(person: ArchiePerson, status: string) {
    if (busy) return;
    setBusy(true);
    const res = await updatePerson(person.id, { status });
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Update failed.");
    await refresh();
  }

  async function handleRemove(person: ArchiePerson) {
    if (busy) return;
    setBusy(true);
    const res = await removePerson(person.id);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Removal failed.");
    else
      setNotice(
        res.note ?? "Person permanently removed with all their shares.",
      );
    await refresh();
  }

  return (
    <div className="archie-fade-up mx-auto max-w-4xl space-y-4 px-4 py-4 md:py-6">
      <header>
        <h1 className="archie-title-gradient text-xl font-bold">People</h1>
        <p className="text-sm text-slate-400">
          Family and trusted professionals. Invitation codes are single-use,
          expire in 24 hours, and grant nothing until you review and approve.
        </p>
      </header>

      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2 text-sm text-emerald-300">
          {notice}
        </p>
      )}

      {phase.kind === "invited" && (
        <div
          className="rounded-xl border-2 border-dashed border-white/15 p-4"
          data-testid="invite-code"
        >
          <p className="text-sm text-slate-400">
            Invitation code (shown once — share it now):
          </p>
          <p className="my-2 select-all font-mono text-2xl font-bold tracking-widest">
            {phase.code}
          </p>
          <p className="text-xs text-slate-500">
            Expires {new Date(phase.expiresAt).toLocaleString()}. {phase.note}
          </p>
          <button
            className="mt-2 text-xs underline"
            onClick={() => setPhase({ kind: "idle" })}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="rounded-xl border p-4">
        <h2 className="mb-2 font-semibold">Add family / trusted person</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Their name"
            className="flex-1 archie-input w-full rounded-lg px-3 py-2 text-sm text-slate-200"
          />
          <select
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            className="archie-input w-full rounded-lg px-3 py-2 text-sm text-slate-200"
          >
            {PEOPLE_RELATIONS.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button
            onClick={handleInvite}
            disabled={busy || !name.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Generate invitation
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Your network ({people.length})</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : people.length === 0 ? (
          <p className="text-sm text-slate-400">
            No one yet — invite a family member or trusted professional above.
          </p>
        ) : (
          people.map((p) => (
            <article key={p.id} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {p.display_name}{" "}
                    <span className="text-xs text-slate-500">
                      · {p.relation.replace(/_/g, " ")}
                    </span>
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[p.status]}`}
                  >
                    {p.status.replace(/_/g, " ")}
                  </span>
                  {p.status === "ACTIVE" && p.access_expires_at && (
                    <p className="mt-1 text-xs text-slate-500">
                      Access expires{" "}
                      {new Date(p.access_expires_at).toLocaleString()}
                    </p>
                  )}
                  {p.permissions.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Permissions: {p.permissions.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {p.status === "PENDING_REQUEST" && (
                    <button
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                      onClick={() => openApproval(p)}
                    >
                      Review request
                    </button>
                  )}
                  {p.status === "ACTIVE" && (
                    <button
                      className="archie-input rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      onClick={() => handleStatus(p, "SUSPENDED")}
                      disabled={busy}
                    >
                      Suspend
                    </button>
                  )}
                  {p.status === "SUSPENDED" && (
                    <button
                      className="archie-input rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      onClick={() => handleStatus(p, "ACTIVE")}
                      disabled={busy}
                    >
                      Reinstate
                    </button>
                  )}
                  {p.status !== "REVOKED" && (
                    <button
                      className="archie-input rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      onClick={() => handleStatus(p, "REVOKED")}
                      disabled={busy}
                    >
                      Revoke
                    </button>
                  )}
                  <button
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 dark:text-red-300"
                    onClick={() => handleRemove(p)}
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {approvalFor === p.id && (
                <div
                  className="mt-3 rounded-lg bg-muted p-3"
                  data-testid="approval-panel"
                >
                  <p className="mb-2 text-sm font-medium">
                    Configure permissions before activation (nothing is granted
                    automatically):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PEOPLE_PERMISSIONS.map((perm) => (
                      <button
                        key={perm}
                        onClick={() =>
                          setDraftPerms((d) =>
                            d.includes(perm)
                              ? d.filter((x) => x !== perm)
                              : [...d, perm],
                          )
                        }
                        className={`rounded-full border px-2 py-1 text-xs ${
                          draftPerms.includes(perm)
                            ? "border-primary bg-primary text-primary-foreground"
                            : ""
                        }`}
                      >
                        {perm.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Access:</span>
                    {ACCESS_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setDraftAccess(opt.hours)}
                        className={`rounded-lg border px-2 py-1 text-xs ${
                          draftAccess === opt.hours
                            ? "border-primary bg-primary text-primary-foreground"
                            : ""
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    onClick={handleApprove}
                    disabled={busy}
                  >
                    Approve & activate
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
