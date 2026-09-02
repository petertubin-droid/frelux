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
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 dark:border-white/5 dark:bg-card">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking notification settings…</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={classNames(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            subscribed
              ? 'bg-primary/10 text-brand-purple dark:text-brand-purple-lighter'
              : 'bg-muted text-muted-foreground dark:bg-white/5'
          )}>
            {subscribed ? <Bell aria-hidden="true" className="h-5 w-5" /> : <BellOff aria-hidden="true" className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground dark:text-primary-foreground">Push Notifications</h3>
            <p className="mt-0.5 text-xs text-muted-foreground dark:text-muted-foreground">
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
                ? 'border border-border text-muted-foreground hover:bg-muted/50 dark:border-white/10 dark:text-muted-foreground/80 dark:hover:bg-white/5'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
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
