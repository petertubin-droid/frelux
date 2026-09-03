import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search, Paintbrush, Grid3x3, BookOpen, Calculator } from 'lucide-react';
import { useSeo } from '@/lib/seo';
import Container from '@/components/ui/Container';

const suggestions = [
  { icon: Paintbrush, label: 'Paint Calculator', to: '/paint-calculator' },
  { icon: Grid3x3, label: 'Tile Calculator', to: '/tile-calculator' },
  { icon: Calculator, label: 'All Calculators', to: '/calculators' },
  { icon: BookOpen, label: 'Learn Hub', to: '/learn' },
];

export default function NotFound() {
  useSeo({
    title: 'Page Not Found — FRELUX PROJECT CALC',
    description: 'The page you are looking for could not be found. Browse our paint calculators, cost estimators, and AI color tools instead.',
    canonicalPath: '/404',
    noIndex: true,
  });

  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 py-24 text-center sm:py-32">
      {/* Subtle grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-grid dark:opacity-20" aria-hidden="true" />
      {/* Soft glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[100px]" aria-hidden="true" />

      <Container className="relative animate-fade-in-up">
        <div className="mx-auto max-w-lg">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-brand-purple">
            <Search className="h-7 w-7" />
          </div>
          <p className="font-display text-7xl font-bold text-gradient-purple sm:text-8xl">404</p>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground dark:text-primary-foreground">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
            The page you're looking for doesn't exist or may have moved.
          </p>

          {/* Suggested pages */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {suggestions.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.to}
                  to={s.to}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-card dark:hover:border-brand-purple/20"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-brand-purple transition-transform group-hover:scale-110">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/80">{s.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/" className="btn-primary group">
              <Home className="h-4 w-4" />
              Back to home
              <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
