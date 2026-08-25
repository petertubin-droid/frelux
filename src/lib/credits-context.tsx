/**
 * Credits Context — provides credit wallet state and reward actions
 * to the entire app. Integrates with existing auth context.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import {
  getCreditWallet,
  getActivityStreak,
  recordActivity,
  REWARD_EVENTS,
  type CreditWallet,
  type ActivityStreak,
  type RewardEventKey,
  generateReferenceId,
} from '@/lib/credits';
import { useToast } from '@/components/ui/Toast';

interface CreditsContextValue {
  wallet: CreditWallet | null;
  streak: ActivityStreak | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Award credits for a specific reward event (server-side, idempotent) */
  awardEvent: (eventKey: RewardEventKey, referenceId: string, metadata?: Record<string, unknown>) => Promise<boolean>;
  /** Record qualifying activity (updates streak + mission progress) */
  trackActivity: (activityType: string, missionTaskType?: string) => Promise<void>;
}

const CreditsContext = createContext<CreditsContextValue | undefined>(undefined);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [streak, setStreak] = useState<ActivityStreak | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setStreak(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [w, s] = await Promise.all([
      getCreditWallet(user.id),
      getActivityStreak(user.id),
    ]);
    setWallet(w);
    setStreak(s);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const awardEvent = useCallback(
    async (eventKey: RewardEventKey, referenceId: string, metadata?: Record<string, unknown>): Promise<boolean> => {
      if (!user || !session) return false;

      const eventDef = REWARD_EVENTS[eventKey];
      if (!eventDef) return false;

      const token = session.access_token;
      const { awardCredits } = await import('@/lib/credits');
      const result = await awardCredits(token, eventDef, referenceId, metadata);

      if (result.success && !result.alreadyAwarded) {
        // Refresh wallet to show new balance
        await refresh();
        // Toast notification
        toast({
          type: 'success',
          title: `+${eventDef.amount} FRELUX Credits`,
          message: eventDef.reason,
          duration: 3500,
        });
        return true;
      }

      if (result.success && result.alreadyAwarded) {
        // Already awarded — silent (idempotency working)
        return false;
      }

      return false;
    },
    [user, session, refresh, toast]
  );

  const trackActivity = useCallback(
    async (activityType: string, missionTaskType?: string) => {
      if (!user || !session) return;

      const token = session.access_token;
      const result = await recordActivity(token, activityType, missionTaskType);

      if (result.success && result.streakAwarded && result.streakAwarded > 0) {
        toast({
          type: 'success',
          title: `🔥 7-Day Streak! +${result.streakAwarded} Credits`,
          message: 'You completed a 7-day activity streak.',
          duration: 4000,
        });
        await refresh();
      }
    },
    [user, session, refresh, toast]
  );

  return (
    <CreditsContext.Provider value={{ wallet, streak, loading, refresh, awardEvent, trackActivity }}>
      {children}
    </CreditsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error('useCredits must be used within CreditsProvider');
  return ctx;
}
