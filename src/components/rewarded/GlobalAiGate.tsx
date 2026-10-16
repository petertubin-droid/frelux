import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits-context";
import {
  getAiGatewayStatus,
  AiGatewayStatus,
  getClientId,
} from "@/lib/ai-access";
import {
  Sparkles,
  Lock,
  Coins,
  ShieldCheck,
  CheckCircle2,
  UserPlus,
  LogIn,
  ArrowRight,
  PlayCircle,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GlobalAiGateProps {
  featureName: string;
  children: React.ReactNode;
}

export const GlobalAiGate: React.FC<GlobalAiGateProps> = ({
  featureName,
  children,
}) => {
  const { user } = useAuth();
  const { wallet } = useCredits();
  const [gatewayStatus, setGatewayStatus] = useState<AiGatewayStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [adWatching, setAdWatching] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const navigate = useNavigate();

  const checkStatus = async () => {
    setLoading(true);
    const s = await getAiGatewayStatus();
    setGatewayStatus(s);
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, [user, wallet?.balance]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4 mr-2 animate-spin text-primary" />
        Checking AI Access & Entitlements...
      </div>
    );
  }

  // ── State C: Subscriber (Unlimited / covered by plan) ──
  if (gatewayStatus?.isSubscribed) {
    return <div>{children}</div>;
  }

  // ── State A: Anonymous Guest ──
  if (!user) {
    const guestUsed = gatewayStatus?.operationsUsed ?? 0;
    const hasAdCredit = gatewayStatus?.hasAdCredit ?? false;

    // 1. Guest exhausted daily allowance -> prompt to register / sign in (NO ad offered)
    if (guestUsed >= 1) {
      return (
        <div className="border border-border/80 rounded-xl p-6 sm:p-8 bg-card/60 text-center max-w-lg mx-auto shadow-sm my-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-foreground mb-2">
            Daily Guest AI Allowance Used
          </h3>

          <p className="text-sm text-muted-foreground mb-6">
            You have used your 1 free guest AI operation for today. Sign in or
            create an account to earn AI credits, complete tasks, or get
            unlimited access.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/login?mode=signup")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Create Free Account
            </button>

            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </div>
        </div>
      );
    }

    // 2. Guest has already watched an ad today -> render unlocked AI tool
    if (hasAdCredit) {
      return (
        <div>
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4" />1 Free Guest AI Operation
              Unlocked Today
            </span>
            <span className="opacity-80">
              Shared across all FRELUX AI tools
            </span>
          </div>
          {children}
        </div>
      );
    }

    // 3. Guest has NOT yet watched an ad today -> prompt to watch sponsor ad to unlock
    return (
      <div className="border border-border/80 rounded-xl p-6 sm:p-8 bg-card/60 text-center max-w-lg mx-auto shadow-sm my-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <PlayCircle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-foreground mb-2">
          Unlock 1 Free Guest AI Operation
        </h3>

        <p className="text-sm text-muted-foreground mb-4">
          Secure ad verification is not configured yet, so sponsored AI access
          is temporarily unavailable. You can still create an account or sign in
          to use your available credits.
        </p>

        <div className="mb-4 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Rewarded ads are disabled until an authenticated provider-side
          completion can be verified. No ad impression will be requested.
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-3">
            Want persistent credits, higher limits, or pro features?
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => navigate("/login?mode=signup")}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              Create Free Account
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── State B: Registered Free User (Requires 10 credits) ──
  const balance = wallet?.balance ?? 0;
  const standardCost = 10;
  const hasEnoughCredits = balance >= standardCost;

  if (hasEnoughCredits) {
    return (
      <div>
        <div className="mb-4 bg-muted/60 border border-border rounded-lg p-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Coins className="w-4 h-4 text-primary" />
            Available: <strong>{balance} Credits</strong> (Cost: {standardCost}{" "}
            credits)
          </span>
          <button
            onClick={() => navigate("/profile")}
            className="text-primary hover:underline flex items-center gap-1"
          >
            Manage in Profile <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {children}
      </div>
    );
  }

  // Registered user with insufficient credits -> Direct to Profile (NO in-feature ad prompts!)
  const missing = standardCost - balance;
  return (
    <div className="border border-border/80 rounded-xl p-6 sm:p-8 bg-card/60 text-center max-w-lg mx-auto shadow-sm my-6">
      <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
        <Coins className="w-6 h-6" />
      </div>

      <h3 className="text-lg font-bold text-foreground mb-2">
        Additional Credits Needed
      </h3>

      <p className="text-sm text-muted-foreground mb-4">
        {featureName} costs <strong>{standardCost} credits</strong> per
        operation. Your current balance is <strong>{balance} credits</strong>{" "}
        (you need <strong>{missing} more credits</strong>).
      </p>

      <p className="text-xs text-muted-foreground mb-6">
        Visit your Profile section to earn credits by watching rewarded partner
        ads (+5 credits each, up to 4 daily), completing eligible tasks, or
        purchasing credit bundles.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => navigate("/profile")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Coins className="w-4 h-4" />
          Earn or Buy in Profile
        </button>

        <button
          onClick={() => navigate("/pricing")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
};
