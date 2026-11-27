import { useMemo, useState } from "react";
import { Droplets } from "lucide-react";
import {
  designFlow,
  sizePipe,
  type PipeFamily,
} from "@/lib/estimation/pipe-sizing-engine";
import {
  calculateUpcIpcWaterSupply,
  type UpcIpcFixtureCounts,
} from "@/lib/estimation/plumbing-standards-engine";
import { Badge } from "@/components/ui/shadcn/badge";

const ROWS = [
  { key: "basin", label: "Basin or sink tap", flow: "6" },
  { key: "shower", label: "Shower", flow: "9" },
  { key: "hose", label: "Garden or washdown tap", flow: "12" },
  { key: "wc", label: "WC cistern fill", flow: "6" },
] as const;

type RowKey = (typeof ROWS)[number]["key"];

export default function PipeSizingPanel() {
  const [activeTab, setActiveTab] = useState<"velocity" | "hunters_curve">(
    "velocity",
  );

  // Velocity mode state
  const [counts, setCounts] = useState<Record<RowKey, string>>({
    basin: "3",
    shower: "1",
    hose: "0",
    wc: "2",
  });
  const [flows, setFlows] = useState<Record<RowKey, string>>({
    basin: "6",
    shower: "9",
    hose: "12",
    wc: "6",
  });
  const [factor, setFactor] = useState("1");
  const [limit, setLimit] = useState("1.5");
  const [family, setFamily] = useState<PipeFamily>("ppr");

  // Hunter's Curve mode state (IPC 2024 Appendix E / UPC 2024 Appendix A)
  const [hunterFixtures, setHunterFixtures] = useState<UpcIpcFixtureCounts>({
    water_closets: 3,
    lavatories: 3,
    showers: 2,
    bathtubs: 1,
    kitchen_sinks: 1,
    dishwashers: 1,
    clothes_washers: 1,
  });
  const [systemType, setSystemType] = useState<"flush_tank" | "flushometer">(
    "flush_tank",
  );

  const demand = useMemo(
    () =>
      designFlow({
        outlets: ROWS.map((row) => ({
          label: row.label,
          flow_lpm: Number(flows[row.key]),
          count: Number(counts[row.key]),
        })),
        simultaneity_factor: Number(factor),
      }),
    [flows, counts, factor],
  );

  const verdict = useMemo(
    () =>
      sizePipe({
        flow_lps: demand.design_lps,
        velocity_limit_mps: Number(limit),
        family,
      }),
    [demand.design_lps, limit, family],
  );

  const hunterSupply = useMemo(() => {
    return calculateUpcIpcWaterSupply(hunterFixtures, systemType);
  }, [hunterFixtures, systemType]);

  const field =
    "w-full rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <section
      aria-labelledby="pipe-size-heading"
      className="mt-10 rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <Droplets
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <h2
              id="pipe-size-heading"
              className="text-sm font-semibold text-foreground"
            >
              Water Service & Supply Pipe Sizing
            </h2>
            <p className="text-xs text-muted-foreground">
              Determine adequate pipe diameters from branch fixture velocities
              or total building peak demand curves.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg border border-border bg-muted/40 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("velocity")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === "velocity"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Branch Velocity Sizing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("hunters_curve")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === "hunters_curve"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Hunter's Curve Peak Demand
          </button>
        </div>
      </div>

      {activeTab === "velocity" ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th scope="col" className="py-1.5 pr-2 font-medium">
                    Outlet Fixture
                  </th>
                  <th scope="col" className="py-1.5 pr-2 font-medium">
                    Flow (L/min)
                  </th>
                  <th scope="col" className="py-1.5 font-medium">
                    How many
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {ROWS.map((row) => (
                  <tr key={row.key}>
                    <th
                      scope="row"
                      className="py-2 pr-2 font-normal text-foreground"
                    >
                      {row.label}
                    </th>
                    <td className="py-2 pr-2">
                      <input
                        aria-label={`Flow for ${row.label}`}
                        className={field}
                        inputMode="decimal"
                        value={flows[row.key]}
                        onChange={(e) =>
                          setFlows({ ...flows, [row.key]: e.target.value })
                        }
                      />
                    </td>
                    <td className="py-2">
                      <input
                        aria-label={`Count for ${row.label}`}
                        className={field}
                        inputMode="numeric"
                        value={counts[row.key]}
                        onChange={(e) =>
                          setCounts({ ...counts, [row.key]: e.target.value })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-xs">
              <span className="font-medium text-foreground">
                Simultaneity factor
              </span>
              <input
                className={`mt-1 ${field}`}
                inputMode="decimal"
                value={factor}
                onChange={(e) => setFactor(e.target.value)}
              />
              <span className="text-[11px] text-muted-foreground">
                1.0 assumes all outlets operate simultaneously
              </span>
            </label>
            <label className="text-xs">
              <span className="font-medium text-foreground">
                Velocity limit (m/s)
              </span>
              <select
                className={`mt-1 ${field}`}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              >
                <option value="1">1.0 m/s (Quiet hot water / copper)</option>
                <option value="1.5">1.5 m/s (Standard cold branch)</option>
                <option value="2">2.0 m/s (Rising main short runs)</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="font-medium text-foreground">Pipe system</span>
              <select
                className={`mt-1 ${field}`}
                value={family}
                onChange={(e) => setFamily(e.target.value as PipeFamily)}
              >
                <option value="ppr">PPR (PN20 / PN25)</option>
                <option value="copper">Copper (BS EN 1057 / ASTM B88)</option>
                <option value="pex">PEX (ASTM F876 / CTS)</option>
                <option value="pvc">PVC / CPVC (Schedule 40 / 80)</option>
              </select>
            </label>
          </div>

          <div
            aria-live="polite"
            className="mt-4 rounded-lg bg-muted/40 p-3.5 text-xs space-y-2"
          >
            <p className="text-muted-foreground font-mono">{demand.detail}</p>
            {verdict.feasible ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm">
                  Smallest size: {verdict.chosen?.label}
                </span>
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                >
                  {verdict.velocity_mps} m/s
                </Badge>
              </div>
            ) : (
              <p className="font-semibold text-amber-600 dark:text-amber-400">
                No standard size works: {verdict.reason}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
              Velocity sizing checks run capacity against design flow. Static
              street pressure, water meter friction loss, and total developed
              length must still be verified with local supplier specifications.
            </p>
          </div>
        </>
      ) : (
        /* Hunter's Curve mode */
        <div className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div>
              <span className="font-semibold text-foreground block">
                Standard: {hunterSupply.standards_reference}
              </span>
              <span className="text-muted-foreground text-[11px]">
                Determines building peak water demand and main service pipe size
                using Water Supply Fixture Units (WSFU).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="water-system-type-select"
                className="text-[11px] font-medium text-foreground"
              >
                Supply Type:
              </label>
              <select
                id="water-system-type-select"
                value={systemType}
                onChange={(e) =>
                  setSystemType(e.target.value as "flush_tank" | "flushometer")
                }
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                <option value="flush_tank">Gravity Flush Tank (Cistern)</option>
                <option value="flushometer">
                  Flushometer Valve (Commercial)
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: "water_closets", label: "Water Closets (WC)" },
              { key: "lavatories", label: "Lavatories (Sinks)" },
              { key: "showers", label: "Showers" },
              { key: "bathtubs", label: "Bathtubs" },
              { key: "kitchen_sinks", label: "Kitchen Sinks" },
              { key: "dishwashers", label: "Dishwashers" },
              { key: "clothes_washers", label: "Washing Machines" },
            ].map(({ key, label }) => (
              <div
                key={key}
                className="p-2.5 rounded-lg border border-border bg-card"
              >
                <label
                  htmlFor={`fixture-count-${key}`}
                  className="block font-medium text-foreground mb-1"
                >
                  {label}
                </label>
                <input
                  id={`fixture-count-${key}`}
                  type="number"
                  min={0}
                  max={100}
                  value={hunterFixtures[key as keyof UpcIpcFixtureCounts] ?? 0}
                  onChange={(e) =>
                    setHunterFixtures((prev) => ({
                      ...prev,
                      [key]: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                  className={field}
                />
              </div>
            ))}
          </div>

          {/* Results Card */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary/20 pb-2">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-primary block">
                  Peak Water Demand & Service Line Size
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Total Aggregated Load:{" "}
                  <strong className="text-foreground">
                    {hunterSupply.total_wsfu} WSFU
                  </strong>
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-sm font-bold bg-card border-primary/40 text-foreground px-3 py-1"
              >
                Main Service: {hunterSupply.recommended_service_pipe_inches}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-lg bg-card border border-border">
                <span className="text-muted-foreground block text-[11px]">
                  Peak Demand Flow
                </span>
                <span className="text-base font-bold text-foreground font-mono">
                  {hunterSupply.peak_flow_gpm} GPM
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  {hunterSupply.peak_flow_lps} L/s
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-card border border-border">
                <span className="text-muted-foreground block text-[11px]">
                  Recommended Main
                </span>
                <span className="text-base font-bold text-primary font-mono">
                  {hunterSupply.recommended_service_pipe_inches}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  at ≤ 8 ft/s (2.4 m/s)
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-card border border-border col-span-2 sm:col-span-1">
                <span className="text-muted-foreground block text-[11px]">
                  Governing Standard
                </span>
                <span className="text-xs font-semibold text-foreground block truncate">
                  {hunterSupply.standards_reference}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  {systemType === "flush_tank"
                    ? "Flush Tank Curve"
                    : "Flushometer Curve"}
                </span>
              </div>
            </div>

            <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5 pt-1">
              {hunterSupply.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
