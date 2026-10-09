import { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { DbTestimonial } from "@/types/database";

/**
 * Social proof for the homepage trust layer (Phase 11).
 *
 * Renders nothing at all while there are no active testimonials, so the
 * section never ships fake quotes or an empty placeholder. The table is
 * populated by the admin team with REAL user quotes only; there is no
 * generated or seeded content.
 */
export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<DbTestimonial[] | null>(
    null,
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("site_testimonials")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(6);
      if (!cancelled) setTestimonials((data ?? []) as DbTestimonial[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Loading or empty: render nothing rather than a dead section.
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Quote className="h-4 w-4 text-brand-purple" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground dark:text-primary-foreground sm:text-3xl">
          What our users say
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground dark:text-muted-foreground">
          Real feedback from homeowners and professionals who plan with FRELUX
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t) => (
          <figure
            key={t.id}
            className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm dark:border-white/5 dark:bg-card"
          >
            <Quote
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-brand-purple/60"
            />
            <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground dark:text-primary-foreground">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-5 border-t border-border/60 pt-4 dark:border-white/5">
              <span className="block text-sm font-semibold text-foreground dark:text-primary-foreground">
                {t.author_name}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground dark:text-muted-foreground">
                {[t.author_role, t.author_location].filter(Boolean).join(" · ")}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
