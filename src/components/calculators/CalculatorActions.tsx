/**
 * One size for the buttons that sit under a result.
 *
 * Print, share, save, open in the studio, find a supplier: none of these is
 * the page's main action, but on a phone they were built like one. Each was
 * `px-4 py-2 text-sm`, so five of them at 36 px tall could not share a 360 px
 * screen, and the row overflowed instead of stacking. The result card ended up
 * taller than the estimate it was reporting on.
 *
 * These tokens are deliberately small: 32 px tall, 12 px text, a 3.5 icon.
 * That still clears a thumb target when the row has its own padding, and five
 * of them now fit two or three to a line. The main calc button keeps its own
 * weight elsewhere, because there should only ever be one of those.
 */

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold leading-none transition-colors disabled:opacity-50 [&_svg]:h-3.5 [&_svg]:w-3.5";

/** Neutral secondary action: Print, Copy, Find supply. */
export const ACTION_BTN = `${BASE} border border-border/70 bg-card/60 text-foreground hover:bg-muted dark:border-white/10 dark:bg-white/5`;

/** The one action the card is nudging the visitor towards. */
export const ACTION_BTN_PRIMARY = `${BASE} bg-primary text-primary-foreground hover:bg-primary/90`;

/** Quiet action, no border: used inside denser rows. */
export const ACTION_BTN_GHOST = `${BASE} text-muted-foreground hover:bg-muted hover:text-foreground`;

/**
 * The row itself. Wraps and centres, and never lets a long label push past the
 * card: the children shrink and truncate rather than the row overflowing.
 */
export function CalculatorActionBar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-0 flex-wrap items-center justify-center gap-1.5 sm:gap-2 ${className}`}
    >
      {children}
    </div>
  );
}

export default CalculatorActionBar;
