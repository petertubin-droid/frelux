import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import {
  buildCopyText,
  copyConfirmationText,
  copyText,
  type CopyBlock,
  type CopyOutcome,
} from "@/lib/results/copy-results";

/**
 * Copies a finished estimate as plain text. Used by the calculators that render
 * their own result block instead of the shared ResultCard, so every calculator
 * answers "can I send this to someone" the same way.
 */
export function CopyResultsButton({
  block,
  label = "Copy results",
  className,
}: {
  block: CopyBlock;
  label?: string;
  className?: string;
}) {
  const [outcome, setOutcome] = useState<CopyOutcome | null>(null);

  const handleCopy = async () => {
    const result = await copyText(buildCopyText(block));
    setOutcome(result);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setOutcome(null), 2400);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        type="button"
        onClick={handleCopy}
        className={className}
        aria-label={`Copy ${block.title} to the clipboard`}
      >
        {outcome === "copied" ? (
          <Check aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Copy aria-hidden="true" className="h-4 w-4" />
        )}
        {outcome === "copied" ? "Copied" : label}
      </Button>
      <span
        aria-live="polite"
        className="min-h-[1rem] text-xs text-muted-foreground"
      >
        {outcome ? copyConfirmationText(outcome) : ""}
      </span>
    </span>
  );
}

export default CopyResultsButton;
