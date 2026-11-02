/**
 * Administration for site intelligence: the data sources behind regional
 * screening, the geotechnical reports awaiting review, and the soil
 * classifications the public page offers.
 *
 * Only administrators reach this page (enforced by the admin route guard), and
 * report decisions are written by the review function, which re-checks the
 * caller's role on the server rather than trusting this screen.
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, ShieldCheck, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/shadcn/button";
import { useSeo } from "@/lib/seo";
import { supabase } from "@/lib/supabase";
import { fetchReports, fetchSoilClassifications, reviewReport } from "@/lib/site-intelligence/queries";
import type { GeotechReport, RegionalSiteProfile, SoilClassification } from "@/lib/site-intelligence/types";

const EMPTY_PROFILE = {
  country_code: "NG",
  region_slug: "",
  region_name: "",
  city_slug: "",
  flood_exposure: "unknown",
  groundwater_note: "",
  drainage_note: "",
  terrain_note: "",
  erosion_note: "",
  source_reference: "",
  source_url: "",
  source_year: "",
};

export default function AdminSiteIntelligence() {
  useSeo({
    title: "Site intelligence administration | FRELUXTOOLS",
    description: "Manage regional screening sources, soil classifications and geotechnical report review.",
    canonicalPath: "/admin/site-intelligence",
    noIndex: true,
  });

  const [tab, setTab] = useState<"reports" | "profiles" | "soils">("reports");
  const [reports, setReports] = useState<GeotechReport[]>([]);
  const [profiles, setProfiles] = useState<RegionalSiteProfile[]>([]);
  const [soils, setSoils] = useState<SoilClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_PROFILE });

  const load = useCallback(async () => {
    setLoading(true);
    const [r, p, s] = await Promise.all([
      fetchReports(),
      supabase
        .from("regional_site_profiles")
        .select("*")
        .order("country_code")
        .then((res) => (res.data ?? []) as RegionalSiteProfile[]),
      fetchSoilClassifications(),
    ]);
    setReports(r);
    setProfiles(p);
    setSoils(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(report: GeotechReport, decision: "verify" | "reject") {
    setBusyId(report.id);
    setError(null);
    const result = await reviewReport({ reportId: report.id, decision });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error ?? "The decision could not be saved.");
      return;
    }
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id
          ? {
              ...r,
              verification_status: decision === "verify" ? "verified" : "rejected",
            }
          : r,
      ),
    );
  }

  async function addProfile() {
    if (!form.region_slug.trim() || !form.region_name.trim() || !form.source_reference.trim()) {
      setError("A region and a source reference are required: screening data must say where it came from.");
      return;
    }
    const { error: insertError } = await supabase.from("regional_site_profiles").insert({
      country_code: form.country_code.trim().toUpperCase(),
      region_slug: form.region_slug.trim().toLowerCase(),
      region_name: form.region_name.trim(),
      city_slug: form.city_slug.trim().toLowerCase() || null,
      flood_exposure: form.flood_exposure,
      groundwater_note: form.groundwater_note || null,
      drainage_note: form.drainage_note || null,
      terrain_note: form.terrain_note || null,
      erosion_note: form.erosion_note || null,
      source_reference: form.source_reference.trim(),
      source_url: form.source_url.trim() || null,
      source_year: form.source_year ? Number(form.source_year) : null,
      verification_status: "sourced",
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm({ ...EMPTY_PROFILE });
    load();
  }

  async function withdrawProfile(id: string) {
    const { error: updateError } = await supabase
      .from("regional_site_profiles")
      .update({ verification_status: "withdrawn" })
      .eq("id", id);
    if (updateError) setError(updateError.message);
    else load();
  }

  const pending = reports.filter((r) => r.verification_status === "unverified");

  return (
    <>
      <PageHeader
        title="Site intelligence"
        subtitle="Screening sources, geotechnical review and soil classifications."
        breadcrumbs={[
          { label: "Admin", path: "/admin" },
          { label: "Site intelligence" },
        ]}
      />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["reports", `Reports (${pending.length} awaiting)`],
              ["profiles", `Regional sources (${profiles.length})`],
              ["soils", `Soil classifications (${soils.length})`],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={tab === key ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : tab === "reports" ? (
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Report</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Stated capacity</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No reports have been uploaded yet.
                    </td>
                  </tr>
                )}
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.prepared_by ?? "Firm not stated"} ·{" "}
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-xs">{r.report_type.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.bearing_capacity_kpa ? `${r.bearing_capacity_kpa} kN/m²` : "Not stated"}
                    </td>
                    <td className="px-3 py-2 text-xs">{r.verification_status}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === r.id || r.verification_status === "verified"}
                          onClick={() => decide(r, "verify")}
                        >
                          {busyId === r.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <ShieldCheck className="mr-1 h-3 w-3" /> Verify
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === r.id || r.verification_status === "rejected"}
                          onClick={() => decide(r, "reject")}
                        >
                          <X className="mr-1 h-3 w-3" /> Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "profiles" ? (
          <div className="space-y-6">
            <div className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-3">
              {(
                [
                  ["country_code", "Country code"],
                  ["region_slug", "Region slug"],
                  ["region_name", "Region name"],
                  ["city_slug", "City slug (optional)"],
                  ["source_reference", "Source reference (required)"],
                  ["source_url", "Source URL"],
                  ["source_year", "Source year"],
                  ["groundwater_note", "Groundwater note"],
                  ["drainage_note", "Drainage note"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                  />
                </label>
              ))}
              <label className="text-xs">
                <span className="text-muted-foreground">Flood exposure</span>
                <select
                  value={form.flood_exposure}
                  onChange={(e) => setForm((prev) => ({ ...prev, flood_exposure: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
                >
                  <option value="unknown">Unknown</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </label>
              <div className="flex items-end">
                <Button onClick={addProfile}>
                  <Plus className="mr-1 h-4 w-4" /> Add source
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Region</th>
                    <th className="px-3 py-2 font-medium">Flood</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        No regional screening sources yet. The public page says so rather than
                        showing placeholder values.
                      </td>
                    </tr>
                  )}
                  {profiles.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2">
                        {p.region_name}
                        <span className="text-xs text-muted-foreground">
                          {p.city_slug ? ` · ${p.city_slug}` : ""} · {p.country_code}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">{p.flood_exposure ?? "unknown"}</td>
                      <td className="px-3 py-2 text-xs">
                        {p.source_reference}
                        {p.source_year ? ` (${p.source_year})` : ""}
                      </td>
                      <td className="px-3 py-2 text-xs">{p.verification_status}</td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={p.verification_status === "withdrawn"}
                          onClick={() => withdrawProfile(p.id)}
                        >
                          Withdraw
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Classification</th>
                  <th className="px-3 py-2 font-medium">Implication</th>
                  <th className="px-3 py-2 font-medium">Investigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {soils.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 font-medium">
                      {s.name}
                      <span className="ml-2 text-xs text-muted-foreground">{s.code}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.implication}</td>
                    <td className="px-3 py-2 text-xs">{s.investigation_priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
