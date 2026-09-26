/**
 * Cross-site house-ad system: Heartsyncx promoted across Frelux.
 *
 * ONE admin-configurable unit (Admin > Ads > House Promos) rendered in
 * the visual language of real programmatic ad networks (AdSense display,
 * AdSense link units, Adsterra native, content-recommendation widgets)
 * so visitors cannot tell house ads apart from network inventory:
 *  - 'card'         content-recommendation widget ("Recommended for you")
 *  - 'banner'       responsive display ad + link-unit row
 *  - 'native'       native ad with thumbnail, headline, body and CTA
 *  - 'interstitial' full-screen overlay ad, once per browser session
 *
 * Every unit carries standard ad chrome: the "Ad" badge, an AdChoices
 * info glyph, blue headline link, green display URL, neutral ad
 * container and a pill CTA. Slots rotate destinations (by slotIndex)
 * so two units on one page advertise different parts of Heartsyncx.
 * First-party unit: no consent gate, cannot be blocked by ad blockers.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Info,
  Heart,
  Sparkles,
  Lock,
  TrendingUp,
  Crown,
  ExternalLink,
  X,
} from "lucide-react";
import { useHousePromoSettings } from "@/lib/house-promo";

const HS_BASE = "https://heartsyncx.netlify.app";
const HS_DOMAIN = "heartsyncx.netlify.app";
const INTERSTITIAL_FLAG = "frelux_cross_promo_interstitial_shown";

interface Dest {
  label: string;
  path: string;
  blurb: string;
}

const DESTINATIONS: Dest[] = [
  {
    label: "Relationship articles",
    path: "/articles",
    blurb: "Honest, practical reads on love and communication",
  },
  {
    label: "AI Copilot",
    path: "/ai-copilot",
    blurb: "Personalized relationship insight, on demand",
  },
  {
    label: "LoveVault",
    path: "/lovevault",
    blurb: "A private journal for memories, letters and boundary scripts",
  },
  {
    label: "Trending",
    path: "/trending",
    blurb: "The pieces everyone is reading right now",
  },
  {
    label: "Premium",
    path: "/subscription",
    blurb: "Unlock premium articles and exclusive features",
  },
];

/* Per-destination creative assets for thumbnails. */
const DEST_CREATIVES: { icon: React.ElementType; gradient: string }[] = [
  { icon: Heart, gradient: "from-rose-500 to-pink-600" },
  { icon: Sparkles, gradient: "from-pink-500 to-fuchsia-600" },
  { icon: Lock, gradient: "from-fuchsia-500 to-purple-600" },
  { icon: TrendingUp, gradient: "from-red-500 to-rose-600" },
  { icon: Crown, gradient: "from-amber-500 to-rose-500" },
];

/* Standard programmatic-ad chrome colors (AdSense conventions). */
const HEADLINE = "text-[#1a0dab] dark:text-[#8ab4f8]";
const DISPLAY_URL = "text-[#006629]/90 dark:text-[#7ee787]/80";
const AD_CONTAINER =
  "bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] rounded-lg";
const AD_BODY = "text-[#3c4043] dark:text-[#9aa0a6]";

function go(dest: Dest, source: string) {
  window.open(`${HS_BASE}${dest.path}`, "_blank", "noopener,noreferrer");
}

/** AdSense-style "Ad" badge with AdChoices info glyph. */
function AdBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Ads by Heartsyncx · Sponsored"
      className={`inline-flex items-center gap-0.5 cursor-help rounded bg-[#f1f3f4] px-1 py-px text-[9px] font-bold leading-none text-[#5f6368] dark:bg-[#3c4043] dark:text-[#9aa0a6] ${className}`}
    >
      Ad
      <Info aria-hidden="true" className="h-2 w-2" />
    </span>
  );
}

/** Standalone AdChoices glyph (top-right corner of a unit). */
function AdChoices({ className = "" }: { className?: string }) {
  return (
    <span
      title="Why this ad? Ads by Heartsyncx"
      className={`inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4] dark:text-[#9aa0a6] dark:hover:bg-[#3c4043] ${className}`}
    >
      <Info aria-hidden="true" className="h-2.5 w-2.5" />
    </span>
  );
}

/** Pill CTA button, network-ad style. */
function CtaButton({
  dest,
  source,
  label = "Visit site",
  big = false,
}: {
  dest: Dest;
  source: string;
  label?: string;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => go(dest, source)}
      className={`shrink-0 cursor-pointer rounded-full bg-[#1a73e8] font-bold text-white shadow-sm transition-colors hover:bg-[#1765cc] ${
        big ? "px-6 py-2.5 text-sm" : "px-4 py-1.5 text-xs"
      }`}
    >
      {label}
    </button>
  );
}

/** Banner: responsive display ad with an AdSense-style link-unit row. */
function Banner({ slotIndex, source }: { slotIndex: number; source: string }) {
  const featured = DESTINATIONS[slotIndex % DESTINATIONS.length];
  const links = DESTINATIONS.filter(
    (_, i) => i !== slotIndex % DESTINATIONS.length,
  ).slice(0, 3);
  return (
    <div className={`my-6 overflow-hidden ${AD_CONTAINER}`}>
      <div className="flex items-start justify-between px-4 pt-2">
        <AdBadge />
        <AdChoices />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-3 pt-1.5">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => go(featured, source)}
            className={`block cursor-pointer text-left text-sm font-bold hover:underline sm:text-base ${HEADLINE}`}
          >
            {featured.label} — relationship insight that hits home
          </button>
          <span className={`text-[11px] ${DISPLAY_URL}`}>
            {HS_DOMAIN}
            {featured.path}
          </span>
          <p className={`mt-0.5 truncate text-xs ${AD_BODY}`}>
            {featured.blurb}. From the team behind FRELUX.
          </p>
        </div>
        <CtaButton dest={featured} source={source} />
      </div>
      {/* Link-unit row (AdSense link ads style) */}
      <div className="grid grid-cols-1 divide-y border-t border-[#dadce0] dark:border-[#3c4043] sm:grid-cols-3 sm:divide-x sm:divide-y-0 divide-[#dadce0] dark:divide-[#3c4043]">
        {links.map((d) => (
          <button
            key={d.path}
            type="button"
            onClick={() => go(d, source)}
            className="cursor-pointer px-4 py-2.5 text-left hover:bg-[#f8f9fa] dark:hover:bg-[#292a2d]"
          >
            <span className={`block truncate text-xs font-bold ${HEADLINE}`}>
              {d.label}
            </span>
            <span className={`block truncate text-[10px] ${DISPLAY_URL}`}>
              {HS_DOMAIN}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Native: Adsterra/AdSense native unit — thumbnail, headline, body,
 *  domain line and inline CTA. */
function NativeUnit({
  slotIndex,
  source,
}: {
  slotIndex: number;
  source: string;
}) {
  const d = DESTINATIONS[slotIndex % DESTINATIONS.length];
  const creative = DEST_CREATIVES[slotIndex % DEST_CREATIVES.length];
  return (
    <div className={`my-6 flex items-stretch gap-3 p-3 ${AD_CONTAINER}`}>
      <button
        type="button"
        onClick={() => go(d, source)}
        aria-label={d.label}
        className={`relative h-20 w-24 shrink-0 cursor-pointer overflow-hidden rounded-md bg-gradient-to-br sm:h-[5.5rem] sm:w-28 ${creative.gradient}`}
      >
        <creative.icon
          aria-hidden="true"
          className="absolute inset-0 m-auto h-8 w-8 text-white/90"
        />
        <span className="absolute bottom-1 left-1.5 text-[8px] font-black uppercase tracking-widest text-white/80">
          Heartsyncx
        </span>
        <AdBadge className="absolute right-1 top-1 !bg-black/30 !text-white" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => go(d, source)}
            className={`line-clamp-2 cursor-pointer text-left text-sm font-bold leading-snug hover:underline ${HEADLINE}`}
          >
            {d.label} — {d.blurb}
          </button>
          <AdChoices className="-mt-0.5" />
        </div>
        <p
          className={`mt-1 line-clamp-2 text-[11px] leading-relaxed ${AD_BODY}`}
        >
          Articles, AI-powered insights and interactive tools for love, healing
          and communication.
        </p>
        <div className="mt-auto flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => go(d, source)}
            className={`cursor-pointer truncate text-[10px] font-bold hover:underline ${DISPLAY_URL}`}
          >
            {HS_DOMAIN}
          </button>
          <button
            type="button"
            onClick={() => go(d, source)}
            className="ml-auto cursor-pointer text-[11px] font-bold text-[#1a73e8] hover:underline dark:text-[#8ab4f8]"
          >
            Read more »
          </button>
        </div>
      </div>
    </div>
  );
}

/** Card: content-recommendation widget — rotating sponsored tiles. */
function RecCard({ slotIndex, source }: { slotIndex: number; source: string }) {
  const rotated = DESTINATIONS.map(
    (_, i) => DESTINATIONS[(i + slotIndex) % DESTINATIONS.length],
  );
  return (
    <div className={`my-8 overflow-hidden ${AD_CONTAINER}`}>
      <div className="flex items-center justify-between border-b border-[#dadce0] px-4 py-2.5 dark:border-[#3c4043]">
        <span
          className={`text-xs font-bold uppercase tracking-wide ${AD_BODY}`}
        >
          Recommended for you
        </span>
        <AdChoices />
      </div>
      <div className="grid grid-cols-1 divide-y divide-[#dadce0] sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-[#3c4043]">
        {rotated.slice(0, 3).map((d, i) => {
          const creative =
            DEST_CREATIVES[(i + slotIndex) % DEST_CREATIVES.length];
          return (
            <button
              key={d.path}
              type="button"
              onClick={() => go(d, source)}
              className="group flex cursor-pointer items-stretch gap-3 p-3 text-left hover:bg-[#f8f9fa] dark:hover:bg-[#292a2d]"
            >
              <span
                className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-gradient-to-br ${creative.gradient}`}
              >
                <creative.icon
                  aria-hidden="true"
                  className="absolute inset-0 m-auto h-6 w-6 text-white/90"
                />
              </span>
              <span className="min-w-0">
                <span
                  className={`line-clamp-2 block text-xs font-bold leading-snug ${HEADLINE}`}
                >
                  {d.label}
                </span>
                <span
                  className={`mt-1 block truncate text-[10px] ${DISPLAY_URL}`}
                >
                  {HS_DOMAIN}
                </span>
                <span className="mt-0.5 block text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">
                  Sponsored
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Interstitial overlay ad: standard chrome, once per browser session. */
function Interstitial({ source }: { source: string }) {
  const [open, setOpen] = useState(false);
  const featured = DESTINATIONS[0];
  useEffect(() => {
    try {
      if (sessionStorage.getItem(INTERSTITIAL_FLAG) === "1") return;
    } catch {
      /* storage unavailable - still show, degrade gracefully */
    }
    const t = setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(INTERSTITIAL_FLAG, "1");
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearTimeout(t);
  }, []);
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className={`w-full max-w-md shadow-2xl ${AD_CONTAINER}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-2">
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#5f6368] dark:text-[#9aa0a6]">
            Advertisement <AdBadge />
          </span>
          <div className="flex items-center gap-1">
            <AdChoices />
            <button
              type="button"
              aria-label="Close ad"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-full p-1 text-[#5f6368] hover:bg-[#f1f3f4] dark:text-[#9aa0a6] dark:hover:bg-[#3c4043]"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="p-4">
          <button
            type="button"
            onClick={() => go(featured, source)}
            className={`block cursor-pointer text-left text-lg font-bold leading-snug hover:underline ${HEADLINE}`}
          >
            Relationship insight that actually hits home
          </button>
          <span className={`text-xs ${DISPLAY_URL}`}>{HS_DOMAIN}</span>
          <p className={`mt-2 text-sm leading-relaxed ${AD_BODY}`}>
            Articles, AI-powered insights and interactive tools for love,
            healing and communication. From the team behind FRELUX.
          </p>
          <div className="mt-4">
            <CtaButton big dest={featured} source={source} label="Visit site" />
          </div>
          <div className="mt-4 space-y-1.5 border-t border-[#dadce0] pt-3 dark:border-[#3c4043]">
            {DESTINATIONS.slice(1, 4).map((d) => (
              <button
                key={d.path}
                type="button"
                onClick={() => go(d, source)}
                className="group flex w-full cursor-pointer items-center justify-between gap-2 text-left"
              >
                <span className="min-w-0">
                  <span
                    className={`block truncate text-xs font-bold group-hover:underline ${HEADLINE}`}
                  >
                    {d.label}
                  </span>
                  <span className={`block truncate text-[10px] ${DISPLAY_URL}`}>
                    {HS_DOMAIN}
                    {d.path}
                  </span>
                </span>
                <ExternalLink
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 text-[#5f6368] opacity-0 group-hover:opacity-100 dark:text-[#9aa0a6]"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function CrossPromoSlot({
  slotIndex = 0,
  source = "unknown",
}: {
  /** Used for destination rotation so slots on the same page differ. */
  slotIndex?: number;
  source?: string;
}) {
  const [settings] = useHousePromoSettings();
  if (!settings.enabled) return null;
  if (settings.format === "interstitial")
    return <Interstitial source={source} />;
  if (settings.format === "banner")
    return <Banner slotIndex={slotIndex} source={source} />;
  if (settings.format === "native")
    return <NativeUnit slotIndex={slotIndex} source={source} />;
  return <RecCard slotIndex={slotIndex} source={source} />;
}
