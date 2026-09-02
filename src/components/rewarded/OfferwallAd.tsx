/**
 * OfferwallAd — Responsive Offerwall.ad iframe component.
 *
 * Only renders after authentication has been confirmed.
 * Uses the authenticated user's stable Supabase Auth UUID as the
 * Offerwall visitor ID (uid parameter).
 *
 * Credits are NEVER awarded by this component. The Offerwall.ad
 * provider sends a server-to-server postback when a user completes
 * an offer. The rewarded-postback edge function validates and
 * awards credits through the award_offerwall_credits RPC.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";

interface OfferwallAdProps {
  /** The authenticated user's stable Supabase Auth UUID */
  userId: string;
  /** Called when the user wants to go back to the rewards area */
  onBack?: () => void;
}

// Fallback wall URL — used when no offerwall_ad provider is configured in the DB
const FALLBACK_WALL_URL =
  "https://offerwall.ad/wall/1b50ede6cf94ed6dbeedb6274efc2b6d";

export function OfferwallAd({ userId, onBack }: OfferwallAdProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offerwallUrl, setOfferwallUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch the offerwall URL from the ad_providers table (offerwall_ad slug).
  // Falls back to the hardcoded URL if no DB config exists.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getSupabase } = await import("@/lib/supabase-lazy");
        const supabase = await getSupabase();
        const { data } = await supabase
          .from("ad_providers_public")
          .select("credentials")
          .eq("slug", "offerwall_ad")
          .eq("is_active", true)
          .maybeSingle();

        const wallUrl = data?.credentials?.wall_url || FALLBACK_WALL_URL;
        if (!cancelled) {
          setOfferwallUrl(`${wallUrl}?uid=${encodeURIComponent(userId)}`);
        }
      } catch {
        if (!cancelled) {
          setOfferwallUrl(
            `${FALLBACK_WALL_URL}?uid=${encodeURIComponent(userId)}`,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setError(false);
    setLoading(true);
    // Force iframe reload by toggling src
    if (iframeRef.current) {
      const src = iframeRef.current.src;
      iframeRef.current.src = "";
      requestAnimationFrame(() => {
        if (iframeRef.current) iframeRef.current.src = src;
      });
    }
  }, []);

  return (
    <div className="w-full">
      {/* Header bar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <ExternalLink className="h-4 w-4 text-brand-purple" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
              Complete Offers — Earn FRELUX Credits
            </h3>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              Complete available offers to earn FRELUX Credits. Rewards vary by
              offer.
            </p>
          </div>
        </div>
        {onBack && (
          <Button variant="ghost"
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-card-foreground dark:hover:bg-white/10 dark:hover:text-primary-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Rewards
          </Button>
        )}
      </div>

      {/* Iframe container — responsive, no horizontal scroll */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card dark:border-white/10 dark:bg-card">
        {/* Loading overlay — absolutely positioned so it doesn't affect layout */}
        {loading && !error && (
          <div className="absolute inset-0 z-10 flex min-h-[500px] flex-col items-center justify-center gap-3 p-8 bg-card dark:bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
              Loading offerwall…
            </p>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              This may take a few seconds.
            </p>
          </div>
        )}

        {/* Error state — replaces the iframe entirely */}
        {error ? (
          <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 p-8">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <div className="text-center">
              <p className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                Unable to load the offerwall
              </p>
              <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                This might be a temporary issue. Please try again.
              </p>
            </div>
            <Button variant="default"
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors hover:/90"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : (
          /* The actual Offerwall iframe */
          <iframe
            ref={iframeRef}
            src={offerwallUrl}
            title="Frelux Offerwall — Earn Credits"
            className="block w-full border-0"
            style={{
              height: "70vh",
              minHeight: "500px",
              maxHeight: "900px",
              maxWidth: "100%",
            }}
            loading="lazy"
            allow="clipboard-write"
            onLoad={handleLoad}
            onError={handleError}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        )}
      </div>

      {/* Info footer */}
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 p-3 dark:bg-white/5">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground dark:text-muted-foreground">
          Credits are awarded automatically after you complete an offer. The
          offerwall provider confirms completion securely — you don&apos;t need
          to do anything extra. Your FRELUX Credit balance will update once the
          offer is verified.
        </p>
      </div>
    </div>
  );
}
