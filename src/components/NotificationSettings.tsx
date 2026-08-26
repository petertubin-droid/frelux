import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Check, AlertTriangle } from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  hasPushSubscription,
} from '@/lib/push-notifications';
import { useAuth } from '@/lib/auth';
import { classNames } from '@/lib/utils';

export default function NotificationSettings() {
  const { user } = useAuth();
  const [pushSupported, setPushSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const supported = isPushSupported();
    setPushSupported(supported);
    if (!supported) {
      setLoading(false);
      return;
    }
    setPermission(getNotificationPermission());
    (async () => {
      const has = await hasPushSubscription();
      setSubscribed(has);
      setLoading(false);
    })();
  }, [user]);

  async function handleToggle() {
    if (!user) return;
    setActionLoading(true);
    setMessage(null);

    try {
      if (subscribed) {
        const ok = await unsubscribeFromPush();
        if (ok) {
          setSubscribed(false);
          setMessage({ type: 'success', text: 'Push notifications disabled.' });
        } else {
          setMessage({ type: 'error', text: 'Failed to disable notifications. Try again.' });
        }
      } else {
        // Request permission and subscribe
        const ok = await subscribeToPush();
        if (ok) {
          setSubscribed(true);
          setPermission('granted');
          setMessage({ type: 'success', text: 'Push notifications enabled! You\'ll receive message alerts.' });
        } else {
          setPermission(getNotificationPermission());
          setMessage({ type: 'error', text: 'Failed to enable notifications. Check your browser permissions.' });
        }
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-neutral-400" />
        <span className="text-sm text-neutral-400">Checking notification settings…</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={classNames(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            subscribed
              ? 'bg-brand-purple/10 text-brand-purple dark:text-brand-purple-lighter'
              : 'bg-neutral-100 text-neutral-400 dark:bg-white/5'
          )}>
            {subscribed ? <Bell aria-hidden="true" className="h-5 w-5" /> : <BellOff aria-hidden="true" className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Push Notifications</h3>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {pushSupported
                ? subscribed
                  ? 'You\'ll receive notifications when professionals message you.'
                  : 'Get notified instantly when you receive new messages.'
                : 'Push notifications aren\'t supported in this browser.'}
            </p>
          </div>
        </div>

        {pushSupported && user && (
          <button
            onClick={handleToggle}
            disabled={actionLoading}
            className={classNames(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
              subscribed
                ? 'border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5'
                : 'bg-brand-purple text-white hover:bg-brand-purple-dark'
            )}
          >
            {actionLoading ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : subscribed ? (
              'Disable'
            ) : (
              'Enable'
            )}
          </button>
        )}
      </div>

      {/* Permission warning */}
      {pushSupported && permission === 'denied' && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Notifications are blocked in your browser settings. To enable, go to site settings and allow notifications for this website.
          </p>
        </div>
      )}

      {/* Success/error message */}
      {message && (
        <div className={classNames(
          'mt-4 flex items-start gap-2 rounded-lg p-3 text-xs',
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
        )}>
          {message.type === 'success' ? <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />}
          <p>{message.text}</p>
        </div>
      )}
    </div>
  );
}
