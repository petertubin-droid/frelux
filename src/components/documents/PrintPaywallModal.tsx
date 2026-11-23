import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Printer,
  ShieldCheck,
  CreditCard,
  Coins,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  DOCUMENT_PRINT_USD,
  calculatePrintFeeInCurrency,
  recordPrintPassUnlock,
} from "@/lib/documents/document-access";
import { DISPLAY_CURRENCIES } from "@/lib/international/fx-display";

export interface PrintPaywallModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  documentId: string;
  documentTitle?: string;
  userCurrency?: string;
  onPrintUnlocked?: () => void;
  onUnlocked?: () => void;
}

export function PrintPaywallModal({
  isOpen,
  open,
  onClose,
  onOpenChange,
  documentId,
  documentTitle = "Document",
  userCurrency = "USD",
  onPrintUnlocked,
  onUnlocked,
}: PrintPaywallModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(userCurrency || "USD");
  const [selectedGateway, setSelectedGateway] = useState<"paystack" | "flutterwave" | "crypto">("paystack");
  const [processing, setProcessing] = useState(false);

  const isVisible = Boolean(open ?? isOpen);
  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };
  const handleSuccess = () => {
    onPrintUnlocked?.();
    onUnlocked?.();
  };

  if (!isVisible) return null;

  const pricing = calculatePrintFeeInCurrency(selectedCurrency);

  const handleUnlockAndPrint = async () => {
    setProcessing(true);
    try {
      // Simulate/process the $1.09 one-time payment unlock
      // In production environment, this ties to edge function webhook or inline checkout
      await Promise.resolve();

      recordPrintPassUnlock({
        documentId,
        currency: pricing.currency,
        amount: pricing.amount,
        gateway: selectedGateway,
      });

      toast.success(
        `Print pass activated! Billed ${pricing.formatted} ($1.09 USD). Opening print view…`,
      );
      handleClose();
      handleSuccess();
    } catch {
      toast.error("Payment authorization failed. Please try again or subscribe.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-paywall-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-purple via-blue-600 to-indigo-600" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
            <Printer className="h-6 w-6" />
          </div>
          <div>
            <h3 id="print-paywall-title" className="text-lg font-bold text-slate-900">
              Document Print Access
            </h3>
            <p className="text-xs text-slate-500">
              {documentTitle}
            </p>
          </div>
        </div>

        {/* Notice Box */}
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
          <p className="font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
            Subscription or One-Time Print Pass Required
          </p>
          <p className="mt-1 text-amber-800/90 leading-relaxed">
            Printing high-resolution documents requires an active subscription or a one-time single print pass of <strong>$1.09 USD</strong> (billed in your local currency).
          </p>
        </div>

        {/* Dynamic Currency Pricing Card */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                One-Time Print Fee
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-slate-900" data-testid="print-fee-amount">
                  {pricing.formatted}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  (eqv. ${DOCUMENT_PRINT_USD.toFixed(2)} USD)
                </span>
              </div>
            </div>

            {/* Currency Switcher */}
            <div className="text-right">
              <label htmlFor="currency-select" className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Currency
              </label>
              <select
                id="currency-select"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-purple focus:outline-none"
              >
                {DISPLAY_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            Rate applied: 1 USD ≈ {pricing.rate.toLocaleString(undefined, { maximumFractionDigits: 2 })} {pricing.currency}. Valid for 48 hours for this document.
          </p>
        </div>

        {/* Payment Gateway Options */}
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Select Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedGateway("paystack")}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition ${
                selectedGateway === "paystack"
                  ? "border-brand-purple bg-brand-purple/5 text-brand-purple ring-1 ring-brand-purple"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <CreditCard className="h-4 w-4 mb-1" />
              <span>Card / Bank</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGateway("flutterwave")}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition ${
                selectedGateway === "flutterwave"
                  ? "border-brand-purple bg-brand-purple/5 text-brand-purple ring-1 ring-brand-purple"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <CreditCard className="h-4 w-4 mb-1" />
              <span>Flutterwave</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGateway("crypto")}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition ${
                selectedGateway === "crypto"
                  ? "border-brand-purple bg-brand-purple/5 text-brand-purple ring-1 ring-brand-purple"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Coins className="h-4 w-4 mb-1" />
              <span>Crypto Pay</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleUnlockAndPrint}
            disabled={processing}
            data-testid="pay-and-print-button"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-purple px-4 text-sm font-bold text-white shadow-md transition hover:bg-brand-purple/90 disabled:opacity-60"
          >
            {processing ? (
              <span>Authorizing {pricing.formatted}…</span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Pay {pricing.formatted} & Unlock Print</span>
              </>
            )}
          </button>

          {/* Subscription Alternative */}
          <div className="relative my-1 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Or subscribe for full access
            </span>
          </div>

          <Link
            to="/pricing"
            onClick={handleClose}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-brand-purple/40 bg-brand-purple/5 px-4 text-xs font-semibold text-brand-purple transition hover:bg-brand-purple/10"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Subscribe for Unlimited Prints ($4.99/mo)</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PrintPaywallModal;
