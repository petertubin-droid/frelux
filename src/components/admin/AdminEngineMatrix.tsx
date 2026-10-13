import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Cpu,
} from "lucide-react";
import {
  FULL_ENGINE_INVENTORY,
  ALL_20_MARKETS,
  MARKET_DISPLAY_NAMES,
  getDiscrepancyReport,
  type MarketSupportStatus,
} from "@/lib/international/engine-inventory";

const STATUS_CONFIG: Record<
  MarketSupportStatus,
  {
    label: string;
    bg: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  verified: {
    label: "Verified",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-400",
    icon: CheckCircle,
  },
  partially_verified: {
    label: "Partial",
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-400",
    icon: AlertCircle,
  },
  requires_local_inputs: {
    label: "Needs Input",
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-400",
    icon: HelpCircle,
  },
  unpriced: {
    label: "Unpriced",
    bg: "bg-purple-500/10 border-purple-500/30",
    text: "text-purple-400",
    icon: AlertCircle,
  },
  not_implemented: {
    label: "N/A Typology",
    bg: "bg-zinc-800/40 border-zinc-700/40",
    text: "text-zinc-500",
    icon: XCircle,
  },
  unavailable: {
    label: "Unavailable",
    bg: "bg-rose-500/10 border-rose-500/30",
    text: "text-rose-400",
    icon: XCircle,
  },
  requires_verification: {
    label: "Audit Req.",
    bg: "bg-orange-500/10 border-orange-500/30",
    text: "text-orange-400",
    icon: HelpCircle,
  },
};

export const AdminEngineMatrix: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMarket, setSelectedMarket] = useState("ALL");
  const [expandedEngineId, setExpandedEngineId] = useState<string | null>(null);
  const report = useMemo(() => getDiscrepancyReport(), []);
  const categories = useMemo(
    () => Array.from(new Set(FULL_ENGINE_INVENTORY.map((e) => e.category))),
    [],
  );
  const filteredEngines = useMemo(
    () =>
      FULL_ENGINE_INVENTORY.filter((engine) => {
        const matchesSearch =
          engine.name.toLowerCase().includes(search.toLowerCase()) ||
          engine.id.toLowerCase().includes(search.toLowerCase()) ||
          engine.calculationPurpose
            .toLowerCase()
            .includes(search.toLowerCase());
        return (
          matchesSearch &&
          (selectedCategory === "all" || engine.category === selectedCategory)
        );
      }),
    [search, selectedCategory],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric
          label="Total Discovered Engines"
          value={report.discoveredCount}
          detail="Independent calculations and sub-engines"
        />
        <Metric
          label="Canonical Registry"
          value={report.canonicalCapabilityCount}
          detail="IDs in capability registry"
        />
        <Metric
          label="Unregistered"
          value={report.unregisteredEngines.length}
          detail="Need registry reconciliation"
        />
        <Metric
          label="Markets Evaluated"
          value="20 / 20"
          detail="Evaluation is not proof of support"
        />
      </div>

      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-zinc-300 space-y-2">
        <div className="font-semibold text-amber-400 flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          Registry reconciliation
        </div>
        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          {report.reconciliationNotes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search engines, formulas, or files..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-zinc-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2"
          >
            <option value="all">
              All categories ({FULL_ENGINE_INVENTORY.length})
            </option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2"
          >
            <option value="ALL">All 20 markets</option>
            {ALL_20_MARKETS.map((m) => (
              <option key={m} value={m}>
                {m} - {MARKET_DISPLAY_NAMES[m]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4" />
                <th className="py-3 px-4">Engine / Sub-engine</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">
                  {selectedMarket === "ALL"
                    ? "20-market status matrix"
                    : `${selectedMarket} status`}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {filteredEngines.map((engine) => {
                const expanded = expandedEngineId === engine.id;
                return (
                  <React.Fragment key={engine.id}>
                    <tr
                      onClick={() =>
                        setExpandedEngineId(expanded ? null : engine.id)
                      }
                      className="hover:bg-zinc-800/30 cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        {expanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-zinc-200">
                          {engine.name}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {engine.id}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {engine.classification.replaceAll("_", " ")}
                      </td>
                      <td className="py-3 px-4 uppercase">{engine.category}</td>
                      <td className="py-3 px-4">
                        {selectedMarket === "ALL" ? (
                          <div className="flex flex-wrap gap-1">
                            {ALL_20_MARKETS.map((m) => (
                              <MarketPill
                                key={m}
                                market={m}
                                status={engine.marketMatrix[m].status}
                                notes={engine.marketMatrix[m].notes}
                              />
                            ))}
                          </div>
                        ) : (
                          <MarketDetail
                            market={selectedMarket}
                            status={
                              engine.marketMatrix[
                                selectedMarket as keyof typeof engine.marketMatrix
                              ].status
                            }
                            notes={
                              engine.marketMatrix[
                                selectedMarket as keyof typeof engine.marketMatrix
                              ].notes
                            }
                          />
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-zinc-950/70 border-y border-zinc-800">
                        <td colSpan={5} className="p-4">
                          <EngineDetails engine={engine} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-2xl font-bold text-zinc-100 mt-1">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{detail}</div>
    </div>
  );
}
function MarketPill({
  market,
  status,
  notes,
}: {
  market: string;
  status: MarketSupportStatus;
  notes: string;
}) {
  const c = STATUS_CONFIG[status];
  return (
    <span
      title={`${market}: ${c.label} - ${notes}`}
      className={`px-1.5 py-0.5 rounded text-[9px] border ${c.bg} ${c.text}`}
    >
      {market}
    </span>
  );
}
function MarketDetail({
  market,
  status,
  notes,
}: {
  market: string;
  status: MarketSupportStatus;
  notes: string;
}) {
  const c = STATUS_CONFIG[status];
  const Icon = c.icon;
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${c.bg} ${c.text}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {c.label}
      </span>
      <span className="text-zinc-500 text-[11px] truncate max-w-xs">
        {notes}
      </span>
    </div>
  );
}
function EngineDetails({
  engine,
}: {
  engine: (typeof FULL_ENGINE_INVENTORY)[number];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
      <div className="space-y-3">
        <Detail title="Calculation purpose" value={engine.calculationPurpose} />
        <Detail title="Key formulas" value={engine.keyFormulas} mono />
        <Detail title="Market assumptions" value={engine.marketAssumptions} />
      </div>
      <div className="space-y-3">
        <Detail
          title="Source files"
          value={engine.sourceFiles.join(" · ")}
          mono
        />
        <Detail title="Consumers" value={engine.consumers.join(" · ")} mono />
        <Detail
          title="Dependencies"
          value={engine.dependencies.join(" · ")}
          mono
        />
      </div>
    </div>
  );
}
function Detail({
  title,
  value,
  mono,
}: {
  title: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="font-semibold text-zinc-400 uppercase text-[10px]">
        {title}
      </div>
      <div className={`text-zinc-300 mt-1 ${mono ? "font-mono" : ""}`}>
        {value || "Not recorded"}
      </div>
    </div>
  );
}

export default AdminEngineMatrix;
