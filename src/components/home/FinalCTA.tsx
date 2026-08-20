import { Link } from 'react-router-dom';
import { Calculator, ArrowRight } from 'lucide-react';
import Container from '@/components/ui/Container';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function FinalCTA() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="relative overflow-hidden bg-mesh-animated text-white bg-noise">
      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" aria-hidden="true" />

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-purple/20 blur-[160px] animate-gradient-pulse" />
      </div>

      <div ref={ref} className="relative">
        <Container className="py-24 sm:py-32 text-center">
          <div
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-5xl text-balance">
              Know what you need{' '}
              <span className="text-gradient-premium">before you buy</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-white/55 text-balance">
              Stop guessing. Start calculating. Get accurate material quantities and cost estimates for your next construction project.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:flex-wrap">
              <Link
                to="/paint-calculator"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-purple px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand-purple/25 transition-all hover:bg-brand-purple-dark hover:shadow-xl hover:shadow-brand-purple/30 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <Calculator className="h-5 w-5" />
                Start Calculating
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/cost-estimator"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/10 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Estimate Cost
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}
