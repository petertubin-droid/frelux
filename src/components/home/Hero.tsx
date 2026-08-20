import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, ArrowRight, Check, MapPin, Layers, Droplets, Ruler } from 'lucide-react';
import Container from '@/components/ui/Container';
import { calculatePaint } from '@/lib/calc';
import { DEFAULT_COVERAGE_M2_PER_LITER, DEFAULT_CONTAINER_SIZES_LITERS } from '@/lib/calc';
import type { CalculatorInput } from '@/types';

const trustPoints = [
  'No sign-up required',
  'Real Nigerian prices',
  'Mobile-friendly',
];

/**
 * Interactive estimate preview — uses the REAL calculation engine.
 * Shows a sample painting estimate for a 12×12 ft room with 2 coats.
 * Values are computed live from calculatePaint(), not hardcoded.
 */
function EstimatePreview() {
  const [animatedLiters, setAnimatedLiters] = useState(0);
  const [animatedArea, setAnimatedArea] = useState(0);

  // Real calculation for a 12×12 ft room, 2 coats, 1 door, 2 windows
  const result = useMemo(() => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 12,
      width: 12,
      wallHeight: 10,
      doors: 1,
      doorDims: { width: 0.8, height: 2.4 },
      windows: 2,
      windowDims: { width: 1.2, height: 1.2 },
      coats: 2,
      paintType: 'premium-emulsion',
      unit: 'feet',
      includeCeiling: false,
      wasteMargin: 10,
    };
    return calculatePaint(input, {
      coverageRate: DEFAULT_COVERAGE_M2_PER_LITER,
      containerSizes: DEFAULT_CONTAINER_SIZES_LITERS,
    });
  }, []);

  // Animate the numbers on mount
  useEffect(() => {
    const duration = 1200;
    const start = performance.now();

    function frame(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setAnimatedLiters(result.totalRecommendedLiters * eased);
      setAnimatedArea(result.paintableArea * eased);
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }, [result.totalRecommendedLiters, result.paintableArea]);

  const totalBuckets = result.recommendedContainers.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="relative mx-auto max-w-md">
      {/* Main estimate card — like a premium dashboard window */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-brand-navy-mid/80 shadow-premium-lg backdrop-blur-xl">
        {/* Window header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Painting Estimate</span>
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Room info row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-white/40">
              <Ruler className="h-3.5 w-3.5" />
              Room
            </div>
            <span className="font-semibold text-white/80">12 × 12 ft</span>
          </div>

          {/* Coats */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-white/40">
              <Layers className="h-3.5 w-3.5" />
              Coats
            </div>
            <span className="font-semibold text-white/80">2 coats</span>
          </div>

          {/* Paintable area — metric cards */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Paintable area</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-white">
                {animatedArea.toFixed(1)}<span className="text-sm font-normal text-white/40"> m²</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Paint needed</p>
              <p className="mt-1.5 font-display text-2xl font-bold text-white">
                {animatedLiters.toFixed(1)}<span className="text-sm font-normal text-white/40"> L</span>
              </p>
            </div>
          </div>

          {/* Containers recommendation */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-brand-purple-light" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Recommended</span>
              </div>
              <span className="text-xs font-bold text-white/80">
                {totalBuckets} {totalBuckets === 1 ? 'bucket' : 'buckets'}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {result.recommendedContainers.map((c) => (
                <div key={c.size} className="flex items-center justify-between text-xs">
                  <span className="text-white/50">{c.size}L container</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold text-white/80">×{c.count}</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: c.count }).map((_, i) => (
                        <div
                          key={i}
                          className="h-6 w-3 rounded-sm bg-gradient-to-b from-brand-purple-light to-brand-purple"
                          style={{ opacity: 0.6 + i * 0.1 }}
                        />
                      ))}
                    </div>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Materials note */}
          <div className="flex items-start gap-2 rounded-lg bg-brand-purple/8 px-3.5 py-2.5">
            <Calculator className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-purple-light" />
            <p className="text-[11px] leading-relaxed text-white/50">
              Materials, primer, and labour costs are calculated separately in the full cost estimator.
            </p>
          </div>
        </div>
      </div>

      {/* Floating swatch card */}
      <div className="absolute -bottom-6 -left-6 w-52 rounded-xl bg-white p-4 shadow-premium-lg animate-float-smooth dark:bg-brand-navy-mid dark:border dark:border-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-white/30">
          Suggested palette
        </p>
        <div className="mt-2.5 flex gap-1.5">
          <div className="h-12 flex-1 rounded-lg ring-1 ring-black/5 transition-transform hover:scale-105" style={{ background: '#F5F1E8' }} />
          <div className="h-12 flex-1 rounded-lg ring-1 ring-black/5 transition-transform hover:scale-105" style={{ background: '#D9D2C5' }} />
          <div className="h-12 flex-1 rounded-lg ring-1 ring-black/5 transition-transform hover:scale-105" style={{ background: '#7B9EA8' }} />
        </div>
        <p className="mt-2.5 text-xs font-semibold text-neutral-700 dark:text-white/80">Serene Living</p>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <div data-tour="hero" className="contents">
      <section className="relative overflow-hidden bg-mesh-animated text-white bg-noise">
        {/* Grid pattern */}
        <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" aria-hidden="true" />

        {/* Ambient glows — layered for depth */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-purple/20 blur-[160px] animate-gradient-pulse" />
          <div className="absolute -right-32 top-1/4 h-72 w-72 rounded-full bg-accent-cyan/8 blur-[120px]" />
          <div className="absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-brand-purple-deep/15 blur-[120px]" />
        </div>

        {/* Top border line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden="true" />

        <Container className="relative grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-2 lg:gap-20 lg:py-32">
          {/* Left: Content */}
          <div className="animate-fade-in-up">
            {/* Eyebrow badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md">
              <MapPin className="h-3 w-3 text-brand-purple-light" />
              Built for Nigerian construction projects
            </span>

            {/* Headline */}
            <h1 className="mt-7 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem] text-balance">
              Know exactly what materials your project needs
            </h1>

            {/* Subheadline */}
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/55 text-balance">
              FRELUX calculates materials and project costs using practical Nigerian construction and finishing measurements, real product sizes, and configurable market prices.
            </p>

            {/* Primary CTAs */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/paint-calculator"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-purple px-7 py-4 text-base font-semibold text-white shadow-lg shadow-brand-purple/25 transition-all hover:bg-brand-purple-dark hover:shadow-xl hover:shadow-brand-purple/30 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <Calculator className="h-5 w-5" />
                Start Calculating
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/cost-estimator"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/10 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <Calculator className="h-4 w-4" />
                Explore Calculators
              </Link>
            </div>

            {/* Trust points */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
              {trustPoints.map((point) => (
                <span key={point} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/40">
                  <Check className="h-3.5 w-3.5 text-accent-green" />
                  {point}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Interactive estimate preview */}
          <div className="relative hidden lg:block animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <EstimatePreview />
          </div>
        </Container>

        {/* Bottom fade transition */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white dark:to-brand-navy" aria-hidden="true" />
      </section>
    </div>
  );
}
