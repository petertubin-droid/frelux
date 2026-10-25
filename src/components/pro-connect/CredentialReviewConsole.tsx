import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { credentialStatusLabel } from "@/lib/credential-status";
import {
  adminListCredentialsForReview,
  adminRequestCredentialCorrection,
  adminRevokeCredential,
  adminSuspendCredential,
  adminUnableToVerifyCredential,
  adminVerifyCredentialByReviewer,
  adminVerifyCredentialBySource,
  getCredentialEvents,
} from "@/lib/pro-connect";
import type {
  CredentialVerificationStatus,
  DbProCredentialEvent,
} from "@/types/pro-connect";

// =========================================================
// FRELUX reviewer console (Phase 2)
//
// Reviewer and source verification for submitted professional
// credentials. Every decision is reviewer-attributed and lands in
// the append-only event trail. A failed registry lookup is
// recorded as an attempt, never as a verification.
// =========================================================

type QueueRow = Awaited<
  ReturnType<typeof adminListCredentialsForReview>
>[number];

const FILTERS: Array<{
  label: string;
  statuses?: CredentialVerificationStatus[];
}> = [
  { label: "Awaiting review", statuses: ["submitted", "pending_review"] },
  {
    label: "Verified",
    statuses: ["verified_by_source", "verified_by_reviewer"],
  },
  { label: "Suspended / revoked", statuses: ["suspended", "revoked"] },
  { label: "All", statuses: undefined },
];

export function CredentialReviewConsole() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterIndex, setFilterIndex] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [registryResult, setRegistryResult] = useState<Record<string, string>>(
    {},
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [eventsFor, setEventsFor] = useState<string | null>(null);
  const [events, setEvents] = useState<DbProCredentialEvent[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminListCredentialsForReview(
      FILTERS[filterIndex]?.statuses,
    );
    setRows(data);
    setLoading(false);
  }, [filterIndex]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!eventsFor) return;
    let cancelled = false;
    void getCredentialEvents(eventsFor).then((r) => {
      if (!cancelled) setEvents(r);
    });
    return () => {
      cancelled = true;
    };
  }, [eventsFor]);

  const act = async (id: string, fn: (id: string) => Promise<boolean>) => {
    setBusy(id);
    setError("");
    const ok = await fn(id);
    setBusy(null);
    if (!ok) {
      setError(
        "That decision is not allowed for this credential's current state.",
      );
      return;
    }
    await load();
  };

  return (
    <section aria-labelledby="credential-review-heading" className="mb-8">
      <h2
        id="credential-review-heading"
        className="text-lg font-semibold text-foreground"
      >
        Credential review queue
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Decisions are attributed to you and recorded in the append-only audit
        trail. A failed registry lookup is recorded as an attempt, never as a
        verification.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map((f, i) => (
          <Button
            key={f.label}
            variant={i === filterIndex ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterIndex(i)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading queue…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No credentials in this queue.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {row.credential_type}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {row.profile_display_name ?? "Unknown profile"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.professional_body} · {row.registration_number}
                    {row.country_code ? ` · ${row.country_code}` : ""}
                    {row.subnational_scope ? ` · ${row.subnational_scope}` : ""}
                    {row.expires_at ? ` · expires ${row.expires_at}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {credentialStatusLabel(row.verification_status)}
                </span>
              </div>

              <label className="mt-2 block text-sm">
                <span className="text-muted-foreground">
                  Decision note (recorded)
                </span>
                <Input
                  className="mt-1"
                  value={notes[row.id] ?? ""}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, [row.id]: e.target.value }))
                  }
                />
              </label>

              {(row.verification_status === "submitted" ||
                row.verification_status === "pending_review") && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">
                      Registry lookup result
                    </span>
                    <select
                      className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                      value={registryResult[row.id] ?? "match"}
                      onChange={(e) =>
                        setRegistryResult((r) => ({
                          ...r,
                          [row.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="match">Registry match</option>
                      <option value="mismatch">
                        Registry mismatch or error
                      </option>
                      <option value="not_found">Not found in registry</option>
                    </select>
                  </label>
                  <div className="flex flex-wrap items-end gap-2">
                    <Button
                      size="sm"
                      disabled={busy === row.id}
                      onClick={() =>
                        act(row.id, (id) =>
                          adminVerifyCredentialBySource(id, {
                            result:
                              registryResult[id] === "not_found"
                                ? "not_found"
                                : registryResult[id] === "mismatch"
                                  ? "error"
                                  : "match",
                            reason: notes[id] || undefined,
                          }),
                        )
                      }
                    >
                      Record source verification
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === row.id}
                      onClick={() =>
                        act(row.id, (id) =>
                          adminVerifyCredentialByReviewer(id, {
                            reason: notes[id] || undefined,
                          }),
                        )
                      }
                    >
                      Verify after document review
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === row.id}
                      onClick={() =>
                        act(row.id, (id) =>
                          adminRequestCredentialCorrection(
                            id,
                            notes[id] || "correction requested",
                          ),
                        )
                      }
                    >
                      Request correction
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === row.id}
                      onClick={() =>
                        act(row.id, (id) =>
                          adminUnableToVerifyCredential(
                            id,
                            notes[id] || "could not verify",
                          ),
                        )
                      }
                    >
                      Unable to verify
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {(row.verification_status === "verified_by_source" ||
                  row.verification_status === "verified_by_reviewer" ||
                  row.verification_status === "verified") && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === row.id}
                    onClick={() =>
                      act(row.id, (id) =>
                        adminSuspendCredential(
                          id,
                          notes[id] || "suspended by reviewer",
                        ),
                      )
                    }
                  >
                    Suspend
                  </Button>
                )}
                {(row.verification_status === "suspended" ||
                  row.verification_status === "verified_by_source" ||
                  row.verification_status === "verified_by_reviewer" ||
                  row.verification_status === "verified") && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === row.id}
                    onClick={() =>
                      act(row.id, (id) =>
                        adminRevokeCredential(
                          id,
                          notes[id] || "revoked by reviewer",
                        ),
                      )
                    }
                  >
                    Revoke
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setEventsFor(eventsFor === row.id ? null : row.id)
                  }
                >
                  <History aria-hidden="true" className="h-4 w-4" />
                  {eventsFor === row.id ? "Hide audit trail" : "Audit trail"}
                </Button>
              </div>

              {eventsFor === row.id && (
                <div className="mt-2 rounded-lg bg-muted/50 p-3 dark:bg-white/5">
                  {events.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No recorded events.
                    </p>
                  ) : (
                    <ol className="space-y-1">
                      {events.map((ev) => (
                        <li
                          key={ev.id}
                          className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"
                        >
                          <span>
                            {ev.event_type.replace(/_/g, " ")}
                            {ev.reason ? ` — ${ev.reason}` : ""}
                            {ev.actor_role ? ` (${ev.actor_role})` : ""}
                          </span>
                          <span>
                            {new Date(ev.occurred_at).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
