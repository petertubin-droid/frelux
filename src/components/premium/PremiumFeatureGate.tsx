/**
 * PremiumFeatureGate — Reusable inline gate for premium features.
 *
 * Shows a golden crown icon and two unlock buttons:
 * 1. Watch Ad to Unlock (uses existing unlockFeatureViaAd)
 * 2. Use 10 Credits to Unlock (uses existing spendAiCredits)
 *
 * Unlock is session-scoped (useState only) — once the user leaves
 * the feature, they must unlock again.
 *
 * Paid subscribers bypass the gate entirely.
 *
 * Does NOT modify the credits flow — uses existing edge functions.
 */
import { useState, useCallback, useEffect } from "react";
import { Crown, PlayCircle, Loader2, X } from "lucide-react";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { useAuth } from "@/lib/auth";
import {
  spendAiCredits,
  unlockFeatureViaAd,
  getAiFeatureCost,
  generateReferenceId,
  type AiFeatureCost,
} from "@/lib/credits";
import { logAdEvent } from "@/lib/ad-config";
import { hasRewardedAdProvider } from "@/lib/ad-config";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/shadcn/button";

interface Props {
  /** Feature key in ai_feature_costs table (e.g. 'pdf_export', 'ai_building_estimation') */
  featureKey: string;
  /** Display name shown in the gate UI */
  featureName: string;
  /** Called when the user successfully unlocks — proceed with the feature */
  onUnlock: () => void;
  /** Called when the user dismisses the gate */
  onClose: () => void;
  /** Optional description shown below the feature name */
  description?: string;
}

export function PremiumFeatureGate({
  featureKey,
  featureName,
  onUnlock,
  onClose,
  description,
}: Props) {
  const { isPaid, user } = useAuth();
  const { toast } = useToast();
  const [featureCost, setFeatureCost] = useState<AiFeatureCost | null>(null);
  const [loading, setLoading] = useState(true);
  const [spending, setSpending] = useState(false);
  const [adUnlocking, setAdUnlocking] = useState(false);
  const [adProviderReady, setAdProviderReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    hasRewardedAdProvider().then(setAdProviderReady);
  }, []);

  useEffect(() => {
    (async () => {
      const cost = await getAiFeatureCost(featureKey);
      setFeatureCost(cost);
      setLoading(false);
    })();
  }, [featureKey]);

  // Paid subscribers bypass the gate
  useEffect(() => {
    if (isPaid && !loading) {
      onUnlock();
    }
  }, [isPaid, loading, onUnlock]);

  const handleUseCredits = useCallback(async () => {
    if (!user) {
      setError("Please sign in to use credits.");
      return;
    }
    setSpending(true);
    setError("");

    const idempotencyKey = generateReferenceId(featureKey);
    const result = await spendAiCredits(featureKey, idempotencyKey);

    setSpending(false);

    if (result.success) {
      toast({
        type: "success",
        title: "Unlocked!",
        message: `${featureName} is ready to use.`,
      });
      onUnlock();
    } else {
      if (result.code === "INSUFFICIENT_CREDITS") {
        setError(
          `Not enough FRELUX Credits. You need ${result.requiredCredits ?? 10} but have ${result.currentBalance ?? 0}.`,
        );
      } else if (result.code === "DAILY_LIMIT") {
        setError("Daily usage limit reached for this feature.");
      } else {
        setError(result.error ?? "Failed to spend credits.");
      }
    }
  }, [user, featureKey, featureName, onUnlock, toast]);

  const handleWatchAd = useCallback(async () => {
    if (!user) {
      setError("Please sign in to watch ads.");
      return;
    }
    if (!adProviderReady) {
      setError("No ad provider is configured yet. Please check back later!");
      return;
    }

    setAdUnlocking(true);
    setError("");

    const adEventId = `gate_ad_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await logAdEvent({
      event_type: "impression",
      tool_key: featureKey,
      metadata: { ad_event_id: adEventId, mode: "unlock_feature" },
    });

    const result = await unlockFeatureViaAd(featureKey, "adsense", adEventId);

    setAdUnlocking(false);

    if (result.success) {
      await logAdEvent({
        event_type: "reward",
        tool_key: featureKey,
        metadata: { ad_event_id: adEventId, mode: "unlock_feature" },
      });
      toast({
        type: "success",
        title: "Unlocked!",
        message: `${featureName} is ready to use.`,
      });
      onUnlock();
    } else {
      setError(
        result.error ?? "Ad verification failed. No reward was granted.",
      );
    }
  }, [user, adProviderReady, featureKey, featureName, onUnlock, toast]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative rounded-2xl bg-card p-8 dark:bg-card">
          <Loader2
            aria-hidden="true"
            className="h-8 w-8 animate-spin text-brand-purple"
          />
        </div>
      </div>
    );
  }

  const cost = featureCost?.credit_cost ?? 10;
  const adAvailable = featureCost?.ad_unlock_enabled ?? true;
  const canWatchAd = adAvailable && adProviderReady;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl dark:bg-card">
        {/* Header with crown */}
        <div className="bg-gradient-to-br from-background to-primary p-6 text-primary-foreground">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <PremiumBadge size="md" glow />
              <h2 className="text-lg font-bold">{featureName}</h2>
            </div>
            <Button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </Button>
          </div>
          <p className="mt-2 text-sm text-primary-foreground/70">
            {description ??
              "Unlock this premium feature. One-time use — choose how you want to access it."}
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {/* Use Credits button */}
            <Button variant="default"
              type="button"
              onClick={handleUseCredits}
              disabled={spending}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all hover:/90 disabled:opacity-50"
            >
              {spending ? (
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
              ) : (
                <Crown aria-hidden="true" className="h-5 w-5 text-amber-400" />
              )}
              Use {cost} Credits to Unlock
            </Button>

            {/* Watch Ad button */}
            {canWatchAd && (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-muted dark:bg-white/10" />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    OR
                  </span>
                  <div className="h-px flex-1 bg-muted dark:bg-white/10" />
                </div>
                <Button variant="default"
                  type="button"
                  onClick={handleWatchAd}
                  disabled={adUnlocking}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-purple/30 px-4 py-3 text-sm font-bold text-brand-purple transition-all hover:disabled:opacity-50"
                >
                  {adUnlocking ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-5 w-5 animate-spin"
                    />
                  ) : (
                    <PlayCircle aria-hidden="true" className="h-5 w-5" />
                  )}
                  Watch Ad to Unlock
                </Button>
              </>
            )}

            {!canWatchAd && (
              <p className="text-center text-xs text-muted-foreground dark:text-muted-foreground">
                Watch ads from the Rewards page to earn more credits.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
