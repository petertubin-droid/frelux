import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ruler, Layers, Droplets, Calculator, FileText, Eye } from 'lucide-react';
import Container from '@/components/ui/Container';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { calculatePaint } from '@/lib/calc';
import { DEFAULT_COVERAGE_M2_PER_LITER, DEFAULT_CONTAINER_SIZES_LITERS } from '@/lib/calc';
import type { CalculatorInput } from '@/types';

/**
 * Interactive estimate preview section.
 * Demonstrates how a FRELUX calculation looks using the REAL calculation engine.
 * No fake numbers — everything is computed from calculatePaint().
 */

const presets = [
  { label: 'Small room', length: 10, width: 10, height: 9, doors: 1, windows: 2, coats: 2 },
  { label: 'Standard room', length: 12, width: 12, height: 10, doors: 1, windows: 2, coats: 2 },
  { label: 'Large room', length: 16, width: 14, height: 10, doors: 2, windows: 3, coats: 2 },
];

export default function InteractiveEstimatePreview() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const [activePreset, setActivePreset] = useState(1); // default to "Standard room"
  const [animatedValues, setAnimatedValues] = useState({ liters: 0, area: 0, buckets: 0 });
  const animFrameRef = useRef<number | null>(null);

  const preset = presets[activePreset];

  // Real calculation using the actual calc engine
  const result = useMemo(() => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: preset.length,
      width: preset.width,
      wallHeight: preset.height,
      doors: preset.doors,
      doorDims: { width: 0.8, height: 2.4 },
      windows: preset.windows,
      windowDims: { width: 1.2, height: 1.2 },
      coats: preset.coats,
      paintType: 'premium-emulsion',
      unit: 'feet',
      includeCeiling: false,
      wasteMargin: 10,
    };
    return calculatePaint(input, {
      coverageRate: DEFAULT_COVERAGE_M2_PER_LITER,
      containerSizes: DEFAULT_CONTAINER_SIZES_LITERS,
    });
  }, [preset]);

  const totalBuckets = result.recommendedContainers.reduce((sum, c) => sum + c.count, 0);

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
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [result, totalBuckets, isVisible]);

  return (
    <section data-tour="cost" className="relative overflow-hidden bg-neutral-50/50 py-20 sm:py-24 dark:bg-brand-navy-mid bg-noise">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30 dark:bg-grid-dark dark:opacity-20" aria-hidden="true" />

      <Container className="relative">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-purple dark:text-brand-purple-lighter">
            See it in action
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
            What a FRELUX estimate looks like
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-500 dark:text-neutral-400">
            Real calculation output. No demo data, these numbers come from the actual FRELUX calculation engine.
          </p>
        </div>

        {/* Preset selector */}
        <div className="mt-8 flex justify-center gap-2">
          {presets.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setActivePreset(i)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activePreset === i
                  ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                  : 'bg-white text-neutral-500 border border-neutral-200 hover:border-brand-purple/20 hover:text-brand-purple dark:bg-brand-navy-mid dark:border-white/10 dark:text-neutral-400 dark:hover:text-brand-purple-lighter'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Estimate preview card */}
        <div
          ref={ref}
          className="mx-auto mt-10 max-w-3xl"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-premium-lg dark:border-white/10 dark:bg-brand-navy-mid">
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                  <FileText className="h-4 w-4" />
                </span>
                <span className="font-display text-sm font-bold text-neutral-900 dark:text-white">Painting Estimate</span>
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
                <div className="rounded-xl bg-neutral-50 p-4 dark:bg-white/5">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-white/30">
                    <Ruler className="h-3 w-3" />
                    Room dimensions
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold text-neutral-900 dark:text-white">
                    {preset.length} × {preset.width} ft
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Wall height: {preset.height} ft</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-neutral-50 p-3 text-center dark:bg-white/5">
                    <Layers className="mx-auto h-4 w-4 text-brand-purple dark:text-brand-purple-lighter" />
                    <p className="mt-1.5 text-sm font-bold text-neutral-900 dark:text-white">{preset.coats}</p>
                    <p className="text-[10px] text-neutral-400">Coats</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3 text-center dark:bg-white/5">
                    <Ruler className="mx-auto h-4 w-4 text-brand-purple dark:text-brand-purple-lighter" />
                    <p className="mt-1.5 text-sm font-bold text-neutral-900 dark:text-white">{preset.doors}</p>
                    <p className="text-[10px] text-neutral-400">Doors</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3 text-center dark:bg-white/5">
                    <Eye className="mx-auto h-4 w-4 text-brand-purple dark:text-brand-purple-lighter" />
                    <p className="mt-1.5 text-sm font-bold text-neutral-900 dark:text-white">{preset.windows}</p>
                    <p className="text-[10px] text-neutral-400">Windows</p>
                  </div>
                </div>

                <div className="rounded-xl bg-neutral-50 p-4 dark:bg-white/5">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-white/30">
                    <Calculator className="h-3 w-3" />
                    Coverage rate
                  </p>
                  <p className="mt-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    {DEFAULT_COVERAGE_M2_PER_LITER} m² per litre per coat
                  </p>
                  <p className="text-[11px] text-neutral-400">Configurable from admin settings</p>
                </div>
              </div>

              {/* Right: Results */}
              <div className="space-y-4">
                {/* Paintable area */}
                <div className="rounded-xl border border-brand-purple/10 bg-brand-purple/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-purple dark:text-brand-purple-lighter">
                    Paintable area
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold text-neutral-900 dark:text-white">
                    {animatedValues.area.toFixed(1)}<span className="text-base font-normal text-neutral-400"> m²</span>
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Wall area: {result.wallArea} m² · Door: {result.doorArea} m² · Window: {result.windowArea} m²
                  </p>
                </div>

                {/* Paint required */}
                <div className="rounded-xl border border-accent-cyan/10 bg-accent-cyan/5 p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-cyan">
                    <Droplets className="h-3 w-3" />
                    Paint required
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold text-neutral-900 dark:text-white">
                    {animatedValues.liters.toFixed(1)}<span className="text-base font-normal text-neutral-400"> L</span>
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Theoretical: {result.paintRequiredLiters} L + {result.wasteMargin}% waste = {result.adjustedLiters} L
                  </p>
                </div>

                {/* Container recommendation */}
                <div className="rounded-xl bg-neutral-50 p-4 dark:bg-white/5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-white/30">
                    Recommended purchase
                  </p>
                  <div className="mt-2.5 space-y-1.5">
                    {result.recommendedContainers.map((c) => (
                      <div key={c.size} className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600 dark:text-neutral-300">{c.size}L container</span>
                        <span className="font-bold text-neutral-900 dark:text-white">×{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card footer */}
            <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-4 dark:border-white/5">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Materials, primer, and labour are calculated in the full cost estimator.
              </p>
              <Link
                to="/painting-estimator"
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
