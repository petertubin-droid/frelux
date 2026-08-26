import { useState, useCallback } from "react";
import { useSeo } from "@/lib/seo";
import {
  estimateTimeline,
  type TimelineInput,
  type ProjectComplexity,
  type WorkforceSize,
  type Season,
} from "@/lib/engineering/timeline-estimator";
import { monitoredCalc } from "@/lib/calculator-monitor";
import { Calendar, Clock, AlertTriangle, TrendingUp, Flag } from "lucide-react";

export default function ProjectTimeline() {
  useSeo({
    title: "Construction Timeline Estimator | FRELUX",
    description:
      "Estimate how long your construction project will take. Stage-by-stage breakdown based on Nigerian construction benchmarks.",
    keywords:
      "construction timeline, project duration, building schedule Nigeria",
  });

  const [buildingType, setBuildingType] = useState("bungalow");
  const [length, setLength] = useState(15);
  const [width, setWidth] = useState(10);
  const [floors, setFloors] = useState(1);
  const [complexity, setComplexity] = useState<ProjectComplexity>("standard");
  const [workforce, setWorkforce] = useState<WorkforceSize>("medium");
  const [season, setSeason] = useState<Season>("dry");
  const [foundationType, setFoundationType] = useState("strip_footing");
  const [roofType, setRoofType] = useState("gable");
  const [hasEngineer, setHasEngineer] = useState(false);
  const [result, setResult] = useState<ReturnType<
    typeof estimateTimeline
  > | null>(null);

  const calculate = useCallback(() => {
    const input: TimelineInput = {
      building_type: buildingType,
      building_length: length,
      building_width: width,
      number_of_floors: floors,
      complexity,
      workforce,
      season,
      foundation_type: foundationType,
      roof_type: roofType,
      has_engineer_schedule: hasEngineer,
    };
    setResult(monitoredCalc("Project Timeline", () => estimateTimeline(input)));
  }, [
    buildingType,
    length,
    width,
    floors,
    complexity,
    workforce,
    season,
    foundationType,
    roofType,
    hasEngineer,
  ]);

  if (!result) calculate();

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-brand-navy text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <Calendar aria-hidden="true" className="w-8 h-8 text-accent-green" />
            <h1 className="text-2xl md:text-3xl font-bold">
              Construction Timeline Estimator
            </h1>
          </div>
          <p className="text-white/70 text-sm md:text-base">
            How long will your project take? Stage-by-stage estimates based on
            Nigerian construction benchmarks.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Inputs */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-card p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Select
              label="Building type"
              value={buildingType}
              onChange={setBuildingType}
              options={[
                { v: "bungalow", l: "Bungalow" },
                { v: "duplex", l: "Duplex" },
                { v: "two_storey", l: "Two Storey" },
                { v: "apartment", l: "Apartment" },
                { v: "office", l: "Office" },
                { v: "shop", l: "Shop" },
              ]}
            />
            <Num
              label="Length (m)"
              value={length}
              onChange={setLength}
              step="0.5"
            />
            <Num
              label="Width (m)"
              value={width}
              onChange={setWidth}
              step="0.5"
            />
            <Num
              label="Floors"
              value={floors}
              onChange={(v) => setFloors(Math.floor(v))}
            />
            <Select
              label="Complexity"
              value={complexity}
              onChange={(v) => setComplexity(v as ProjectComplexity)}
              options={[
                { v: "simple", l: "Simple" },
                { v: "standard", l: "Standard" },
                { v: "complex", l: "Complex" },
                { v: "high_end", l: "High-End" },
              ]}
            />
            <Select
              label="Workforce size"
              value={workforce}
              onChange={(v) => setWorkforce(v as WorkforceSize)}
              options={[
                { v: "small", l: "Small (5-10)" },
                { v: "medium", l: "Medium (10-20)" },
                { v: "large", l: "Large (20+)" },
              ]}
            />
            <Select
              label="Season"
              value={season}
              onChange={(v) => setSeason(v as Season)}
              options={[
                { v: "dry", l: "Dry (Nov-Mar)" },
                { v: "rainy", l: "Rainy (Apr-Oct)" },
              ]}
            />
            <Select
              label="Foundation type"
              value={foundationType}
              onChange={setFoundationType}
              options={[
                { v: "strip_footing", l: "Strip Footing" },
                { v: "pad_footing", l: "Pad Footing" },
                { v: "raft", l: "Raft" },
                { v: "pile", l: "Pile" },
              ]}
            />
            <Select
              label="Roof type"
              value={roofType}
              onChange={setRoofType}
              options={[
                { v: "gable", l: "Gable" },
                { v: "hip", l: "Hip" },
                { v: "flat", l: "Flat" },
              ]}
            />
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={hasEngineer}
              onChange={(e) => setHasEngineer(e.target.checked)}
            />
            Structural engineer engaged (has reinforcement schedule)
          </label>

          <button
            onClick={calculate}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-purple px-6 py-3 text-sm font-bold text-white hover:bg-brand-purple-dark"
          >
            <Calendar aria-hidden="true" className="w-4 h-4" /> Estimate Timeline
          </button>
        </div>

        {result && (
          <>
            {/* Summary */}
            <div className="grid md:grid-cols-4 gap-4">
              <SummaryCard
                label="Total Duration"
                value={`${result.total_days}`}
                unit="days"
              />
              <SummaryCard
                label="Approximately"
                value={`${result.total_weeks}`}
                unit="weeks"
              />
              <SummaryCard
                label="Estimated Start"
                value={result.estimated_start}
                unit=""
              />
              <SummaryCard
                label="Estimated Completion"
                value={result.estimated_end}
                unit=""
              />
            </div>

            {/* Milestones */}
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-card p-6">
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2 mb-4">
                <Flag className="w-5 h-5 text-brand-purple" /> Project
                Milestones
              </h3>
              <div className="space-y-3">
                {result.milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-purple text-white text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">
                        {m.label}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {m.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-900">
                        Day {m.after_days}
                      </p>
                      <p className="text-xs text-neutral-500">
                        ≈ {Math.ceil(m.after_days / 6)} weeks
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage breakdown */}
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-card p-6">
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2 mb-4">
                <Clock aria-hidden="true" className="w-5 h-5 text-brand-purple" /> Stage-by-Stage
                Breakdown
              </h3>
              <div className="space-y-2">
                {result.stages.map((s, i) => (
                  <div
                    key={i}
                    className="border border-neutral-100 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-navy text-white text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-neutral-900">
                          {s.stage_label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">
                          {s.min_days}-{s.max_days} days
                        </span>
                        <span className="rounded bg-brand-purple/10 px-2 py-0.5 text-xs font-medium text-brand-purple">
                          {s.estimated_days} days
                        </span>
                      </div>
                    </div>
                    {s.notes && (
                      <p className="text-xs text-amber-600 ml-8">⚠ {s.notes}</p>
                    )}
                    <div className="ml-8 mt-2 flex flex-wrap gap-1">
                      {s.activities.map((a, j) => (
                        <span
                          key={j}
                          className="text-xs text-neutral-500 bg-neutral-50 rounded px-2 py-0.5"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risks & recommendations */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5" /> Risks
                </h3>
                <ul className="space-y-1.5">
                  {result.risks.map((r, i) => (
                    <li
                      key={i}
                      className="text-sm text-amber-700 flex items-start gap-2"
                    >
                      <span className="text-amber-400">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
                <h3 className="font-semibold text-green-900 flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5" /> Recommendations
                </h3>
                <ul className="space-y-1.5">
                  {result.recommendations.map((r, i) => (
                    <li
                      key={i}
                      className="text-sm text-green-700 flex items-start gap-2"
                    >
                      <span className="text-green-400">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Assumptions */}
            <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4">
              <p className="text-xs font-medium text-neutral-500 mb-2">
                Assumptions:
              </p>
              <div className="space-y-1">
                {result.assumptions.map((a, i) => (
                  <p key={i} className="text-xs text-neutral-500">
                    • {a}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <label className="text-xs font-medium text-neutral-500 mb-1 block">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-200 px-2.5 py-2 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-neutral-500 mb-1 block">
        {label}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-lg border border-neutral-200 px-2.5 py-2 text-sm text-neutral-900 focus:border-brand-purple focus:outline-none"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-brand-navy p-5 text-white">
      <p className="text-xs text-white/60 mb-1">{label}</p>
      <p className="text-xl font-bold">
        {value} {unit && <span className="text-sm text-white/60">{unit}</span>}
      </p>
    </div>
  );
}
