import { X, PlayCircle, Loader2, Gift, CheckCircle2, Lock, Clock } from 'lucide-react';
import { formatExpiry } from '@/lib/rewarded-access';
import type { RewardedAccess } from '@/lib/rewarded-access';

interface Props {
  access: RewardedAccess;
  featureName: string;
  features: string[];
}

export function RewardedAdModal({ access, featureName, features }: Props) {
  const { adLoading, cancelUnlock, watchAd, expiresAt, isUnlocked } = access;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={cancelUnlock} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-brand-navy-mid dark:bg-brand-navy-mid">
        {/* Header */}
        <div className="bg-gradient-to-br from-brand-navy to-brand-purple p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-6 w-6 text-accent-green" />
              <h2 className="text-lg font-bold">{featureName}</h2>
            </div>
            <button type="button" onClick={cancelUnlock} className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-sm text-white/70">
            Unlock all advanced features for today. Watch one short ad. No subscriptions, no payments.
          </p>
        </div>

        {/* Features list */}
        <div className="p-6">
          <div className="space-y-2">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-green" />
                {f}
              </div>
            ))}
          </div>

          {/* Unlock status */}
          {isUnlocked && expiresAt && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/10 p-3 text-sm text-neutral-700 dark:text-neutral-200">
              <Clock className="h-4 w-4 text-accent-green" />
              {formatExpiry(expiresAt)}
            </div>
          )}

          {/* Ad watching state */}
          {adLoading && (
            <div className="mt-6 flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Playing ad…</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Please keep this tab open while the ad plays.</p>
            </div>
          )}

          {/* CTA */}
          {!adLoading && !isUnlocked && (
            <button
              type="button"
              onClick={watchAd}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-purple px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90"
            >
              <PlayCircle className="h-5 w-5" />
              Watch Rewarded Ad to Unlock for Today
            </button>
          )}

          {isUnlocked && (
            <button
              type="button"
              onClick={cancelUnlock}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-green px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-green/90"
            >
              <Lock className="h-4 w-4" />
              Continue to Advanced Calculator
            </button>
          )}

          <p className="mt-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
            Access resets automatically at midnight. One ad per day.
          </p>
        </div>
      </div>
    </div>
  );
}
