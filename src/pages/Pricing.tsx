import { useState, useEffect, useMemo } from "react";
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
import {
  MARKET_STORAGE_KEY,
  useMarket,
} from "@/lib/international/market-context";
import {
  detectMarketCode,
  pricingMarketCode,
} from "@/lib/international/market-suggest";
import { useSeo } from "@/lib/seo";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { useToast } from "@/components/ui/Toast";
import {
  loadLocalSubscriptionPrices,
  displayedPrice,
  formatLocalPrice,
  marketCurrencyCode,
  type LocalPriceRow,
} from "@/lib/subscription-pricing";
import {
  PRICING_PLANS,
  SUBSCRIPTION_CURRENCY,
  formatUsdPrice,
  planPriceCents,
  yearlySavingPercent,
  type PricingPlan,
} from "@/lib/pricing-plans";
import { verifyPayment } from "@/lib/paystack";
import { verifyFlutterwavePayment } from "@/lib/flutterwave";
import {
  startSubscriptionCheckout,
  fetchConfiguredGateway,
  gatewaysForMarket,
  gatewayForMarket,
  currentGatewayRuntimeConfig,
  type PaymentGateway,
} from "@/lib/payments/gateway";
import { isPremiumEnabled } from "@/lib/premium-access";
import { classNames } from "@/lib/utils";
import { SITE_URL } from "@/lib/seo";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

type BillingCycle = "monthly" | "yearly";

/** Largest annual saving across paid plans, for the toggle badge. */
const MAX_YEARLY_SAVING = Math.max(
  ...PRICING_PLANS.map((p) => yearlySavingPercent(p)),
);

export default function Pricing() {
  const { t } = useLanguage();
  useSeo({
    title: "Pricing, FRELUX Premium",
    description:
      "Choose the FRELUX plan that fits your construction needs. From free calculators to the full engineering toolkit with structural design, foundation analysis, and AI-powered estimation.",
    canonicalPath: "/pricing",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        // SoftwareApplication, not Product: FRELUX Premium is a software
        // subscription, not a physical merchant product. Typing it as
        // Product made Search Console demand aggregateRating/review
        // (Product snippets warnings, 2026-10-10). We never fabricate
        // ratings, so the honest type is the fix.
        "@type": "SoftwareApplication",
        name: "FRELUX Premium",
        description:
          "Premium subscription for FRELUX engineering calculators, AI estimation tools, and Pro Connect messaging.",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        publisher: { "@type": "Organization", name: "FRELUX" },
        // One Offer per purchasable plan and cycle, priced exactly as
        // advertised. The old pair of offers carried naira amounts and a
        // Premium price that did not match the card on the page.
        offers: PRICING_PLANS.filter((p) => p.monthlyPrice > 0).flatMap((p) =>
          (["monthly", "yearly"] as const).map((cycle) => ({
            "@type": "Offer" as const,
            name: `${p.name} ${cycle === "monthly" ? "Monthly" : "Annual"}`,
            price: (cycle === "monthly"
              ? p.monthlyPrice
              : p.yearlyPrice
            ).toFixed(2),
            priceCurrency: SUBSCRIPTION_CURRENCY,
            url: `${SITE_URL}/pricing`,
            availability: "https://schema.org/InStock",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: (cycle === "monthly"
                ? p.monthlyPrice
                : p.yearlyPrice
              ).toFixed(2),
              priceCurrency: SUBSCRIPTION_CURRENCY,
              billingDuration: cycle === "monthly" ? 1 : 12,
              billingIncrement: 1,
              unitCode: "MON",
            },
          })),
        ),
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
              text: "Subscription prices are in US dollars. Paystack handles naira cards, bank transfer and USSD in Nigeria, Ghana, South Africa and Kenya; Flutterwave handles international cards. A naira-paying card is charged the naira equivalent quoted at checkout.",
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
              text: "You'll automatically revert to the Free plan. Your saved projects and data remain intact, you just lose access to premium tools until you renew.",
            },
          },
        ],
      },
    ],
  });

  const { user, isPaid, paidStatus, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { market } = useMarket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<"success" | "error" | null>(
    null,
  );
  const [premiumLive, setPremiumLive] = useState<boolean | null>(null);
  const [defaultGateway, setDefaultGateway] = useState<PaymentGateway | null>(
    null,
  );
  const [chosenGateway, setChosenGateway] = useState<PaymentGateway | null>(
    null,
  );
  // Local price rows for all markets; empty means USD prices throughout.
  const [localPrices, setLocalPrices] = useState<LocalPriceRow[]>([]);
  // A price list is a location fact: the visitor's own country decides which
  // list applies, and a country choice only decides when the browser gives no
  // signal. Nigeria's naira list is a domestic promo, not a selectable one.
  const detectedMarket = useMemo(() => detectMarketCode(), []);
  const [savedMarketChoice, setSavedMarketChoice] = useState<string | null>(
    null,
  );
  useEffect(() => {
    try {
      setSavedMarketChoice(localStorage.getItem(MARKET_STORAGE_KEY));
    } catch {
      setSavedMarketChoice(null);
    }
  }, []);
  const priceMarketCode = useMemo(
    () =>
      // No country signal and no saved choice means no local list, so the
      // dollar price stands instead of defaulting anyone into the naira list.
      pricingMarketCode(detectedMarket, savedMarketChoice),
    [detectedMarket, savedMarketChoice],
  );
  // Paystack only settles NGN/GHS/ZAR/KES, so a non-African market is given
  // Flutterwave (which accepts international cards) instead of a gateway that
  // cannot complete the charge.
  const gateways: PaymentGateway[] = gatewaysForMarket(
    market.marketCode,
    currentGatewayRuntimeConfig(),
  ).filter((g) => g === "paystack" || g === "flutterwave");

  useEffect(() => {
    let alive = true;
    fetchConfiguredGateway().then((gw) => {
      if (!alive) return;
      setDefaultGateway(gw);
      setChosenGateway((prev) => prev ?? gateways[0]);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    loadLocalSubscriptionPrices().then((rows) => {
      if (alive) setLocalPrices(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Check if premium subscriptions are enabled
  useEffect(() => {
    isPremiumEnabled().then(setPremiumLive);
  }, []);

  // Handle gateway redirect callback (Paystack or Flutterwave)
  useEffect(() => {
    const status = searchParams.get("status");
    const ref = searchParams.get("ref");
    const gw = searchParams.get("gw");
    // Flutterwave appends tx_ref to the redirect URL; verify server-side.
    const txRef = searchParams.get("tx_ref");
    const isFlutterwave = gw === "flutterwave" || !!txRef;
    if (status === "verify" && (ref || txRef)) {
      setVerifying(true);
      const verifyPromise = isFlutterwave
        ? verifyFlutterwavePayment(txRef || ref || "")
        : verifyPayment(ref || "");
      verifyPromise.then(async (result) => {
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

    if (!user) {
      navigate(`/login/?redirect=/pricing`);
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

    if (gateways.length === 0) {
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

    // Amount in USD cents. The hosted checkout re-resolves the canonical
    // price server-side, so this is a hint for logging, never trusted.
    const amountMinor = planPriceCents(plan, billingCycle);

    const result = await startSubscriptionCheckout(
      plan.id,
      billingCycle,
      amountMinor,
      user.email!,
      user.id,
      (chosenGateway ?? undefined) as PaymentGateway | undefined,
      market.marketCode,
      detectedMarket,
    );

    setLoadingPlan(null);

    if ("error" in result) {
      toast({
        title: "Payment failed to start",
        message: result.error,
        type: "error",
      });
    } else {
      // Redirect to the configured gateway's checkout
      window.location.href = result.authorization_url;
    }
  }

  if (verifying) {
    return (
      <>
        <PageHeader
          eyebrow="Checkout"
          title={t("Verifying Payment")}
          subtitle={t("Confirming your payment with the provider…")}
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
          title={t("Subscription Active!")}
          subtitle={t("You now have access to all FRELUX premium tools.")}
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
            to="/dashboard/"
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
        title={t("Plans for Every Stage of Your Build")}
        subtitle="From free calculators to the full engineering toolkit. Upgrade anytime, cancel anytime."
      />

      {/* Billing cycle toggle */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Payment method selector: both gateways stay live; admin
            setting is the default, the user may override it. */}
        {gateways.length > 1 && (
          <div className="mb-6 flex justify-center">
            <div
              role="radiogroup"
              aria-label={t("Payment method")}
              data-testid="gateway-selector"
              className="inline-flex rounded-xl border border-border bg-card p-1 dark:border-border"
            >
              {gateways.map((gw) => (
                <button
                  key={gw}
                  type="button"
                  role="radio"
                  aria-checked={chosenGateway === gw}
                  onClick={() => setChosenGateway(gw)}
                  className={classNames(
                    "rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors",
                    chosenGateway === gw
                      ? "bg-brand-purple text-white"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {gw === "paystack" ? "Paystack" : "Flutterwave"}
                  {defaultGateway === gw && " (default)"}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-center">
          <div
            role="tablist"
            aria-label={t("Billing cycle")}
            className="inline-flex rounded-xl border border-border bg-card p-1 dark:border-border border-border dark:bg-background"
          >
            <Button
              variant="ghost"
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
              {t("Monthly")}
            </Button>
            <Button
              variant="ghost"
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
              {t("Yearly")}
              <span className="ml-1.5 rounded-full bg-accent-green/15 px-2 py-0.5 text-[10px] font-bold text-accent-green">
                {t("Save up to")} {MAX_YEARLY_SAVING}%
              </span>
            </Button>
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
              {t("Premium Subscriptions, Coming Soon")}
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
            const shown = displayedPrice(
              plan,
              billingCycle,
              priceMarketCode,
              localPrices,
            );
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

                <div className="mt-4" aria-live="polite">
                  <span
                    className="text-3xl font-extrabold text-foreground dark:text-primary-foreground"
                    data-testid={`plan-price-${plan.id}`}
                    data-currency={shown.currency}
                  >
                    {shown.formatted}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{billingCycle === "monthly" ? "mo" : "yr"}
                  </span>
                  {/* The naira list is the Nigerian price, not a conversion
                      of the dollar price, so it carries no dollar anchor. */}
                  {!shown.isUsd && shown.currency !== "NGN" && (
                    <p
                      className="mt-1 block text-xs text-muted-foreground"
                      data-testid={`plan-usd-${plan.id}`}
                    >
                      {shown.usdFormatted} USD
                    </p>
                  )}
                  {billingCycle === "yearly" && plan.monthlyPrice > 0 && (
                    <p className="mt-1 block text-xs text-muted-foreground">
                      {formatLocalPrice(
                        Math.round(shown.amountMinor / 12),
                        shown.currency,
                      )}
                      /mo, {t("save")} {yearlySavingPercent(plan)}%
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  aria-label={`${plan.cta}, ${plan.name} plan, billed ${billingCycle}, ${shown.formatted}`}
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
                </Button>

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

        {localPrices.some(
          (r) =>
            r.market_code.toUpperCase() === market.marketCode.toUpperCase(),
        ) &&
          marketCurrencyCode(market.marketCode) !== SUBSCRIPTION_CURRENCY && (
            <p
              className="mx-auto mt-6 max-w-xl text-center text-xs text-muted-foreground"
              data-testid="market-currency-note"
            >
              {t("Prices shown in")} {marketCurrencyCode(priceMarketCode)}.{" "}
              {t("Your card is charged that amount at checkout.")}
            </p>
          )}

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />{" "}
            {t("Secure payment via Paystack or Flutterwave")}
          </span>
          <span className="flex items-center gap-2">
            <Zap aria-hidden="true" className="h-4 w-4" />{" "}
            {t("Instant activation")}
          </span>
          <span className="flex items-center gap-2">
            <Check aria-hidden="true" className="h-4 w-4" />{" "}
            {t("Cancel anytime")}
          </span>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-center text-xl font-bold text-foreground dark:text-primary-foreground">
            {t("Frequently Asked Questions")}
          </h2>
          <div className="mt-6 space-y-4">
            <FaqItem
              q="Can I upgrade or downgrade later?"
              a="Yes. You can switch plans at any time. If you upgrade, you'll only pay the prorated difference. Downgrades take effect at the end of your current billing cycle."
            />
            <FaqItem
              q="What payment methods do you accept?"
              a="Prices are in US dollars. Paystack takes naira debit cards (Verve, Visa, Mastercard), bank transfer and USSD in Nigeria, Ghana, South Africa and Kenya; Flutterwave takes international cards. A naira card is charged the naira equivalent quoted at checkout."
            />
            <FaqItem
              q="Do I need to be logged in to subscribe?"
              a="Yes. You'll need a free FRELUX account first. After subscribing, your premium features activate instantly."
            />
            <FaqItem
              q="What happens when my subscription expires?"
              a="You'll automatically revert to the Free plan. Your saved projects and data remain intact, you just lose access to premium tools until you renew."
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
              You need a FRELUX account to subscribe. Create one in seconds,
              it's free.
            </p>
            <Link
              to="/login/?redirect=/pricing"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
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
      <Button
        variant="ghost"
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
      </Button>
      {open && (
        <p className="px-4 pb-4 text-sm text-muted-foreground dark:text-muted-foreground">
          {a}
        </p>
      )}
    </div>
  );
}
