import { Link } from 'react-router-dom';
import { Building2, Camera, ArrowRight } from 'lucide-react';

/**
 * Cross-links to Build-to-Roof Estimator and AI Photo Estimator.
 * Shown at the bottom of every calculator and estimator page for
 * internal linking and user discovery.
 */
export default function RelatedToolsLinks({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          to="/build-to-roof-estimator"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:border-brand-purple/30 hover:text-brand-purple dark:border-white/10 dark:text-neutral-300"
        >
          <Building2 className="h-3.5 w-3.5" />
          Build-to-Roof Estimator
        </Link>
        <Link
          to="/image-estimator"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:border-brand-purple/30 hover:text-brand-purple dark:border-white/10 dark:text-neutral-300"
        >
          <Camera className="h-3.5 w-3.5" />
          AI Photo Estimator
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      <Link
        to="/build-to-roof-estimator"
        className="group flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/10 dark:bg-brand-navy-mid"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-neutral-900 dark:text-white">Build-to-Roof Estimator</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Estimate a full building project from foundation to roof.</p>
        </div>
        <ArrowRight className="h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-purple" />
      </Link>

      <Link
        to="/image-estimator"
        className="group flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-accent-green/30 hover:shadow-md dark:border-white/10 dark:bg-brand-navy-mid"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-green/10 text-accent-green">
          <Camera className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-neutral-900 dark:text-white">AI Photo Estimator</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Upload a photo and get an AI-powered estimate.</p>
        </div>
        <ArrowRight className="h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-green" />
      </Link>
    </div>
  );
}
