import { useState, useEffect, useCallback } from "react";
import {
  X,
  PlayCircle,
  Loader2,
  Gift,
  CheckCircle2,
  Lock,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatExpiry } from "@/lib/rewarded-access";
import type { RewardedAccess } from "@/lib/rewarded-access";
import { Button } from "@/components/ui/shadcn/button";

interface Props {
  access: RewardedAccess;
  featureName: string;
  features: string[];
}

export function RewardedAdModal({ access, featureName, features }: Props) {
  const {
    adLoading,
    cancelUnlock,
    watchAd,
    closeOfferwall,
    expiresAt,
    isUnlocked,
    offerwallUrl,
    offerwallProviderName,
    adProviderUsed,
  } = access;

  const [adWatchSeconds, setAdWatchSeconds] = useState(0);

  // Count up viewing seconds while the ad is loading/watching
  useEffect(() => {
    if (!adLoading || offerwallUrl) return;
    const interval = setInterval(() => {
      setAdWatchSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [adLoading, offerwallUrl]);

  // After 5 seconds, show the "ad viewed" indicator
  const minWatchTime = 5;
  const canProceed = adWatchSeconds >= minWatchTime;

  const handleWatchAd = useCallback(async () => {
    setAdWatchSeconds(0);
    await watchAd();
  }, [watchAd]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={cancelUnlock}
      />

      {/* Offerwall iframe mode — larger modal */}
      {offerwallUrl ? (
        <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-card shadow-2xl dark:bg-card">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Gift aria-hidden="true" className="h-5 w-5 text-brand-purple" />
              <h2 className="text-sm font-bold text-foreground dark:text-primary-foreground">
                {offerwallProviderName ?? adProviderUsed} — Complete offers to
                unlock
              </h2>
            </div>
            <Button variant="ghost"
              type="button"
              onClick={() => {
                closeOfferwall();
                cancelUnlock();
              }}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-card-foreground dark:hover:bg-white/10 dark:hover:text-primary-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Offerwall iframe */}
          <div className="relative" style={{ height: "600px" }}>
            <iframe
              src={offerwallUrl}
              title={`${offerwallProviderName ?? "Sponsor"} offerwall`}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3 dark:border-white/5">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground dark:text-muted-foreground">
              <Clock aria-hidden="true" className="h-3.5 w-3.5" />
              Checking for completion… This will close automatically when you
              earn your reward.
            </p>
            <Button variant="ghost"
              type="button"
              onClick={() => {
                closeOfferwall();
                cancelUnlock();
              }}
              className="text-xs font-semibold text-muted-foreground hover:text-card-foreground dark:text-muted-foreground dark:hover:text-primary-foreground"
            >
              Maybe later
            </Button>
          </div>
        </div>
      ) : (
        /* Standard rewarded ad modal — now showing real display ads from all providers */
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl dark:bg-card">
          {/* Header */}
          <div className="bg-gradient-to-br from-background to-primary p-6 text-primary-foreground">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Gift
                  aria-hidden="true"
                  className="h-6 w-6 text-accent-green"
                />
                <h2 className="text-lg font-bold">{featureName}</h2>
              </div>
              <Button variant="ghost"
                type="button"
                onClick={cancelUnlock}
                className="rounded-lg p-1 text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="mt-2 text-sm text-primary-foreground/70">
              Unlock all advanced features for today. Watch one short ad. No
              subscriptions, no payments.
            </p>
          </div>

          {/* Features list */}
          <div className="p-6">
            <div className="space-y-2">
              {features.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-2 text-sm text-card-foreground dark:text-muted-foreground/60"
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-accent-green"
                  />
                  {f}
                </div>
              ))}
            </div>

            {/* Unlock status */}
            {isUnlocked && expiresAt && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/10 p-3 text-sm text-card-foreground dark:text-muted-foreground/60">
                <Clock
                  aria-hidden="true"
                  className="h-4 w-4 text-accent-green"
                />
                {formatExpiry(expiresAt)}
              </div>
            )}

            {/* Ad watching state */}
            {adLoading && (
              <div className="mt-6">
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2
                    aria-hidden="true"
                    className="h-8 w-8 animate-spin text-brand-purple"
                  />
                  <p className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground/80">
                    {offerwallProviderName
                      ? "Opening offerwall…"
                      : canProceed
                        ? "Ad complete — unlocking…"
                        : "Sponsored ad playing…"}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    {offerwallProviderName
                      ? "Complete offers in the offerwall to earn your unlock."
                      : canProceed
                        ? "Your access is being granted."
                        : `Please keep this tab open — ${minWatchTime - adWatchSeconds}s remaining.`}
                  </p>
                  {/* Progress bar */}
                  {!offerwallProviderName && (
                    <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand-purple transition-all duration-1000 ease-linear"
                        style={{
                          width: `${Math.min(100, (adWatchSeconds / minWatchTime) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CTA */}
            {!adLoading && !isUnlocked && (
              <Button variant="default"
                type="button"
                onClick={handleWatchAd}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors hover:/90"
              >
                <PlayCircle aria-hidden="true" className="h-5 w-5" />
                Watch Rewarded Ad to Unlock for Today
              </Button>
            )}

            {isUnlocked && (
              <Button variant="ghost"
                type="button"
                onClick={cancelUnlock}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-green px-4 py-3 text-sm font-bold text-primary-foreground transition-colors -green/90"
              >
                <Lock aria-hidden="true" className="h-4 w-4" />
                Continue to Advanced Calculator
              </Button>
            )}

            {offerwallProviderName && adLoading && (
              <a
                href={offerwallUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 text-xs text-brand-purple hover:underline"
              >
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                Open {offerwallProviderName} in a new tab
              </a>
            )}

            <p className="mt-4 text-center text-xs text-muted-foreground dark:text-muted-foreground">
              Access resets automatically at midnight. One ad per day.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
