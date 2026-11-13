import { useMemo, useState } from "react";
import { Search, Cpu, AlertTriangle } from "lucide-react";
import {
  buildEngineManifest,
  summariseManifest,
  type ManifestEngine,
} from "@/lib/ai-foundation/engine-manifest";

type Register = "ai" | "capability" | "inventory";

const REGISTER_LABEL: Record<Register, string> = {
  ai: "AI register",
  capability: "Capability",
  inventory: "Inventory",
};

function registersFor(engine: ManifestEngine): Register[] {
  const registers: Register[] = [];
  if (engine.sources.aiEngineIds.length > 0) registers.push("ai");
  if (engine.sources.capabilityId) registers.push("capability");
  if (engine.sources.inventoryId) registers.push("inventory");
  return registers;
}

function gapLevel(engine: ManifestEngine): "none" | "partial" | "blocking" {
  if (engine.gaps.length === 0) return "none";
  if (registersFor(engine).length < 3) return "partial";
  return "none";
}

/**
 * Every engine the platform has, with which of the three registers can see
 * it and what nobody has declared about it. Built from the composed
 * manifest, so it cannot drift from the data the matrix uses.
 */
export function AdminEngineReconciliation() {
  const [search, setSearch] = useState("");
  const [onlyGapped, setOnlyGapped] = useState(false);
  const manifest = useMemo(() => buildEngineManifest(), []);
  const summary = useMemo(() => summariseManifest(manifest), [manifest]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return manifest.filter((engine) => {
      const matches =
        !needle ||
        engine.id.toLowerCase().includes(needle) ||
        engine.name.toLowerCase().includes(needle);
      const gapped = gapLevel(engine) !== "none";
      return matches && (!onlyGapped || gapped);
    });
  }, [manifest, search, onlyGapped]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Engine reconciliation</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {summary.total} engines. {summary.describedByAllThree} are described
          by all three registers. An engine seen by fewer registers can be
          listed here while another layer cannot run it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Described by all three", summary.describedByAllThree],
          ["AI register only", summary.aiOnly],
          ["Capability only", summary.capabilityOnly],
          ["Inventory only", summary.inventoryOnly],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-md border bg-card px-3 py-2"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search engines"
            aria-label="Search engines"
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyGapped}
            onChange={(event) => setOnlyGapped(event.target.checked)}
          />
          Only engines one register cannot see
        </label>
        <span className="text-xs text-muted-foreground">
          Showing {rows.length} of {manifest.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Engine</th>
              <th className="px-3 py-2 font-medium">Seen by</th>
              <th className="px-3 py-2 font-medium">Deterministic</th>
              <th className="px-3 py-2 font-medium">Verified markets</th>
              <th className="px-3 py-2 font-medium">Not declared</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((engine) => (
              <tr key={engine.id} className="border-t align-top">
                <td className="px-3 py-2">
                  <p className="font-medium">{engine.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {engine.id}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {registersFor(engine).map((register) => (
                      <span
                        key={register}
                        className="rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {REGISTER_LABEL[register]}
                      </span>
                    ))}
                    {registersFor(engine).length < 3 && (
                      <span className="rounded border border-amber-300 px-1.5 py-0.5 text-xs text-amber-700 dark:border-amber-800 dark:text-amber-400">
                        {3 - registersFor(engine).length} missing
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {engine.deterministic === null
                    ? "Not declared"
                    : engine.deterministic
                      ? "Yes"
                      : "No"}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {engine.markets
                    ? `${engine.markets.verified.length} verified`
                    : "Not declared"}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {engine.gaps.length === 0 ? (
                    "Nothing"
                  ) : (
                    <details>
                      <summary className="flex cursor-pointer items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {engine.gaps.length}
                      </summary>
                      <ul className="mt-1 list-disc pl-4">
                        {engine.gaps.map((gap) => (
                          <li key={gap}>{gap}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="border-t">
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                >
                  No engine matches this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        "Not declared" means no register states it, so it was left null rather
        than defaulted. Version, input schema and output schema are not declared
        for any engine yet.
      </p>
    </div>
  );
}
