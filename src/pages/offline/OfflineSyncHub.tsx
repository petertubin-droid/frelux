import React, { useState, useEffect } from "react";
import { useSeo } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  Layers,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  CloudLightning,
  Sparkles,
} from "lucide-react";
import {
  isEdgeOnline,
  setSimulatedOffline,
  getSimulatedOffline,
  getQueuedMutations,
  enqueueMutation,
  processQueuedMutations,
  preCacheJobsitePackage,
  getCachedJobsitePrices,
  estimateOfflineStorageBytes,
  type OfflineMutation,
} from "@/lib/offline/edge-sync-engine";

export default function OfflineSyncHub() {
  const { t } = useLanguage();
  useSeo({
    title: "Offline Workbench Prototype | FRELUX",
    description:
      "Zero-latency offline computation for remote jobsites, deep basements, and emerging market network drops. Resilient IndexedDB caching, vector clock sequencing, and 3-way structural conflict resolution.",
  });

  const [online, setOnline] = useState(isEdgeOnline);
  const [simOffline, setSimOffline] = useState(getSimulatedOffline);
  const [mutations, setMutations] =
    useState<OfflineMutation[]>(getQueuedMutations);
  const [storageBytes, setStorageBytes] = useState(estimateOfflineStorageBytes);
  const [cachedPrices, setCachedPrices] = useState(() =>
    getCachedJobsitePrices("NG"),
  );
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState("NG");

  useEffect(() => {
    const handleStatus = () => {
      setOnline(isEdgeOnline());
      setMutations(getQueuedMutations());
      setStorageBytes(estimateOfflineStorageBytes());
    };
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  const handleToggleSimulatedOffline = () => {
    const next = !simOffline;
    setSimulatedOffline(next);
    setSimOffline(next);
    setOnline(isEdgeOnline());
    setSyncStatusMsg(
      next
        ? "Simulating remote jobsite network blackout. Webhooks & API calls will safely buffer locally."
        : "Network connection restored. Background synchronizer ready to flush queued mutations.",
    );
  };

  const handleCreateTestOfflineRecord = (
    type: "measurement" | "boq_edit" | "escrow_note",
  ) => {
    let mut: OfflineMutation;
    if (type === "measurement") {
      mut = enqueueMutation(
        "field_measurement",
        `meas_${Date.now()}`,
        "create",
        {
          wallLengthM: 18.5,
          heightM: 3.2,
          location: "Basement Column Grid B-4",
          timestamp: new Date().toISOString(),
        },
      );
    } else if (type === "boq_edit") {
      mut = enqueueMutation("boq_item", `boq_item_${Date.now()}`, "update", {
        itemName: "16mm High-Yield Deformed Rebar",
        quantity: 120,
        unitPrice: 14500,
        concurrentRemoteEdit: true, // triggers conflict demonstration
      });
    } else {
      mut = enqueueMutation(
        "escrow_verification",
        `escrow_step_${Date.now()}`,
        "update",
        {
          milestoneId: "ms_roof_casting",
          verificationPhotos: ["photo_roof_beam_inspection.jpg"],
          foremanSigned: true,
        },
      );
    }

    setMutations(getQueuedMutations());
    setStorageBytes(estimateOfflineStorageBytes());
    setSyncStatusMsg(
      `Buffered ${type} to edge storage. Mutation ID: ${mut.id}`,
    );
  };

  const handleTriggerSync = () => {
    const res = processQueuedMutations();
    setMutations(getQueuedMutations());
    setStorageBytes(estimateOfflineStorageBytes());
    if (res.processed === 0 && res.stillQueued > 0) {
      setSyncStatusMsg(
        `Sync aborted: Client is currently in offline mode. ${res.stillQueued} records preserved safely.`,
      );
    } else {
      setSyncStatusMsg(
        `Synchronizer completed: ${res.synced} mutations processed, ${res.conflictsResolved} structural conflicts resolved without data loss.`,
      );
    }
  };

  const handlePreCachePrices = () => {
    const res = preCacheJobsitePackage(selectedMarket);
    setCachedPrices(res);
    setStorageBytes(estimateOfflineStorageBytes());
    setSyncStatusMsg(
      `Successfully pre-cached ${selectedMarket} material price books & seasonal climate baselines for offline access.`,
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="Resilient Site Infrastructure"
        title={t("Offline Workbench Prototype")}
        subtitle="Explore local-storage queue behavior and sample market data. This workbench is a prototype; it does not provide production offline sync or server reconciliation."
        image="/assets/headers/ai.jpg"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Tools", path: "/calculators" },
          { label: "Offline Edge Sync" },
        ]}
      />

      <Container className="py-10 space-y-10">
        <div
          role="note"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground"
        >
          <strong>Prototype limitation:</strong> queue actions and connectivity
          toggles are local browser simulations. Reconnect does not upload to a
          server, and clearing the demo queue may discard its local entries. Do
          not use this page for field records or safety-critical data.
        </div>
        {/* Status & Signal Controller Banner */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-2xl shrink-0 ${
                online
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-rose-500/10 text-rose-600"
              }`}
            >
              {online ? (
                <Wifi className="w-7 h-7" />
              ) : (
                <WifiOff className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  Edge Connectivity State:{" "}
                  {online ? "Connected (5G / Fiber)" : "Offline / Remote Site"}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    online
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                  }`}
                >
                  {online ? "Auto-Sync Active" : "Edge Local Storage Active"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {online
                  ? "Cloud webhooks and live database channels are operating normally."
                  : "Calculations continue with zero latency using local cached schemas and merchant price tables."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant={simOffline ? "default" : "outline"}
              onClick={handleToggleSimulatedOffline}
              className="gap-2 text-xs font-semibold"
            >
              {simOffline ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              {simOffline
                ? "Exit Signal Drop Simulation"
                : "Simulate Jobsite Signal Drop"}
            </Button>
            <Button
              variant="outline"
              onClick={handleTriggerSync}
              className="gap-2 text-xs font-semibold"
            >
              <RefreshCw className="w-4 h-4" /> {t("Sync Now")}
            </Button>
          </div>
        </div>

        {syncStatusMsg && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs font-medium text-foreground flex items-center gap-2.5">
            <CloudLightning className="w-4 h-4 text-primary shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
        )}

        {/* 3 Core Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-primary font-bold text-base">
              <Database className="w-5 h-5" /> {t("Local Edge Storage")}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This demo stores its sample queue in browser localStorage. It does
              not prove that Frelux calculators or BOQs work fully offline, and
              no IndexedDB-backed production cache is configured.
            </p>
            <div className="pt-2 text-xs text-muted-foreground font-mono">
              Footprint:{" "}
              <strong className="text-foreground">
                {(storageBytes / 1024).toFixed(1)} KB
              </strong>{" "}
              buffered
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-primary font-bold text-base">
              <Layers className="w-5 h-5" /> {t("Vector Lamport Clock")}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The demo assigns a local sequence value to sample mutations. It is
              not a durable distributed clock and does not guarantee ordering
              across devices or reloads.
            </p>
            <div className="pt-2 text-xs text-muted-foreground font-mono">
              Pending Queue:{" "}
              <strong className="text-foreground">
                {mutations.length} mutations
              </strong>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-primary font-bold text-base">
              <GitMerge className="w-5 h-5" /> 3-Way Structural Merge
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The workbench demonstrates a local merge example only. It does not
              compare against a server version or safely resolve concurrent
              production edits.
            </p>
            <div className="pt-2 text-xs text-emerald-600 font-medium">
              Demo Merge Only — No Server Reconciliation
            </div>
          </div>
        </div>

        {/* Section 2: Interactive Offline Testing Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Action Panel */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />{" "}
                {t("Jobsite Field Simulator")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simulate actions taken by site foremen while underground or out
                of cellular coverage.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateTestOfflineRecord("measurement")}
                className="text-xs font-medium h-auto py-2.5 flex flex-col gap-1 text-center"
              >
                <span>{t("Record Measurement")}</span>
                <span className="text-[10px] text-muted-foreground">
                  {t("Laser beam capture")}
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateTestOfflineRecord("boq_edit")}
                className="text-xs font-medium h-auto py-2.5 flex flex-col gap-1 text-center"
              >
                <span>{t("Edit BOQ Quantities")}</span>
                <span className="text-[10px] text-muted-foreground">
                  {t("Concurrent line update")}
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateTestOfflineRecord("escrow_note")}
                className="text-xs font-medium h-auto py-2.5 flex flex-col gap-1 text-center"
              >
                <span>{t("Log Escrow Proof")}</span>
                <span className="text-[10px] text-muted-foreground">
                  {t("Milestone clearance")}
                </span>
              </Button>
            </div>

            {/* Mutation Queue Viewer */}
            <div className="pt-3 border-t border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Pending Mutation Queue ({mutations.length})
                </h4>
                {mutations.length > 0 && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    {t("Buffered in IndexedDB/Storage")}
                  </span>
                )}
              </div>

              {mutations.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                  {t(
                    "Queue is clear. All calculations and milestone records are synchronized.",
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {mutations.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl border border-border/70 bg-muted/30 text-xs space-y-1 font-mono"
                    >
                      <div className="flex items-center justify-between text-foreground font-semibold">
                        <span>
                          {m.entityType} ({m.action})
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary">
                          Clock #{m.lamportClock}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[11px] truncate">
                        ID: {m.entityId} • {m.clientTimestamp.substring(11, 19)}{" "}
                        UTC
                      </div>
                      {m.conflictAudit && (
                        <div className="text-[11px] text-emerald-600 mt-1 font-sans">
                          ✓ {m.conflictAudit.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Regional Pre-Cache Console */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-primary" />{" "}
                {t("Pre-Cache Jobsite Material Books")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download high-confidence material price books and seasonal
                weather baselines before driving to remote sites.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="text-xs rounded-md border border-input bg-card px-3 py-2 flex-1"
              >
                <option value="NG">{t("Nigeria (NGN - Lagos / Abuja)")}</option>
                <option value="KE">
                  {t("Kenya (KES - Nairobi / Mombasa)")}
                </option>
                <option value="GH">{t("Ghana (GHS - Accra / Kumasi)")}</option>
                <option value="GB">{t("United Kingdom (GBP - London)")}</option>
                <option value="US">
                  {t("United States (USD - Atlanta / Dallas)")}
                </option>
              </select>
              <Button
                size="sm"
                onClick={handlePreCachePrices}
                className="font-medium shrink-0"
              >
                {t("Download Offline Pack")}
              </Button>
            </div>

            {cachedPrices && (
              <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>Cached Material Table ({cachedPrices.marketCode})</span>
                  <span className="text-muted-foreground font-normal">
                    {new Date(cachedPrices.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {Object.entries(cachedPrices.materials).map(([mat, data]) => (
                    <div
                      key={mat}
                      className="p-2 rounded bg-card border border-border/50"
                    >
                      <div className="text-muted-foreground text-[10px] capitalize">
                        {mat.replace(/_/g, " ")}
                      </div>
                      <div className="font-bold text-foreground">
                        {cachedPrices.currency} {data.price.toLocaleString()} /{" "}
                        {data.unit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
