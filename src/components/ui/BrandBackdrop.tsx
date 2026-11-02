import { useState } from "react";

/**
 * Brand architectural backdrop, shared by the hero, the footer and the
 * page body — the same layered background the first-visit Entry
 * Experience shows: the architectural image, the blueprint grid and the
 * brand glows, faded to stay behind content.
 *
 * All layers are decorative: aria-hidden, pointer-events-none, no layout
 * impact. The image never blocks paint (opacity fades in on load) and
 * is the already-cached /assets/entry/entry-bg.jpg.
 *
 * Variants:
 *  - "hero":   rich treatment behind the dark hero surface (image ~0.35)
 *  - "footer": visible texture behind footer content (light-safe scrim)
 *  - "page":   whisper-quiet texture behind ordinary page content
 */
export default function BrandBackdrop({
  variant = "page",
}: {
  variant?: "hero" | "footer" | "page";
}) {
  const [ready, setReady] = useState(false);

  const config = {
    // The hero surface is always dark (bg-mesh + light text), so its
    // image carries the full entry-screen weight and needs no scrim.
    // The footer and page body are theme-aware surfaces with muted
    // text, so in light mode the image is quiet and lifted toward the
    // background to keep text contrast.
    hero: {
      img: 0.35,
      grid: 0.5,
      glows: true,
      scrim: false,
    },
    footer: {
      img: 0.22,
      grid: 0.35,
      glows: true,
      scrim: true,
    },
    page: {
      img: 0.12,
      grid: 0.25,
      glows: false,
      scrim: true,
    },
  }[variant];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Architectural image: fades in when it loads, never blocks */}
      <img
        src="/assets/entry/entry-bg.jpg"
        alt=""
        loading={variant === "hero" ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setReady(true)}
        onError={() => setReady(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out ${
          ready ? "opacity-[var(--bd-img)]" : "opacity-0"
        }`}
        style={{ "--bd-img": config.img } as React.CSSProperties}
      />

      {/* Blueprint grid: the technical line detail from the entry screen */}
      <div
        className="absolute inset-0"
        style={{
          opacity: config.grid,
          backgroundImage:
            "linear-gradient(rgba(109,40,217,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(109,40,217,0.10) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Brand glows (hero/footer): violet from the top, orange at the base */}
      {config.glows && (
        <>
          <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-violet-700/15 blur-3xl sm:h-80 sm:w-80" />
          <div className="absolute -bottom-24 right-1/5 h-64 w-64 rounded-full bg-orange-600/10 blur-3xl sm:h-80 sm:w-80" />
        </>
      )}

      {/* Readability scrim (footer/page only, light mode only): lift the
          image toward the background so muted text keeps its contrast.
          Dark mode keeps the image visible — the dark scrim below just
          softens the grid toward the bottom edge. */}
      {config.scrim && (
        <>
          <div className="absolute inset-0 bg-background/85 dark:bg-background/30" />
          <div className="absolute inset-0 hidden dark:block dark:bg-[linear-gradient(180deg,transparent_0%,transparent_60%,rgba(10,10,26,0.25)_100%)]" />
        </>
      )}
    </div>
  );
}
