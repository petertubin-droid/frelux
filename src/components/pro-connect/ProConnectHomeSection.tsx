import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Briefcase, Search } from 'lucide-react';
import { fetchCategories } from '@/lib/pro-connect';
import type { DbProCategory } from '@/types/pro-connect';

// Category icon mapping using lucide names from DB
const categoryIconMap: Record<string, string> = {
  'painters': '🎨',
  'tilers': '🟦',
  'wall-screeders': '📏',
  'pop-installers': '🏠',
  'building-contractors': '🏗️',
  'civil-engineers': '📐',
  'architects': '✏️',
  'quantity-surveyors': '📊',
  'interior-decorators': '🛋️',
  'plumbers': '🔧',
  'electricians': '⚡',
  'carpenters': '🔨',
  'aluminium-glass-installers': '🪟',
  'other-construction-professionals': '👷',
};

export default function ProConnectHomeSection() {
  const [categories, setCategories] = useState<DbProCategory[]>([]);

const mountedRef = useRef(true);
    useEffect(() => {
    (async () => {
      const cats = await fetchCategories();
      // Guard: fetchCategories can resolve null (e.g. DB unavailable)
      if (Array.isArray(cats)) setCategories(cats.slice(0, 8));
    })();
  
    return () => { mountedRef.current = false; };
  }, []);

  return (
    <section className="bg-card py-16 dark:bg-background sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-brand-purple dark:text-brand-purple-lighter">
            <Users aria-hidden="true" className="h-3.5 w-3.5" />
            FRELUX Pro Connect
          </div>
          <h2 className="text-2xl font-bold text-foreground dark:text-primary-foreground sm:text-3xl">
            Find the Right Professional for Your Project
          </h2>
          <p className="mt-3 text-sm text-muted-foreground dark:text-muted-foreground sm:text-base">
            Connect with painters, tilers, contractors, engineers, screeders, POP installers and other construction professionals based on your project needs and location.
          </p>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/pro-connect"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
          >
            <Search aria-hidden="true" className="h-4 w-4" />
            Find a Professional
          </Link>
          <Link
            to="/pro-connect/register"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-card-foreground transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground/60 dark:hover:border-brand-purple-lighter dark:hover:text-brand-purple-lighter sm:w-auto"
          >
            <Briefcase aria-hidden="true" className="h-4 w-4" />
            Join as a Pro Worker
          </Link>
        </div>

        {/* Category cards */}
        {categories.length > 0 && (
          <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/pro-connect?category=${cat.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-card dark:hover:border-brand-purple-lighter/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-lg">
                  {categoryIconMap[cat.slug] || '🔧'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground dark:text-primary-foreground group-hover:text-brand-purple dark:group-hover:text-brand-purple-lighter">
                    {cat.name}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Browse {cat.name.toLowerCase()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Explore all link */}
        <div className="mt-8 text-center">
          <Link
            to="/pro-connect"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-purple hover:text-brand-purple-dark dark:text-brand-purple-lighter"
          >
            Explore All Professionals
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
