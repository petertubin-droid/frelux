import React, { useState } from "react";
import { useSeo } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/shadcn/button";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  ArrowRight,
  Camera,
  Check,
  Clock,
  Globe2,
  Building2,
  FileCheck2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import {
  DEMO_ESCROW_CONTRACT,
  calculateEscrowSummary,
  type EscrowMilestone,
} from "@/lib/payments/diaspora-escrow";
import { formatByCode } from "@/lib/international/currency-format";
import { useLanguage } from "@/lib/i18n";

export default function DiasporaEscrow() {
  const { t } = useLanguage();
  useSeo({
    title: "Cross-Border Diaspora Escrow | FRELUX Global Enterprise",
    description:
      "Milestone-based international construction funding loop. Fund securely in USD/GBP/EUR and release local contractor payouts on verified milestone clearances.",
  });

  const [contract, setContract] = useState(DEMO_ESCROW_CONTRACT);
  const [activeTab, setActiveTab] = useState<
    "milestones" | "forensic_photos" | "financial_audit"
  >("milestones");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(
    contract.milestones[1].id,
  );
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const summary = calculateEscrowSummary(contract);
  const selectedMilestone =
    contract.milestones.find((m) => m.id === selectedMilestoneId) ||
    contract.milestones[0];

  const handleReleaseMilestone = (milestoneId: string) => {
    setContract((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m) => {
        if (m.id === milestoneId) {
          return {
            ...m,
            status: "released",
            releasedAt: new Date().toISOString(),
          };
        }
        return m;
      }),
    }));
    setActionSuccess(
      `Simulated clearance: Milestone ${milestoneId} marked released in this session preview. Real fund movement requires linking an authorized licensed escrow custody partner.`,
    );
    setTimeout(() => setActionSuccess(null), 5000);
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Premium Hero with Subtle Background Image Texture */}
      <div className="relative border-b border-border/40 bg-gradient-to-b from-card/80 to-background">
        <div
          className="absolute inset-0 opacity-10 bg-cover bg-center pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
        <Container className="relative py-12">
          <PageHeader
            eyebrow="Diaspora Global Infrastructure"
            title={t("Cross-Border Construction Escrow")}
            subtitle="Secure diaspora funding loops for transatlantic & overseas developments. Lock funds in hard currency and release local contractor disbursements only when verified site milestones are cleared."
            breadcrumbs={[
              { label: "Home", path: "/" },
              { label: "Pro Connect", path: "/pro-connect" },
              { label: "Diaspora Escrow" },
            ]}
          />
        </Container>
      </div>

      <Container className="py-10 space-y-8">
        {actionSuccess && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Contract Header Card */}
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {contract.id}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {t("Initiated Oct 2026")}
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground mt-2">
                {contract.contractTitle}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-500">
                <ShieldCheck className="h-4 w-4" /> Interactive Simulation ·
                Sandbox Preview
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border/50">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {t("Diaspora Client")}
              </span>
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Globe2 className="h-4 w-4 text-primary" />{" "}
                {contract.diasporaClientName}
              </p>
              <p className="text-xs text-muted-foreground">
                {contract.diasporaClientLocation}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {t("Local Executing Contractor")}
              </span>
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />{" "}
                {contract.localContractorName}
              </p>
              <p className="text-xs text-muted-foreground">
                Certified Builder (Region: {contract.localContractorCountry})
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {t("Locked Escrow Pool")}
              </span>
              <p className="text-base font-bold text-foreground">
                {formatByCode(summary.totalFunded, contract.sourceCurrency)}
              </p>
              <p className="text-xs text-emerald-500 font-medium">
                {formatByCode(summary.releasedFunded, contract.sourceCurrency)}{" "}
                released ({summary.completionPercentage}%)
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {t("Target Local Payout")}
              </span>
              <p className="text-base font-bold text-foreground">
                {formatByCode(summary.totalPayout, contract.localCurrency)}
              </p>
              <p className="text-xs text-muted-foreground">
                Locked FX: 1 {contract.sourceCurrency} ={" "}
                {formatByCode(
                  contract.milestones[0]?.fxRateLocked ??
                    contract.totalLocalPayout / contract.totalFundedSource,
                  contract.localCurrency,
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Main Interface Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Milestones Navigation List */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {t("Execution Milestones")}
              </h3>
              <span className="text-xs font-semibold text-primary">
                {contract.milestones.length} Phases Total
              </span>
            </div>

            <div className="space-y-3">
              {contract.milestones.map((milestone, idx) => {
                const isSelected = milestone.id === selectedMilestoneId;
                const isReleased = milestone.status === "released";
                const isPending =
                  milestone.status === "pending_client_approval";

                return (
                  <button
                    key={milestone.id}
                    onClick={() => setSelectedMilestoneId(milestone.id)}
                    className={`w-full text-left rounded-xl p-4 border transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        Phase {idx + 1}
                      </span>
                      {isReleased && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <Check className="h-3 w-3" /> {t("Released")}
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <Clock className="h-3 w-3" /> {t("Action Needed")}
                        </span>
                      )}
                      {milestone.status === "funded_locked" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <Lock className="h-3 w-3" /> {t("Locked")}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-foreground mt-1 line-clamp-1">
                      {milestone.phaseName}
                    </h4>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-2 border-t border-border/40">
                      <span>
                        {formatByCode(
                          milestone.fundedAmount,
                          milestone.sourceCurrency,
                        )}
                      </span>
                      <span>
                        ≈{" "}
                        {formatByCode(
                          milestone.localPayoutAmount,
                          milestone.localCurrency,
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Milestone Forensic Detail */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    {t("Milestone Details & Verification")}
                  </span>
                  <h3 className="text-lg font-bold text-foreground mt-1">
                    {selectedMilestone.phaseName}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">
                    {t("Custody Allocation")}
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {formatByCode(
                      selectedMilestone.fundedAmount,
                      selectedMilestone.sourceCurrency,
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("Deliverable Scope")}
                </span>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {selectedMilestone.description}
                </p>
              </div>

              {selectedMilestone.foremanNotes && (
                <div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <FileCheck2 className="h-4 w-4 text-primary" />{" "}
                    {t("On-Site Lead Engineer Log")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedMilestone.foremanNotes}
                  </p>
                </div>
              )}

              {/* Forensic Verification Photos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-primary" /> Verified
                    Forensic Site Imagery (
                    {selectedMilestone.verificationPhotos.length})
                  </span>
                  <span className="text-xs text-emerald-500 font-medium">
                    {t("Digital Watermark & GPS Checked")}
                  </span>
                </div>

                {selectedMilestone.verificationPhotos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedMilestone.verificationPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative rounded-xl border border-border overflow-hidden bg-muted"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption}
                          className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="p-3 bg-card border-t border-border">
                          <p className="text-xs font-medium text-foreground line-clamp-1">
                            {photo.caption}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            Foreman verified · GPS cleared
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
                    <Camera className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Forensic imagery will be uploaded by the site supervisor
                      once this phase progresses.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Banner */}
              <div className="pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {t("Conversion on release")}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Contractor receives{" "}
                    {formatByCode(
                      selectedMilestone.localPayoutAmount,
                      selectedMilestone.localCurrency,
                    )}
                  </span>
                </div>

                <div>
                  {selectedMilestone.status === "released" ? (
                    <Button
                      disabled
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-500"
                    >
                      <Check className="h-4 w-4 mr-2" /> {t("Funds Released")}
                    </Button>
                  ) : selectedMilestone.status === "pending_client_approval" ? (
                    <Button
                      onClick={() =>
                        handleReleaseMilestone(selectedMilestone.id)
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      <ShieldCheck className="h-4 w-4 mr-2" />{" "}
                      {t("Clear Milestone & Release Payout")}
                    </Button>
                  ) : (
                    <Button disabled variant="outline">
                      <Lock className="h-4 w-4 mr-2" /> {t("Locked In Custody")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
