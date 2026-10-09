import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { type ReactNode } from "react";
import HeroTitle from "./HeroTitle";

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  backTo,
  backLabel,
  actions,
  breadcrumbs,
  image,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
  breadcrumbs?: { label: string; path?: string }[];
  /** Optional blended photo behind the header. Same fade-to-surface
   *  technique as the homepage hero: the picture sits under the mesh
   *  and dissolves into the page background so there is no seam. */
  image?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${
        image
          ? "bg-background"
          : "border-b border-border/80 bg-card dark:border-white/5 dark:bg-card"
      }`}
    >
      {/* Blended photo band: decorative, faded into the page surface so
          the transition below the header is invisible. */}
      {image && (
        <>
          <img
            src={image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 dark:opacity-20"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/25 via-background/55 to-background"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-background/50"
            aria-hidden="true"
          />
        </>
      )}
      {/* Premium gradient mesh background */}
      <div
        className="calc-header-mesh pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      {/* Ambient accent orbs - slowly drifting so the header feels alive
          without pulling attention from the content. */}
      <div
        className="calc-orb animate-float-slow pointer-events-none absolute -right-20 -top-10 h-48 w-48 rounded-full bg-primary/8 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="animate-float-slower pointer-events-none absolute -left-24 top-8 h-40 w-40 rounded-full bg-accent-cyan/10 blur-3xl dark:bg-accent-cyan/8"
        aria-hidden="true"
      />

      {/* Top accent line: a static hairline with a slow light sweep
          travelling along it, like light running along the edge of glass */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="hero-shimmer-line absolute inset-0" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {backTo && (
          <Link
            to={backTo}
            className="group mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-purple dark:text-muted-foreground dark:hover:text-brand-purple-lighter"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {backLabel ?? "Back"}
          </Link>
        )}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className="text-muted-foreground/80 dark:text-muted-foreground">
                    /
                  </span>
                )}
                {crumb.path ? (
                  <Link
                    to={crumb.path}
                    className="transition-colors hover:text-brand-purple dark:hover:text-brand-purple-lighter"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/80">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && (
          <p className="section-label mb-3 animate-fade-in-up">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {eyebrow}
          </p>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {/* Premium title: Clash Display with a staggered word reveal */}
            <HeroTitle
              className="text-3xl sm:text-4xl text-foreground dark:text-primary-foreground"
              title={title}
            />
            {/* Gradient underline, scaling in after the words settle */}
            <div
              className="mt-3 h-[3px] w-16 origin-left scale-x-0 animate-scale-in rounded-full bg-gradient-to-r from-brand-purple-light via-primary to-accent-cyan [animation-fill-mode:forwards] [animation-delay:400ms]"
              aria-hidden="true"
            />
            {subtitle && (
              <p
                className="mt-4 max-w-2xl animate-fade-in-up text-base text-muted-foreground text-balance dark:text-muted-foreground"
                style={{ animationDelay: "0.3s" }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div
              className="shrink-0 animate-fade-in-up"
              style={{ animationDelay: "0.45s" }}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
