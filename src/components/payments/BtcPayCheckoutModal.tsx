// =========================================================
// FRELUX PAY — Interactive Bitcoin Checkout Modal
// Displays live BTC address, Satoshis, QR code, and real-time status polling
// =========================================================

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/shadcn/dialog";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import {
  Bitcoin,
  Copy,
  Check,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  type BtcPayInvoiceResult,
  verifyBtcPayInvoice,
  formatBtc,
  formatSats,
} from "@/lib/payments/btcpay";
import { toast } from "sonner";

interface BtcPayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: BtcPayInvoiceResult | null;
  planName: string;
  billingCycle: string;
  onSuccess: () => void;
}

export default function BtcPayCheckoutModal({
  isOpen,
  onClose,
  invoice,
  planName,
  billingCycle,
  onSuccess,
}: BtcPayCheckoutModalProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("30:00");
  const [isExpired, setIsExpired] = useState(false);
  const [status, setStatus] = useState<string>("Pending");
  const [verifying, setVerifying] = useState(false);
  const pollTimerRef = useRef<number | null>(null);

  // Expiry Countdown Timer
  useEffect(() => {
    if (!invoice?.expires_at || !isOpen) return;

    const expiryTime = new Date(invoice.expires_at).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        setIsExpired(true);
        setStatus("Expired");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [invoice, isOpen]);

  // Real-time Status Polling
  useEffect(() => {
    if (
      !invoice?.invoice_id ||
      !isOpen ||
      isExpired ||
      status === "Confirmed"
    ) {
      return;
    }

    const pollStatus = async () => {
      try {
        setVerifying(true);
        const res = await verifyBtcPayInvoice(invoice.invoice_id);
        setStatus(res.status);

        if (res.status === "Confirmed" || res.activated) {
          toast.success(
            "Bitcoin payment confirmed! Your subscription is active.",
          );
          onSuccess();
          return;
        }
      } catch {
        // Continue polling silently
      } finally {
        setVerifying(false);
      }
    };

    // Poll every 5 seconds
    pollTimerRef.current = window.setInterval(pollStatus, 5000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [invoice, isOpen, isExpired, status, onSuccess]);

  if (!invoice) return null;

  const copyToClipboard = (text: string, type: "address" | "amount") => {
    navigator.clipboard.writeText(text);
    if (type === "address") {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
    toast.success("Copied to clipboard");
  };

  const qrUrl = invoice.qr_code_data && invoice.btc_address
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=4&data=${encodeURIComponent(invoice.qr_code_data)}`
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-left space-y-1 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-amber-500/10 p-2 text-amber-500">
                <Bitcoin className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  FRELUX PAY
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Bitcoin Payment Checkout
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant={
                status === "Confirmed"
                  ? "default"
                  : status === "Processing"
                    ? "secondary"
                    : isExpired
                      ? "destructive"
                      : "outline"
              }
              className="text-xs font-mono"
            >
              {status === "Confirmed" ? (
                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
              ) : isExpired ? (
                <AlertTriangle className="h-3 w-3 mr-1" />
              ) : (
                <Clock className="h-3 w-3 mr-1 animate-pulse" />
              )}
              {status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Plan & Amount Summary */}
          <div className="flex items-center justify-between rounded-xl bg-muted/60 p-3 text-sm">
            <div>
              <span className="font-semibold text-foreground">
                {planName} Plan
              </span>
              <span className="text-xs text-muted-foreground block capitalize">
                Billed {billingCycle}
              </span>
            </div>
            <div className="text-right">
              <div className="font-mono text-base font-bold text-foreground">
                {formatBtc(invoice.amount_btc)} BTC
              </div>
              <span className="text-xs text-muted-foreground">
                ≈ {formatSats(invoice.amount_sats)} sats ($
                {invoice.amount_fiat.toFixed(2)} {invoice.currency_fiat})
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border bg-white dark:bg-neutral-900 shadow-inner">
            {isExpired ? (
              <div className="py-12 text-center text-muted-foreground">
                <AlertTriangle className="h-10 w-10 mx-auto text-destructive mb-2" />
                <p className="font-medium text-sm">This invoice has expired</p>
                <p className="text-xs">
                  Please close and initiate a new checkout session.
                </p>
              </div>
            ) : (
              qrUrl ? (
                <>
                  <img
                    src={qrUrl}
                    alt="Bitcoin payment QR code"
                    className="h-48 w-48 rounded-lg shadow-sm"
                    loading="eager"
                  />
                  <span className="text-[11px] text-muted-foreground mt-2">
                    Scan with a Bitcoin wallet
                  </span>
                </>
              ) : (
                <div className="py-10 px-4 text-center text-muted-foreground">
                  <Bitcoin className="h-10 w-10 mx-auto mb-2 text-amber-500" />
                  <p className="font-medium text-sm">Continue in the secure BTCPay checkout</p>
                  <p className="text-xs mt-1">The payment address is available in the hosted checkout window.</p>
                </div>
              )
            )}
          </div>

          {/* Destination BTC Address */}
          {!isExpired && invoice.btc_address && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Destination Bitcoin Address</span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(invoice.btc_address, "address")
                  }
                  className="text-brand-purple hover:underline flex items-center gap-1 font-medium"
                >
                  {copiedAddress ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy Address
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-2.5 font-mono text-xs break-all select-all text-foreground">
                {invoice.btc_address}
              </div>
            </div>
          )}

          {/* Timer & Network Status */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
            <div className="flex items-center gap-1.5 font-mono">
              <Clock className="h-3.5 w-3.5" />
              <span>Time remaining: </span>
              <span
                className={`font-bold ${isExpired ? "text-destructive" : "text-foreground"}`}
              >
                {timeLeft}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {verifying && (
                <Loader2 className="h-3 w-3 animate-spin text-brand-purple" />
              )}
              <span>Auto-detecting payment…</span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={onClose}
            >
              Close
            </Button>
            {invoice.checkout_url && (
              <Button
                variant="default"
                size="sm"
                className="flex-1 text-xs"
                asChild
              >
                <a
                  href={invoice.checkout_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5"
                >
                  BTCPay Window
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
