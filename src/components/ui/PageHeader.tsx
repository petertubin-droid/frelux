import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ReactNode } from 'react';

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  backTo,
  backLabel,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        {backTo && (
          <Link
            to={backTo}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-brand-purple"
          >
            <ChevronLeft className="h-4 w-4" />
            {backLabel ?? 'Back'}
          </Link>
        )}
        {eyebrow && <p className="section-label mb-2">{eyebrow}</p>}
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl text-balance">
          {title}
        </h1>
        {subtitle && <p className="mt-3 max-w-2xl text-base text-neutral-500 text-balance">{subtitle}</p>}
      </div>
    </div>
  );
}
