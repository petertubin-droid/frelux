import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface Crumb {
  label: string;
  path?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground dark:text-muted-foreground">
      <Link
        to="/"
        className="inline-flex items-center hover:text-brand-purple dark:hover:text-brand-purple-lighter transition-colors"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-muted-foreground/80 dark:text-muted-foreground" />
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className="hover:text-brand-purple dark:hover:text-brand-purple-lighter transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate text-card-foreground dark:text-muted-foreground/80" aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
