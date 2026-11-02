/**
 * Universal share actions for every FRELUX calculator and estimator.
 *
 * Drop-in usage near a results block:
 *
 *   <ShareEstimateButton
 *     estimate={{
 *       kind: "Tile Cost Estimate",
 *       summaryLines: [{ label: "Area", value: "42 m²" }],
 *       lineItems: [...],
 *       totals: [{ label: "Grand total", value: "₦512,400", emphasized: true }],
 *       link: "/tile-cost-estimator",
 *     }}
 *   />
 *
 * Renders three actions on one row: WhatsApp share, Save PDF,
 * Copy summary. All values are the caller's pre-formatted display
 * strings; the component never recomputes an estimate.
 */
import { useState } from "react";
import { FileText, Copy, Check, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";
import {
  copyEstimateSummary,
  downloadEstimatePdf,
  shareEstimateOnWhatsApp,
  type ShareableEstimate,
} from "@/lib/estimate-sharing";

interface ShareEstimateButtonProps {
  estimate: ShareableEstimate | null;
  /** Compact label variant for tight layouts. */
  compact?: boolean;
  className?: string;
}

export function ShareEstimateButton({
  estimate,
  compact = false,
  className = "",
}: ShareEstimateButtonProps) {
  const { t } = useLanguage();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  if (!estimate) return null;

  const handlePdf = async () => {
    setPdfBusy(true);
    setPdfError(null);
    try {
      await downloadEstimatePdf(estimate);
    } catch {
      setPdfError(
        "PDF could not be generated. Try the WhatsApp share instead.",
      );
    } finally {
      setPdfBusy(false);
    }
  };

  const handleCopy = async () => {
    const ok = await copyEstimateSummary(estimate);
    setCopied(ok);
    if (ok) {
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => shareEstimateOnWhatsApp(estimate)}
          className="gap-1.5 text-accent-green"
        >
          <MessageCircle className="h-4 w-4" />
          {t("WhatsApp")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePdf}
          disabled={pdfBusy}
          className="gap-1.5"
        >
          {pdfBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Save PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5"
        >
          {copied ? (
            <Check className="h-4 w-4 text-accent-green" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        {pdfError && (
          <span className="text-xs text-destructive">{pdfError}</span>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => shareEstimateOnWhatsApp(estimate)}
          className="flex flex-col items-center gap-1.5 rounded-lg bg-accent-green/10 p-3 text-center transition-all hover:bg-accent-green/20"
        >
          <MessageCircle className="h-5 w-5 text-accent-green" />
          <span className="text-xs font-semibold text-accent-green">
            {t("WhatsApp")}
          </span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handlePdf}
          disabled={pdfBusy}
          className="flex flex-col items-center gap-1.5 rounded-lg bg-primary/10 p-3 text-center transition-all hover:bg-primary/20 disabled:opacity-60"
        >
          {pdfBusy ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand-purple" />
          ) : (
            <FileText className="h-5 w-5 text-brand-purple" />
          )}
          <span className="text-xs font-semibold text-brand-purple">
            {t("Save PDF")}
          </span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleCopy}
          className="flex flex-col items-center gap-1.5 rounded-lg bg-muted p-3 text-center transition-all hover:bg-accent"
        >
          {copied ? (
            <Check className="h-5 w-5 text-accent-green" />
          ) : (
            <Copy className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-muted-foreground">
            {copied ? "Copied!" : "Copy text"}
          </span>
        </Button>
      </div>
      {pdfError && (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {pdfError}
        </p>
      )}
    </div>
  );
}
