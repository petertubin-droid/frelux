/**
 * Share bar fed by a calculator's own quote builder.
 *
 * The getter is called from this child's render, i.e. after the parent has
 * finished running, so a builder that reads page state declared further down
 * the parent body is safe to hand over. Returns nothing until the calculator
 * has produced a quote, so an untouched page never shows a share row.
 */
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import { shareableFromQuote, type QuotePayloadLike } from "@/lib/estimate-share-adapter";

interface QuoteShareButtonProps {
  build: () => QuotePayloadLike | null;
  kind: string;
  link: string;
  compact?: boolean;
}

export function QuoteShareButton({ build, kind, link, compact = true }: QuoteShareButtonProps) {
  let estimate = null;
  try {
    estimate = shareableFromQuote(build(), { kind, link });
  } catch {
    return null;
  }
  if (!estimate) return null;
  return <ShareEstimateButton estimate={estimate} compact={compact} />;
}

export default QuoteShareButton;
