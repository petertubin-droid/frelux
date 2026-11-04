import { useMemo, useState } from "react";
import { Droplets } from "lucide-react";
import {
  designFlow,
  sizePipe,
  velocityNote,
  type PipeFamily,
} from "@/lib/estimation/pipe-sizing-engine";

/**
 * Pipe size check for a water installation.
 *
 * The plumbing estimator counts metros of pipe and never asked how big the pipe
 * should be, which is the first thing a plumber asks. Demand comes from the
 * outlet flow rates below, which are yours to confirm against the fittings you
 * are buying, and the simultaneity factor is applied only because you set it.
 */
const ROWS = [
  { key: "basin", label: "Basin or sink tap", flow: "6" },
  { key: "shower", label: "Shower", flow: "9" },
  { key: "hose", label: "Garden or washdown tap", flow: "12" },
  { key: "wc", label: "WC cistern fill", flow: "6" },
] as const;

type RowKey = (typeof ROWS)[number]["key"];

export default function PipeSizingPanel() {
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

  const field =
    "w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <section
      aria-labelledby="pipe-size-heading"
      className="mt-10 rounded-lg border p-5"
    >
      <div className="mb-3 flex items-start gap-2">
        <Droplets
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div>
          <h2 id="pipe-size-heading" className="font-semibold">
            Water pipe size check
          </h2>
          <p className="text-sm text-muted-foreground">
            Sizes a supply pipe from the flow it has to carry. Enter the flow
            rates from the fittings you are buying; the defaults are typical
            domestic figures to edit, not measurements.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col" className="py-1 pr-2 font-medium">
                Outlet
              </th>
              <th scope="col" className="py-1 pr-2 font-medium">
                Flow (l/min)
              </th>
              <th scope="col" className="py-1 font-medium">
                How many
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="py-1 pr-2 font-normal">
                  {row.label}
                </th>
                <td className="py-1 pr-2">
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
                <td className="py-1">
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

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="font-medium">Simultaneity factor</span>
          <input
            className={`mt-1 ${field}`}
            inputMode="decimal"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">
            1 means every outlet at once, the safe and expensive case
          </span>
        </label>
        <label className="text-sm">
          <span className="font-medium">Velocity limit (m/s)</span>
          <select
            className={`mt-1 ${field}`}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          >
            <option value="1">1.0, quiet hot water</option>
            <option value="1.5">1.5, normal cold branch</option>
            <option value="2">2.0, short rising main only</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">Pipe system</span>
          <select
            className={`mt-1 ${field}`}
            value={family}
            onChange={(e) => setFamily(e.target.value as PipeFamily)}
          >
            <option value="ppr">PPR</option>
            <option value="copper">Copper</option>
          </select>
        </label>
      </div>

      <div aria-live="polite" className="mt-4 space-y-2 text-sm">
        <p className="text-muted-foreground">{demand.detail}</p>
        {verdict.feasible ? (
          <p>
            <span className="font-medium">
              Smallest size: {verdict.chosen?.label}
            </span>{" "}
            <span className="text-muted-foreground">
              runs at {verdict.velocity_mps} m/s.{" "}
              {velocityNote(verdict.velocity_mps)}
            </span>
          </p>
        ) : (
          <p>
            <span className="font-medium">No tabulated size works</span>{" "}
            <span className="text-muted-foreground">{verdict.reason}</span>
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Velocity sizing checks one run against one flow. Pressure, friction
          loss, developed length and the pressure the supply can actually hold
          still need the supplier's figures.
        </p>
      </div>
    </section>
  );
}
