import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 py-24 text-center sm:py-32">
      {/* Subtle grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-grid dark:opacity-20" aria-hidden="true" />
      {/* Soft glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-purple/8 blur-[100px]" aria-hidden="true" />

      <div className="relative animate-fade-in-up">
        <p className="font-display text-7xl font-bold text-gradient sm:text-8xl">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-neutral-900 dark:text-white">Page not found</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link to="/" className="btn-primary">
            <Home className="h-4 w-4" />
            Back to home
          </Link>
          <Link to="/painting-estimator" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Try the calculator
          </Link>
        </div>
      </div>
    </div>
  );
}
