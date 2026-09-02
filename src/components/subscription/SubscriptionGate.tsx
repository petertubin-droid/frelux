import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Lock, Clock, CheckCircle2, Gem } from "lucide-react";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { useAuth } from "@/lib/auth";
import { formatSubscriptionStatus } from "@/lib/subscription";
import type { PaidFeature } from "@/lib/subscription";
import { FEATURE_LABELS, getFeatureMinPlan } from "@/lib/subscription";
import { isPremiumEnabled } from "@/lib/premium-access";

interface SubscriptionGateProps {
  feature: PaidFeature;
  children: React.ReactNode;
  /** Optional fallback content to show when the user is not subscribed */
  fallback?: React.ReactNode;
}

/**
 * Gates children behind an active subscription check.
 *
 * Access rules:
 * - Admins always see the content
 * - Users with active paid subscription see the content
 * - When premium subscriptions are disabled (admin toggle), shows "Coming Soon"
 * - Everyone else sees the locked paywall
 *
 * For rewarded-ad gating (daily free uses + ad unlock), use RewardedFeatureGate instead.
 */
export function SubscriptionGate({
  feature,
  children,
  fallback,
}: SubscriptionGateProps) {
  const { isAdmin, isPaid, paidStatus, user } = useAuth();
  const [premiumLive, setPremiumLive] = useState<boolean | null>(null);

  useEffect(() => {
    isPremiumEnabled().then(setPremiumLive);
  }, []);

  // Check tiered access: admin always passes, paid users must have sufficient plan tier
  const minPlan = getFeatureMinPlan(feature);
  const hasAccess =
    isAdmin ||
    (isPaid &&
      (() => {
        // Free features always accessible
        if (minPlan === "free") return true;
        // Check if user's plan meets the feature's minimum tier
        const userPlan = paidStatus?.plan || "free";
        const hierarchy = ["free", "basic", "pro", "premium", "enterprise"];
        return hierarchy.indexOf(userPlan) >= hierarchy.indexOf(minPlan);
      })());

  if (hasAccess) {
    return (
      <>
        {children}
        {isPaid && paidStatus?.paid_until && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/10 px-4 py-2 text-xs text-muted-foreground">
            <Clock
              aria-hidden="true"
              className="h-3.5 w-3.5 text-accent-green"
            />
            {formatSubscriptionStatus({
              isActive: true,
              plan:
                (paidStatus.plan as
                  "free" | "basic" | "pro" | "premium" | "enterprise") || "pro",
              paidUntil: new Date(paidStatus.paid_until),
              daysRemaining: Math.ceil(
                (new Date(paidStatus.paid_until).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              ),
              paidStatus,
              loading: false,
              error: null,
              refresh: async () => {},
            })}
          </div>
        )}
      </>
    );
  }

  if (fallback) return <>{fallback}</>;

  const featureLabel = FEATURE_LABELS[feature];

  // Show "Coming Soon" when premium subscriptions are not live yet
  if (premiumLive === false) {
    return (
      <div className="mx-auto max-w-md py-12 px-4">
        <div className="rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Gem className="h-7 w-7 text-brand-purple" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground dark:text-primary-foreground">
            {featureLabel}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This premium feature is coming soon. We're putting the finishing
            touches on FRELUX Premium subscriptions.
          </p>

          <div className="mx-auto mt-5 max-w-sm space-y-1.5 text-left">
            {[
              "All engineering calculators & estimators",
              "AI Photo Estimator with vision analysis",
              "Construction Sequence Planner",
              "Structural & Foundation calculators",
              "Unlimited saves & export to PDF",
              "Priority Pro Connect messaging",
            ].map((f) => (
              <div
                key={f}
                className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground/80"
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-brand-purple"
                />
                {f}
              </div>
            ))}
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-brand-purple/30 bg-primary/5 px-6 py-3 text-sm font-bold text-brand-purple">
            <Gem className="h-4 w-4" />
            Coming Soon
          </div>

          {user && (
            <p className="mt-3 text-xs text-muted-foreground">
              You'll be notified as soon as Premium goes live.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Loading state (premiumLive === null) — show nothing briefly
  if (premiumLive === null) {
    return (
      <div className="mx-auto max-w-md py-12 px-4 animate-pulse">
        <div className="h-48 rounded-2xl border border-border bg-muted/50 dark:border-white/5 dark:bg-white/5" />
      </div>
    );
  }

  // Premium is live — show the real paywall
  return (
    <div className="mx-auto max-w-md py-12 px-4">
      <div className="rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
          <Lock aria-hidden="true" className="h-7 w-7 text-brand-purple" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-foreground dark:text-primary-foreground">
          {featureLabel}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This feature requires the{" "}
          <span className="font-semibold capitalize text-brand-purple">
            {minPlan}
          </span>{" "}
          plan or higher. Subscribe to unlock all FRELUX engineering tools,
          calculators, and AI assistants.
        </p>

        <div className="mx-auto mt-5 max-w-sm space-y-1.5 text-left">
          {[
            "All engineering calculators & estimators",
            "AI Photo Estimator with vision analysis",
            "Construction Sequence Planner",
            "Structural & Foundation calculators",
            "Unlimited saves & export to PDF",
            "Priority Pro Connect messaging",
          ].map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground/80"
            >
              <CheckCircle2
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-brand-purple"
              />
              {f}
            </div>
          ))}
        </div>

        {user ? (
          <Link
            to="/pricing"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PremiumBadge size="xs" />
            Upgrade
          </Link>
        ) : (
          <Link
            to="/login?redirect=/pricing"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PremiumBadge size="xs" />
            Sign in to Subscribe
          </Link>
        )}
      </div>
    </div>
  );
}
