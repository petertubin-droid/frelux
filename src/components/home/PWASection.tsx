import { Link } from 'react-router-dom';
import { Smartphone, Download, Wifi, ArrowRight, Calculator as CalcIcon, Layers, Grid3x3, Square } from 'lucide-react';
import Container from '@/components/ui/Container';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function PWASection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="relative overflow-hidden bg-background py-20 text-primary-foreground sm:py-24 bg-noise">
      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-30" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/3 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px] animate-gradient-pulse" aria-hidden="true" />

      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left: Content */}
          <div
            className="order-2 lg:order-1"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-primary-foreground/70 backdrop-blur-md">
              <Smartphone className="h-3 w-3 text-brand-purple-light" />
              Mobile-first & PWA
            </span>

            <h2 className="mt-6 font-display text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl text-balance">
              Your calculators,{' '}
              <span className="text-gradient-premium">right in your pocket</span>
            </h2>

            <p className="mt-5 max-w-md text-lg leading-relaxed text-primary-foreground/55 text-balance">
              Access every FRELUX calculator from your phone, on site, in the store, wherever you are. Install it as an app on supported devices.
            </p>

            {/* Feature list */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                  <Download className="h-4 w-4 text-brand-purple-light" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-primary-foreground">Installable as a PWA</p>
                  <p className="text-xs text-primary-foreground/45">Add to your home screen, no app store needed</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                  <Wifi className="h-4 w-4 text-brand-purple-light" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-primary-foreground">Works offline</p>
                  <p className="text-xs text-primary-foreground/45">Saved estimates and recent calculations are available without internet</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                  <Smartphone className="h-4 w-4 text-brand-purple-light" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-primary-foreground">Optimized for small screens</p>
                  <p className="text-xs text-primary-foreground/45">Clean, readable interface that works on any Android or iOS device</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                to="/paint-calculator?mode=room-estimate"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-brand-purple/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Try on your phone
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Right: Phone mockup */}
          <div
            ref={ref}
            className="relative order-1 mx-auto lg:order-2"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="relative mx-auto w-[260px]">
              {/* Phone frame */}
              <div className="relative overflow-hidden rounded-[2.5rem] border-[10px] border-border bg-card shadow-premium-lg dark:border-border border-border">
                {/* Notch */}
                <div className="absolute left-1/2 top-0 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-card-foreground/90 dark:bg-card-foreground/80" />

                {/* Screen content */}
                <div className="h-[480px] overflow-y-auto p-4 pt-8 scrollbar-hide">
                  {/* App header */}
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-primary-foreground">FRELUX</span>
                    <span className="text-[10px] text-primary-foreground/40">Paint Calculator</span>
                  </div>

                  {/* Mini calculator card */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-brand-purple-light">
                        <CalcIcon className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-semibold text-primary-foreground">Paint Calculator</span>
                    </div>

                    {/* Mini input fields */}
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1 rounded-lg bg-white/5 px-3 py-2">
                          <p className="text-[9px] text-primary-foreground/30">Length</p>
                          <p className="text-xs font-bold text-primary-foreground">12 ft</p>
                        </div>
                        <div className="flex-1 rounded-lg bg-white/5 px-3 py-2">
                          <p className="text-[9px] text-primary-foreground/30">Width</p>
                          <p className="text-xs font-bold text-primary-foreground">12 ft</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 rounded-lg bg-white/5 px-3 py-2">
                          <p className="text-[9px] text-primary-foreground/30">Height</p>
                          <p className="text-xs font-bold text-primary-foreground">10 ft</p>
                        </div>
                        <div className="flex-1 rounded-lg bg-primary/10 px-3 py-2">
                          <p className="text-[9px] text-brand-purple-light/50">Coats</p>
                          <p className="text-xs font-bold text-brand-purple-light">2</p>
                        </div>
                      </div>
                    </div>

                    {/* Result */}
                    <div className="mt-3 rounded-lg bg-primary/10 p-3">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-brand-purple-light/60">Paint needed</p>
                      <p className="font-display text-xl font-bold text-primary-foreground">14 L</p>
                      <p className="text-[10px] text-primary-foreground/40">2 buckets · 38 m²</p>
                    </div>
                  </div>

                  {/* Other calculators */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-center">
                      <Square className="mx-auto h-4 w-4 text-accent-cyan" />
                      <p className="mt-1 text-[9px] text-primary-foreground/50">Screeding</p>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-center">
                      <Layers className="mx-auto h-4 w-4 text-brand-purple-light" />
                      <p className="mt-1 text-[9px] text-primary-foreground/50">POP</p>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-center">
                      <Grid3x3 className="mx-auto h-4 w-4 text-accent-cyan" />
                      <p className="mt-1 text-[9px] text-primary-foreground/50">Tiles</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating notification */}
              <div className="absolute -right-8 top-20 rounded-xl bg-card p-3 shadow-premium-lg animate-float-smooth dark:bg-card dark:border dark:border-white/10" style={{ width: '180px' }}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-brand-purple">
                    <Download className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-foreground dark:text-primary-foreground">Install FRELUX</p>
                    <p className="text-[9px] text-muted-foreground dark:text-primary-foreground/40">Add to home screen</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
