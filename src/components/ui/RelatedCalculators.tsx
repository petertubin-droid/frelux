import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface RelatedLink {
  label: string;
  description: string;
  to: string;
}

export default function RelatedCalculators({ links, title = 'Related Calculators' }: { links: RelatedLink[]; title?: string }) {
  if (!links.length) return null;

  return (
    <section className="mt-12 border-t border-border/60 pt-8 dark:border-white/5">
      <h2 className="mb-4 font-display text-lg font-bold text-foreground dark:text-primary-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group flex flex-col rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-brand-purple/20 hover:shadow-sm dark:border-white/5 dark:bg-card dark:hover:border-brand-purple/30"
          >
            <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">{link.label}</p>
            <p className="mt-1 flex-1 text-xs text-muted-foreground dark:text-muted-foreground">{link.description}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-purple dark:text-brand-purple-lighter">
              Open
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
