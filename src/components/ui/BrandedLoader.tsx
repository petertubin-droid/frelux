import { useEffect, useState } from "react";
import { Paintbrush } from "lucide-react";
import type { LoaderConfig } from "@/types/database";

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
] as const;

export const LOADER_STYLE_OPTIONS: {
  value: string;
  label: string;
  description: string;
}[] = [
  {
    value: "gradient_ring",
    label: "Gradient Ring",
    description: "Rotating gradient circle with the logo (default)",
  },
  {
    value: "dual_rings",
    label: "Dual Rings",
    description: "Two arcs rotating in opposite directions",
  },
  {
    value: "spinner",
    label: "Minimal Spinner",
    description: "Single thin arc, quiet and light",
  },
  {
    value: "orbit",
    label: "Orbiting Dots",
    description: "Dots circling a soft core",
  },
  {
    value: "pulse",
    label: "Soft Pulse",
    description: "Glowing disc breathing in and out",
  },
  {
    value: "brand_beat",
    label: "Brand Beat",
    description: "Beating paintbrush mark, brand-forward",
  },
  {
    value: "bars",
    label: "Equalizer Bars",
    description: "Five bars rising and falling",
  },
  {
    value: "dots",
    label: "Bouncing Dots",
    description: "Three dots hopping in sequence",
  },
  {
    value: "progress",
    label: "Progress Bar",
    description: "Indeterminate bar sliding across",
  },
  {
    value: "ripple",
    label: "Ripple",
    description: "Concentric circles expanding outward",
  },
];

export const DEFAULT_LOADER_CONFIG: LoaderConfig = {
  enabled: true,
  style: "gradient_ring",
  size: "md",
  speed: "normal",
  primary_color: "#7c3aed",
  secondary_color: "#2563eb",
  show_logo: true,
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

const SIZES: Record<LoaderConfig["size"], number> = { sm: 64, md: 96, lg: 128 };
const SPEED_MULT: Record<LoaderConfig["speed"], number> = {
  slow: 1.6,
  fast: 0.6,
  normal: 1,
};

/** The pure visual for each loader style (no overlay chrome). Exported for
 *  the admin live preview. */
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

  // gradient_ring (default)
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
        strokeWidth="4"
        opacity="0.25"
      />
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="200 110"
        className="animate-spin"
        style={{ animationDuration: `${dur}s`, transformOrigin: "50% 50%" }}
      />
    </svg>
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand-purple dark:border-t-brand-purple-lighter" />
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
              <div
                className="rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-md"
                style={{ width: size * 0.46, height: size * 0.46 }}
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt=""
                    style={{
                      width: size * 0.38,
                      height: size * 0.38,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span
                    className="font-black text-brand-purple dark:text-brand-purple-lighter"
                    style={{ fontSize: size * 0.2 }}
                  >
                    F
                  </span>
                )}
              </div>
            </div>
          )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground font-medium">
        {config.text || ROTATING_MESSAGES[msgIndex]}
      </p>
    </div>
  );
}
