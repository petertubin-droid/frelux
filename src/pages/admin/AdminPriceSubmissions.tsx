import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, XCircle, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminHeader,
  AdminButton,
  StateMessage,
} from "@/components/admin/AdminUi";
import { classNames } from "@/lib/utils";

interface SubmissionRow {
  id: string;
  market: string;
  region: string;
  item_name: string;
  unit: string;
  price: number;
  currency: string;
  vendor: string | null;
  status: string;
  created_at: string;
}

interface MaterialOption {
  id: string;
  name: string;
}

import { getCountryCurrency } from "@/lib/international/countries";

const STATUS_TABS = [
  "pending",
  "community_verified",
  "approved",
  "rejected",
  "all",
];

export default function AdminPriceSubmissions() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [materialPick, setMaterialPick] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (status: string) => {
    setLoading(true);
    setError(null);
    let q = supabase
      .from("price_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status !== "all") q = q.eq("status", status);
    const { data, error: err } = await q;
    if (err) setError(err.message);
    setRows((data as SubmissionRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load(tab);
  }, [tab]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("estimation_materials")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      setMaterials((data as MaterialOption[]) ?? []);
    })();
  }, []);

  const setStatus = async (id: string, status: string) => {
    setBusyId(id);
    const { error: err } = await supabase
      .from("price_submissions")
      .update({ status })
      .eq("id", id);
    setBusyId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id || tab === "all"));
  };

  /** Approve AND copy the community price into the price book. */
  const promote = async (row: SubmissionRow) => {
    const refId = materialPick[row.id];
    if (!refId) {
      setError(`Pick the price-book item for "${row.item_name}" first.`);
      return;
    }
    setBusyId(row.id);
    const { error: priceErr } = await supabase
      .from("estimation_prices")
      .insert({
        price_type: "material",
        ref_id: refId,
        price: row.price,
        currency: getCountryCurrency(row.market),
        market: row.market,
        notes: `From community price report (${row.region}${row.vendor ? `, ${row.vendor}` : ""}).`,
      });
    if (priceErr) {
      setBusyId(null);
      setError(priceErr.message);
      return;
    }
    await setStatus(row.id, "approved");
    setBusyId(null);
  };

  return (
    <div>
      <AdminHeader
        title="Community Price Submissions"
        subtitle="User-reported local prices. Approve into the price book, or reject. Consensus-verified rows (3+ agreeing reports) are highlighted."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={classNames(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              tab === s
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading && (
        <StateMessage
          type="loading"
          title="Loading"
          message="Loading submissions…"
        />
      )}
      {error && <StateMessage type="error" title="Error" message={error} />}
      {!loading && !error && rows.length === 0 && (
        <StateMessage
          type="empty"
          title="Nothing here"
          message="No submissions in this view."
        />
      )}

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className={classNames(
              "rounded-xl border bg-card p-4",
              r.status === "community_verified"
                ? "border-primary/40"
                : "border-border",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-card-foreground">
                {r.item_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {r.region} · {r.market} · {Number(r.price).toLocaleString()}{" "}
                {r.currency} / {r.unit}
              </span>
              {r.vendor && (
                <span className="text-xs text-muted-foreground/70">
                  vendor: {r.vendor}
                </span>
              )}
              {r.status === "community_verified" && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <Sparkles className="h-3 w-3" /> Consensus
                </span>
              )}
              <span className="ml-auto text-[11px] text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </span>
            </div>

            {r.status === "pending" || r.status === "community_verified" ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={materialPick[r.id] ?? ""}
                  onChange={(e) =>
                    setMaterialPick((prev) => ({
                      ...prev,
                      [r.id]: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs dark:border-white/10 dark:bg-background dark:text-primary-foreground"
                >
                  <option value="">Map to price-book item…</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <AdminButton
                  disabled={busyId === r.id}
                  onClick={() => void promote(r)}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Approve into price book
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  disabled={busyId === r.id}
                  onClick={() => void setStatus(r.id, "rejected")}
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                </AdminButton>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5" /> {r.status}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
