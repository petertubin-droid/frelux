import { useMemo, useState } from "react";
import { Ruler } from "lucide-react";
import {
  COPPER_AMPACITY_A,
  minimumCableSize,
  voltageDropPercent,
  type SupplySystem,
} from "@/lib/estimation/electrical-engine";

/**
 * Feeder volt drop and cable size check.
 *
 * The engine has been able to answer this since the F7 audit, but nothing on
 * the page ever asked it, so users sized cables by eye and reported the
 * estimator as incomplete. Both answers come from the same deterministic
 * functions the tests pin: no value here is guessed.
 */
export default function CableSizingCheck() {
  const [loadWatts, setLoadWatts] = useState("5000");
  const [runM, setRunM] = useState("25");
  const [voltage, setVoltage] = useState("230");
  const [system, setSystem] = useState<SupplySystem>("single");
  const [powerFactor, setPowerFactor] = useState("1");
  const [lighting, setLighting] = useState(false);
  const [existing, setExisting] = useState("4");

  const parsed = useMemo(() => {
    const load = Number(loadWatts);
    const run = Number(runM);
    const volts = Number(voltage);
    const pf = Number(powerFactor);
    return {
      load,
      run,
      volts,
      pf,
      valid:
        Number.isFinite(load) &&
        Number.isFinite(run) &&
        Number.isFinite(volts) &&
        load > 0 &&
        run > 0 &&
        volts > 0,
    };
  }, [loadWatts, runM, voltage, powerFactor]);

  const drop = useMemo(() => {
    if (!parsed.valid) return null;
    return voltageDropPercent({
      load_watts: parsed.load,
      run_m: parsed.run,
      voltage: parsed.volts,
      cross_section_mm2: Number(existing),
      lighting_dominant: lighting,
      system,
      power_factor: parsed.pf,
    });
  }, [parsed, existing, lighting, system]);

  const sizing = useMemo(() => {
    if (!parsed.valid) return null;
    return minimumCableSize({
      load_watts: parsed.load,
      run_m: parsed.run,
      voltage: parsed.volts,
      lighting_dominant: lighting,
      system,
      power_factor: parsed.pf,
    });
  }, [parsed, lighting, system]);

  const field =
    "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <section
      aria-labelledby="cable-check-heading"
      className="mt-10 rounded-lg border p-5"
    >
      <div className="mb-3 flex items-start gap-2">
        <Ruler
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div>
          <h2 id="cable-check-heading" className="font-semibold">
            Feeder volt drop and cable size check
          </h2>
          <p className="text-sm text-muted-foreground">
            Sizes a copper feeder against the 3% lighting and 5% power limits
            and the tabulated current carrying capacity. It checks one run at a
            time and is not a board schedule.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">
          <span className="font-medium">Connected load (W)</span>
          <input
            className={field}
            inputMode="decimal"
            value={loadWatts}
            onChange={(e) => setLoadWatts(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">One way run (m)</span>
          <input
            className={field}
            inputMode="decimal"
            value={runM}
            onChange={(e) => setRunM(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">System voltage (V)</span>
          <input
            className={field}
            inputMode="decimal"
            value={voltage}
            onChange={(e) => setVoltage(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Supply</span>
          <select
            className={field}
            value={system}
            onChange={(e) => setSystem(e.target.value as SupplySystem)}
          >
            <option value="single">Single phase</option>
            <option value="three">Three phase</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">Power factor</span>
          <input
            className={field}
            inputMode="decimal"
            value={powerFactor}
            onChange={(e) => setPowerFactor(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">
            1 for resistive loads, around 0.8 for motors
          </span>
        </label>
        <label className="text-sm">
          <span className="font-medium">Cable you planned to use</span>
          <select
            className={field}
            value={existing}
            onChange={(e) => setExisting(e.target.value)}
          >
            {COPPER_AMPACITY_A.map(([csa, amps]) => (
              <option key={csa} value={csa}>
                {csa} mm² ({amps} A)
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={lighting}
          onChange={(e) => setLighting(e.target.checked)}
        />
        <span>This run mainly serves lighting (3% limit)</span>
      </label>

      <div aria-live="polite" className="mt-4 space-y-2 text-sm">
        {!parsed.valid && (
          <p className="text-muted-foreground">
            Enter a load, a run length and a voltage to see the check.
          </p>
        )}
        {drop && (
          <p>
            <span className="font-medium">
              {drop.passes ? "Drop within limit" : "Drop over limit"}
            </span>{" "}
            <span
              className={drop.passes ? "text-emerald-700" : "text-destructive"}
            >
              {drop.drop_percent}%
            </span>{" "}
            <span className="text-muted-foreground">
              of {parsed.volts} V against a {drop.limit_percent}% limit
            </span>
          </p>
        )}
        {sizing && (
          <p>
            <span className="font-medium">
              {sizing.feasible
                ? `Smallest compliant size: ${sizing.cross_section_mm2} mm²`
                : "No compliant size in the table"}
            </span>{" "}
            <span className="text-muted-foreground">{sizing.reason}</span>
          </p>
        )}
      </div>
    </section>
  );
}
