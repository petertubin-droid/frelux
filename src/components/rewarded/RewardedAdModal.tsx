import { X, PlayCircle, Loader2, Gift, CheckCircle2, Lock, Clock, ExternalLink } from 'lucide-react';
import { formatExpiry } from '@/lib/rewarded-access';
import type { RewardedAccess } from '@/lib/rewarded-access';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={cancelUnlock} />

      {/* Offerwall iframe mode — larger modal */}
      {offerwallUrl ? (
        <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-brand-navy-mid">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Gift aria-hidden="true" className="h-5 w-5 text-brand-purple" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {offerwallProviderName ?? adProviderUsed} — Complete offers to unlock
              </h2>
            </div>
            <button
              type="button"
              onClick={() => { closeOfferwall(); cancelUnlock(); }}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Offerwall iframe */}
          <div className="relative" style={{ height: '600px' }}>
            <iframe
              src={offerwallUrl}
              title={`${offerwallProviderName ?? 'Sponsor'} offerwall`}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 dark:border-white/5">
            <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-500">
              <Clock aria-hidden="true" className="h-3.5 w-3.5" />
              Checking for completion… This will close automatically when you earn your reward.
            </p>
            <button
              type="button"
              onClick={() => { closeOfferwall(); cancelUnlock(); }}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white"
            >
              Maybe later
            </button>
          </div>
        </div>
      ) : (
        /* Standard rewarded ad modal (SDK / dev mode) */
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-brand-navy-mid">
          {/* Header */}
          <div className="bg-gradient-to-br from-brand-navy to-brand-purple p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Gift aria-hidden="true" className="h-6 w-6 text-accent-green" />
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
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-accent-green" />
                  {f}
                </div>
              ))}
            </div>

            {/* Unlock status */}
            {isUnlocked && expiresAt && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/10 p-3 text-sm text-neutral-700 dark:text-neutral-200">
                <Clock aria-hidden="true" className="h-4 w-4 text-accent-green" />
                {formatExpiry(expiresAt)}
              </div>
            )}

            {/* Ad watching state */}
            {adLoading && (
              <div className="mt-6 flex flex-col items-center gap-3 py-4">
                <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-brand-purple" />
                <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  {offerwallProviderName ? 'Opening offerwall…' : 'Playing ad…'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">
                  {offerwallProviderName
                    ? 'Complete offers in the offerwall to earn your unlock.'
                    : 'Please keep this tab open while the ad plays.'}
                </p>
              </div>
            )}

            {/* CTA */}
            {!adLoading && !isUnlocked && (
              <button
                type="button"
                onClick={watchAd}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-purple px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90"
              >
                <PlayCircle aria-hidden="true" className="h-5 w-5" />
                Watch Rewarded Ad to Unlock for Today
              </button>
            )}

            {isUnlocked && (
              <button
                type="button"
                onClick={cancelUnlock}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-green px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-green/90"
              >
                <Lock aria-hidden="true" className="h-4 w-4" />
                Continue to Advanced Calculator
              </button>
            )}

            {offerwallProviderName && adLoading && (
              <a
                href={offerwallUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 text-xs text-brand-purple hover:underline"
              >
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                Open {offerwallProviderName} in a new tab
              </a>
            )}

            <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-500">
              Access resets automatically at midnight. One ad per day.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
