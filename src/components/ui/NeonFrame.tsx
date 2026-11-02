/**
 * Site-wide neon viewport frame.
 *
 * Renders a thin animated edge light along ALL four edges of the viewport:
 * the left and right screen walls, the bottom edge on desktop, and the top
 * edge (which sits neatly under the navbar's own neon edge). It completes
 * the FRELUX neon edge-lighting system so every edge of the website is
 * illuminated - not just the header and bottom nav.
 *
 * Purely decorative: aria-hidden, pointer-events disabled, no state.
 */
export default function NeonFrame() {
  return <div aria-hidden="true" className="neon-frame pointer-events-none" />;
}
