import { Link } from 'react-router-dom';
import { Layers, Calculator, DollarSign, Palette, ArrowRight, Check, Sparkles } from 'lucide-react';
import Container from '@/components/ui/Container';

const heroSteps = [
  { icon: Layers, label: 'Screeding', to: '/screeding-calculator' },
  { icon: Calculator, label: 'Paint', to: '/paint-calculator' },
  { icon: DollarSign, label: 'Cost', to: '/cost-estimator' },
  { icon: Palette, label: 'Colors', to: '/ai-color-assistant' },
];

const trustPoints = [
  'No sign-up required',
  'Real product prices',
  'Mobile-friendly',
];

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

      <Container className="relative grid items-center gap-12 py-24 sm:py-28 lg:grid-cols-2 lg:gap-20 lg:py-36">
        {/* Left: Content */}
        <div className="animate-fade-in-up">
          {/* Eyebrow badge — premium */}
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-brand-purple-light" />
            Plan. Estimate. Discover.
          </span>

          {/* Headline */}
          <h1 className="mt-7 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.75rem] text-balance">
            Plan Your Perfect{' '}
            <span className="relative inline-block">
              <span className="text-gradient-premium">
                Paint Project
              </span>
              <span className="absolute -bottom-1 left-0 h-[2px] w-full bg-gradient-to-r from-brand-purple-light/0 via-brand-purple-light/60 to-brand-purple-light/0" />
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/55 text-balance">
            Measure your walls, calculate screeding and paint needs, estimate costs, and discover colors that transform your space, all in one place.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to="/screeding-calculator"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-purple px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition-all hover:bg-brand-purple-dark hover:shadow-xl hover:shadow-brand-purple/30 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Layers className="h-4 w-4" />
              Start with Screeding
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/paint-calculator"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/8 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/12 hover:-translate-y-0.5 active:scale-[0.98] border border-white/10"
            >
              <Calculator className="h-4 w-4" />
              Paint Calculator
            </Link>
            <Link
              to="/ai-color-assistant" data-tour="ai"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white/80 transition-all hover:text-white hover:bg-white/5 active:scale-[0.98]"
            >
              <Palette className="h-4 w-4" />
              Smart Color Assistant
              <ArrowRight className="h-4 w-4" />
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

          {/* Workflow steps */}
          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/25">Complete workflow</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {heroSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex items-center gap-2">
                    <Link
                      to={step.to}
                      className="group inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-white/60 transition-all hover:border-white/15 hover:text-white hover:bg-white/5 hover:-translate-y-0.5"
                    >
                      <span className="text-white/20">{i + 1}</span>
                      <Icon className="h-3.5 w-3.5 transition-colors group-hover:text-brand-purple-light" />
                      {step.label}
                    </Link>
                    {i < heroSteps.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-white/15" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Visual composition */}
        <div className="relative hidden lg:block animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="relative mx-auto max-w-md">
            {/* Main image with premium ring and shadow */}
            <div className="relative overflow-hidden rounded-2xl shadow-premium-lg ring-1 ring-white/10">
              <img
                src="https://images.pexels.com/photos/6474471/pexels-photo-6474471.jpeg?auto=compress&cs=tinysrgb&w=900"
                alt="Painter rolling fresh color onto a wall"
                className="aspect-[4/5] w-full object-cover"
                loading="eager"
              />
              {/* Gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/50 via-transparent to-transparent" />
            </div>

            {/* Floating swatch card */}
            <div className="absolute -bottom-6 -left-6 w-52 rounded-xl bg-white p-4 shadow-premium-lg animate-float-smooth">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Suggested palette
              </p>
              <div className="mt-2.5 flex gap-1.5">
                <div className="h-12 flex-1 rounded-lg ring-1 ring-black/5 transition-transform hover:scale-105" style={{ background: '#F5F1E8' }} />
                <div className="h-12 flex-1 rounded-lg ring-1 ring-black/5 transition-transform hover:scale-105" style={{ background: '#D9D2C5' }} />
                <div className="h-12 flex-1 rounded-lg ring-1 ring-black/5 transition-transform hover:scale-105" style={{ background: '#7B9EA8' }} />
              </div>
              <p className="mt-2.5 text-xs font-semibold text-neutral-700">Serene Living</p>
            </div>

            {/* Floating estimate chip */}
            <div className="absolute -right-5 top-8 rounded-xl bg-white px-4 py-3.5 shadow-premium-lg animate-float-smooth" style={{ animationDelay: '3s' }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Paint needed
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-neutral-900">14 L</p>
              <p className="text-[11px] text-neutral-500">2 coats, 38 m²</p>
            </div>

            {/* Floating accuracy badge with pulse ring */}
            <div className="absolute -top-4 right-12 rounded-xl bg-brand-purple px-3.5 py-2.5 shadow-lg shadow-brand-purple/30 animate-pulse-ring">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">Accuracy</p>
              <p className="font-display text-sm font-bold text-white">98.4%</p>
            </div>
          </div>
        </div>
      </Container>

      {/* Bottom fade transition */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white dark:to-brand-navy" aria-hidden="true" />
    </section>
    </div>
  );
}
