import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Columns3,
  Minus,
  Monitor,
  Plus,
  RotateCcw,
  Rows3,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { panelGeometry } from "@/lib/display-panel-layout";
import { cn } from "@/lib/cn";
import {
  DEFAULT_PREFERENCES,
  DISPLAY_SCALE_OPTIONS,
  defaultPreferencesForDevice,
  useDisplayPreferences,
  type DisplayScale,
} from "@/lib/display-preferences";

const MIN_SCALE = DISPLAY_SCALE_OPTIONS[0];
const MAX_SCALE = DISPLAY_SCALE_OPTIONS[DISPLAY_SCALE_OPTIONS.length - 1];
/** Slider stops every 5%, snapped to the nearest option the app actually ships. */
const SLIDER_STEP = 5;

function snapToOption(value: number): DisplayScale {
  return DISPLAY_SCALE_OPTIONS.reduce<DisplayScale>(
    (closest, option) =>
      Math.abs(option - value) < Math.abs(closest - value) ? option : closest,
    DISPLAY_SCALE_OPTIONS[0],
  );
}

function stepScale(current: DisplayScale, direction: -1 | 1): DisplayScale {
  const index = DISPLAY_SCALE_OPTIONS.indexOf(current);
  const next = Math.min(
    Math.max(index + direction, 0),
    DISPLAY_SCALE_OPTIONS.length - 1,
  );
  return DISPLAY_SCALE_OPTIONS[next];
}

/** A settings row whose switch is a real checkbox: keyboard and label semantics stay native. */
function SwitchRow({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: typeof Rows3;
}) {
  return (
    <label className="group flex cursor-pointer items-start justify-between gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-muted/60 focus-within:bg-muted/60">
      <span className="flex min-w-0 items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
            checked
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
          aria-hidden="true"
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold leading-5 text-foreground">
            {label}
          </span>
          <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
            {description}
          </span>
        </span>
      </span>
      <span className="relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center">
        <input
          type="checkbox"
          aria-label={label}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          className="h-6 w-10 rounded-full bg-muted ring-1 ring-inset ring-border/70 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1 dark:ring-white/15"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-background shadow-sm transition-transform duration-200 ease-out peer-checked:translate-x-4"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

/**
 * Live sample of the chosen display settings: the type scales with the zoom and
 * the card tightens with compact spacing, so the panel answers "what will change"
 * before the page behind it repaints.
 */
function SettingsPreview({
  scale,
  compact,
  wideView,
}: {
  scale: DisplayScale;
  compact: boolean;
  wideView: boolean;
}) {
  const typeSize = Math.min(Math.max(11 * (scale / 100), 7), 15);
  return (
    <div
      className="rounded-xl border border-border/60 bg-muted/40 p-2 dark:border-white/10"
      aria-hidden="true"
    >
      <div
        className={cn(
          "rounded-lg bg-card shadow-sm transition-all duration-200",
          compact ? "p-2" : "p-2.5",
        )}
        style={{ fontSize: `${typeSize}px`, lineHeight: 1.45 }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-foreground">Living room</span>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
            {scale}%
          </span>
        </div>
        <div
          className={cn(
            "mt-1.5 space-y-1",
            compact ? "space-y-0.5" : "space-y-1",
          )}
        >
          <span className="block h-1 rounded-full bg-muted-foreground/25" />
          <span className="block h-1 w-4/5 rounded-full bg-muted-foreground/20" />
          <span
            className={cn(
              "block h-1 rounded-full bg-muted-foreground/15",
              wideView ? "w-full" : "w-3/5",
            )}
          />
        </div>
      </div>
    </div>
  );
}

export default function DisplaySettings() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // The display scale is applied at the viewport, so this body-level portal is
  // scaled with the page. The panel counter-zooms (1 / scale) to stay readable,
  // and its offsets are expressed in that counter-zoomed space.
  const [geometry, setGeometry] = useState(() =>
    panelGeometry({
      trigger: null,
      viewport: { width: 1024, height: 768 },
      scalePercent: DEFAULT_PREFERENCES.scale,
    }),
  );
  const { scale, compact, wideView, setScale, setCompact, setWideView, reset } =
    useDisplayPreferences();

  // Reset is device-aware, so "nothing to reset" has to be judged against this
  // device's own defaults (a phone starts at 80%, a desktop at 50%).
  const deviceDefaults = useMemo(() => defaultPreferencesForDevice(), [scale]);
  const isDefault =
    scale === deviceDefaults.scale &&
    compact === deviceDefaults.compact &&
    wideView === deviceDefaults.wideView;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setGeometry(
        panelGeometry({
          trigger: { left: rect.left, bottom: rect.bottom },
          viewport: { width: window.innerWidth, height: window.innerHeight },
          scalePercent: scale,
        }),
      );
    };
    frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, scale]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Display settings, ${scale}% scale`}
        aria-expanded={open}
        aria-controls="frelux-display-settings"
        className={cn(
          "frelux-display-settings-trigger inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors",
          open
            ? "border-border bg-muted text-foreground dark:border-white/15"
            : "border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground dark:border-white/10",
        )}
      >
        <Monitor className="h-4 w-4" aria-hidden="true" />
        <span className="tabular-nums">{scale}%</span>
      </Button>

      {open &&
        createPortal(
          <section
            ref={panelRef}
            id="frelux-display-settings"
            aria-label="Display settings"
            className="surface-float fixed z-[80] overflow-y-auto rounded-2xl border border-border/70 text-left shadow-2xl dark:border-white/10"
            style={{
              // Counter-zoom so the panel stays readable at a reduced scale.
              zoom: geometry.zoom,
              top: geometry.top,
              left: geometry.left,
              width: geometry.width,
              maxHeight: geometry.maxHeight,
            }}
          >
            <header className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3 dark:border-white/10">
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold leading-5 tracking-tight text-foreground">
                  Display
                </h2>
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                  Preview instantly · saved on this device
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="-mr-1.5 -mt-1 h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="Close display settings"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </header>

            <div className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="frelux-display-scale"
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                >
                  Zoom
                </label>
                <span className="text-xs text-muted-foreground">
                  {scale === 100 ? "Original layout" : `${scale}% of original`}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScale(stepScale(scale, -1))}
                  disabled={scale === MIN_SCALE}
                  aria-label="Decrease display scale"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 text-foreground transition-colors hover:bg-muted disabled:opacity-40 dark:border-white/10"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <output
                  htmlFor="frelux-display-scale"
                  className="w-14 shrink-0 text-center text-lg font-semibold tabular-nums leading-8 text-foreground"
                  aria-live="polite"
                >
                  {scale}%
                </output>
                <button
                  type="button"
                  onClick={() => setScale(stepScale(scale, 1))}
                  disabled={scale === MAX_SCALE}
                  aria-label="Increase display scale"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 text-foreground transition-colors hover:bg-muted disabled:opacity-40 dark:border-white/10"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <input
                  id="frelux-display-scale"
                  type="range"
                  aria-label="Display scale"
                  min={MIN_SCALE}
                  max={MAX_SCALE}
                  step={SLIDER_STEP}
                  value={scale}
                  onChange={(event) =>
                    setScale(snapToOption(Number(event.target.value)))
                  }
                  className="ml-1 h-8 min-w-0 flex-1 cursor-pointer accent-primary"
                />
              </div>

              <div className="mt-3">
                <SettingsPreview
                  scale={scale}
                  compact={compact}
                  wideView={wideView}
                />
              </div>
            </div>

            <div className="border-t border-border/60 px-1.5 py-1.5 dark:border-white/10">
              <SwitchRow
                icon={Rows3}
                label="Compact spacing"
                description="Tighten page gaps and card padding"
                checked={compact}
                onChange={setCompact}
              />
              <SwitchRow
                icon={Columns3}
                label="Wide calculator view"
                description="Use more width for tool pages and panels"
                checked={wideView}
                onChange={setWideView}
              />
            </div>

            <footer className="border-t border-border/60 px-3 py-2.5 dark:border-white/10">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 text-xs leading-4 text-muted-foreground">
                  Display only. Browser zoom and calculations are untouched.
                </p>
                <button
                  type="button"
                  onClick={reset}
                  disabled={isDefault}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Reset
                </button>
              </div>
            </footer>
          </section>,
          document.body,
        )}
    </div>
  );
}
