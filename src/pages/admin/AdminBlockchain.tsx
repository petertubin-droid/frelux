// =========================================================
// Admin Blockchain — FRELUX PAY & FRELUX VERIFY Administration
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
} from "lucide-react";
import { toast } from "sonner";
import { formatBtc, formatSats } from "@/lib/payments/btcpay";

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

export default function AdminBlockchain() {
  const [activeTab, setActiveTab] = useState<
    "invoices" | "timestamps" | "health"
  >("invoices");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<AdminInvoiceRow[]>([]);
  const [docs, setDocs] = useState<AdminDocRecord[]>([]);
  const [logs, setLogs] = useState<AdminVerificationLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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
          .order("verified_at", { ascending: false })
          .limit(100),
      ]);

      if (invRes.data) setInvoices(invRes.data as AdminInvoiceRow[]);
      if (docRes.data) setDocs(docRes.data as AdminDocRecord[]);
      if (logRes.data) setLogs(logRes.data as AdminVerificationLog[]);
    } catch (err: unknown) {
      console.error("[admin-blockchain] fetch error:", err);
      toast.error("Failed to load blockchain administration records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Invoice calculations
  const totalSettledCount = invoices.filter(
    (i) => i.status === "Confirmed",
  ).length;
  const totalBtcReceived = invoices
    .filter((i) => i.status === "Confirmed")
    .reduce((sum, i) => sum + (Number(i.amount_btc) || 0), 0);
  const pendingCount = invoices.filter(
    (i) => i.status === "Pending" || i.status === "Processing",
  ).length;

  // Document calculations
  const totalConfirmedDocs = docs.filter(
    (d) => d.status === "Blockchain Verified",
  ).length;
  const pendingDocs = docs.filter(
    (d) => d.status !== "Blockchain Verified",
  ).length;
  const tamperedLogsCount = logs.filter(
    (l) => l.result === "tampered_mismatch",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bitcoin className="h-6 w-6 text-amber-500" />
            Blockchain & Bitcoin Operations
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage FRELUX PAY (BTCPay Server) payment invoices and FRELUX VERIFY
            (OpenTimestamps) document attestations.
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-4">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "invoices"
              ? "border-brand-purple text-brand-purple font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bitcoin className="h-4 w-4" />
          Bitcoin Payments (FRELUX PAY)
        </button>
        <button
          onClick={() => setActiveTab("timestamps")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "timestamps"
              ? "border-brand-purple text-brand-purple font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Document Timestamps (FRELUX VERIFY)
        </button>
        <button
          onClick={() => setActiveTab("health")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "health"
              ? "border-brand-purple text-brand-purple font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-4 w-4" />
          Integration Health & Node Status
        </button>
      </div>

      {/* Tab 1: Bitcoin Payments */}
      {activeTab === "invoices" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground uppercase">
                  Total BTC Settled
                </span>
                <div className="text-xl font-bold font-mono text-amber-500 mt-1">
                  ₿ {formatBtc(totalBtcReceived)}
                </div>
                <span className="text-xs text-muted-foreground">
                  {totalSettledCount} invoices
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground uppercase">
                  Pending Invoices
                </span>
                <div className="text-xl font-bold text-foreground mt-1">
                  {pendingCount}
                </div>
                <span className="text-xs text-muted-foreground">
                  Awaiting mempool / confirmations
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground uppercase">
                  Total Invoices Generated
                </span>
                <div className="text-xl font-bold text-foreground mt-1">
                  {invoices.length}
                </div>
                <span className="text-xs text-muted-foreground">
                  Across all subscription tiers
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground uppercase">
                  Conversion Currency
                </span>
                <div className="text-xl font-bold text-foreground mt-1">
                  USD / BTC
                </div>
                <span className="text-xs text-muted-foreground">
                  Greenfield Exchange Rate Lock
                </span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Payment Invoices
                </CardTitle>
                <div className="w-64">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search invoice or user ID..."
                    className="w-full text-xs rounded border border-border px-2.5 py-1.5 bg-background"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Invoice ID</th>
                    <th className="py-2.5 px-3 font-medium">Plan / Purpose</th>
                    <th className="py-2.5 px-3 font-medium">Fiat</th>
                    <th className="py-2.5 px-3 font-medium">BTC (Satoshis)</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium">Address</th>
                    <th className="py-2.5 px-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices
                    .filter((inv) =>
                      searchTerm
                        ? inv.invoice_id
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          inv.user_id
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                        : true,
                    )
                    .map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium">
                          {inv.invoice_id}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium uppercase">
                            {inv.plan_id || inv.purpose}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            ({inv.billing_cycle || "one-time"})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          ${inv.amount_fiat?.toFixed(2)} {inv.currency_fiat}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          ₿ {formatBtc(inv.amount_btc)}
                          <span className="text-muted-foreground block text-[10px]">
                            {formatSats(inv.amount_sats)} sats
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              inv.status === "Confirmed"
                                ? "default"
                                : inv.status === "Processing"
                                  ? "secondary"
                                  : inv.status === "Expired"
                                    ? "outline"
                                    : "destructive"
                            }
                            className="text-[10px]"
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {inv.btc_address || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {new Date(inv.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No Bitcoin payment invoices recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Document Timestamps */}
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
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base font-semibold">
                Stamped Construction Documents
              </CardTitle>
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
                      </tr>
                    );
                  })}
                  {docs.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
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

          {/* Verification Audit Logs */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base font-semibold">
                Verification Check Audit Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Time</th>
                    <th className="py-2.5 px-3 font-medium">
                      Identifier / Hash
                    </th>
                    <th className="py-2.5 px-3 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {new Date(log.verified_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px]">
                        {log.verification_id || log.document_hash}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            log.result.includes("confirmed")
                              ? "default"
                              : log.result.includes("tampered")
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {log.result}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No verification checks logged yet.
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
                <span className="text-muted-foreground font-medium">
                  Lightning Network Readiness
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  Architecture Ready (Pending Node Connect)
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base font-semibold">
                OpenTimestamps Attestation Pools
              </CardTitle>
              <CardDescription>
                Public decentralized calendar servers used for Bitcoin Merkle
                aggregation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border font-mono">
                <span>https://a.pool.opentimestamps.org</span>
                <Badge variant="default" className="text-[10px]">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border font-mono">
                <span>https://b.pool.opentimestamps.org</span>
                <Badge variant="default" className="text-[10px]">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between py-1 font-mono">
                <span>https://alice.btc.calendar.opentimestamps.org</span>
                <Badge variant="default" className="text-[10px]">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
