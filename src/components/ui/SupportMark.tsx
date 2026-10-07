/**
 * SupportMark - the live chat / support identity icon.
 *
 * A classic headset + speech-bubble "contact us" glyph, recolored into the
 * FRELUX brand gradient (violet into cyan) instead of a generic flat black
 * icon or a sparkle/star mark. Inline SVG so it can never 404 and stays
 * crisp at any size.
 */
export default function SupportMark({
  className = "h-6 w-6",
  "aria-label": ariaLabel = "Live chat support",
}: {
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id="support-mark-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="0.55" stopColor="#6D28D9" />
          <stop offset="1" stopColor="#1FA8CC" />
        </linearGradient>
        <linearGradient id="support-mark-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Squircle backdrop, same corner radius/gradient as the rest of the
          brand's icon system */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="14"
        fill="url(#support-mark-g)"
      />
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="14"
        fill="url(#support-mark-shine)"
      />

      {/* Headset band (open at the bottom, like a classic support icon) */}
      <path
        d="M14 21.5 C14 14.6 18.7 9.5 24 9.5 C29.3 9.5 34 14.6 34 21.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Left earcup */}
      <rect
        x="11.6"
        y="19.5"
        width="5.4"
        height="8.4"
        rx="2.4"
        fill="#FFFFFF"
      />
      {/* Right earcup */}
      <rect x="31" y="19.5" width="5.4" height="8.4" rx="2.4" fill="#FFFFFF" />
      {/* Mic boom from the right earcup down to the mouthpiece */}
      <path
        d="M33.7 27.5 C33.7 31.2 31 33 28.3 33.4"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="27" cy="33.6" r="1.9" fill="#FFFFFF" />

      {/* Speech bubble, overlapping the headset like the reference icon */}
      <path
        d="M10.5 25.8 C10.5 23 12.8 20.8 15.6 20.8 L26.4 20.8 C29.2 20.8 31.5 23 31.5 25.8 L31.5 30.4 C31.5 33.2 29.2 35.4 26.4 35.4 L17.6 35.4 L12.3 39.4 C11.7 39.9 10.8 39.4 10.9 38.6 L11.5 34.9 C10.9 34 10.5 32.9 10.5 31.7 Z"
        fill="#FFFFFF"
      />
      <circle cx="17.2" cy="28.1" r="1.5" fill="#5B21B6" />
      <circle cx="21.9" cy="28.1" r="1.5" fill="#5B21B6" />
      <circle cx="26.6" cy="28.1" r="1.5" fill="#5B21B6" />
    </svg>
  );
}
