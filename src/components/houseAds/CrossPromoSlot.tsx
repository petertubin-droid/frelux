/**
 * Cross-site house-ad system: Heartsyncx promoted across Frelux.
 *
 * ONE admin-configurable unit (Admin > Ads > House Promos) rendered in
 * four formats:
 *  - 'card'         rich card: headline + grid of destination links
 *  - 'banner'       slim horizontal strip with 3 rotating destination links
 *  - 'native'       in-feed text unit with 1 rotating destination
 *  - 'interstitial' full-screen overlay, shown ONCE per browser session
 *                  (5s after the first slot mounts); inline slots render
 *                  nothing while this format is active
 *
 * Every destination deep-links to the section/feature it names on
 * heartsyncx.netlify.app. Slots rotate destinations (by slotIndex) so
 * two units on the same page advertise different parts of Heartsyncx
 * simultaneously. First-party unit: no consent gate, cannot be blocked
 * by ad blockers.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, HeartHandshake, X } from "lucide-react";
import { useHousePromoSettings } from "@/lib/house-promo";

const HS_BASE = "https://heartsyncx.netlify.app";
const INTERSTITIAL_FLAG = "frelux_cross_promo_interstitial_shown";

const DESTINATIONS: { label: string; path: string; blurb: string }[] = [
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

function Banner({ slotIndex, source }: { slotIndex: number; source: string }) {
  const picks = DESTINATIONS.filter(
    (_, i) => i !== slotIndex % DESTINATIONS.length,
  ).slice(0, 3);
  return (
    <div className="my-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/80 bg-gradient-to-r from-muted/60 to-card px-4 py-3 dark:border-white/10 dark:from-card dark:to-background">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <HeartHandshake aria-hidden="true" className="h-3.5 w-3.5" />
        From our sister site
      </span>
      <a
        href={HS_BASE}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-bold text-foreground hover:text-brand-purple dark:text-primary-foreground dark:hover:text-brand-purple-lighter transition-colors"
      >
        Heartsyncx: relationship insight that actually hits home
      </a>
      <span className="ml-auto hidden items-center gap-3 sm:flex">
        {picks.map((d) => (
          <a
            key={d.path}
            href={`${HS_BASE}${d.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-brand-purple dark:hover:text-brand-purple-lighter"
          >
            {d.label}
          </a>
        ))}
      </span>
      {/* source kept for future per-slot analytics */}
      <span data-promo-source={source} className="hidden" />
    </div>
  );
}

function NativeUnit({ slotIndex }: { slotIndex: number; source?: string }) {
  const d = DESTINATIONS[slotIndex % DESTINATIONS.length];
  return (
    <div className="my-6 flex items-center gap-2 text-sm">
      <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        Sponsored
      </span>
      <a
        href={`${HS_BASE}${d.path}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 items-center gap-1.5 text-muted-foreground transition-colors hover:text-brand-purple dark:hover:text-brand-purple-lighter"
      >
        <span className="font-semibold text-foreground dark:text-primary-foreground">
          Heartsyncx
        </span>
        <span className="truncate">— {d.blurb}</span>
        <ExternalLink
          aria-hidden="true"
          className="h-3 w-3 shrink-0 opacity-60"
        />
      </a>
    </div>
  );
}

function Card() {
  return (
    <aside
      aria-label="Suggested reading from Heartsyncx"
      className="my-10 rounded-2xl border border-border/80 bg-gradient-to-br from-muted/50 to-card p-6 dark:border-white/10 dark:from-card dark:to-background sm:p-7"
    >
      <div className="mb-3 flex items-center gap-2 border-b border-border/70 pb-2.5 dark:border-white/10">
        <HeartHandshake
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-brand-purple dark:text-brand-purple-lighter"
        />
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          From our sister site
        </span>
      </div>
      <a
        href={HS_BASE}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <span className="block font-display text-lg font-bold text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground dark:group-hover:text-brand-purple-lighter">
          Heartsyncx: relationship insight that actually hits home
        </span>
        <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
          From the same team behind FRELUX: articles, AI-powered insights and
          interactive tools for love, healing and communication.
        </span>
      </a>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {DESTINATIONS.map((d) => (
          <a
            key={d.path}
            href={`${HS_BASE}${d.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2 rounded-xl border border-border/70 bg-card p-3 transition-all hover:border-brand-purple/60 dark:border-white/10 dark:bg-background dark:hover:border-brand-purple-lighter/40"
          >
            <ExternalLink
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-purple dark:group-hover:text-brand-purple-lighter"
            />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground dark:group-hover:text-brand-purple-lighter">
                {d.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                {d.blurb}
              </span>
            </span>
          </a>
        ))}
      </div>
    </aside>
  );
}

function Interstitial() {
  const [open, setOpen] = useState(false);
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
        className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl dark:border-white/10 dark:bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-full bg-muted p-1.5 text-muted-foreground hover:bg-muted/70 dark:bg-white/10"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <HeartHandshake
            aria-hidden="true"
            className="h-4 w-4 text-brand-purple dark:text-brand-purple-lighter"
          />
          From our sister site
        </div>
        <a
          href={HS_BASE}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <span className="block font-display text-xl font-bold text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground dark:group-hover:text-brand-purple-lighter">
            Heartsyncx: relationship insight that actually hits home
          </span>
          <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
            From the same team behind FRELUX: articles, AI-powered insights and
            interactive tools for love, healing and communication.
          </span>
        </a>
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {DESTINATIONS.map((d) => (
            <a
              key={d.path}
              href={`${HS_BASE}${d.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 rounded-xl border border-border/70 bg-background p-3 transition-all hover:border-brand-purple/60 dark:border-white/10 dark:bg-white/5 dark:hover:border-brand-purple-lighter/40"
            >
              <ExternalLink
                aria-hidden="true"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-purple dark:group-hover:text-brand-purple-lighter"
              />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground dark:group-hover:text-brand-purple-lighter">
                  {d.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {d.blurb}
                </span>
              </span>
            </a>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-4 w-full rounded-xl bg-muted py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted/70 dark:bg-white/10 dark:text-white"
        >
          Continue to FRELUX
        </button>
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
  if (settings.format === "interstitial") return <Interstitial />;
  if (settings.format === "banner")
    return <Banner slotIndex={slotIndex} source={source} />;
  if (settings.format === "native") return <NativeUnit slotIndex={slotIndex} />;
  return <Card />;
}
