import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardList, Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import {
  PROCUREMENT_STATUSES,
  PROCUREMENT_STATUS_LABELS,
  canTransition,
  isTerminal,
  type ProcurementStatus,
} from "@/lib/procurement/state-machine";
import {
  appendProcurementEvent,
  createProcurementRecord,
  getProcurementTrail,
  listProcurementRecords,
  type ProcurementEvent,
  type ProcurementLineItem,
  type ProcurementRecord,
} from "@/lib/procurement/records";
import { useSeo } from "@/lib/seo";
import { useLanguage } from "@/lib/i18n";

// =========================================================
// FRELUX Phase 3: logistics board.
//
// Every status change is an auditable transition recorded in
// the append-only trail; the board never edits history and
// never invents progress. Missing data renders as an honest
// empty state.
// =========================================================

const STATUS_FILTERS: Array<{
  label: string;
  statuses?: ProcurementStatus[];
}> = [
  {
    label: "Open",
    statuses: [
      "listed",
      "quote_requested",
      "quoted",
      "approved",
      "purchase_ordered",
    ],
  },
  {
    label: "In motion",
    statuses: ["dispatched", "in_transit", "customs_hold", "partial_delivery"],
  },
  { label: "Delivered", statuses: ["delivered"] },
  { label: "Needs attention", statuses: ["exception", "cancelled"] },
  { label: "All", statuses: undefined },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function LineItemRow({ item }: { item: ProcurementLineItem }) {
  return (
    <li className="text-xs text-muted-foreground">
      <span className="text-foreground">{item.description}</span>{" "}
      <span>
        {item.quantity} {item.unit}
      </span>
    </li>
  );
}

export function LogisticsBoard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  useSeo({
    title: "Logistics board | FRELUX",
    description:
      "Track material procurement with auditable, append-only status transitions.",
  });
  const [rows, setRows] = useState<ProcurementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterIndex, setFilterIndex] = useState(4);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [trailFor, setTrailFor] = useState<string | null>(null);
  const [trails, setTrails] = useState<Record<string, ProcurementEvent[]>>({});
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    supplier: "",
    destination: "",
    itemText: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listProcurementRecords();
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!trailFor) return;
    let cancelled = false;
    void getProcurementTrail(trailFor).then((events) => {
      if (!cancelled) {
        setTrails((t) => ({ ...t, [trailFor]: events }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [trailFor]);

  const visible = STATUS_FILTERS[filterIndex]?.statuses
    ? rows.filter((r) =>
        (STATUS_FILTERS[filterIndex].statuses as ProcurementStatus[]).includes(
          r.status,
        ),
      )
    : rows;

  const transition = async (
    record: ProcurementRecord,
    to: ProcurementStatus,
  ) => {
    setBusy(record.id);
    setError("");
    const result = await appendProcurementEvent(record, to, {
      notes: notes[record.id] ?? "",
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    await load();
  };

  const submit = async () => {
    setBusy("create");
    setError("");
    const lineItems: ProcurementLineItem[] = form.itemText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // "Cement, 100, bags" or "Cement | 100 | bags"
        const parts = line.split(/[,|]/).map((p) => p.trim());
        return {
          description: parts[0] ?? "",
          quantity: Number(parts[1] ?? 1),
          unit: parts[2] ?? "units",
        };
      });
    const created = await createProcurementRecord({
      title: form.title,
      supplier: form.supplier,
      destination: form.destination,
      lineItems,
    });
    setBusy(null);
    if (!created) {
      setError(
        "The record could not be created. Check the fields and try again.",
      );
      return;
    }
    setForm({ title: "", supplier: "", destination: "", itemText: "" });
    setCreating(false);
    await load();
  };

  return (
    <section
      aria-labelledby="logistics-heading"
      className="mx-auto max-w-5xl px-4 py-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            id="logistics-heading"
            className="text-xl font-semibold text-foreground"
          >
            {t("Logistics board")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Procurement tracking with auditable transitions. Every status change
            is recorded in an append-only trail with its provenance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/contractor")}
          >
            <ChevronRight
              className="mr-1 h-4 w-4 rotate-180"
              aria-hidden="true"
            />
            {t("Projects")}
          </Button>
          <Button size="sm" onClick={() => setCreating((c) => !c)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("New record")}
          </Button>
        </div>
      </div>

      <div
        className="mt-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label={t("Status filters")}
      >
        {STATUS_FILTERS.map((f, i) => (
          <Button
            key={f.label}
            role="tab"
            aria-selected={i === filterIndex}
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

      {creating && (
        <form
          className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4"
          aria-label={t("New procurement record")}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">{t("Title")}</span>
              <Input
                required
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">{t("Supplier")}</span>
              <Input
                required
                value={form.supplier}
                onChange={(e) =>
                  setForm((f) => ({ ...f, supplier: e.target.value }))
                }
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">{t("Destination")}</span>
              <Input
                required
                value={form.destination}
                onChange={(e) =>
                  setForm((f) => ({ ...f, destination: e.target.value }))
                }
              />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">
              Line items, one per line: description, quantity, unit
            </span>
            <textarea
              className="min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
              value={form.itemText}
              onChange={(e) =>
                setForm((f) => ({ ...f, itemText: e.target.value }))
              }
              placeholder={"Cement, 100, bags"}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreating(false)}
            >
              {t("Cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={busy === "create"}>
              {t("Create as listed")}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading records…</p>
      ) : visible.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border bg-card px-4 py-10 text-center">
          <ClipboardList
            className="mx-auto h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-2 text-sm font-medium text-foreground">
            {t("No procurement records here yet")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a record to start tracking quotes, orders and deliveries with
            an auditable trail.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((record) => {
            const allowed = PROCUREMENT_STATUSES.filter((to) =>
              canTransition(record.status, to),
            );
            const trail = trails[record.id];
            return (
              <li
                key={record.id}
                className="rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {record.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.supplier} to {record.destination} · updated{" "}
                      {formatDate(record.updated_at)}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {isTerminal(record.status) &&
                    record.status === "delivered" ? (
                      <ClipboardList
                        className="mr-1 h-3 w-3"
                        aria-hidden="true"
                      />
                    ) : (
                      <Truck className="mr-1 h-3 w-3" aria-hidden="true" />
                    )}
                    {PROCUREMENT_STATUS_LABELS[record.status]}
                  </span>
                </div>

                {record.line_items.length > 0 && (
                  <ul className="mt-2 space-y-1" aria-label={t("Line items")}>
                    {record.line_items.map((item, i) => (
                      <LineItemRow key={i} item={item} />
                    ))}
                  </ul>
                )}

                {!isTerminal(record.status) && (
                  <>
                    <label className="mt-2 block text-sm">
                      <span className="text-muted-foreground">
                        {t("Decision note (recorded)")}
                      </span>
                      <Input
                        className="mt-1"
                        value={notes[record.id] ?? ""}
                        onChange={(e) =>
                          setNotes((n) => ({
                            ...n,
                            [record.id]: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {allowed.map((to) => (
                        <Button
                          key={to}
                          size="sm"
                          variant={to === "cancelled" ? "outline" : "default"}
                          disabled={busy === record.id}
                          onClick={() => void transition(record, to)}
                        >
                          Mark {PROCUREMENT_STATUS_LABELS[to].toLowerCase()}
                        </Button>
                      ))}
                    </div>
                  </>
                )}

                <button
                  type="button"
                  className="mt-3 text-xs font-medium text-primary underline-offset-4 hover:underline"
                  aria-expanded={trailFor === record.id}
                  onClick={() =>
                    setTrailFor((t) => (t === record.id ? null : record.id))
                  }
                >
                  {trailFor === record.id
                    ? "Hide audit trail"
                    : "View audit trail"}
                </button>

                {trailFor === record.id &&
                  (trail === undefined ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Loading trail…
                    </p>
                  ) : trail.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("No recorded events yet.")}
                    </p>
                  ) : (
                    <ol className="mt-2 space-y-2 border-l border-border pl-3">
                      {trail.map((event) => (
                        <li key={event.id} className="text-xs">
                          <p className="text-foreground">
                            {event.from_status
                              ? `${PROCUREMENT_STATUS_LABELS[event.from_status]} to ${PROCUREMENT_STATUS_LABELS[event.to_status]}`
                              : `Recorded as ${PROCUREMENT_STATUS_LABELS[event.to_status]}`}
                          </p>
                          <p className="text-muted-foreground">
                            {formatDate(event.occurred_at)} · actor:{" "}
                            {event.actor_role} · source: {event.source}
                            {event.notes ? ` · note: ${event.notes}` : ""}
                          </p>
                        </li>
                      ))}
                    </ol>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default LogisticsBoard;
