import React, { useState } from "react";
import { useSeo } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";
import {
  ShieldCheck,
  Server,
  Download,
  Trash2,
  Globe2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  Database,
  ExternalLink,
} from "lucide-react";
import {
  REGIONAL_ENDPOINTS,
  getActiveResidencyProfile,
  saveResidencyProfile,
  auditCrossBorderTransfer,
  executeRightToBeForgotten,
  generateMachineReadableExport,
  type DataResidencyRegion,
} from "@/lib/compliance/data-residency-router";

export default function DataResidencyCenter() {
  const { t } = useLanguage();
  useSeo({
    title: "Data Residency Planning Prototype | FRELUX",
    description:
      "Multi-jurisdictional geographic data residency layer. Enforce GDPR, CCPA/CPRA, and African regional data localization policies with Article 17 right-to-be-forgotten and Article 20 portability.",
  });

  const [profile, setProfile] = useState(getActiveResidencyProfile);
  const [selectedRegion, setSelectedRegion] = useState<DataResidencyRegion>(
    profile.assignedRegion,
  );
  const [targetAuditRegion, setTargetAuditRegion] =
    useState<DataResidencyRegion>("us-west-2");
  const [erasureEmail, setErasureEmail] = useState("");
  const [erasureResult, setErasureResult] = useState<ReturnType<
    typeof executeRightToBeForgotten
  > | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const activeEndpoint = REGIONAL_ENDPOINTS[selectedRegion];
  const auditResult = auditCrossBorderTransfer(
    selectedRegion,
    targetAuditRegion,
  );

  const handleSaveRegion = () => {
    const updated = saveResidencyProfile({
      assignedRegion: selectedRegion,
      clientJurisdiction: activeEndpoint.jurisdiction,
    });
    setProfile(updated);
    setSaveFeedback(
      `Routing boundary locked to ${activeEndpoint.regionName}. Intra-region storage active.`,
    );
    setTimeout(() => setSaveFeedback(null), 4000);
  };

  const handleToggleDoNotSell = () => {
    const updated = saveResidencyProfile({
      doNotSellOrShare: !profile.doNotSellOrShare,
    });
    setProfile(updated);
  };

  const handleExportData = () => {
    setIsExporting(true);
    setTimeout(() => {
      const data = generateMachineReadableExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `frelux-data-export-${selectedRegion}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
    }, 600);
  };

  const handleExecuteErasure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!erasureEmail) return;
    const res = executeRightToBeForgotten(erasureEmail);
    setErasureResult(res);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="Multi-Jurisdictional Architecture"
        title={t("Data Residency Planning Prototype")}
        subtitle="Explore a regional residency-planning prototype and local privacy-request helpers. This page does not route production data or establish legal compliance."
        image="/assets/headers/structural.jpg"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Legal & Compliance", path: "/legal/privacy" },
          { label: "Data Residency" },
        ]}
      />

      <Container className="py-10 space-y-10">
        {/* Important Architectural Notice */}
        <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 text-sm">
              <h3 className="font-semibold text-foreground text-base">
                {t("Multi-Jurisdictional Data Boundary Architecture")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                This is a planning prototype only. FRELUX does not currently
                route project data to the regional clusters shown here, and the
                listed endpoints are illustrative rather than deployed
                infrastructure. This page cannot establish GDPR, CCPA/CPRA, or
                other jurisdictional compliance.
              </p>
              <p className="text-xs text-muted-foreground/80 pt-1">
                No regional hosting, transfer mechanism, or contractual
                safeguard is configured by this demo. Confirm actual processing
                locations and obtain qualified legal advice before relying on
                any compliance representation.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Regional Cluster Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />{" "}
                  {t("Illustrative Regional Profile (Not Connected)")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Select your project workspace data boundary to enforce statutory data isolation.",
                  )}
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                {t("Residency Enforced")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.keys(REGIONAL_ENDPOINTS) as DataResidencyRegion[]).map(
                (regKey) => {
                  const ep = REGIONAL_ENDPOINTS[regKey];
                  const isSelected = selectedRegion === regKey;
                  return (
                    <div
                      key={regKey}
                      onClick={() => setSelectedRegion(regKey)}
                      className={`cursor-pointer rounded-xl p-4 border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/70 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-foreground text-sm">
                          {ep.regionName}
                        </div>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {ep.governingLaw}
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {ep.edgeLatencyMs}ms
                          edge
                        </span>
                        {ep.strictResidencyEnforced && (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {t("Strict Boundary")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div className="text-xs text-muted-foreground">
                Assigned Database:{" "}
                <code className="text-foreground">
                  {activeEndpoint.databaseCluster}
                </code>
              </div>
              <Button
                onClick={handleSaveRegion}
                size="sm"
                className="font-medium"
              >
                {t("Save & Lock Data Boundary")}
              </Button>
            </div>
            {saveFeedback && (
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium border border-emerald-500/20">
                {saveFeedback}
              </div>
            )}
          </div>

          {/* Telemetry / Boundary Details */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />{" "}
              {t("Boundary Telemetry")}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="text-muted-foreground font-medium">
                  {t("Jurisdiction")}
                </div>
                <div className="font-semibold text-foreground text-sm mt-0.5">
                  {activeEndpoint.jurisdiction}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="text-muted-foreground font-medium">
                  {t("Governing Statute")}
                </div>
                <div className="font-semibold text-foreground text-sm mt-0.5">
                  {activeEndpoint.governingLaw}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="text-muted-foreground font-medium">
                  {t("Isolated Media Bucket")}
                </div>
                <div className="font-mono text-foreground text-xs mt-0.5 truncate">
                  {activeEndpoint.documentBucket}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                {t("Mandatory Regional Rules")}
              </h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {activeEndpoint.crossBorderTransferRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-primary font-bold">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2: Cross-Border Transfer Compliance Validator */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-primary" />{" "}
                {t("Cross-Border Data Transfer Auditor")}
              </h3>
              <p className="text-sm text-muted-foreground">
                Verify compliance before moving project estimates or escrow
                metadata between international offices.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Simulate target node:
              </span>
              <select
                value={targetAuditRegion}
                onChange={(e) =>
                  setTargetAuditRegion(e.target.value as DataResidencyRegion)
                }
                className="text-xs rounded-md border border-input bg-card px-2.5 py-1.5"
              >
                {(Object.keys(REGIONAL_ENDPOINTS) as DataResidencyRegion[]).map(
                  (r) => (
                    <option key={r} value={r}>
                      {REGIONAL_ENDPOINTS[r].regionName}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {auditResult.requiresSCC ? (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />{" "}
                  {t("Standard Contractual Clauses (SCC Annex B) Mandated")}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />{" "}
                  {t("Intra-Region / Compliant Transit")}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {auditResult.disclosure}
            </p>
          </div>
        </div>

        {/* Section 3: Statutory Rights - Right to be Forgotten & Portability */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Article 20 / CCPA Portability */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">
                  {t("GDPR Article 20 / CCPA Portability")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Export machine-readable JSON containing all BOQs, material
                  calculations, and escrow ledgers.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Provides an immutable structured data archive conforming to
              Article 20 interoperability standards. Compatible with commercial
              enterprise auditing suites and third-party quantity surveyors.
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ccpa-opt-out"
                  checked={profile.doNotSellOrShare}
                  onChange={handleToggleDoNotSell}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <label
                  htmlFor="ccpa-opt-out"
                  className="text-xs font-medium text-foreground cursor-pointer"
                >
                  {t("CCPA Do Not Sell/Share My Info (Active)")}
                </label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                disabled={isExporting}
                className="font-medium gap-1.5"
              >
                <FileText className="w-4 h-4" />{" "}
                {isExporting ? "Generating..." : "Export JSON"}
              </Button>
            </div>
          </div>

          {/* Article 17 Right to be Forgotten */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">
                  Article 17 "Right to be Forgotten"
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cryptographically purge user records, local caches, and
                  tombstone escrow milestones.
                </p>
              </div>
            </div>

            {erasureResult ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />{" "}
                  {t("Erasure Executed Successfully")}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    Confirmation Token:{" "}
                    <code className="text-foreground">
                      {erasureResult.confirmationToken}
                    </code>
                  </div>
                  <div>
                    {t("Cached projects & estimates purged from edge device.")}
                  </div>
                  <div>
                    {t(
                      "Audit record preserved under legal compliance exemptions (Article 17(3)(b)).",
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecuteErasure} className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enter your email to verify identity and initiate complete
                  cascade erasure across edge caches and regional databases.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder={t("Enter email to confirm...")}
                    value={erasureEmail}
                    onChange={(e) => setErasureEmail(e.target.value)}
                    className="flex-1 text-xs rounded-md border border-input bg-card px-3 py-2"
                  />
                  <Button
                    type="submit"
                    variant="destructive"
                    size="sm"
                    className="font-medium shrink-0"
                  >
                    {t("Purge All Records")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
