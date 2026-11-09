/**
 * Placement for the display-settings panel under the app's display scale.
 *
 * The bug this fixes (2026-11-09): Smart Display applies `zoom` to `#root`, but
 * the settings panel is portalled to `document.body`, which sits outside that
 * zoom. So the panel rendered at 100% while the entire application around it
 * rendered at 50%: the control you use to fix the text size was itself the only
 * thing on screen at double the size, and on a phone it filled the viewport.
 *
 * The panel keeps its body-level portal (that avoids the app shell's stacking
 * and overflow contexts) and receives the same zoom itself. Because a length on
 * a zoomed element is multiplied by that zoom when painted, every value below is
 * returned in *element space*: divide by the zoom to land on the position the
 * user should see. The tests assert the round trip, so the arithmetic is checked
 * rather than eyeballed.
 */

export interface PanelViewport {
  width: number;
  height: number;
}

export interface PanelTriggerRect {
  left: number;
  bottom: number;
}

export interface PanelGeometryInput {
  trigger: PanelTriggerRect | null;
  viewport: PanelViewport;
  /** Display scale as a percentage, as stored in preferences. */
  scalePercent: number;
  /** Width the panel should occupy on screen, in visual pixels. */
  desiredWidth?: number;
  /** Height it is allowed to occupy on screen, in visual pixels. */
  maxHeight?: number;
  /** Gap between the trigger and the panel, in visual pixels. */
  gap?: number;
  /** Minimum distance from any viewport edge, in visual pixels. */
  margin?: number;
}

export interface PanelGeometry {
  /** Width in element space (already divided by zoom). */
  width: number;
  /** Maximum height in element space. */
  maxHeight: number;
  left: number;
  top: number;
  /** Zoom to apply to the panel so it matches the rest of the application. */
  zoom: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function panelGeometry({
  trigger,
  viewport,
  scalePercent,
  desiredWidth = 320,
  maxHeight = 420,
  gap = 8,
  margin = 8,
}: PanelGeometryInput): PanelGeometry {
  // A scale outside the offered range, or a nonsense value, falls back to 1 so
  // the panel can never be divided by zero or blown up.
  const zoom =
    Number.isFinite(scalePercent) && scalePercent > 0 && scalePercent <= 200
      ? scalePercent / 100
      : 1;

  const usableWidth = Math.max(viewport.width - margin * 2, 1);
  const onScreenWidth = Math.min(desiredWidth, usableWidth);
  const onScreenMaxHeight = Math.min(
    maxHeight,
    Math.max(viewport.height - margin * 2, 1),
  );

  const anchorLeft = trigger?.left ?? margin;
  const anchorBottom = trigger?.bottom ?? margin;

  // Clamp in visual space, where the trigger rect and viewport both live.
  const onScreenLeft = clamp(
    anchorLeft,
    margin,
    Math.max(viewport.width - onScreenWidth - margin, margin),
  );
  const onScreenTop = clamp(
    anchorBottom + gap,
    margin,
    Math.max(viewport.height - onScreenMaxHeight - margin, margin),
  );

  return {
    width: onScreenWidth / zoom,
    maxHeight: onScreenMaxHeight / zoom,
    left: onScreenLeft / zoom,
    top: onScreenTop / zoom,
    zoom,
  };
}
