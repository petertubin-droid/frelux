import { Link } from 'react-router-dom';
import { Building2, Camera, ArrowRight } from 'lucide-react';

export default function RelatedToolsLinks({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          to="/build-to-roof-estimator"
          className="related-tool-card inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
        >
          <Building2 className="h-3.5 w-3.5 text-brand-purple" />
          Build-to-Roof Estimator
        </Link>
        <Link
          to="/image-estimator"
          className="related-tool-card inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
        >
          <Camera className="h-3.5 w-3.5 text-accent-green" />
          AI Photo Estimator
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      <Link
        to="/build-to-roof-estimator"
        className="related-tool-card group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm dark:border-white/10 dark:bg-card"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-brand-purple transition-transform duration-300 group-hover:scale-110">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground dark:text-primary-foreground">Build-to-Roof Estimator</p>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground">Estimate a full building project from foundation to roof.</p>
        </div>
        <ArrowRight aria-hidden="true" className="h-4 w-4 text-muted-foreground/80 transition-transform group-hover:translate-x-1 group-hover:text-brand-purple" />
      </Link>

      <Link
        to="/image-estimator"
        className="related-tool-card group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm dark:border-white/10 dark:bg-card"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-green/10 text-accent-green transition-transform duration-300 group-hover:scale-110">
          <Camera className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground dark:text-primary-foreground">AI Photo Estimator</p>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground">Upload a photo and get an AI-powered estimate.</p>
        </div>
        <ArrowRight aria-hidden="true" className="h-4 w-4 text-muted-foreground/80 transition-transform group-hover:translate-x-1 group-hover:text-accent-green" />
      </Link>
    </div>
  );
}
