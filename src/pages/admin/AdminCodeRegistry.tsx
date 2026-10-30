/**
 * Admin pane: International Code Registry.
 *
 * The standards library itself is code (src/lib/codes/library.ts) and is
 * changed by pull request, not by clicking. This panel manages the
 * ADMINISTRATIVE OVERLAY on top of it: verification status, reviewer and
 * notes per reference, plus the append-only audit history. That split is
 * deliberate — the denominator stays diffable in git while the overlay
 * records who verified what, and when.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Save, ShieldCheck } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminHeader,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  StateMessage,
} from "@/components/admin/AdminUi";
import {
  CODE_FAMILIES,
  DOMAIN_ORDER,
  FAMILY_ORDER,
  REGISTRY_VERSION,
  getFamily,
} from "@/lib/codes/library";
import { entryKey, type StatusOverlay } from "@/lib/codes/resolver";
import {
  fetchStatusHistory,
  fetchStatusOverlay,
  saveStatusChange,
  type HistoryRow,
} from "@/lib/codes/status-store";
import { REQUIREMENT_DOMAINS, type RequirementDomain } from "@/lib/codes/types";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export default function AdminCodeRegistry() {
  const [overlay, setOverlay] = useState<StatusOverlay>({});
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState(FAMILY_ORDER[0]);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const [status, setStatus] = useState<
    "verified" | "under-review" | "unsupported"
  >("verified");
  const [note, setNote] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [save, setSave] = useState<SaveState>({ kind: "idle" });

  const load = useCallback(async () => {
    setLoading(true);
    const [statusResult, historyResult] = await Promise.all([
      fetchStatusOverlay(),
      fetchStatusHistory(40),
    ]);
    setOverlay(statusResult.overlay);
    setHistory(historyResult.rows);
    setLoadError(statusResult.error ?? historyResult.error ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const family = getFamily(familyId);

  /** Every reference in the chosen family, with its effective status. */
  const entries = useMemo(() => {
    const list: {
      key: string;
      domain: string;
      domainId: RequirementDomain;
      document: string;
      libraryStatus: "verified" | "verify-locally";
      effective: { status?: string; note?: string; reviewer?: string | null };
    }[] = [];
    for (const domain of DOMAIN_ORDER) {
      const entry = family.requirements[domain];
      if (entry.status !== "referenced") continue;
      for (const reference of entry.references) {
        const key = entryKey(family.id, domain, reference.document);
        list.push({
          key,
          domain: REQUIREMENT_DOMAINS.find((item) => item.id === domain)!.label,
          domainId: domain,
          document: reference.document,
          libraryStatus: reference.status,
          effective: overlay[key] ?? {},
        });
      }
    }
    return list;
  }, [family, overlay]);

  useEffect(() => {
    const first = entries[0];
    if (!first) return;
    if (!entries.some((entry) => entry.key === selectedKey)) {
      setSelectedKey(first.key);
    }
  }, [entries, selectedKey]);

  const selected = entries.find((entry) => entry.key === selectedKey);

  useEffect(() => {
    if (!selected) return;
    setStatus(
      (selected.effective.status as
        "verified" | "under-review" | "unsupported") ??
        (selected.libraryStatus === "verified" ? "verified" : "under-review"),
    );
    setNote(selected.effective.note ?? "");
    setReviewer(selected.effective.reviewer ?? "");
  }, [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!selected) return;
    setSave({ kind: "saving" });
    const result = await saveStatusChange({
      entryKey: selected.key,
      familyId: family.id,
      domain: selected.domainId,
      document: selected.document,
      status,
      note,
      reviewer,
    });
    if (result.ok) {
      setSave({ kind: "saved" });
      await load();
    } else {
      setSave({ kind: "error", message: result.error ?? "Could not save." });
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="International Code Registry"
        subtitle={`Administrative overlay on library v${REGISTRY_VERSION}. The library itself is versioned in git; this panel records verification status, reviewer and history.`}
      />

      {loadError ? (
        <StateMessage
          type="error"
          title="Registry status unavailable"
          message={`${loadError} — the public tool keeps using library defaults. No status is guessed.`}
        />
      ) : null}

      <AdminCard>
        <div className="flex flex-wrap items-end gap-3">
          <AdminField label="Code family">
            <AdminSelect
              value={familyId}
              onChange={(event) =>
                setFamilyId(event.target.value as typeof familyId)
              }
            >
              {FAMILY_ORDER.map((id) => (
                <option key={id} value={id}>
                  {CODE_FAMILIES[id].name}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <p className="pb-2 text-xs text-muted-foreground">
            {entries.length} reference{entries.length === 1 ? "" : "s"} ·{" "}
            {family.adoptingAuthorities}
          </p>
        </div>

        <div className="mt-4 max-h-72 overflow-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Domain</th>
                <th className="px-3 py-2">Document</th>
                <th className="px-3 py-2">Library</th>
                <th className="px-3 py-2">Admin status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.key}
                  onClick={() => setSelectedKey(entry.key)}
                  className={
                    entry.key === selectedKey
                      ? "cursor-pointer bg-primary/5"
                      : "cursor-pointer hover:bg-muted/40"
                  }
                >
                  <td className="px-3 py-2 text-muted-foreground">
                    {entry.domain}
                  </td>
                  <td className="px-3 py-2 font-medium text-foreground">
                    {entry.document}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {entry.libraryStatus}
                  </td>
                  <td className="px-3 py-2">{entry.effective.status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {selected ? (
        <AdminCard>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
            Update status · {selected.document}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Domain: {selected.domain} · Library status: {selected.libraryStatus}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminField label="Administrative status">
              <AdminSelect
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                      "verified" | "under-review" | "unsupported",
                  )
                }
              >
                <option value="verified">Verified for use</option>
                <option value="under-review">Under review</option>
                <option value="unsupported">Not usable — show caveat</option>
              </AdminSelect>
            </AdminField>
            <AdminField label="Reviewer (name / registration)">
              <AdminInput
                value={reviewer}
                placeholder="e.g. Eng. A. Okafor, COREN"
                onChange={(event) => setReviewer(event.target.value)}
              />
            </AdminField>
          </div>

          <AdminField label="Note shown with the reference">
            <AdminTextarea
              value={note}
              rows={3}
              placeholder="Why this status? e.g. 'Edition confirmed with the municipal building department on 2026-10-30.'"
              onChange={(event) => setNote(event.target.value)}
            />
          </AdminField>

          <div className="mt-3 flex items-center gap-3">
            <AdminButton
              onClick={handleSave}
              disabled={save.kind === "saving" || loading}
            >
              <Save aria-hidden="true" className="mr-2 h-4 w-4" />
              {save.kind === "saving" ? "Saving…" : "Save status"}
            </AdminButton>
            {save.kind === "saved" ? (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                Saved with a history entry.
              </span>
            ) : null}
            {save.kind === "error" ? (
              <span className="text-xs text-destructive">{save.message}</span>
            ) : null}
          </div>
        </AdminCard>
      ) : null}

      <AdminCard>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <History aria-hidden="true" className="h-4 w-4 text-primary" />
          Update history
        </h2>
        {history.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No administrative changes recorded yet. Every save above appends to
            this audit trail.
          </p>
        ) : (
          <div className="mt-3 overflow-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Entry</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Reviewer</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">
                      {row.entry_key}
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.reviewer ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
