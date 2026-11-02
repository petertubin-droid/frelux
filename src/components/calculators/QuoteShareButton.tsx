/**
 * Share bar fed by a calculator's own quote builder.
 *
 * The getter is called from this child's render, i.e. after the parent has
 * finished running, so a builder that reads page state declared further down
 * the parent body is safe to hand over. Returns nothing until the calculator
 * has produced a quote, so an untouched page never shows a share row.
 */
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import {
  shareableFromQuote,
  type QuotePayloadLike,
} from "@/lib/estimate-share-adapter";
import { useLocation } from "react-router-dom";
import { useEngineAccess } from "@/lib/use-engine-access";
import { EnginePreviewLock } from "@/components/premium/EnginePreviewLock";

interface QuoteShareButtonProps {
  build: () => QuotePayloadLike | null;
  kind: string;
  link: string;
  compact?: boolean;
}

export function QuoteShareButton({
  build,
  kind,
  link,
  compact = true,
}: QuoteShareButtonProps) {
  const location = useLocation();
  const access = useEngineAccess(location.pathname);
  let estimate = null;
  try {
    estimate = shareableFromQuote(build(), { kind, link });
  } catch {
    return null;
  }
  if (!estimate) return null;
  // Taking the estimate away is a paid action on a gated engine. The numbers are
  // still on screen; what a plan adds is the shareable, printable document.
  if (!access.canExport && access.engine) {
    return <EnginePreviewLock engine={access.engine} hiddenLines={0} />;
  }
  return <ShareEstimateButton estimate={estimate} compact={compact} />;
}

export default QuoteShareButton;
