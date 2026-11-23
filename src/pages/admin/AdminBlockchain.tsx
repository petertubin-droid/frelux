// =========================================================
// Admin Blockchain — FRELUX PAY & FRELUX VERIFY Administration
// Real-time invoice monitoring, OTS calendar telemetry, and proof verification
// =========================================================

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import {
  Bitcoin,
  ShieldCheck,
  Activity,
  Search,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  FileText,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatBtc,
  formatSats,
  verifyBtcPayInvoice,
} from "@/lib/payments/btcpay";
import { verifyNowPaymentsInvoice } from "@/lib/payments/nowpayments";
import { verifyDocumentOnBlockchain } from "@/lib/blockchain/opentimestamps";

interface AdminInvoiceRow {
  id: string;
  invoice_id: string;
  user_id: string;
  purpose: string;
  plan_id?: string;
  billing_cycle?: string;
  amount_fiat: number;
  currency_fiat: string;
  amount_btc: number;
  amount_sats: number;
  status: string;
  btc_address?: string;
  provider?: string;
  created_at: string;
  expires_at: string;
  confirmed_at?: string;
}

interface AdminDocRecord {
  id: string;
  verification_id: string;
  document_type: string;
  document_title: string;
  document_hash: string;
  status: string;
  created_at: string;
  blockchain_timestamp_proofs?: Array<{
    bitcoin_block_height?: number;
    verification_status?: string;
  }>;
}

interface AdminVerificationLog {
  id: string;
  document_hash: string;
  verification_id?: string;
  result: string;
  verified_at: string;
}

interface CalendarPingState {
  status: "idle" | "checking" | "online" | "offline";
  latencyMs?: number;
}

const OTS_POOLS = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://alice.btc.calendar.opentimestamps.org",
];

export default function AdminBlockchain() {
  const [activeTab, setActiveTab] = useState<
    "invoices" | "timestamps" | "health"
  >("invoices");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<AdminInvoiceRow[]>([]);
  const [docs, setDocs] = useState<AdminDocRecord[]>([]);
  const [logs, setLogs] = useState<AdminVerificationLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [poolStatus, setPoolStatus] = useState<
    Record<string, CalendarPingState>
  >({
    "https://a.pool.opentimestamps.org": { status: "idle" },
    "https://b.pool.opentimestamps.org": { status: "idle" },
    "https://alice.btc.calendar.opentimestamps.org": { status: "idle" },
  });
  const [verifyingInvoiceId, setVerifyingInvoiceId] = useState<string | null>(
    null,
  );
  const [upgradingDocId, setUpgradingDocId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [invRes, docRes, logRes] = await Promise.all([
        supabase
          .from("crypto_payment_invoices")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("blockchain_document_records")
          .select(
            "*, blockchain_timestamp_proofs(bitcoin_block_height, verification_status)",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("blockchain_verification_logs")
          .select("*")
          .order("checked_at", { ascending: false })
          .limit(100),
      ]);

      if (invRes.data) setInvoices(invRes.data as AdminInvoiceRow[]);
      if (docRes.data) setDocs(docRes.data as AdminDocRecord[]);
      if (logRes.data)
        setLogs(logRes.data as unknown as AdminVerificationLog[]);
    } catch (err: unknown) {
      console.error("[admin-blockchain] fetch error:", err);
      toast.error("Failed to load blockchain administration records.");
    } finally {
      setLoading(false);
    }
  };

  const pingPools = async () => {
    const updated: Record<string, CalendarPingState> = {};
    for (const pool of OTS_POOLS) {
      updated[pool] = { status: "checking" };
    }
    setPoolStatus({ ...updated });

    for (const pool of OTS_POOLS) {
      const start = Date.now();
      try {
        const res = await fetch(`${pool.replace(/\/+$/, "")}/`, {
          method: "GET",
          signal: AbortSignal.timeout(4000),
        });
        updated[pool] = {
          status: res.status < 500 ? "online" : "offline",
          latencyMs: Date.now() - start,
        };
      } catch {
        updated[pool] = { status: "offline" };
      }
      setPoolStatus({ ...updated });
    }
    toast.success("OpenTimestamps calendar telemetry updated.");
  };

  const handleManualInvoiceVerify = async (
    invoiceId: string,
    provider?: string,
  ) => {
    setVerifyingInvoiceId(invoiceId);
    try {
      if (provider === "nowpayments") {
        const res = await verifyNowPaymentsInvoice(invoiceId);
        toast.success(`NOWPayments invoice ${invoiceId} status: ${res.status}`);
      } else {
        const res = await verifyBtcPayInvoice(invoiceId);
        toast.success(`BTCPay invoice ${invoiceId} status: ${res.status}`);
      }
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Verification error: ${msg}`);
    } finally {
      setVerifyingInvoiceId(null);
    }
  };

  const handleDocUpgradeCheck = async (verificationId: string) => {
    setUpgradingDocId(verificationId);
    try {
      const res = await verifyDocumentOnBlockchain({ verificationId });
      if (res.proof?.is_blockchain_confirmed) {
        toast.success(
          `Anchored in Bitcoin Block #${res.proof.bitcoin_block_height}!`,
        );
      } else {
        toast.info("Status: Bitcoin confirmation still pending.");
      }
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Upgrade check failed: ${msg}`);
    } finally {
      setUpgradingDocId(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered lists
  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.btc_address &&
        inv.btc_address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      inv.status.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalVolumeBtc = invoices
    .filter((i) => i.status === "Confirmed")
    .reduce((sum, i) => sum + (Number(i.amount_btc) || 0), 0);

  const totalVolumeSats = invoices
    .filter((i) => i.status === "Confirmed")
    .reduce((sum, i) => sum + (Number(i.amount_sats) || 0), 0);

  const totalConfirmedDocs = docs.filter(
    (d) => d.status === "Blockchain Verified",
  ).length;
  const pendingDocs = docs.filter(
    (d) => d.status !== "Blockchain Verified",
  ).length;
  const tamperedLogsCount = logs.filter((l) =>
    l.result?.includes("tampered"),
  ).length;

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bitcoin className="h-6 w-6 text-amber-500" />
            Blockchain & Bitcoin Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor FRELUX PAY settlements, OpenTimestamps Bitcoin proofs, and
            infrastructure health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "invoices"
              ? "border-brand-purple text-brand-purple font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bitcoin className="h-4 w-4" />
          FRELUX PAY Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab("timestamps")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "timestamps"
              ? "border-brand-purple text-brand-purple font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          FRELUX VERIFY Proofs ({docs.length})
        </button>
        <button
          onClick={() => setActiveTab("health")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "health"
              ? "border-brand-purple text-brand-purple font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-4 w-4" />
          Integration Telemetry & Health
        </button>
      </div>

      {/* Tab 1: Bitcoin Invoices */}
      {activeTab === "invoices" && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground uppercase">
                  Settled Bitcoin Volume
                </span>
                <div className="text-xl font-bold text-foreground mt-1 font-mono">
                  {formatBtc(totalVolumeBtc)} BTC
                </div>
                <span className="text-xs text-muted-foreground">
                  ≈ {formatSats(totalVolumeSats)} sats
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground uppercase">
                  Total Invoices
                </span>
                <div className="text-xl font-bold text-foreground mt-1">
                  {invoices.length}
                </div>
                <span className="text-xs text-muted-foreground">
                  Generated via Greenfield API
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground uppercase">
                  Confirmed / Settled
                </span>
                <div className="text-xl font-bold text-emerald-600 mt-1">
                  {invoices.filter((i) => i.status === "Confirmed").length}
                </div>
                <span className="text-xs text-muted-foreground">
                  Subscribed accounts active
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground uppercase">
                  Pending Mempool
                </span>
                <div className="text-xl font-bold text-amber-500 mt-1">
                  {
                    invoices.filter(
                      (i) =>
                        i.status === "Pending" || i.status === "Processing",
                    ).length
                  }
                </div>
                <span className="text-xs text-muted-foreground">
                  Awaiting confirmation
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              id="blockchain-search"
              aria-label="Search crypto invoices"
              type="text"
              placeholder="Search by invoice ID, address, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Invoices Table */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base font-semibold">
                Bitcoin Payment Ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Invoice ID</th>
                    <th className="py-2.5 px-3 font-medium">Gateway</th>
                    <th className="py-2.5 px-3 font-medium">Purpose / Plan</th>
                    <th className="py-2.5 px-3 font-medium">Amount BTC</th>
                    <th className="py-2.5 px-3 font-medium">Satoshis</th>
                    <th className="py-2.5 px-3 font-medium">Fiat Equivalent</th>
                    <th className="py-2.5 px-3 font-medium">
                      Destination Address
                    </th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium">Created At</th>
                    <th className="py-2.5 px-3 font-medium text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                        {inv.invoice_id}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {inv.provider === "nowpayments"
                            ? "NOWPayments"
                            : "BTCPay"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 capitalize">
                        {inv.plan_id
                          ? `${inv.plan_id} (${inv.billing_cycle})`
                          : inv.purpose}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-500">
                        {formatBtc(inv.amount_btc)} BTC
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {formatSats(inv.amount_sats)}
                      </td>
                      <td className="py-2.5 px-3">
                        ${inv.amount_fiat.toFixed(2)} {inv.currency_fiat}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {inv.btc_address || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            inv.status === "Confirmed"
                              ? "default"
                              : inv.status === "Processing"
                                ? "secondary"
                                : inv.status === "Expired" ||
                                    inv.status === "Failed"
                                  ? "destructive"
                                  : "outline"
                          }
                          className="text-[10px]"
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] px-2"
                          disabled={verifyingInvoiceId === inv.invoice_id}
                          onClick={() =>
                            // The row already knows its provider and the table
                            // prints it, so verification must follow that same
                            // field. Without it every NOWPayments invoice was
                            // sent to the BTCPay verifier.
                            handleManualInvoiceVerify(
                              inv.invoice_id,
                              inv.provider,
                            )
                          }
                        >
                          {verifyingInvoiceId === inv.invoice_id ? (
                            <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="h-3 w-3 mr-1" />
                          )}
                          Verify
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No Bitcoin invoices found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Document Proofs */}
      {activeTab === "timestamps" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground uppercase">
                  Confirmed Bitcoin Anchors
                </span>
                <div className="text-xl font-bold text-emerald-600 mt-1">
                  {totalConfirmedDocs}
                </div>
                <span className="text-xs text-muted-foreground">
                  Block attestation verified
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground uppercase">
                  Pending Calendar Maturation
                </span>
                <div className="text-xl font-bold text-blue-600 mt-1">
                  {pendingDocs}
                </div>
                <span className="text-xs text-muted-foreground">
                  Submitted to OpenTimestamps
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground uppercase">
                  Tamper / Mismatch Alerts
                </span>
                <div className="text-xl font-bold text-destructive mt-1">
                  {tamperedLogsCount}
                </div>
                <span className="text-xs text-muted-foreground">
                  Audit log integrity alerts
                </span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Stamped Construction Documents
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Cryptographically registered BOQs and estimates anchored in
                  Bitcoin.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Verification ID</th>
                    <th className="py-2.5 px-3 font-medium">Document Title</th>
                    <th className="py-2.5 px-3 font-medium">Type</th>
                    <th className="py-2.5 px-3 font-medium">
                      SHA-256 Fingerprint
                    </th>
                    <th className="py-2.5 px-3 font-medium">Block Height</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium">Stamped At</th>
                    <th className="py-2.5 px-3 font-medium text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {docs.map((doc) => {
                    const blockHeight =
                      doc.blockchain_timestamp_proofs?.[0]
                        ?.bitcoin_block_height;
                    return (
                      <tr key={doc.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-semibold text-brand-purple">
                          {doc.verification_id}
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          {doc.document_title}
                        </td>
                        <td className="py-2.5 px-3 uppercase text-muted-foreground">
                          {doc.document_type}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground truncate max-w-[140px]">
                          {doc.document_hash}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {blockHeight ? `#${blockHeight}` : "Pending"}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              doc.status === "Blockchain Verified"
                                ? "default"
                                : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {doc.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            disabled={upgradingDocId === doc.verification_id}
                            onClick={() =>
                              handleDocUpgradeCheck(doc.verification_id)
                            }
                          >
                            {upgradingDocId === doc.verification_id ? (
                              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-1" />
                            )}
                            Check Block
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {docs.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No documents stamped on blockchain yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Health & Settings */}
      {activeTab === "health" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base font-semibold">
                BTCPay Server Greenfield Rail
              </CardTitle>
              <CardDescription>
                Server-to-server connection parameters for Bitcoin settlement
                and lightning readiness.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground font-medium">
                  API URL (Greenfield v1)
                </span>
                <span className="font-mono text-foreground">
                  Configured via BTCPAY_URL
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground font-medium">
                  Store Identifier
                </span>
                <span className="font-mono text-foreground">
                  Configured via BTCPAY_STORE_ID
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground font-medium">
                  Webhook Endpoint
                </span>
                <span className="font-mono text-foreground">
                  /functions/v1/btcpay-webhook
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground font-medium">
                  Webhook Signature Verification
                </span>
                <Badge variant="outline" className="text-[10px]">
                  HMAC-SHA256 (BTCPay-Sig)
                </Badge>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Lightning Network Readiness
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  Architecture Ready (Pending Lightning Node Connect)
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  OpenTimestamps Attestation Pools
                </CardTitle>
                <CardDescription>
                  Public decentralized calendar servers used for Bitcoin Merkle
                  aggregation.
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={pingPools}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Ping Pools Now
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              {OTS_POOLS.map((pool) => {
                const st = poolStatus[pool] || { status: "idle" };
                return (
                  <div
                    key={pool}
                    className="flex items-center justify-between py-1.5 border-b border-border font-mono"
                  >
                    <span className="truncate max-w-[280px] sm:max-w-none">
                      {pool}
                    </span>
                    <div className="flex items-center gap-2">
                      {st.latencyMs !== undefined && (
                        <span className="text-[10px] text-muted-foreground">
                          {st.latencyMs}ms
                        </span>
                      )}
                      <Badge
                        variant={
                          st.status === "online"
                            ? "default"
                            : st.status === "checking"
                              ? "secondary"
                              : st.status === "offline"
                                ? "destructive"
                                : "outline"
                        }
                        className="text-[10px]"
                      >
                        {st.status === "online"
                          ? "Online"
                          : st.status === "checking"
                            ? "Pinging..."
                            : st.status === "offline"
                              ? "Unreachable"
                              : "Ready"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
