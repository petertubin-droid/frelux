import { useEffect, useState, type CSSProperties } from "react";
import { Paintbrush } from "lucide-react";
import type { LoaderConfig } from "@/types/database";
import { LogoMark } from "@/components/brand/Logo";

/** Loader styles selectable from Admin Settings (loader_config.style). */
export const LOADER_STYLE_VALUES = [
  "gradient_ring",
  "dual_rings",
  "spinner",
  "orbit",
  "pulse",
  "brand_beat",
  "bars",
  "dots",
  "progress",
  "ripple",
  "conic_sweep",
  "segmented_ring",
  "slim_arc",
  "soft_square",
  "fade_dot",
  "blades",
] as const;

export type LoaderStyleCategory = "premium" | "simple" | "classic" | "standard";

/** Category order and headings for the admin picker. */
export const LOADER_CATEGORY_ORDER: {
  value: LoaderStyleCategory;
  label: string;
  hint: string;
}[] = [
  {
    value: "premium",
    label: "Premium",
    hint: "Brand-forward circles for the main app loader",
  },
  {
    value: "simple",
    label: "Simple",
    hint: "Quiet shapes that stay out of the way",
  },
  {
    value: "classic",
    label: "Classic",
    hint: "The familiar spinner, done cleanly",
  },
  {
    value: "standard",
    label: "Standard",
    hint: "Linear and sequence indicators",
  },
];

export const LOADER_STYLE_OPTIONS: {
  value: string;
  label: string;
  description: string;
  category: LoaderStyleCategory;
}[] = [
  // Premium (5)
  {
    value: "gradient_ring",
    label: "Aurora Ring",
    description: "Hairline track with a brand sweep (default)",
    category: "premium",
  },
  {
    value: "dual_rings",
    label: "Dual Rings",
    description: "Two arcs rotating in opposite directions",
    category: "premium",
  },
  {
    value: "brand_beat",
    label: "Brand Beat",
    description: "Beating paintbrush mark, brand-forward",
    category: "premium",
  },
  {
    value: "conic_sweep",
    label: "Conic Sweep",
    description: "Conic gradient ring with a bright leading head",
    category: "premium",
  },
  {
    value: "segmented_ring",
    label: "Segmented Ring",
    description: "Two-tone dashes chasing round the ring",
    category: "premium",
  },
  // Simple (6)
  {
    value: "orbit",
    label: "Orbiting Dots",
    description: "Dots circling a soft core",
    category: "simple",
  },
  {
    value: "pulse",
    label: "Soft Pulse",
    description: "Glowing disc breathing in and out",
    category: "simple",
  },
  {
    value: "dots",
    label: "Bouncing Dots",
    description: "Three dots hopping in sequence",
    category: "simple",
  },
  {
    value: "slim_arc",
    label: "Slim Arc",
    description: "One hairline arc, nothing else",
    category: "simple",
  },
  {
    value: "soft_square",
    label: "Soft Square",
    description: "Rounded square outline turning slowly",
    category: "simple",
  },
  {
    value: "fade_dot",
    label: "Fading Dot",
    description: "A single dot fading in and out",
    category: "simple",
  },
  // Classic (2)
  {
    value: "spinner",
    label: "Minimal Spinner",
    description: "Single thin arc, quiet and light",
    category: "classic",
  },
  {
    value: "blades",
    label: "Classic Blades",
    description: "Eight blades fading in sequence",
    category: "classic",
  },
  // Standard (3)
  {
    value: "bars",
    label: "Equalizer Bars",
    description: "Five bars rising and falling",
    category: "standard",
  },
  {
    value: "progress",
    label: "Progress Bar",
    description: "Indeterminate bar sliding across",
    category: "standard",
  },
  {
    value: "ripple",
    label: "Ripple",
    description: "Concentric circles expanding outward",
    category: "standard",
  },
];

export const DEFAULT_LOADER_CONFIG: LoaderConfig = {
  enabled: true,
  style: "gradient_ring",
  size: "md",
  speed: "normal",
  primary_color: "#7c3aed",
  secondary_color: "#f97316",
  show_logo: false,
  logo_url: null,
  text: "",
};

const ROTATING_MESSAGES = [
  "Loading…",
  "Mixing your workspace…",
  "Preparing your tools…",
  "Almost ready…",
];

let cachedConfig: LoaderConfig | null = null;

/** Reads loader_config from site_settings (module-cached; resilient to the
 *  column not existing yet on older deployments - falls back to defaults). */
export function useLoaderConfig() {
  const [config, setConfig] = useState<LoaderConfig>(
    cachedConfig ?? DEFAULT_LOADER_CONFIG,
  );

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig);
      return;
    }
    let alive = true;
    import("@/lib/supabase-lazy")
      .then(async ({ getSupabase, isSupabaseConfigured }) => {
        if (!isSupabaseConfigured) return;
        const supabase = await getSupabase();
        const { data } = await supabase
          .from("site_settings")
          .select("loader_config")
          .limit(1)
          .maybeSingle();
        if (!alive || !data) return;
        const merged = {
          ...DEFAULT_LOADER_CONFIG,
          ...((data.loader_config as LoaderConfig | null) ?? {}),
        };
        cachedConfig = merged;
        setConfig(merged);
      })
      .catch(() => {
        /* column not deployed yet, or no session: keep defaults */
      });
    return () => {
      alive = false;
    };
  }, []);

  return config;
}

/** Force a re-fetch after admin saves (clears the module cache). */
export function invalidateLoaderConfigCache() {
  cachedConfig = null;
}

/** Fade a CSS colour to transparent. Falls back to `transparent` for any
 *  format that cannot be faded safely (named colours, colour functions). */
function fade(color: string, alpha: number) {
  const hex = color.trim().replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return "transparent";
  const value = parseInt(full, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

const SIZES: Record<LoaderConfig["size"], number> = { sm: 64, md: 96, lg: 128 };
const SPEED_MULT: Record<LoaderConfig["speed"], number> = {
  slow: 1.6,
  fast: 0.6,
  normal: 1,
};

/** The pure visual for each loader style (no overlay chrome). Exported for
 *  FRELUX live preview. */
export function LoaderVisual({
  config,
  sizePx,
}: {
  config: LoaderConfig;
  sizePx?: number;
}) {
  const size = sizePx ?? SIZES[config.size] ?? 96;
  const mult = SPEED_MULT[config.speed] ?? 1;
  const dur = Math.round(1.4 * mult * 100) / 100;
  const gradId = `freluxLoaderGrad-${config.style}`;
  const primary = config.primary_color || "#7c3aed";
  const secondary = config.secondary_color || "#2563eb";

  if (config.style === "dual_rings" || config.style === "spinner") {
    const thin = config.style === "spinner";
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke="#a1a1aa"
          strokeWidth={thin ? 2 : 4}
          opacity="0.25"
        />
        {thin ? (
          <circle
            cx="50"
            cy="50"
            r="41"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="200 60"
            className="animate-spin"
            style={{ animationDuration: `${dur}s`, transformOrigin: "50% 50%" }}
          />
        ) : (
          <>
            <circle
              cx="50"
              cy="50"
              r="41"
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="160 220"
              className="animate-spin"
              style={{
                animationDuration: `${dur}s`,
                transformOrigin: "50% 50%",
              }}
            />
            <circle
              cx="50"
              cy="50"
              r="30"
              fill="none"
              stroke={secondary}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="80 110"
              className="animate-spin"
              style={{
                animationDuration: `${Math.round(1.1 * mult * 100) / 100}s`,
                animationDirection: "reverse",
                transformOrigin: "50% 50%",
              }}
            />
          </>
        )}
      </svg>
    );
  }

  if (config.style === "orbit") {
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute rounded-full"
          style={{
            inset: size * 0.38,
            backgroundColor: primary,
            opacity: 0.35,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            animation: `frelux-loader-orbit ${Math.round(1.5 * mult * 100) / 100}s linear infinite`,
          }}
        >
          {[0, 120, 240].map((deg) => (
            <div
              key={deg}
              className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: size * 0.14,
                height: size * 0.14,
                backgroundColor: deg === 0 ? secondary : primary,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (config.style === "pulse") {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div
          className="rounded-full"
          style={{
            animation: `frelux-loader-pulse ${Math.round(1.6 * mult * 100) / 100}s ease-in-out infinite`,
            width: size * 0.55,
            height: size * 0.55,
            background: `linear-gradient(135deg, ${primary}, ${secondary})`,
            boxShadow: `0 0 ${size * 0.18}px ${primary}`,
          }}
        />
      </div>
    );
  }

  if (config.style === "brand_beat") {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div
          style={{
            animation: `frelux-loader-beat ${Math.round(1.1 * mult * 100) / 100}s ease-in-out infinite`,
          }}
        >
          <Paintbrush
            style={{ width: size * 0.55, height: size * 0.55, color: primary }}
          />
        </div>
      </div>
    );
  }

  if (config.style === "bars") {
    const bw = size * 0.08;
    return (
      <div
        className="flex items-center justify-center gap-1.5"
        style={{ width: size, height: size }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: bw,
              height: size * 0.55,
              background: `linear-gradient(180deg, ${primary}, ${secondary})`,
              animation: `frelux-loader-bar ${Math.round(0.9 * mult * 100) / 100}s ease-in-out ${i * 0.09}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  if (config.style === "dots") {
    const d = size * 0.13;
    return (
      <div
        className="flex items-center justify-center gap-2"
        style={{ width: size, height: size }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: d,
              height: d,
              backgroundColor: i === 1 ? secondary : primary,
              animation: `frelux-loader-dot ${Math.round(0.7 * mult * 100) / 100}s ease-out ${i * 0.12}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  if (config.style === "progress") {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div
          className="w-full rounded-full overflow-hidden bg-zinc-200/60 dark:bg-zinc-800/60"
          style={{ height: size * 0.06 }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: "45%",
              background: `linear-gradient(90deg, ${primary}, ${secondary})`,
              animation: `frelux-loader-progress ${Math.round(1.2 * mult * 100) / 100}s ease-in-out infinite`,
            }}
          />
        </div>
      </div>
    );
  }

  if (config.style === "conic_sweep") {
    // A conic gradient is the whole ring; the mask cuts the middle out so it
    // reads as a stroke rather than a pie. One element, no SVG.
    const stroke = Math.max(3, Math.round(size * 0.055));
    const ring = `radial-gradient(farthest-side, transparent calc(100% - ${stroke}px), #000 calc(100% - ${stroke}px))`;
    return (
      <div
        role="progressbar"
        aria-label="Loading"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `conic-gradient(from 0deg, ${secondary}00 0deg, ${secondary} 120deg, ${primary} 260deg, ${primary}00 360deg)`,
          WebkitMask: ring,
          mask: ring,
          animation: `frelux-loader-orbit ${Math.round(1.5 * mult * 100) / 100}s linear infinite`,
        }}
      />
    );
  }

  if (config.style === "segmented_ring") {
    const segments = 12;
    const gap = 100 / segments;
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="progressbar"
        aria-label="Loading"
      >
        {Array.from({ length: segments }, (_, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r="41"
            fill="none"
            stroke={i % 2 === 0 ? primary : secondary}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${gap * 0.62} ${gap * 0.38}`}
            strokeDashoffset={-(i * gap)}
            opacity={0.25 + (0.75 * i) / segments}
          />
        ))}
        <g
          className="animate-spin"
          style={{ animationDuration: `${dur}s`, transformOrigin: "50% 50%" }}
        >
          <circle
            cx="50"
            cy="50"
            r="41"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="20 220"
          />
        </g>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (config.style === "slim_arc") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="progressbar"
        aria-label="Loading"
      >
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke={primary}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="120 140"
          className="animate-spin"
          style={{ animationDuration: `${dur}s`, transformOrigin: "50% 50%" }}
        />
      </svg>
    );
  }

  if (config.style === "soft_square") {
    return (
      <div
        role="progressbar"
        aria-label="Loading"
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size * 0.16,
          border: `${Math.max(3, Math.round(size * 0.045))}px solid ${primary}`,
          borderTopColor: "transparent",
          borderRightColor: secondary,
          animation: `frelux-loader-orbit ${Math.round(1.7 * mult * 100) / 100}s linear infinite`,
        }}
      />
    );
  }

  if (config.style === "fade_dot") {
    return (
      <div
        role="progressbar"
        aria-label="Loading"
        className="flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div
          className="rounded-full"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            background: `linear-gradient(135deg, ${primary}, ${secondary})`,
            animation: `frelux-loader-pulse ${Math.round(1.5 * mult * 100) / 100}s ease-in-out infinite`,
          }}
        />
      </div>
    );
  }

  if (config.style === "blades") {
    // Eight blades on a static 45 degree grid, each fading on a stagger. That
    // is the classic shape without a per-frame JS tick or a new keyframe.
    return (
      <div
        role="progressbar"
        aria-label="Loading"
        className="relative"
        style={{ width: size, height: size }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 origin-top"
            style={{
              width: Math.max(3, Math.round(size * 0.06)),
              height: size * 0.24,
              marginLeft: -Math.max(3, Math.round(size * 0.06)) / 2,
              borderRadius: 999,
              backgroundColor: i % 2 === 0 ? primary : secondary,
              transform: `rotate(${i * 45}deg) translateY(${-size * 0.46}px)`,
              animation: `frelux-loader-pulse ${Math.round(1.1 * mult * 100) / 100}s linear infinite`,
              animationDelay: `${(i * 0.11).toFixed(2)}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (config.style === "ripple") {
    return (
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border-2"
            style={{
              borderColor: i % 2 ? secondary : primary,
              width: size * 0.5,
              height: size * 0.5,
              animation: `frelux-loader-ripple ${Math.round(1.5 * mult * 100) / 100}s ease-out ${i * (0.5 * mult)}s infinite`,
            }}
          />
        ))}
        <div
          className="absolute rounded-full"
          style={{
            width: size * 0.18,
            height: size * 0.18,
            background: `linear-gradient(135deg, ${primary}, ${secondary})`,
          }}
        />
      </div>
    );
  }

  // gradient_ring (default): a hairline track with one brand sweep and a
  // soft bloom underneath. Nothing sits in the middle, so the loader never
  // reads as a letter in a disc.
  const thickness = Math.max(2, Math.round(size * 0.045));
  const sweep = `conic-gradient(from 0deg, ${fade(primary, 0)} 0deg, ${primary} 90deg, ${secondary} 250deg, ${fade(secondary, 0)} 350deg, ${fade(primary, 0)} 360deg)`;
  const spin = `${Math.round(1.8 * mult * 100) / 100}s`;
  const ringStyle: CSSProperties = {
    background: sweep,
    WebkitMaskImage: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness}px))`,
    maskImage: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness}px))`,
    animationDuration: spin,
  };
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label="Loading"
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: `inset 0 0 0 ${thickness}px ${fade("#71717a", 0.16)}`,
        }}
      />
      <div
        className="absolute animate-spin rounded-full"
        style={{
          inset: -Math.round(thickness / 2),
          background: sweep,
          filter: `blur(${Math.max(3, Math.round(size * 0.05))}px)`,
          opacity: 0.35,
          animationDuration: spin,
        }}
      />
      <div
        className="absolute inset-0 animate-spin rounded-full"
        style={ringStyle}
      />
    </div>
  );
}

/** Centered page loader used for Suspense fallbacks across the app.
 *  Fully admin-configurable via Admin Settings -> Loading Experience. */
export default function BrandedLoader() {
  const config = useLoaderConfig();
  const [msgIndex, setMsgIndex] = useState(0);
  const size = SIZES[config.size] ?? 96;

  useEffect(() => {
    if (config.text) return;
    const id = window.setInterval(
      () => setMsgIndex((i) => (i + 1) % ROTATING_MESSAGES.length),
      2800,
    );
    return () => window.clearInterval(id);
  }, [config.text]);

  if (!config.enabled) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoaderVisual
          config={{ ...DEFAULT_LOADER_CONFIG, show_logo: false }}
          sizePx={32}
        />
      </div>
    );
  }

  const logoSrc = config.logo_url || undefined;

  return (
    <div className="flex flex-col items-center justify-center py-32 select-none">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <LoaderVisual config={config} />
        {config.show_logo &&
          config.style !== "bars" &&
          config.style !== "dots" &&
          config.style !== "progress" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  style={{
                    width: size * 0.34,
                    height: size * 0.34,
                    objectFit: "contain",
                  }}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <LogoMark
                  variant="auto"
                  size={Math.round(size * 0.3)}
                  className="object-contain"
                />
              )}
            </div>
          )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground font-medium">
        {config.text || ROTATING_MESSAGES[msgIndex]}
      </p>
    </div>
  );
}
