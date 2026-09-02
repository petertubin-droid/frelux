import { useState, useEffect } from "react";
import {
  Check,
  Gem,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { useToast } from "@/components/ui/Toast";
import {
  PRICING_PLANS,
  formatNaira,
  type PricingPlan,
} from "@/lib/pricing-plans";
import {
  initializeSubscriptionCheckout,
  verifyPayment,
  isPaystackConfigured,
} from "@/lib/paystack";
import { isPremiumEnabled } from "@/lib/premium-access";
import { classNames } from "@/lib/utils";
import { SITE_URL } from "@/lib/seo";

type BillingCycle = "monthly" | "yearly";

export default function Pricing() {
  useSeo({
    title: "Pricing — FRELUX Premium",
    description:
      "Choose the FRELUX plan that fits your construction needs. From free calculators to the full engineering toolkit with structural design, foundation analysis, and AI-powered estimation.",
    canonicalPath: "/pricing",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: "FRELUX Premium",
        description:
          "Premium subscription for FRELUX engineering calculators, AI estimation tools, and Pro Connect messaging.",
        brand: { "@type": "Brand", name: "FRELUX PAINT CALC" },
        offers: [
          {
            "@type": "Offer",
            name: "Pro Monthly",
            price: "5000",
            priceCurrency: "NGN",
            url: `${SITE_URL}/pricing`,
            availability: "https://schema.org/PreOrder",
          },
          {
            "@type": "Offer",
            name: "Premium Monthly",
            price: "10000",
            priceCurrency: "NGN",
            url: `${SITE_URL}/pricing`,
            availability: "https://schema.org/PreOrder",
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Can I upgrade or downgrade my FRELUX plan later?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. You can switch plans at any time. If you upgrade, you'll only pay the prorated difference. Downgrades take effect at the end of your current billing cycle.",
            },
          },
          {
            "@type": "Question",
            name: "What payment methods does FRELUX accept?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "We use Paystack to accept all major Nigerian debit cards (Verve, Visa, Mastercard), bank transfers, and USSD. International cards are also supported.",
            },
          },
          {
            "@type": "Question",
            name: "Do I need to be logged in to subscribe?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. You'll need a free FRELUX account first. After subscribing, your premium features activate instantly.",
            },
          },
          {
            "@type": "Question",
            name: "What happens when my FRELUX subscription expires?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "You'll automatically revert to the Free plan. Your saved projects and data remain intact — you just lose access to premium tools until you renew.",
            },
          },
        ],
      },
    ],
  });

  const { user, isPaid, paidStatus, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<"success" | "error" | null>(
    null,
  );
  const [premiumLive, setPremiumLive] = useState<boolean | null>(null);

  // Check if premium subscriptions are enabled
  useEffect(() => {
    isPremiumEnabled().then(setPremiumLive);
  }, []);

  // Handle Paystack redirect callback
  useEffect(() => {
    const status = searchParams.get("status");
    const ref = searchParams.get("ref");
    if (status === "verify" && ref) {
      setVerifying(true);
      verifyPayment(ref).then(async (result) => {
        if (result.verified) {
          setVerifyResult("success");
          await refreshProfile();
          toast({
            title: "Payment successful!",
            message: "Your premium subscription is now active.",
          });
        } else {
          setVerifyResult("error");
          toast({
            title: "Payment verification failed",
            message: result.error || "Please contact support.",
            type: "error",
          });
        }
        setVerifying(false);
      });
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubscribe(plan: PricingPlan) {
    if (plan.id === "free") {
      navigate("/dashboard");
      return;
    }

    if (plan.id === "enterprise") {
      navigate("/contact?subject=Enterprise%20Inquiry");
      return;
    }

    if (!user) {
      navigate(`/login?redirect=/pricing`);
      return;
    }

    if (!premiumLive) {
      toast({
        title: "Coming Soon",
        message:
          "FRELUX Premium subscriptions are coming soon. We'll let you know as soon as they go live!",
      });
      return;
    }

    if (!isPaystackConfigured()) {
      toast({
        title: "Payment not configured",
        message:
          "Our payment provider is being set up. Please contact us directly to subscribe.",
        type: "error",
      });
      navigate("/contact?subject=Subscription%20Inquiry");
      return;
    }

    setLoadingPlan(plan.id);

    const amount =
      billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
    const amountInKobo = amount * 100; // Paystack expects kobo

    const result = await initializeSubscriptionCheckout(
      plan.id,
      billingCycle,
      amountInKobo,
      user.email!,
      user.id,
    );

    setLoadingPlan(null);

    if ("error" in result) {
      toast({
        title: "Payment failed to start",
        message: result.error,
        type: "error",
      });
    } else {
      // Redirect to Paystack checkout
      window.location.href = result.authorization_url;
    }
  }

  if (verifying) {
    return (
      <>
        <PageHeader
          eyebrow="Checkout"
          title="Verifying Payment"
          subtitle="Confirming your subscription with Paystack…"
        />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <Loader2
            aria-hidden="true"
            className="mx-auto h-12 w-12 animate-spin text-brand-purple"
          />
          <p className="mt-4 text-muted-foreground">
            Please wait while we verify your payment…
          </p>
        </div>
      </>
    );
  }

  if (verifyResult === "success") {
    return (
      <>
        <PageHeader
          eyebrow="Welcome aboard"
          title="Subscription Active!"
          subtitle="You now have access to all FRELUX premium tools."
        />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-accent-green/15">
            <Check aria-hidden="true" className="h-10 w-10 text-accent-green" />
          </div>
          <p className="mt-6 text-lg font-semibold text-foreground dark:text-primary-foreground">
            You're all set, {user?.email}!
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your{" "}
            <span className="font-semibold capitalize text-brand-purple">
              {paidStatus?.plan}
            </span>{" "}
            subscription is now active.
          </p>
          <Link
            to="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
          >
            Go to Dashboard{" "}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Plans for Every Stage of Your Build"
        subtitle="From free calculators to the full engineering toolkit. Upgrade anytime, cancel anytime."
      />

      {/* Billing cycle toggle */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-center">
          <div
            role="tablist"
            aria-label="Billing cycle"
            className="inline-flex rounded-xl border border-border bg-card p-1 dark:border-border border-border dark:bg-background"
          >
            <button
              role="tab"
              aria-selected={billingCycle === "monthly"}
              onClick={() => setBillingCycle("monthly")}
              className={classNames(
                "rounded-lg px-5 py-2 text-sm font-semibold transition-all",
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-brand-purple",
              )}
            >
              Monthly
            </button>
            <button
              role="tab"
              aria-selected={billingCycle === "yearly"}
              onClick={() => setBillingCycle("yearly")}
              className={classNames(
                "rounded-lg px-5 py-2 text-sm font-semibold transition-all",
                billingCycle === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-brand-purple",
              )}
            >
              Yearly
              <span className="ml-1.5 rounded-full bg-accent-green/15 px-2 py-0.5 text-[10px] font-bold text-accent-green">
                2 months free
              </span>
            </button>
          </div>
        </div>

        {/* Coming Soon banner */}
        {premiumLive === false && (
          <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-transparent p-6 text-center">
            <Gem
              aria-hidden="true"
              className="mx-auto h-8 w-8 text-brand-purple"
            />
            <h3 className="mt-3 text-lg font-bold text-foreground dark:text-primary-foreground">
              Premium Subscriptions — Coming Soon
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We're putting the finishing touches on FRELUX Premium. Browse the
              plans below to see what's coming, and check back shortly to
              subscribe.
            </p>
          </div>
        )}

        {/* Current plan indicator */}
        {isPaid && (
          <div className="mx-auto mt-6 max-w-md rounded-xl border border-brand-purple/30 bg-primary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground dark:text-muted-foreground/80">
              You're currently on{" "}
              <span className="font-bold capitalize text-brand-purple">
                {paidStatus?.plan}
              </span>
              {paidStatus?.paid_until && (
                <span className="text-muted-foreground">
                  {" "}
                  · expires{" "}
                  {new Date(paidStatus.paid_until).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Plan cards */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan) => {
            const price =
              billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
            const isCurrentPlan = isPaid && paidStatus?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={classNames(
                  "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all dark:bg-card",
                  plan.highlight
                    ? "border-brand-purple ring-2 ring-brand-purple/20 lg:scale-105"
                    : "border-border/60 dark:border-white/10",
                  isCurrentPlan && "ring-2 ring-accent-green/30",
                )}
              >
                {plan.badge && (
                  <span
                    className={classNames(
                      "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
                      plan.highlight
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground dark:bg-card-foreground/90 dark:text-muted-foreground/80",
                    )}
                  >
                    {plan.badge}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {plan.id === "free" ? (
                    <Gem
                      aria-hidden="true"
                      className="h-5 w-5 text-muted-foreground"
                    />
                  ) : (
                    <PremiumBadge size="sm" />
                  )}
                  <h3 className="text-lg font-bold text-foreground dark:text-primary-foreground">
                    {plan.name}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                  {plan.tagline}
                </p>

                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-foreground dark:text-primary-foreground">
                    {formatNaira(price)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{billingCycle === "monthly" ? "mo" : "yr"}
                  </span>
                </div>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={
                    isLoading ||
                    isCurrentPlan ||
                    (premiumLive === false &&
                      plan.id !== "free" &&
                      plan.id !== "enterprise")
                  }
                  className={classNames(
                    "mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                    isCurrentPlan
                      ? "cursor-default bg-accent-green/10 text-accent-green"
                      : premiumLive === false &&
                          plan.id !== "free" &&
                          plan.id !== "enterprise"
                        ? "cursor-default border border-brand-purple/30 bg-primary/5 text-brand-purple"
                        : plan.highlight
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-border text-foreground hover:border-brand-purple hover:text-brand-purple dark:border-white/20 dark:text-primary-foreground dark:hover:border-brand-purple-lighter",
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />{" "}
                      Processing…
                    </span>
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : premiumLive === false &&
                    plan.id !== "free" &&
                    plan.id !== "enterprise" ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Gem aria-hidden="true" className="h-3.5 w-3.5" /> Coming
                      Soon
                    </span>
                  ) : (
                    plan.cta
                  )}
                </button>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground dark:text-muted-foreground/80"
                    >
                      <Check
                        className={classNames(
                          "mt-0.5 h-4 w-4 shrink-0",
                          plan.highlight
                            ? "text-brand-purple"
                            : "text-accent-green",
                        )}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" /> Secure
            payment via Paystack
          </span>
          <span className="flex items-center gap-2">
            <Zap aria-hidden="true" className="h-4 w-4" /> Instant activation
          </span>
          <span className="flex items-center gap-2">
            <Check aria-hidden="true" className="h-4 w-4" /> Cancel anytime
          </span>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-center text-xl font-bold text-foreground dark:text-primary-foreground">
            Frequently Asked Questions
          </h2>
          <div className="mt-6 space-y-4">
            <FaqItem
              q="Can I upgrade or downgrade later?"
              a="Yes. You can switch plans at any time. If you upgrade, you'll only pay the prorated difference. Downgrades take effect at the end of your current billing cycle."
            />
            <FaqItem
              q="What payment methods do you accept?"
              a="We use Paystack to accept all major Nigerian debit cards (Verve, Visa, Mastercard), bank transfers, and USSD. International cards are also supported."
            />
            <FaqItem
              q="Do I need to be logged in to subscribe?"
              a="Yes. You'll need a free FRELUX account first. After subscribing, your premium features activate instantly."
            />
            <FaqItem
              q="What happens when my subscription expires?"
              a="You'll automatically revert to the Free plan. Your saved projects and data remain intact — you just lose access to premium tools until you renew."
            />
          </div>
        </div>

        {/* CTA for non-logged-in users */}
        {!user && (
          <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-brand-purple/20 bg-primary/5 p-6 text-center">
            <AlertCircle
              aria-hidden="true"
              className="mx-auto h-8 w-8 text-brand-purple"
            />
            <p className="mt-3 text-sm text-muted-foreground dark:text-muted-foreground/80">
              You need a FRELUX account to subscribe. Create one in seconds —
              it's free.
            </p>
            <Link
              to="/login?redirect=/pricing"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-background px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-background/90"
            >
              Sign Up / Log In{" "}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border/60 bg-card dark:border-white/10 dark:bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-semibold text-foreground dark:text-primary-foreground">
          {q}
        </span>
        <span
          className={classNames(
            "text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>
      {open && (
        <p className="px-4 pb-4 text-sm text-muted-foreground dark:text-muted-foreground">
          {a}
        </p>
      )}
    </div>
  );
}
