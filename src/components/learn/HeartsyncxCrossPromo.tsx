/**
 * Cross-site house promo: Heartsyncx (the sister site) advertised inside
 * FRELUX learn-article pages. ONE slot per article page.
 *
 * First-party recommendation, not an ad-network unit: no consent gate,
 * no iframe, no zone key. Renders unconditionally, like the in-article
 * insert blocks. External link opens in a new tab.
 */
import { ExternalLink, HeartHandshake } from "lucide-react";

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
        href="https://heartsyncx.netlify.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <span className="block font-display text-lg font-bold text-foreground transition-colors group-hover:text-brand-purple dark:text-primary-foreground dark:group-hover:text-brand-purple-lighter">
          Heartsyncx: relationship insight that actually hits home
        </span>
        <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
          Honest, practical articles on love, communication and healing, with
          AI-powered insights and interactive quizzes, from the same team behind
          FRELUX.
        </span>
        <span className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-brand-purple dark:text-brand-purple-lighter">
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          Visit heartsyncx.netlify.app
        </span>
      </a>
    </aside>
  );
}
