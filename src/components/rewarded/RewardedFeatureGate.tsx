import { Lock, CheckCircle2, Clock } from 'lucide-react';
import { useRewardedAccess, formatExpiry } from '@/lib/rewarded-access';
import { RewardedAdModal } from './RewardedAdModal';

interface Props {
  toolKey: string;
  featureName: string;
  features: string[];
  children: (access: ReturnType<typeof useRewardedAccess>) => React.ReactNode;
}

export function RewardedFeatureGate({ toolKey, featureName, features, children }: Props) {
  const access = useRewardedAccess(toolKey);

  if (access.loading) {
    return (
      <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 py-6 text-sm text-neutral-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-brand-purple" />
        Loading…
      </div>
    );
  }

  if (access.error && !access.isUnlocked) {
    return (
      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {access.error}
      </div>
    );
  }

  if (access.isUnlocked) {
    return (
      <>
        {children(access)}
        {access.expiresAt && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/10 px-4 py-2 text-xs text-neutral-600">
            <Clock className="h-3.5 w-3.5 text-accent-green" />
            {formatExpiry(access.expiresAt)}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="mt-6 overflow-hidden rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-transparent">
        <div className="p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-purple/10">
            <Lock className="h-6 w-6 text-brand-purple" />
          </div>
          <h3 className="mt-3 text-base font-bold text-brand-navy">{featureName}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
            Unlock advanced features by watching a short ad. No subscriptions, no payments. Just one ad for full access until 11:59 PM today.
          </p>
          <div className="mx-auto mt-4 max-w-sm space-y-1.5 text-left">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-purple" />
                {f}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={access.requestUnlock}
            disabled={!access.config?.is_enabled}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-purple px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            Watch Ad to Unlock Advanced Calculator
          </button>
          {!access.config?.is_enabled && (
            <p className="mt-2 text-xs text-neutral-400">This feature is temporarily disabled.</p>
          )}
        </div>
      </div>
      {(access.showAdModal || access.adLoading || access.isUnlocked) && (
        <RewardedAdModal access={access} featureName={featureName} features={features} />
      )}
    </>
  );
}
