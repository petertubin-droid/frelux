/**
 * Campaign slot: the one component every page uses to show a FRELUX promotion.
 *
 * Three presentations, one data contract:
 *   banner   responsive image + headline + description + CTA
 *   native   promotional label, headline, description, CTA link
 *   compact  a single restrained line for tight spaces
 *
 * Behaviour that protects the reading experience:
 *   - nothing renders when no campaign matches, so no empty frame or reserved gap;
 *   - the frame reserves its height while loading, so nothing jumps;
 *   - images are lazy and carry real alt text;
 *   - an impression is recorded only when the slot is actually on screen;
 *   - sponsored destinations leave the site with rel="sponsored noopener" and
 *     internal promotions use descriptive anchor text.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  PLACEMENTS,
  deviceFromWidth,
  loadCampaigns,
  pickCampaign,
  recordCampaignEvent,
  type Campaign,
  type DeviceKind,
} from "@/lib/ads/campaigns";
import { useMarket } from "@/lib/international/market-context";

interface CampaignSlotProps {
  placement: string;
  toolKey?: string | null;
  category?: string | null;
  format?: Campaign["format"];
  className?: string;
  /** Label shown above the unit. Defaults to "Promoted" or "Sponsored". */
  label?: string;
}

function useDevice(): DeviceKind {
  const [device, setDevice] = useState<DeviceKind>(() =>
    typeof window === "undefined"
      ? "desktop"
      : deviceFromWidth(window.innerWidth),
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setDevice(deviceFromWidth(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return device;
}

export function CampaignSlot({
  placement,
  toolKey = null,
  category = null,
  format,
  className = "",
  label,
}: CampaignSlotProps) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const device = useDevice();
  const marketCode = useMarket()?.marketCode ?? "ALL";
  const frameRef = useRef<HTMLDivElement | null>(null);
  const impressionSent = useRef(false);

  useEffect(() => {
    let active = true;
    void loadCampaigns().then((rows) => {
      if (active) setCampaigns(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  const campaign = useMemo(
    () =>
      campaigns
        ? pickCampaign(
            campaigns,
            { placement, toolKey, category, marketCode, device },
            {
              seed:
                typeof window === "undefined"
                  ? "server"
                  : (window.sessionStorage.getItem("frelux_ad_seed") ?? "anon"),
            },
          )
        : null,
    [campaigns, placement, toolKey, category, marketCode, device],
  );

  // Count the impression only once the unit has been on screen for a moment.
  useEffect(() => {
    if (!campaign || impressionSent.current) return;
    const node = frameRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      impressionSent.current = true;
      void recordCampaignEvent({
        campaign,
        eventType: "impression",
        placement,
        toolKey,
        marketCode,
        device,
      });
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (!visible || impressionSent.current) return;
        impressionSent.current = true;
        void recordCampaignEvent({
          campaign,
          eventType: "impression",
          placement,
          toolKey,
          marketCode,
          device,
        });
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [campaign, placement, toolKey, marketCode, device]);

  if (!campaign) return null;

  const variant = format ?? campaign.format;
  const badge = label ?? (campaign.is_sponsored ? "Sponsored" : "Promoted");
  const onActivate = () => {
    void recordCampaignEvent({
      campaign,
      eventType: "click",
      placement,
      toolKey,
      marketCode,
      device,
    });
  };

  const cta = (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors group-hover:bg-primary/90">
      {campaign.cta_label}
      <ArrowRight className="h-3.5 w-3.5" />
    </span>
  );

  const destinationProps = campaign.is_external
    ? {
        href: campaign.destination_url,
        rel: "sponsored noopener noreferrer",
        target: "_blank" as const,
      }
    : { to: campaign.destination_url };

  const Destination = (campaign.is_external ? "a" : Link) as "a";

  if (variant === "compact") {
    return (
      <div
        ref={frameRef}
        className={`rounded-lg border border-dashed bg-card/60 px-4 py-2.5 text-sm ${className}`}
      >
        <span className="mr-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {badge}
        </span>
        <Destination
          {...destinationProps}
          onClick={onActivate}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {campaign.headline}
        </Destination>
      </div>
    );
  }

  if (variant === "banner" && campaign.image_url) {
    return (
      <div
        ref={frameRef}
        className={`overflow-hidden rounded-xl border bg-card ${className}`}
      >
        <Destination
          {...destinationProps}
          onClick={onActivate}
          className="group block"
        >
          <div className="relative aspect-[16/6] w-full bg-muted sm:aspect-[16/5]">
            <img
              src={campaign.image_url}
              alt={campaign.image_alt ?? campaign.headline}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {badge}
              </p>
              <p className="mt-0.5 text-sm font-semibold leading-snug sm:text-base">
                {campaign.headline}
              </p>
              {campaign.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {campaign.description}
                </p>
              ) : null}
            </div>
            <div className="shrink-0">{cta}</div>
          </div>
        </Destination>
      </div>
    );
  }

  // Native card: the default, and the fallback for a banner with no image yet.
  return (
    <div
      ref={frameRef}
      className={`rounded-xl border bg-card p-4 ${className}`}
    >
      <Destination
        {...destinationProps}
        onClick={onActivate}
        className="group flex items-start gap-3"
      >
        {campaign.advertiser_logo_url ? (
          <img
            src={campaign.advertiser_logo_url}
            alt={campaign.advertiser_name ?? "Advertiser logo"}
            loading="lazy"
            decoding="async"
            className="h-9 w-9 shrink-0 rounded-md border object-contain"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {badge}
            {campaign.advertiser_name && campaign.is_sponsored
              ? ` · ${campaign.advertiser_name}`
              : ""}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug">
            {campaign.headline}
          </p>
          {campaign.description ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {campaign.description}
            </p>
          ) : null}
          <div className="mt-2">{cta}</div>
        </div>
      </Destination>
    </div>
  );
}

/** Below a calculator's result summary, before any secondary content. */
export function CalculatorAdBanner({
  toolKey,
  className = "",
}: {
  toolKey: string;
  className?: string;
}) {
  return (
    <CampaignSlot
      placement={PLACEMENTS.calculatorResults}
      toolKey={toolKey}
      className={className}
      label="Promoted"
    />
  );
}

/** A native callout inside an article, at 30%, 65% or the end of the body. */
export function ArticleAdCallout({
  position,
  category = null,
  className = "",
}: {
  position: "30" | "65" | "end";
  category?: string | null;
  className?: string;
}) {
  const placement =
    position === "30"
      ? PLACEMENTS.article30
      : position === "65"
        ? PLACEMENTS.article65
        : PLACEMENTS.articleEnd;
  return (
    <CampaignSlot
      placement={placement}
      category={category}
      format="native"
      className={className}
      label="From FRELUX"
    />
  );
}

/** A paid placement. Keeps the sponsored designation visible at all times. */
export function SponsoredBanner({
  placement,
  toolKey = null,
  category = null,
  className = "",
}: {
  placement: string;
  toolKey?: string | null;
  category?: string | null;
  className?: string;
}) {
  return (
    <CampaignSlot
      placement={placement}
      toolKey={toolKey}
      category={category}
      className={className}
      label="Sponsored"
    />
  );
}

export default CampaignSlot;
