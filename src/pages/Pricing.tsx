import BtcPayCheckoutModal from "@/components/payments/BtcPayCheckoutModal";
import type { BtcPayInvoiceResult } from "@/lib/payments/btcpay";
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
  usePricingPlans,
  SUBSCRIPTION_CURRENCY,
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
  const { plans: pricingPlans } = usePricingPlans();
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
  const [activeBtcInvoice, setActiveBtcInvoice] =
    useState<BtcPayInvoiceResult | null>(null);
  // BTCPay is no longer offered to buyers, so nothing sets the plan it would
  // display; the modal keeps reading it in case the rail returns.
  const [selectedPlanForBtc, _setSelectedPlanForBtc] =
    useState<PricingPlan | null>(null);
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
  ).filter(
    (g) =>
      g === "paystack" ||
      g === "flutterwave" ||
      g === "nowpayments" ||
      g === "btcpay",
  );

  const isCryptoGateway =
    chosenGateway === "nowpayments" || chosenGateway === "btcpay";
  const effectivePriceMarketCode = isCryptoGateway ? null : priceMarketCode;

  useEffect(() => {
    let alive = true;
    fetchConfiguredGateway().then((gw) => {
      if (!alive) return;
      setDefaultGateway(gw);
      const fallback = gateways.find((g) => g !== "btcpay") ?? gateways[0];
      setChosenGateway((prev) => prev ?? (gw === "btcpay" ? fallback : gw));
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
    const nowpaymentsInvoice =
      searchParams.get("nowpayments_invoice") ||
      (searchParams.get("payment") === "nowpayments_success"
        ? searchParams.get("orderId") || searchParams.get("invoice_id")
        : null);

    if (nowpaymentsInvoice) {
      setVerifying(true);
      import("@/lib/payments/nowpayments").then(
        ({ verifyNowPaymentsInvoice }) => {
          verifyNowPaymentsInvoice(nowpaymentsInvoice)
            .then(async (res) => {
              if (res.status === "Confirmed" || res.activated) {
                setVerifyResult("success");
                await refreshProfile();
                toast({
                  title: "Crypto payment confirmed!",
                  message: "Your premium subscription has been activated.",
                  type: "success",
                });
              } else {
                setVerifyResult("error");
                toast({
                  title: "Crypto payment status: " + res.status,
                  message:
                    "Your transaction is currently being processed by the blockchain network.",
                  type: "info",
                });
              }
              setVerifying(false);
            })
            .catch((err) => {
              setVerifyResult("error");
              toast({
                title: "Verification issue",
                message:
                  err instanceof Error
                    ? err.message
                    : "Could not verify payment",
                type: "error",
              });
              setVerifying(false);
            });
        },
      );
      return;
    }

    const btcInvoice = searchParams.get("btcpay_invoice");

    if (btcInvoice) {
      setVerifying(true);
      import("@/lib/payments/btcpay").then(({ verifyBtcPayInvoice }) => {
        verifyBtcPayInvoice(btcInvoice)
          .then(async (res) => {
            if (res.status === "Confirmed" || res.activated) {
              setVerifyResult("success");
              await refreshProfile();
              toast({
                title: "Bitcoin payment confirmed!",
                message: "Your premium subscription has been activated.",
                type: "success",
              });
            } else {
              setVerifyResult("error");
              toast({
                title: "Bitcoin payment status: " + res.status,
                message:
                  "Your payment is currently being confirmed by the Bitcoin network.",
                type: "info",
              });
            }
            setVerifying(false);
          })
          .catch((err) => {
            setVerifyResult("error");
            toast({
              title: "Verification failed",
              message: err instanceof Error ? err.message : String(err),
              type: "error",
            });
            setVerifying(false);
          });
      });
      return;
    }
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
        title: "Checkout unavailable",
        message:
          "FRELUX Premium checkout is currently unavailable. Please contact support for current availability.",
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

    if (chosenGateway === "nowpayments") {
      setLoadingPlan(plan.id);
      try {
        const { initializeNowPaymentsCheckout } =
          await import("@/lib/payments/nowpayments");
        const inv = await initializeNowPaymentsCheckout({
          planId: plan.id,
          billingCycle,
          marketCode: market.marketCode,
          originMarketCode: detectedMarket,
          email: user?.email,
        });
        window.location.href = inv.checkout_url;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({
          title: "FRELUX PAY (Crypto) Unavailable",
          message: msg.includes("NOWPAYMENTS_NOT_CONFIGURED")
            ? "FRELUX PAY (NOWPayments) is not configured yet. Please configure the API key in Admin Settings or choose an alternative gateway."
            : msg,
          type: "error",
        });
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    if (chosenGateway === "btcpay") {
      toast({
        title: "Coming Soon",
        message:
          "BTCPay is not fully implemented yet and will be available soon. Please choose another payment method.",
        type: "info",
      });
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
      <div className="relative mx-auto max-w-6xl px-4 py-8">
        {/* A soft brand glow behind the hero, so the pricing page reads as a
            product surface rather than a plain list of boxes. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,hsl(var(--brand-purple)/0.12),transparent_72%)]"
        />
        {/* Payment method selector: both gateways stay live; admin
            setting is the default, the user may override it. */}
        {gateways.length > 1 && (
          <div className="mb-6 flex justify-center">
            <div
              role="radiogroup"
              aria-label={t("Payment method")}
              data-testid="gateway-selector"
              className="inline-flex rounded-full border border-border/70 bg-card/80 p-1 shadow-sm backdrop-blur dark:border-white/10"
            >
              {gateways
                // NOWPayments is the crypto portal. BTCPay is kept in the
                // server code but is not offered to buyers: showing a second
                // crypto button that can only say "coming soon" reads as a
                // broken portal rather than an alternative.
                .filter((gw) => gw !== "btcpay")
                .map((gw) => (
                  <button
                    key={gw}
                    type="button"
                    role="radio"
                    aria-checked={chosenGateway === gw}
                    onClick={() => setChosenGateway(gw)}
                    className={classNames(
                      "rounded-full px-4 py-2 text-sm font-medium capitalize transition-all duration-200",
                      chosenGateway === gw
                        ? "bg-brand-purple text-white"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {gw === "paystack"
                      ? "Paystack"
                      : gw === "nowpayments"
                        ? "FRELUX PAY (Crypto)"
                        : "Flutterwave"}
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
            className="inline-flex rounded-full border border-border/70 bg-card/80 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background"
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
              <span className="ml-1.5 rounded-full bg-accent-green/15 px-2 py-0.5 text-xs font-bold text-accent-green">
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
              {t("Premium subscriptions are currently unavailable")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Checkout is not enabled right now. Contact support for current
              availability; no subscription or waitlist request will be created
              from this page.
            </p>
            <Link
              to="/contact?subject=Premium%20availability"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t("Contact support")}
            </Link>
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
          {pricingPlans.map((plan: PricingPlan) => {
            const shown = displayedPrice(
              plan,
              billingCycle,
              effectivePriceMarketCode,
              localPrices,
            );
            const isCurrentPlan = isPaid && paidStatus?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={classNames(
                  "relative flex flex-col overflow-hidden rounded-3xl border bg-gradient-to-b from-card to-card/70 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_40px_-24px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_26px_60px_-26px_rgba(15,23,42,0.42)] dark:bg-card",
                  plan.highlight
                    ? "border-brand-purple/60 ring-1 ring-brand-purple/25 lg:scale-[1.04] shadow-[0_2px_4px_rgba(124,58,237,0.12),0_28px_64px_-26px_rgba(124,58,237,0.45)]"
                    : "border-border/60 dark:border-white/10",
                  isCurrentPlan && "ring-2 ring-accent-green/30",
                )}
              >
                {plan.highlight && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/70 to-transparent"
                  />
                )}
                {plan.badge && (
                  <span
                    className={classNames(
                      "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] shadow-sm",
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
                    className="text-4xl font-extrabold tracking-tight tabular-nums text-foreground dark:text-primary-foreground"
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
                  {plan.features.map((feature: string, i: number) => (
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

        {!isCryptoGateway &&
          localPrices.some(
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
        {isCryptoGateway && (
          <p
            className="mx-auto mt-6 max-w-xl text-center text-xs text-muted-foreground"
            data-testid="crypto-pricing-note"
          >
            {t("Prices shown in USD. Crypto payments settle at canonical rates via NOWPayments.")}
          </p>
        )}

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />{" "}
            {t("Secure payment via Paystack, Flutterwave, or Crypto")}
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
              q="Do paid plans remove advertisements across FRELUX?"
              a="Yes. All paid subscriptions (Pro, Premium, and Enterprise) completely remove third-party and banner advertisements across every tool, calculator, and dashboard."
            />
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
        <BtcPayCheckoutModal
          isOpen={Boolean(activeBtcInvoice)}
          onClose={() => setActiveBtcInvoice(null)}
          invoice={activeBtcInvoice}
          planName={selectedPlanForBtc?.name || "Premium"}
          billingCycle={billingCycle}
          onSuccess={async () => {
            setActiveBtcInvoice(null);
            await refreshProfile();
            navigate("/dashboard?payment=btcpay_success");
          }}
        />
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
        className="flex w-full items-start justify-between gap-3 whitespace-normal p-4 text-left"
      >
        <span className="min-w-0 break-words text-sm font-semibold text-foreground dark:text-primary-foreground">
          {q}
        </span>
        <span
          className={classNames(
            "shrink-0 text-muted-foreground transition-transform",
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
