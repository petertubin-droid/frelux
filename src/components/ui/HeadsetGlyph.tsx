/**
 * HeadsetGlyph - the small, single-color version of the FRELUX support
 * headset. Used where a 14-20px inline icon is needed (tabs, buttons,
 * panel titles) in place of the generic AI sparkle/star. It inherits the
 * surrounding text color via currentColor, so it follows light/dark mode
 * and active/inactive states automatically. For the full-color squircle
 * brand mark (avatars, floating buttons) use SupportMark instead.
 */
export default function HeadsetGlyph({
  className = "h-4 w-4",
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Headband */}
      <path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" />
      {/* Earcups */}
      <rect
        x="3"
        y="13.5"
        width="3.6"
        height="5.6"
        rx="1.6"
        fill="currentColor"
      />
      <rect
        x="17.4"
        y="13.5"
        width="3.6"
        height="5.6"
        rx="1.6"
        fill="currentColor"
      />
      {/* Mic boom */}
      <path d="M19.2 19.1c0 1.8-1.6 2.6-4.2 2.6h-1.4" />
      <circle cx="12.8" cy="21.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
