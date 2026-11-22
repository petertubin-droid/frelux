// =========================================================
// FRELUX VERIFY — Blockchain Document Verification Portal
// =========================================================

import React, { useState, useRef } from "react";
import { useSeo } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
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
  calculateFileSha256,
  verifyDocumentOnBlockchain,
  generateVerificationCertificateJson,
  type VerificationLookupResult,
} from "@/lib/blockchain/opentimestamps";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  FileCheck,
  Upload,
  Search,
  Copy,
  Check,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function Verify() {
  useSeo({
    title: "FRELUX VERIFY — Blockchain Document Integrity Portal",
    description:
      "Verify the authenticity, cryptographic SHA-256 fingerprint, and Bitcoin blockchain timestamp of any FRELUX construction document or Bill of Quantities.",
  });

  const [searchId, setSearchId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [computedHash, setComputedHash] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationLookupResult | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    setLoading(true);
    setResult(null);

    try {
      const { hash } = await calculateFileSha256(file);
      setComputedHash(hash);

      const lookup = await verifyDocumentOnBlockchain({ documentHash: hash });
      setResult(lookup);

      if (lookup.verified) {
        toast.success("Document fingerprint matched original record!");
      } else {
        toast.error("Document fingerprint not found or tampered.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Verification error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setFileName(null);
    setComputedHash(null);
    setResult(null);

    try {
      const cleanInput = searchId.trim();
      const isHex = /^[a-f0-9]{64}$/i.test(cleanInput);

      const lookup = await verifyDocumentOnBlockchain({
        verificationId: isHex ? undefined : cleanInput,
        documentHash: isHex ? cleanInput : undefined,
      });

      setResult(lookup);
      if (lookup.verified) {
        toast.success("Verification record found!");
      } else {
        toast.error("No record found matching this identifier.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Lookup error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "hash" | "id") => {
    navigator.clipboard.writeText(text);
    if (type === "hash") {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
    toast.success("Copied to clipboard");
  };

  const downloadCertificate = () => {
    if (!result) return;
    const jsonStr = generateVerificationCertificateJson(result);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${result.document?.verification_id || "frelux"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Certificate downloaded");
  };

  const downloadOtsProof = () => {
    if (!result?.proof?.ots_proof_base64) return;
    const binary = atob(result.proof.ots_proof_base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.document?.verification_id || "document"}.ots`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("OpenTimestamps (.ots) proof downloaded");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        eyebrow="FRELUX VERIFY"
        title="Blockchain Document Verification Portal"
        subtitle="Independently verify the cryptographic integrity, creation timestamp, and Bitcoin blockchain anchoring of any FRELUX Bill of Quantities or construction document."
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Input Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Method 1: Drop Document */}
          <Card
            className={`border-2 transition-all cursor-pointer ${
              dragOver
                ? "border-brand-purple bg-brand-purple/5"
                : "border-dashed border-border hover:border-foreground/30"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileUpload(file);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.json,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <div className="rounded-full bg-primary/10 p-4 mb-4 text-primary">
                <Upload className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-1">
                Upload or Drop Document
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-3">
                Drop your sealed PDF export. Your file is hashed in your browser
                and never leaves your computer.
              </p>
              <Button size="sm" variant="outline" disabled={loading}>
                {loading && fileName ? "Calculating SHA-256..." : "Select File"}
              </Button>
            </CardContent>
          </Card>

          {/* Method 2: Verification ID / Hash Search */}
          <Card className="flex flex-col justify-center">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5 text-brand-purple" />
                Search by ID or Hash
              </CardTitle>
              <CardDescription>
                Enter the Verification ID printed on your document header or
                paste the raw 64-char SHA-256 fingerprint.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearchSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    placeholder="e.g. FRX-VER-2026-X8K2M9 or 64-char hash"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !searchId.trim()}
                >
                  {loading && !fileName ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  Verify Document
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Verification Result Card */}
        {result && (
          <Card className="border border-border shadow-lg overflow-hidden animate-in fade-in-50 duration-300">
            <div
              className={`p-4 border-b flex items-center justify-between ${
                result.verified
                  ? result.result === "verified_confirmed"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}
            >
              <div className="flex items-center gap-3">
                {result.verified ? (
                  result.result === "verified_confirmed" ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <Clock className="h-6 w-6 text-blue-500" />
                  )
                ) : (
                  <ShieldAlert className="h-6 w-6 text-destructive" />
                )}
                <div>
                  <div className="font-semibold text-base">
                    {result.verified
                      ? result.result === "verified_confirmed"
                        ? "Cryptographically Verified & Bitcoin Anchored"
                        : "Cryptographically Verified (Bitcoin Confirmation Pending)"
                      : "Verification Failed / Unregistered Document"}
                  </div>
                  <div className="text-xs opacity-90">
                    {result.verified
                      ? "The cryptographic fingerprint matches the original document creation record exactly."
                      : "The document fingerprint does not match any registered FRELUX record, or the document has been altered."}
                  </div>
                </div>
              </div>

              <Badge
                variant={
                  result.verified
                    ? result.result === "verified_confirmed"
                      ? "default"
                      : "secondary"
                    : "destructive"
                }
                className="text-xs font-mono uppercase"
              >
                {result.document?.status ||
                  (result.verified ? "Verified" : "Tampered")}
              </Badge>
            </div>

            {result.verified && result.document && (
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      Document Title
                    </span>
                    <p className="font-medium text-foreground text-sm mt-0.5">
                      {result.document.document_title}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      Document Type
                    </span>
                    <p className="font-medium text-foreground text-sm mt-0.5 uppercase">
                      {result.document.document_type}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      Verification ID
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-sm font-semibold text-brand-purple">
                        {result.document.verification_id}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            result.document!.verification_id,
                            "id",
                          )
                        }
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy ID"
                      >
                        {copiedId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      Original Creation Date
                    </span>
                    <p className="font-medium text-foreground text-sm mt-0.5">
                      {new Date(result.document.created_at).toUTCString()}
                    </p>
                  </div>
                </div>

                {/* Fingerprint block */}
                <div className="rounded-lg bg-muted/50 p-4 border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="h-3.5 w-3.5" />
                      SHA-256 Cryptographic Fingerprint
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(result.document!.document_hash, "hash")
                      }
                      className="text-xs text-brand-purple hover:underline flex items-center gap-1"
                    >
                      {copiedHash ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy Hash
                        </>
                      )}
                    </button>
                  </div>
                  <code className="text-xs font-mono text-foreground break-all select-all block">
                    {result.document.document_hash}
                  </code>
                </div>

                {/* Blockchain Proof Details */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                      <Clock className="h-4 w-4 text-brand-purple" />
                      Bitcoin Blockchain Attestation
                    </span>
                    <Badge
                      variant={
                        result.proof?.is_blockchain_confirmed
                          ? "default"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {result.proof?.is_blockchain_confirmed
                        ? `Block #${result.proof.bitcoin_block_height}`
                        : "Confirmation Pending"}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {result.proof?.is_blockchain_confirmed
                      ? `Anchored in Bitcoin block height ${result.proof.bitcoin_block_height}. The timestamp proof guarantees that this document existed in this exact byte-for-byte state prior to this block.`
                      : "The cryptographic digest has been submitted to OpenTimestamps calendar pools. Bitcoin block confirmation takes standard network cycle time (approx. a few hours)."}
                  </p>

                  {result.proof?.calendar_urls &&
                    result.proof.calendar_urls.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">
                          Calendar Attestation Pools:{" "}
                        </span>
                        <span className="font-mono">
                          {result.proof.calendar_urls.join(", ")}
                        </span>
                      </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={downloadCertificate}
                    variant="default"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Certificate (.json)
                  </Button>
                  {result.proof?.ots_proof_base64 && (
                    <Button
                      onClick={downloadOtsProof}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Proof (.ots)
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setResult(null);
                      setComputedHash(null);
                      setFileName(null);
                      setSearchId("");
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    Verify Another
                  </Button>
                </div>
              </CardContent>
            )}

            {!result.verified && (
              <CardContent className="p-6 space-y-4">
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-destructive flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold mb-1">
                      Untrusted or Modified File
                    </p>
                    <p className="text-xs opacity-90 leading-relaxed">
                      {result.message ||
                        "No registered document matches the provided identifier or cryptographic hash. If this document was generated by FRELUX, it may have been edited, compressed, re-saved, or the identifier was mistyped."}
                    </p>
                  </div>
                </div>

                {computedHash && (
                  <div className="text-xs font-mono bg-muted p-3 rounded border text-muted-foreground break-all">
                    Calculated Hash: {computedHash}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
