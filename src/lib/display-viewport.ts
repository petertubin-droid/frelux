/**
 * Site-wide display scale, done the way a browser's own page zoom does it.
 *
 * Reference behaviour (owner screen recording, 2026-11-09): at Chrome's 50% page
 * zoom the site lays out at about twice the phone's width, so every media query
 * takes its tablet/desktop branch and the full site appears at once, on every
 * page. At 67% and 300% it re-stacks into the narrow layout.
 *
 * The previous implementation put CSS `zoom` on #root. That scales pixels but
 * does not move a single media-query breakpoint, so the layout stayed phone
 * shaped and only the calculator pages were hand-patched to fake the wide
 * layout, one selector at a time. It could never be site-wide.
 *
 * A mobile browser decides its layout width from the viewport meta tag. Asking
 * for `width = deviceWidth / scale` with `initial-scale = scale` produces what
 * Chrome zoom produces: the layout viewport is wider, every breakpoint and
 * every `window.innerWidth` reader follows, and the content is drawn smaller.
 * Nothing about the pages themselves needs to know.
 *
 * Desktop browsers ignore the viewport meta, and their own zoom already does
 * this, so the scale only applies on touch devices narrower than DESKTOP_MIN.
 */

/** At or above this width a device is a desktop/tablet and gets no scaling. */
export const DESKTOP_MIN_CSS_PX = 900;

/** Layout widths below this are unusable, whatever the user asked for. */
const MIN_LAYOUT_WIDTH = 320;
/** Layout widths above this make the text unreadably small on a phone. */
const MAX_LAYOUT_WIDTH = 1280;

export interface ViewportInput {
  /** The device's width in CSS pixels at 100% (screen.width, portrait). */
  deviceWidth: number;
  /** Display scale as a percentage, as stored in preferences. */
  scalePercent: number;
}

export interface ViewportResult {
  /** The full `content` value for <meta name="viewport">. */
  content: string;
  /** Layout width the page will see, in CSS pixels. */
  layoutWidth: number;
  /** The initial-scale actually applied. */
  initialScale: number;
  /** False when the scale was not applied (desktop, or unusable input). */
  scaled: boolean;
}

/** What the page shipped with before any preference existed. */
export const NEUTRAL_VIEWPORT =
  "width=device-width, initial-scale=1.0, viewport-fit=cover";

const round = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export function viewportContent({
  deviceWidth,
  scalePercent,
}: ViewportInput): ViewportResult {
  const neutral: ViewportResult = {
    content: NEUTRAL_VIEWPORT,
    layoutWidth: Number.isFinite(deviceWidth) ? deviceWidth : 0,
    initialScale: 1,
    scaled: false,
  };

  if (!Number.isFinite(deviceWidth) || deviceWidth <= 0) return neutral;
  if (
    !Number.isFinite(scalePercent) ||
    scalePercent <= 0 ||
    scalePercent > 200
  ) {
    return neutral;
  }
  if (deviceWidth >= DESKTOP_MIN_CSS_PX) return neutral;

  const scale = scalePercent / 100;
  if (scale === 1) return neutral;

  const wanted = deviceWidth / scale;
  const layoutWidth = Math.round(
    Math.min(Math.max(wanted, MIN_LAYOUT_WIDTH), MAX_LAYOUT_WIDTH),
  );
  // Derive the scale from the width actually granted, so a clamped width still
  // fills the screen edge to edge instead of leaving a gutter or overflowing.
  const initialScale = round(deviceWidth / layoutWidth, 4);

  return {
    // minimum-scale lets the user pinch out further; it is never forced above
    // what was asked for, and maximum-scale is left unset so zoom-in works.
    content: `width=${layoutWidth}, initial-scale=${initialScale}, minimum-scale=${round(
      Math.min(initialScale, 1) * 0.5,
      4,
    )}, viewport-fit=cover`,
    layoutWidth,
    initialScale,
    scaled: true,
  };
}

/** The phone's own width at 100%, independent of any current scaling. */
export function deviceCssWidth(win: Window = window): number {
  const screenWidth = win.screen?.width ?? 0;
  const screenHeight = win.screen?.height ?? 0;
  // screen.width follows orientation on some browsers and not on others, so
  // use the short edge for a phone held upright and the live value otherwise.
  const short = Math.min(screenWidth, screenHeight);
  const orientation = win.screen?.orientation?.type ?? "";
  const landscape = orientation.startsWith("landscape");
  const device = landscape
    ? Math.max(screenWidth, screenHeight)
    : short || screenWidth;
  return device > 0 ? device : win.innerWidth;
}

/** Writes the viewport meta, creating it if the document has none. */
export function applyViewport(content: string, doc: Document = document): void {
  let meta = doc.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) {
    meta = doc.createElement("meta");
    meta.name = "viewport";
    doc.head.appendChild(meta);
  }
  if (meta.content !== content) meta.content = content;
}
