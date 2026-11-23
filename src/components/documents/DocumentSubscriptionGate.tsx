import React, { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Lock,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import { useAuthSafe } from "@/lib/auth";
import { useDisplayCurrency } from "@/lib/international/currency-context";
import {
  canExportDocuments,
  calculatePrintFeeInCurrency,
} from "@/lib/documents/document-access";
import { PrintPaywallModal } from "./PrintPaywallModal";

export interface DocumentSubscriptionGateProps {
  children?: ReactNode;
  /** Modal control when used as a popup dialog */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  featureName?: string;
  /** Document ID if available */
  documentId?: string;
  /** Document title for display */
  documentTitle?: string;
  /** If true, blocks view completely; if false, renders view with a banner/modal guard */
  strict?: boolean;
  /** Callback if user unlocks print via the one-time print modal */
  onPrintUnlocked?: () => void;
}

/**
 * Shared Subscription Gate for all Documents: PDFs, BOQs, CSVs.
 * Ensures that:
 * 1. Subscribed users have full access.
 * 2. Non-subscribed users are presented with the subscription gate or the option
 *    to pay the one-time $1.09 fee (in their local currency) to print.
 */
export function DocumentSubscriptionGate({
  children,
  open,
  onOpenChange,
  featureName = "Document Export",
  documentId = "document",
  documentTitle = "Document",
  strict = false,
  onPrintUnlocked,
}: DocumentSubscriptionGateProps) {
  const auth = useAuthSafe();
  const isPaid = Boolean(auth.isPaid);
  const isAdmin = Boolean(auth.isAdmin);
  const currency = useDisplayCurrency();
  const currencyCode = currency?.code || "USD";

  const [showPrintModal, setShowPrintModal] = useState(false);
  const printFee = calculatePrintFeeInCurrency(currencyCode);
  const hasAccess = canExportDocuments({ isPaid, isAdmin });

  // Dialog / Modal mode
  if (open !== undefined) {
    if (!open || hasAccess) return null;

    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      >
        <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-center">
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            aria-label="Close"
            className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-purple/10 text-brand-purple mb-3">
            <Lock className="h-7 w-7" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-bold text-brand-purple uppercase tracking-wider mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Subscription Required
          </span>

          <h3 className="text-xl font-bold text-slate-900 mt-1">
            {featureName} Gate
          </h3>
          <p className="mt-2 text-xs text-slate-600 max-w-sm mx-auto">
            Full PDF, BOQ, and spreadsheet exports require an active subscription. Alternatively, pay <strong>$1.09</strong> to print directly.
          </p>

          <div className="my-5 grid grid-cols-2 gap-2 text-left text-xs text-slate-700">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Full High-Res PDF</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>BOQ & CSV Formats</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Unlimited Prints</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Blockchain Verification</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Link
              to="/pricing"
              onClick={() => onOpenChange?.(false)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-purple px-6 text-sm font-bold text-white shadow transition hover:bg-brand-purple/90"
            >
              <Sparkles className="h-4 w-4" />
              <span>Subscribe for Unlimited Exports ($4.99/mo)</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={() => {
                onOpenChange?.(false);
                setShowPrintModal(true);
              }}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>Print This Document Once ({printFee.formatted})</span>
            </button>
          </div>
        </div>

        <PrintPaywallModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          documentId={documentId}
          documentTitle={documentTitle}
          userCurrency={currencyCode}
          onPrintUnlocked={() => {
            onPrintUnlocked?.();
          }}
        />
      </div>
    );
  }

  // Wrapper mode: has full access
  if (hasAccess) {
    return <>{children}</>;
  }

  // Wrapper mode: strict
  if (strict) {
    return (
      <div className="mx-auto max-w-2xl my-12 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-purple/10 text-brand-purple mb-4">
          <Lock className="h-7 w-7" />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-bold text-brand-purple uppercase tracking-wider mb-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Shared Document Gate
        </span>

        <h2 className="text-2xl font-extrabold text-slate-900 mt-2">
          Subscription Required for Document Access
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
          Full access to professional PDFs, BOQs, Excel, and CSV document generation is reserved for subscribed members.
        </p>

        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto text-xs text-slate-700">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Official Bank & Standard BOQs</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>High-Res PDFs & Excel/CSVs</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Unlimited Document Printing</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Blockchain-Verified Seals</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/pricing"
            className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-brand-purple px-6 text-sm font-bold text-white shadow transition hover:bg-brand-purple/90"
          >
            <Sparkles className="h-4 w-4" />
            <span>Subscribe for Full Access ($4.99/mo)</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>Print this Document ({printFee.formatted})</span>
          </button>
        </div>

        <PrintPaywallModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          documentId={documentId}
          documentTitle={documentTitle}
          userCurrency={currencyCode}
          onPrintUnlocked={() => {
            onPrintUnlocked?.();
          }}
        />
      </div>
    );
  }

  // Wrapper mode: non-strict
  return (
    <>
      <div className="mb-4 rounded-xl border border-brand-purple/20 bg-brand-purple/5 p-4 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block">
              Document Subscription Gate & Pay-Per-Print
            </span>
            <span className="text-slate-600">
              Full PDF/CSV exports require a subscription. Need to print? Unlock single print for {printFee.formatted} (eqv. $1.09 USD).
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Print ({printFee.formatted})
          </button>
          <Link
            to="/pricing"
            className="rounded-lg bg-brand-purple px-3 py-1.5 font-semibold text-white hover:bg-brand-purple/90 transition"
          >
            Subscribe
          </Link>
        </div>
      </div>

      {children}

      <PrintPaywallModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        documentId={documentId}
        documentTitle={documentTitle}
        userCurrency={currencyCode}
        onPrintUnlocked={() => {
          onPrintUnlocked?.();
        }}
      />
    </>
  );
}

export default DocumentSubscriptionGate;
