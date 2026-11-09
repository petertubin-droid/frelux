/**
 * Diaspora Escrow Budget Tracker & Cross-Border Inflation Engine
 *
 * Models foreign currency sponsorship, parallel vs. official FX spread,
 * time-weighted compounding inflation buffer, and on-site material deviations.
 */

import { useState, useMemo } from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Plus,
  Trash2,
  Layers,
} from "lucide-react";
import {
  calculateDiasporaBudgetTracker,
  type DiasporaMilestone,
} from "@/lib/payments/diaspora-budget-tracker-engine";
import { useSeo } from "@/lib/seo";
import { Link } from "react-router-dom";

export default function DiasporaBudgetTracker() {
  useSeo({
    title: "Diaspora Construction Budget & Inflation Tracker | FRELUX",
    description:
      "Track overseas construction funds against local currency inflation, parallel exchange rates, and on-site material cost deviations.",
  });

  const [sponsorBudget, setSponsorBudget] = useState(25000);
  const [sponsorCurrency, setSponsorCurrency] = useState("USD");
  const [localCurrency, setLocalCurrency] = useState("NGN");
  const [parallelRate, setParallelRate] = useState(1620);
  const [officialRate, setOfficialRate] = useState(1480);
  const [annualInflation, setAnnualInflation] = useState(28);
  const [timelineMonths, setTimelineMonths] = useState(8);

  const [milestones, setMilestones] = useState<DiasporaMilestone[]>([
    {
      name: "Land Acquisition & Survey",
      allocatedForeign: 6000,
      spentLocal: 9720000,
      completed: true,
    },
    {
      name: "Foundation & Substructure",
      allocatedForeign: 8000,
      spentLocal: 12960000,
      completed: true,
    },
    {
      name: "Superstructure & Blockwork",
      allocatedForeign: 6000,
      spentLocal: 0,
      completed: false,
    },
    {
      name: "Roofing, Windows & Plaster",
      allocatedForeign: 5000,
      spentLocal: 0,
      completed: false,
    },
  ]);

  const result = useMemo(() => {
    return calculateDiasporaBudgetTracker({
      sponsorBaseBudgetForeign: sponsorBudget,
      sponsorCurrency,
      localCurrency,
      parallelExchangeRate: parallelRate,
      officialExchangeRate: officialRate,
      annualInflationRatePercent: annualInflation,
      timelineMonths,
      milestones,
    });
  }, [
    sponsorBudget,
    sponsorCurrency,
    localCurrency,
    parallelRate,
    officialRate,
    annualInflation,
    timelineMonths,
    milestones,
  ]);

  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      {
        name: `Milestone Phase #${prev.length + 1}`,
        allocatedForeign: 2500,
        spentLocal: 0,
        completed: false,
      },
    ]);
  };

  const removeMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMilestone = (
    index: number,
    field: keyof DiasporaMilestone,
    value: unknown,
  ) => {
    setMilestones((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const exportAuditCSV = () => {
    const rows = [
      ["FRELUX Diaspora Escrow Forensic Audit & Inflation Schedule", ""],
      [
        "Sponsor Budget",
        `${result.sponsorBudgetForeign.toLocaleString()} ${sponsorCurrency}`,
      ],
      [
        "Parallel FX Rate",
        `1 ${sponsorCurrency} = ${result.parallelExchangeRate} ${localCurrency}`,
      ],
      [
        "Official FX Rate",
        `1 ${sponsorCurrency} = ${result.officialExchangeRate} ${localCurrency}`,
      ],
      ["Exchange Rate Spread (Gap)", `${result.exchangeRateGapPercent}%`],
      ["Project Timeline", `${timelineMonths} Months`],
      ["Annual Construction Inflation", `${annualInflation}%`],
      ["Inflation Compounding Multiplier", `${result.inflationMultiplier}x`],
      [
        "Inflation-Adjusted Target Cost",
        `${result.inflationAdjustedProjectedForeign.toLocaleString()} ${sponsorCurrency}`,
      ],
      [
        "Funds Disbursed Overseas",
        `${result.totalSentForeign.toLocaleString()} ${sponsorCurrency}`,
      ],
      [
        "On-Site Spend In Local Currency",
        `${result.totalSpentLocal.toLocaleString()} ${localCurrency}`,
      ],
      [
        "On-Site Spend Converted to Sponsor Currency",
        `${result.equivalentSpentForeign.toLocaleString()} ${sponsorCurrency}`,
      ],
      ["Material Variance / Deviation", `${result.materialDeviationPercent}%`],
      ["--- MILESTONES BREAKDOWN ---", ""],
      ["Milestone Name", "Allocated (Foreign)", "Spent (Local)", "Status"],
      ...milestones.map((m) => [
        m.name,
        String(m.allocatedForeign),
        String(m.spentLocal),
        m.completed ? "Completed & Disbursed" : "In Progress",
      ]),
    ];

    const csvContent = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `diaspora-budget-audit-${sponsorCurrency}-${localCurrency}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <Container>
        <PageHeader
          title="Diaspora Construction Budget & Inflation Tracker"
          subtitle="Protect cross-border remittances against local currency volatility, black market exchange spreads, and compounding material inflation."
          eyebrow="Diaspora Escrow Finance"
        />

        {/* Top Currency & FX Rate Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-8">
          <div className="p-4 rounded-xl border border-border bg-card">
            <span className="text-xs text-muted-foreground block mb-1">
              Sponsor Budget ({sponsorCurrency})
            </span>
            <div className="flex items-center gap-2">
              <select
                value={sponsorCurrency}
                onChange={(e) => setSponsorCurrency(e.target.value)}
                className="rounded border border-input bg-background text-xs font-semibold px-1 py-0.5"
              >
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="CAD">CAD ($)</option>
              </select>
              <input
                type="number"
                value={sponsorBudget}
                onChange={(e) => setSponsorBudget(Number(e.target.value))}
                className="w-full text-xl font-bold font-mono bg-transparent border-none focus:outline-hidden"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              Original foreign allocation
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <span className="text-xs text-muted-foreground block mb-1">
              Parallel (Street) FX Rate
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold">{sponsorCurrency}/</span>
              <select
                value={localCurrency}
                onChange={(e) => setLocalCurrency(e.target.value)}
                className="rounded border border-input bg-background text-xs font-semibold px-1 py-0.5"
              >
                <option value="NGN">NGN (₦)</option>
                <option value="GHS">GHS (₵)</option>
                <option value="KES">KES (KSh)</option>
                <option value="ZAR">ZAR (R)</option>
              </select>
              <input
                type="number"
                value={parallelRate}
                onChange={(e) => setParallelRate(Number(e.target.value))}
                className="w-full text-xl font-bold font-mono bg-transparent border-none focus:outline-hidden"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              Actual contractor liquidity rate
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <span className="text-xs text-muted-foreground block mb-1">
              Official Bank FX Rate
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{sponsorCurrency}/</span>
              <input
                type="number"
                value={officialRate}
                onChange={(e) => setOfficialRate(Number(e.target.value))}
                className="w-full text-xl font-bold font-mono bg-transparent border-none focus:outline-hidden"
              />
            </div>
            <span className="text-[10px] text-amber-500 font-medium">
              +{result.exchangeRateGapPercent}% Parallel Spread
            </span>
          </div>

          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
            <span className="text-xs text-primary font-semibold block mb-1">
              Inflation-Adjusted Target
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">
              {result.inflationAdjustedProjectedForeign.toLocaleString()}{" "}
              {sponsorCurrency}
            </div>
            <span className="text-[10px] text-muted-foreground">
              +{Math.round((result.inflationMultiplier - 1) * 100)}% buffer over{" "}
              {timelineMonths}mo
            </span>
          </div>
        </div>

        {/* Inflation & Risk Config Panel */}
        <div className="rounded-xl border border-border bg-card p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-foreground">
                Annual Construction Inflation
              </label>
              <Badge variant="outline" className="text-xs font-mono">
                {annualInflation}% / yr
              </Badge>
            </div>
            <input
              aria-label="Annual Construction Inflation"
              type="range"
              min="0"
              max="60"
              value={annualInflation}
              onChange={(e) => setAnnualInflation(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="text-[11px] text-muted-foreground block mt-1">
              Cement, steel, transport & regional supply chain inflation.
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-foreground">
                Project Build Duration
              </label>
              <Badge variant="outline" className="text-xs font-mono">
                {timelineMonths} Months
              </Badge>
            </div>
            <input
              aria-label="Project Build Duration"
              type="range"
              min="1"
              max="24"
              value={timelineMonths}
              onChange={(e) => setTimelineMonths(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="text-[11px] text-muted-foreground block mt-1">
              Compounding interval: (1 + r)^(t/12).
            </span>
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-foreground block mb-1">
                Budget Variance Health
              </span>
              <div className="flex items-center gap-2">
                {result.isOverBudget ? (
                  <Badge variant="destructive" className="gap-1 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5" /> High Risk
                    Over-Budget
                  </Badge>
                ) : (
                  <Badge
                    variant="default"
                    className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Budget On-Track
                  </Badge>
                )}
                <span className="text-xs font-mono font-bold">
                  {result.materialDeviationPercent > 0
                    ? `+${result.materialDeviationPercent}%`
                    : `${result.materialDeviationPercent}%`}
                </span>
              </div>
            </div>
            <Button
              onClick={exportAuditCSV}
              variant="outline"
              size="sm"
              className="gap-2 text-xs mt-3 w-full"
            >
              <Download className="h-3.5 w-3.5" /> Export Forensic Audit CSV
            </Button>
          </div>
        </div>

        {/* Milestones Breakdown */}
        <div className="rounded-xl border border-border bg-card p-6 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Phase Milestones &
              Local Spend Verification
            </h3>
            <Button
              size="sm"
              onClick={addMilestone}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-4 w-4" /> Add Phase
            </Button>
          </div>

          <div className="space-y-3">
            {milestones.map((m, idx) => {
              const spentForeignEquivalent =
                parallelRate > 0 ? Math.round(m.spentLocal / parallelRate) : 0;
              const variance =
                m.allocatedForeign > 0 && m.spentLocal > 0
                  ? Math.round(
                      ((spentForeignEquivalent - m.allocatedForeign) /
                        m.allocatedForeign) *
                        100,
                    )
                  : 0;

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    m.completed
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={m.completed}
                        onChange={(e) =>
                          updateMilestone(idx, "completed", e.target.checked)
                        }
                        className="h-4 w-4 rounded accent-primary"
                      />
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) =>
                          updateMilestone(idx, "name", e.target.value)
                        }
                        className="text-sm font-semibold bg-transparent border-none text-foreground focus:outline-hidden"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={m.completed ? "default" : "outline"}
                        className={`text-[10px] ${m.completed ? "bg-emerald-600" : ""}`}
                      >
                        {m.completed
                          ? "Disbursed / Cleared"
                          : "Pending Inspection"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => removeMilestone(idx)}
                        className="text-muted-foreground hover:text-red-500 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-1">
                        Allocated ({sponsorCurrency})
                      </span>
                      <input
                        type="number"
                        value={m.allocatedForeign}
                        onChange={(e) =>
                          updateMilestone(
                            idx,
                            "allocatedForeign",
                            Number(e.target.value),
                          )
                        }
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-muted-foreground block mb-1">
                        Actual On-Site ({localCurrency})
                      </span>
                      <input
                        type="number"
                        value={m.spentLocal}
                        onChange={(e) =>
                          updateMilestone(
                            idx,
                            "spentLocal",
                            Number(e.target.value),
                          )
                        }
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 font-mono"
                      />
                    </div>

                    <div className="flex flex-col justify-center">
                      <span className="text-muted-foreground block mb-1">
                        Forensic Equiv. ({sponsorCurrency})
                      </span>
                      <div className="font-mono font-semibold text-foreground">
                        {spentForeignEquivalent.toLocaleString()}{" "}
                        {sponsorCurrency}
                        {m.spentLocal > 0 && (
                          <span
                            className={`ml-2 text-[10px] ${
                              variance > 0 ? "text-red-500" : "text-emerald-500"
                            }`}
                          >
                            ({variance > 0 ? `+${variance}%` : `${variance}%`})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Cross Navigation */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
          <Link
            to="/escrow"
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
          >
            ← View Milestone Escrow Vault
          </Link>
          <Link
            to="/water-tower-staging-estimator"
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
          >
            Water Tower Staging Estimator →
          </Link>
          <Link
            to="/electrical-conduit-wiring-estimator"
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
          >
            Electrical Conduit Router →
          </Link>
        </div>
      </Container>
    </div>
  );
}
