import { Link } from 'react-router-dom';
import { Layers, Calculator, DollarSign, Palette, ArrowRight } from 'lucide-react';
import Container from '@/components/ui/Container';

const heroSteps = [
  { icon: Layers, label: 'Screeding', to: '/screeding-calculator' },
  { icon: Calculator, label: 'Paint', to: '/paint-calculator' },
  { icon: DollarSign, label: 'Cost', to: '/cost-estimator' },
  { icon: Palette, label: 'Colors', to: '/ai-color-assistant' },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-navy text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-purple/40 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-brand-purple/20 blur-3xl" />
      </div>

      <Container className="relative grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
            Plan. Estimate. Discover.
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl text-balance">
            Plan Your Perfect Paint Project
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70 text-balance">
            Measure your walls, calculate screeding and paint needs, estimate costs, and discover colors that transform your space — all in one place.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to="/screeding-calculator"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-purple px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-purple-light active:scale-95"
            >
              <Layers className="h-4 w-4" />
              Start with Screeding
            </Link>
            <Link
              to="/paint-calculator"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/15 active:scale-95"
            >
              <Calculator className="h-4 w-4" />
              Paint Calculator
            </Link>
            <Link
              to="/ai-color-assistant"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-95"
            >
              <Palette className="h-4 w-4" />
              Smart Color Assistant
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Workflow steps */}
          <div className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Complete workflow</p>
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

        {/* Visual composition: layered color swatches + image */}
        <div className="relative hidden lg:block">
          <div className="relative mx-auto max-w-md">
            <img
              src="https://images.pexels.com/photos/6438713/pexels-photo-6438713.jpeg?auto=compress&cs=tinysrgb&w=900"
              alt="Painter rolling fresh color onto a wall"
              className="aspect-[4/5] w-full rounded-2xl object-cover shadow-2xl ring-1 ring-white/10"
              loading="eager"
            />
            {/* Floating swatch card */}
            <div className="absolute -bottom-6 -left-6 w-44 rounded-xl bg-white p-3 shadow-xl">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                Suggested palette
              </p>
              <div className="mt-2 flex gap-1.5">
                <div className="h-10 flex-1 rounded-md" style={{ background: '#F5F1E8' }} />
                <div className="h-10 flex-1 rounded-md" style={{ background: '#D9D2C5' }} />
                <div className="h-10 flex-1 rounded-md" style={{ background: '#7B9EA8' }} />
              </div>
              <p className="mt-2 text-xs font-medium text-neutral-700">Serene Living</p>
            </div>
            {/* Floating estimate chip */}
            <div className="absolute -right-5 top-8 rounded-xl bg-white px-4 py-3 shadow-xl">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                Paint needed
              </p>
              <p className="mt-1 text-xl font-bold text-brand-navy">14 L</p>
              <p className="text-[11px] text-neutral-500">2 coats · 38 m²</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
