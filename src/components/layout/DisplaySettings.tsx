import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Monitor, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { panelGeometry } from "@/lib/display-panel-layout";
import {
  DEFAULT_PREFERENCES,
  DISPLAY_SCALE_OPTIONS,
  useDisplayPreferences,
  type DisplayScale,
} from "@/lib/display-preferences";

export default function DisplaySettings() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // The panel is portalled to <body>, outside the zoomed #root, so it carries
  // its own zoom and its offsets are expressed in that zoomed space.
  const [geometry, setGeometry] = useState(() =>
    panelGeometry({
      trigger: null,
      viewport: { width: 1024, height: 768 },
      scalePercent: 100,
    }),
  );
  const { scale, compact, wideView, setScale, setCompact, setWideView, reset } =
    useDisplayPreferences();

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
          // The scale is applied at the viewport, so the body-level portal is
          // already scaled with everything else: no extra zoom of its own.
          scalePercent: 100,
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
        className="frelux-display-settings-trigger inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg border border-border/70 px-2 text-xs font-semibold text-muted-foreground hover:bg-muted dark:border-white/10"
      >
        <Monitor className="h-4 w-4" aria-hidden="true" />
        <span>{scale}%</span>
      </Button>

      {open &&
        createPortal(
          <section
            ref={panelRef}
            id="frelux-display-settings"
            aria-label="Display settings"
            className="surface-float fixed z-[80] rounded-2xl border border-border/70 p-4 text-left shadow-2xl dark:border-white/10"
            style={{
              top: geometry.top,
              left: geometry.left,
              width: geometry.width,
              maxHeight: geometry.maxHeight,
              overflowY: "auto",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Display
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Preview changes instantly. Saved on this device.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="-mr-2 -mt-2 h-9 w-9 shrink-0"
                aria-label="Close display settings"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-2 mt-4 flex items-center justify-between text-xs font-semibold text-foreground">
              <label htmlFor="frelux-display-scale">Display scale</label>
              <output htmlFor="frelux-display-scale" className="text-primary">
                {scale}%
              </output>
            </div>
            <select
              id="frelux-display-scale"
              aria-label="Display scale"
              value={scale}
              onChange={(event) =>
                setScale(Number(event.target.value) as DisplayScale)
              }
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {DISPLAY_SCALE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}%{option === 100 ? " · Original layout" : ""}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Compact view</span>
              <span>100% original</span>
            </div>
            <div className="mt-3 space-y-1 border-t border-border/60 pt-3 dark:border-white/10">
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg px-1 text-sm">
                <span>
                  <span className="block font-medium text-foreground">
                    Compact spacing
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Tighten page gaps and card padding
                  </span>
                </span>
                <input
                  type="checkbox"
                  aria-label="Compact spacing"
                  checked={compact}
                  onChange={(event) => setCompact(event.target.checked)}
                  className="h-5 w-5 shrink-0 accent-primary"
                />
              </label>
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg px-1 text-sm">
                <span>
                  <span className="block font-medium text-foreground">
                    Wide calculator view
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Use more width for tool pages and panels
                  </span>
                </span>
                <input
                  type="checkbox"
                  aria-label="Wide calculator view"
                  checked={wideView}
                  onChange={(event) => setWideView(event.target.checked)}
                  className="h-5 w-5 shrink-0 accent-primary"
                />
              </label>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              className="mt-3 h-10 w-full justify-center gap-2 border border-border/70 text-sm dark:border-white/10"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset to default ({DEFAULT_PREFERENCES.scale}%)
            </Button>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              App display scale only. Your browser zoom and calculations are
              unchanged.
            </p>
          </section>,
          document.body,
        )}
    </div>
  );
}
