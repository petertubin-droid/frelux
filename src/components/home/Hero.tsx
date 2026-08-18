import { Link } from 'react-router-dom';
import { Layers, Calculator, DollarSign, Palette, ArrowRight, Check } from 'lucide-react';
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
    <section className="relative overflow-hidden bg-brand-navy text-white">
      {/* Grid pattern background */}
      <div className="pointer-events-none absolute inset-0 bg-grid-dark" aria-hidden="true" />
      {/* Radial gradient glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-brand-purple/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-72 w-72 rounded-full bg-accent-cyan/10 blur-[100px]" />
      </div>
      {/* Bottom fade to nav */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden="true" />

      <Container className="relative grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-2 lg:gap-16 lg:py-32">
        {/* Left: Content */}
        <div className="animate-fade-in-up">
          {/* Eyebrow badge */}
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
            <span className="flex h-1.5 w-1.5 rounded-full bg-accent-green" />
            Plan. Estimate. Discover.
          </span>

          {/* Headline */}
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl text-balance">
            Plan Your Perfect{' '}
            <span className="text-gradient bg-gradient-to-r from-brand-purple-light via-white to-brand-purple-light">
              Paint Project
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/60 text-balance">
            Measure your walls, calculate screeding and paint needs, estimate costs, and discover colors that transform your space — all in one place.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to="/screeding-calculator"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-purple px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition-all hover:bg-brand-purple-light hover:shadow-xl hover:shadow-brand-purple/30 active:scale-[0.98]"
            >
              <Layers className="h-4 w-4" />
              Start with Screeding
            </Link>
            <Link
              to="/paint-calculator"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15 active:scale-[0.98]"
            >
              <Calculator className="h-4 w-4" />
              Paint Calculator
            </Link>
            <Link
              to="/ai-color-assistant"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              <Palette className="h-4 w-4" />
              Smart Color Assistant
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Trust points */}
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
            {trustPoints.map((point) => (
              <span key={point} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50">
                <Check className="h-3.5 w-3.5 text-accent-green" />
                {point}
              </span>
            ))}
          </div>

          {/* Workflow steps */}
          <div className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/30">Complete workflow</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {heroSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex items-center gap-2">
                    <Link
                      to={step.to}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
                    >
                      <span className="text-white/30">{i + 1}</span>
                      <Icon className="h-3.5 w-3.5" />
                      {step.label}
                    </Link>
                    {i < heroSteps.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-white/20" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Visual composition */}
        <div className="relative hidden lg:block animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative mx-auto max-w-md">
            {/* Main image */}
            <div className="relative overflow-hidden rounded-2xl shadow-premium-lg ring-1 ring-white/10">
              <img
                src="https://images.pexels.com/photos/6438713/pexels-photo-6438713.jpeg?auto=compress&cs=tinysrgb&w=900"
                alt="Painter rolling fresh color onto a wall"
                className="aspect-[4/5] w-full object-cover"
                loading="eager"
              />
              {/* Gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/40 via-transparent to-transparent" />
            </div>

            {/* Floating swatch card */}
            <div className="absolute -bottom-6 -left-6 w-48 rounded-xl bg-white p-3.5 shadow-premium-lg">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Suggested palette
              </p>
              <div className="mt-2.5 flex gap-1.5">
                <div className="h-11 flex-1 rounded-md ring-1 ring-black/5" style={{ background: '#F5F1E8' }} />
                <div className="h-11 flex-1 rounded-md ring-1 ring-black/5" style={{ background: '#D9D2C5' }} />
                <div className="h-11 flex-1 rounded-md ring-1 ring-black/5" style={{ background: '#7B9EA8' }} />
              </div>
              <p className="mt-2.5 text-xs font-semibold text-neutral-700">Serene Living</p>
            </div>

            {/* Floating estimate chip */}
            <div className="absolute -right-5 top-8 rounded-xl bg-white px-4 py-3 shadow-premium-lg">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Paint needed
              </p>
              <p className="mt-1 font-display text-xl font-bold text-neutral-900">14 L</p>
              <p className="text-[11px] text-neutral-500">2 coats · 38 m²</p>
            </div>

            {/* Floating accuracy badge */}
            <div className="absolute -top-4 right-12 rounded-lg bg-brand-purple px-3 py-2 shadow-lg shadow-brand-purple/30">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Accuracy</p>
              <p className="font-display text-sm font-bold text-white">98.4%</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
