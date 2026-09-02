import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Ruler,
  Layers,
  Droplets,
  Calculator,
  FileText,
  Eye,
} from "lucide-react";
import Container from "@/components/ui/Container";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { calculatePaint } from "@/lib/calc";
import {
  DEFAULT_COVERAGE_M2_PER_LITER,
  DEFAULT_CONTAINER_SIZES_LITERS,
} from "@/lib/calc";
import type { CalculatorInput } from "@/types";
import { Button } from "@/components/ui/shadcn/button";

/**
 * Interactive estimate preview section.
 * Demonstrates how a FRELUX calculation looks using the REAL calculation engine.
 * No fake numbers — everything is computed from calculatePaint().
 */

const presets = [
  {
    label: "Small room",
    length: 10,
    width: 10,
    height: 9,
    doors: 1,
    windows: 2,
    coats: 2,
  },
  {
    label: "Standard room",
    length: 12,
    width: 12,
    height: 10,
    doors: 1,
    windows: 2,
    coats: 2,
  },
  {
    label: "Large room",
    length: 16,
    width: 14,
    height: 10,
    doors: 2,
    windows: 3,
    coats: 2,
  },
];

export default function InteractiveEstimatePreview() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const [activePreset, setActivePreset] = useState(1); // default to "Standard room"
  const [animatedValues, setAnimatedValues] = useState({
    liters: 0,
    area: 0,
    buckets: 0,
  });
  const animFrameRef = useRef<number | null>(null);

  const preset = presets[activePreset];

  // Real calculation using the actual calc engine
  const result = useMemo(() => {
    const input: CalculatorInput = {
      projectType: "room",
      length: preset.length,
      width: preset.width,
      wallHeight: preset.height,
      doors: preset.doors,
      doorDims: { width: 0.8, height: 2.4 },
      windows: preset.windows,
      windowDims: { width: 1.2, height: 1.2 },
      coats: preset.coats,
      paintType: "premium-emulsion",
      unit: "feet",
      includeCeiling: false,
      wasteMargin: 10,
    };
    return calculatePaint(input, {
      coverageRate: DEFAULT_COVERAGE_M2_PER_LITER,
      containerSizes: DEFAULT_CONTAINER_SIZES_LITERS,
    });
  }, [preset]);

  const totalBuckets = result.recommendedContainers.reduce(
    (sum, c) => sum + c.count,
    0,
  );

  // Animate values when preset changes or section becomes visible
  useEffect(() => {
    if (!isVisible) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const duration = 900;
    const start = performance.now();
    const target = {
      liters: result.totalRecommendedLiters,
      area: result.paintableArea,
      buckets: totalBuckets,
    };

    function frame(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValues({
        liters: target.liters * eased,
        area: target.area * eased,
        buckets: target.buckets * eased,
      });
      if (progress < 1) animFrameRef.current = requestAnimationFrame(frame);
    }
    animFrameRef.current = requestAnimationFrame(frame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [result, totalBuckets, isVisible]);

  return (
    <section
      data-tour="cost"
      className="relative overflow-hidden bg-muted/50 py-20 sm:py-24 dark:bg-card bg-noise"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-grid opacity-30 dark:bg-grid-dark dark:opacity-20"
        aria-hidden="true"
      />

      <Container className="relative">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-purple dark:text-brand-purple-lighter">
            See it in action
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground dark:text-primary-foreground sm:text-4xl">
            What a FRELUX estimate looks like
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground dark:text-muted-foreground">
            Real calculation output. No demo data, these numbers come from the
            actual FRELUX calculation engine.
          </p>
        </div>

        {/* Preset selector */}
        <div className="mt-8 flex justify-center gap-2">
          {presets.map((p, i) => (
            <Button
              key={p.label}
              onClick={() => setActivePreset(i)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activePreset === i
                  ? "bg-primary text-primary-foreground shadow-lg shadow-brand-purple/20"
                  : "bg-card text-muted-foreground border border-border hover:border-brand-purple/20 hover:text-brand-purple dark:bg-card dark:border-white/10 dark:text-muted-foreground dark:hover:text-brand-purple-lighter"
              }`}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Estimate preview card */}
        <div
          ref={ref}
          className="mx-auto mt-10 max-w-3xl"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition:
              "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-premium-lg dark:border-white/10 dark:bg-card">
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
                  <FileText className="h-4 w-4" />
                </span>
                <span className="font-display text-sm font-bold text-foreground dark:text-primary-foreground">
                  Painting Estimate
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-accent-green">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse" />
                Calculated
              </span>
            </div>

            {/* Card body */}
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              {/* Left: Input parameters */}
              <div className="space-y-4">
                <div className="rounded-xl bg-muted/50 p-4 dark:bg-white/5">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-primary-foreground/30">
                    <Ruler className="h-3 w-3" />
                    Room dimensions
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold text-foreground dark:text-primary-foreground">
                    {preset.length} × {preset.width} ft
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Wall height: {preset.height} ft
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center dark:bg-white/5">
                    <Layers className="mx-auto h-4 w-4 text-brand-purple dark:text-brand-purple-lighter" />
                    <p className="mt-1.5 text-sm font-bold text-foreground dark:text-primary-foreground">
                      {preset.coats}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Coats</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center dark:bg-white/5">
                    <Ruler className="mx-auto h-4 w-4 text-brand-purple dark:text-brand-purple-lighter" />
                    <p className="mt-1.5 text-sm font-bold text-foreground dark:text-primary-foreground">
                      {preset.doors}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Doors</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center dark:bg-white/5">
                    <Eye className="mx-auto h-4 w-4 text-brand-purple dark:text-brand-purple-lighter" />
                    <p className="mt-1.5 text-sm font-bold text-foreground dark:text-primary-foreground">
                      {preset.windows}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Windows</p>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/50 p-4 dark:bg-white/5">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-primary-foreground/30">
                    <Calculator className="h-3 w-3" />
                    Coverage rate
                  </p>
                  <p className="mt-2 text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                    {DEFAULT_COVERAGE_M2_PER_LITER} m² per litre per coat
                    (internal)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Configurable from admin settings
                  </p>
                </div>
              </div>

              {/* Right: Results */}
              <div className="space-y-4">
                {/* Paintable area */}
                <div className="rounded-xl border border-brand-purple/10 bg-primary/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-purple dark:text-brand-purple-lighter">
                    Paintable area
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold text-foreground dark:text-primary-foreground">
                    {animatedValues.area.toFixed(1)}
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      m²
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Wall area: {result.wallArea} m² · Door: {result.doorArea} m²
                    · Window: {result.windowArea} m²
                  </p>
                </div>

                {/* Paint required */}
                <div className="rounded-xl border border-accent-cyan/10 bg-accent-cyan/5 p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-cyan">
                    <Droplets className="h-3 w-3" />
                    Paint buckets required
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold text-foreground dark:text-primary-foreground">
                    {Math.ceil(animatedValues.buckets)}
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      buckets
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Theoretical: {result.paintRequiredLiters.toFixed(1)} L +{" "}
                    {result.wasteMargin}% waste ={" "}
                    {result.adjustedLiters.toFixed(1)} L (rounded up to buckets)
                  </p>
                </div>

                {/* Container recommendation */}
                <div className="rounded-xl bg-muted/50 p-4 dark:bg-white/5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-primary-foreground/30">
                    Recommended purchase
                  </p>
                  <div className="mt-2.5 space-y-1.5">
                    {result.recommendedContainers.map((c) => (
                      <div
                        key={c.size}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground dark:text-muted-foreground/80">
                          {c.size} L bucket
                        </span>
                        <span className="font-bold text-foreground dark:text-primary-foreground">
                          ×{c.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card footer */}
            <div className="flex items-center justify-between border-t border-border/50 px-6 py-4 dark:border-white/5">
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                Materials, primer, and labour are calculated in the full cost
                estimator.
              </p>
              <Link
                to="/paint-calculator?mode=room-estimate"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all hover:gap-2.5 dark:text-brand-purple-lighter"
              >
                Try it yourself
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
