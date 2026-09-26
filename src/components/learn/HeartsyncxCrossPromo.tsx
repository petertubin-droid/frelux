/**
 * Cross-site house promo: Heartsyncx (the sister site) advertised inside
 * FRELUX learn-article pages. ONE slot per article page, but it promotes
 * multiple parts of Heartsyncx simultaneously: the articles library, the
 * AI Copilot, the LoveVault feature, trending reads and premium - pages,
 * sections and features, not just the homepage.
 *
 * First-party recommendation, not an ad-network unit: no consent gate,
 * no iframe, no zone key. Renders unconditionally, like the in-article
 * insert blocks. External links open in a new tab.
 */
import { ExternalLink, HeartHandshake } from "lucide-react";

const HEARTSYNCX_BASE = "https://heartsyncx.netlify.app";

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

export default function HeartsyncxCrossPromo() {
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
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
          From our sister site
        </span>
      </div>
      <a
        href={HEARTSYNCX_BASE}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <span className="block font-display text-lg font-bold text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground dark:group-hover:text-brand-purple-lighter">
          Heartsyncx: relationship insight that actually hits home
        </span>
        <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
          From the same team behind FRELUX: articles, AI-powered insights and
          interactive tools for love, healing and communication.
        </span>
      </a>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {DESTINATIONS.map((d) => (
          <a
            key={d.path}
            href={`${HEARTSYNCX_BASE}${d.path}`}
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
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground dark:text-muted-foreground">
                {d.blurb}
              </span>
            </span>
          </a>
        ))}
      </div>
    </aside>
  );
}
