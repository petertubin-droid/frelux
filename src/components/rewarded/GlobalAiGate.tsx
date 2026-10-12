import React, { useState, useEffect } from 'react';
import { getAiGatewayStatus, AiGatewayStatus } from '@/lib/ai-access';
import { useRewardedAccess } from '@/lib/rewarded-access';
import { RewardedAdModal } from './RewardedAdModal';
import { Sparkles, Lock, PlayCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GlobalAiGateProps {
  featureName: string;
  children: React.ReactNode;
}

export const GlobalAiGate: React.FC<GlobalAiGateProps> = ({ featureName, children }) => {
  const [status, setStatus] = useState<AiGatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const access = useRewardedAccess('ai_gateway'); // {

  const checkStatus = async () => {
    setLoading(true);
    const s = await getAiGatewayStatus();
    setStatus(s);
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, [access.isUnlocked]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4 mr-2 animate-spin text-primary" />
        Checking AI Access & Entitlements...
      </div>
    );
  }

  if (status?.canExecute || access.isUnlocked) {
    return (
      <div>
        {!status?.isSubscribed && (
          <div className="mb-4 bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between text-xs text-primary">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              1 Rewarded AI operation available for today
            </span>
            <span className="opacity-80">Shared across all FRELUX AI tools</span>
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className="border border-border/60 rounded-xl p-6 sm:p-8 bg-card/50 text-center max-w-lg mx-auto shadow-sm my-6">
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
        {status?.operationsUsed && status.operationsUsed >= 1 ? (
          <Lock className="w-6 h-6" />
        ) : (
          <Sparkles className="w-6 h-6" />
        )}
      </div>

      <h3 className="text-lg font-bold text-foreground mb-2">
        {status?.operationsUsed && status.operationsUsed >= 1
          ? 'Daily Free AI Quota Reached'
          : `Unlock ${featureName}`}
      </h3>

      <p className="text-sm text-muted-foreground mb-6">
        {status?.operationsUsed && status.operationsUsed >= 1
          ? 'You have used your 1 free AI operation for today. Free quota resets at midnight (WAT). Upgrade to Pro for unlimited AI access.'
          : 'Free users receive 1 high-precision AI operation per day by watching a short rewarded video.'}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {(!status?.operationsUsed || status.operationsUsed < 1) && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            Watch Ad for 1 Free Use
          </button>
        )}

        <button
          onClick={() => navigate('/pricing')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          Get Unlimited with Pro
        </button>
      </div>

      {showModal && (
        <RewardedAdModal
          access={access}
          featureName={featureName}
          features={['1 Free AI Operation Today', 'Valid Across All AI Tools']}
        />
      )}
    </div>
  );
};
