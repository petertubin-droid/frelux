import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  Bookmark,
  Lightbulb,
  Calculator,
  ArrowRight,
  TrendingUp,
  Gem,
  FolderOpen,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import ColorSwatch from "@/components/ui/ColorSwatch";
import {
  fetchUserProjects,
  fetchFavoriteColors,
  fetchRecentlyViewedColors,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import type { DbUserProject, DbPaintColor } from "@/types/database";

const PROJECT_ROUTES: Record<string, string> = {
  screeding: "/screeding-calculator",
  paint_calc: "/paint-calculator",
  cost_estimate: "/paint-calculator?mode=cost",
  ai_recommendation: "/ai-color-assistant",
  custom: "/paint-calculator",
  pop_ceiling: "/pop-ceiling-calculator",
  pop_estimate: "/pop-ceiling-calculator?mode=cost",
  tile: "/tile-calculator",
  tile_estimate: "/tile-calculator?mode=cost",
};

const QUICK_ACTIONS = [
  {
    to: "/paint-calculator",
    label: "Paint Calc",
    icon: Calculator,
    color: "text-brand-purple bg-primary/8",
  },
  {
    to: "/paint-calculator?mode=cost",
    label: "Cost Est",
    icon: TrendingUp,
    color: "text-accent-green bg-accent-green/8",
  },
  {
    to: "/ai-color-assistant",
    label: "AI Color",
    icon: Gem,
    color: "text-accent-orange bg-accent-orange/8",
  },
  {
    to: "/colors",
    label: "Colors",
    icon: Bookmark,
    color: "text-rose-400 bg-rose-400/8",
  },
];

export default function Dashboard() {
  useSeo({
    title: "Dashboard — FRELUX PAINT CALC",
    description:
      "Your personal dashboard with recent projects, saved estimates, favorite colors, and AI recommendations.",
    canonicalPath: "/dashboard",
    noIndex: true,
  });

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<DbUserProject[]>([]);
  const [favColors, setFavColors] = useState<DbPaintColor[]>([]);
  const [recentColors, setRecentColors] = useState<DbPaintColor[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    const [projRes, favRes, recentRes] = await Promise.all([
      fetchUserProjects(),
      fetchFavoriteColors(),
      fetchRecentlyViewedColors(8),
    ]);
    setProjects(projRes.data);
    setFavColors(favRes.data);
    setRecentColors(recentRes.data);
    setLoading(false);
  }

  if (!user) {
    return (
      <>
        <PageHeader
          eyebrow="Personal workspace"
          title="Dashboard"
          subtitle="Sign in to access your personal dashboard with recent projects, saved estimates, and favorite colors."
        />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <EmptyState
            illustration="projects"
            title="Sign in to view your dashboard"
            description="Track your projects, save calculations, and get personalized AI color recommendations."
            actionLabel="Sign in"
            actionTo="/login?redirect=/dashboard"
            secondaryLabel="Browse colors"
            secondaryTo="/colors"
          />
        </div>
      </>
    );
  }

  const lastProject = projects[0];

  return (
    <>
      <PageHeader
        eyebrow="Personal workspace"
        title="Dashboard"
        subtitle="Pick up where you left off and explore your saved work."
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-in-up">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-brand-purple/20 hover:shadow-sm dark:border-white/5 dark:bg-card"
                >
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${a.color} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <a.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                    {a.label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Continue Last Project */}
            {lastProject && (
              <section className="relative overflow-hidden rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-card p-6 dark:from-primary/10 dark:to-card animate-fade-in-up">
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl"
                  aria-hidden="true"
                />
                <div className="relative flex items-center gap-2 text-sm font-semibold text-brand-purple">
                  <Clock className="h-4 w-4" /> Continue where you left off
                </div>
                <div className="relative mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground dark:text-primary-foreground">
                      {lastProject.name}
                    </h3>
                    {lastProject.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {lastProject.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated{" "}
                      {new Date(lastProject.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={
                      PROJECT_ROUTES[lastProject.project_type] ??
                      "/paint-calculator"
                    }
                    state={{
                      projectData: lastProject.project_data,
                      projectId: lastProject.id,
                      projectName: lastProject.name,
                    }}
                    className="btn-primary press-scale shrink-0"
                  >
                    Open Project{" "}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            )}

            {/* Recent Calculations */}
            <section
              className="animate-fade-in-up"
              style={{ animationDelay: "0.05s" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground dark:text-primary-foreground">
                  <Calculator className="h-5 w-5 text-brand-purple" /> Recent
                  Calculations
                </h2>
                <Link
                  to="/my-projects"
                  className="group text-sm font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
                >
                  View all
                  <ArrowRight
                    aria-hidden="true"
                    className="ml-0.5 inline h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
              {projects.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.slice(0, 6).map((p, i) => (
                    <Link
                      key={p.id}
                      to={PROJECT_ROUTES[p.project_type] ?? "/paint-calculator"}
                      state={{
                        projectData: p.project_data,
                        projectId: p.id,
                        projectName: p.name,
                      }}
                      className="card-hover group rounded-xl border border-border bg-card p-4 dark:border-white/5 dark:bg-card animate-fade-in-up"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <div className="flex items-start justify-between">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8 text-brand-purple">
                          <FolderOpen className="h-4 w-4" />
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-bold text-foreground dark:text-primary-foreground group-hover:text-brand-purple dark:group-hover:text-brand-purple-lighter transition-colors">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {p.description}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  illustration="projects"
                  title="No saved calculations yet"
                  description="Use any calculator and save your results to see them here."
                  actionLabel="Start calculating"
                  actionTo="/paint-calculator"
                />
              )}
            </section>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Favorite Colors */}
              <section
                className="animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-foreground dark:text-primary-foreground">
                    <Bookmark className="h-5 w-5 text-rose-400" /> Favorite
                    Colors
                  </h2>
                  <Link
                    to="/my-projects"
                    className="group text-sm font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
                  >
                    View all
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-0.5 inline h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>
                {favColors.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {favColors.slice(0, 6).map((c) => (
                      <Link
                        key={c.id}
                        to={`/colors/paint/${c.slug}`}
                        className="card-hover flex items-center gap-2 rounded-xl border border-border bg-card p-3 dark:border-white/5 dark:bg-card"
                      >
                        <ColorSwatch hex={c.hex_code} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground dark:text-primary-foreground">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.hex_code}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    illustration="favorites"
                    title="No favorites yet"
                    description="Tap the heart on any color to save it."
                    actionLabel="Browse colors"
                    actionTo="/colors"
                  />
                )}
              </section>

              {/* Recently Viewed */}
              <section
                className="animate-fade-in-up"
                style={{ animationDelay: "0.15s" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-foreground dark:text-primary-foreground">
                    <Clock className="h-5 w-5 text-muted-foreground" /> Recently
                    Viewed
                  </h2>
                  <Link
                    to="/my-projects"
                    className="group text-sm font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
                  >
                    View all
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-0.5 inline h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>
                {recentColors.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {recentColors.slice(0, 6).map((c) => (
                      <Link
                        key={c.id}
                        to={`/colors/paint/${c.slug}`}
                        className="card-hover flex items-center gap-2 rounded-xl border border-border bg-card p-3 dark:border-white/5 dark:bg-card"
                      >
                        <ColorSwatch hex={c.hex_code} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground dark:text-primary-foreground">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.hex_code}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    illustration="generic"
                    title="No recently viewed colors"
                    description="Colors you browse will appear here for quick access."
                    actionLabel="Browse colors"
                    actionTo="/colors"
                  />
                )}
              </section>
            </div>

            {/* AI Suggestion */}
            <section
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-muted/50 to-card p-6 dark:border-white/5 dark:from-card dark:to-card animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-orange/5 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative flex items-center gap-2 text-sm font-semibold text-accent-orange">
                <Lightbulb className="h-4 w-4" /> AI Suggestion
              </div>
              <p className="relative mt-3 text-sm text-muted-foreground dark:text-muted-foreground/80">
                Try the Smart Color Assistant to get personalized color
                recommendations based on your room type, lighting, and style
                preferences.
              </p>
              <Link
                to="/ai-color-assistant"
                className="group relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
              >
                Get recommendations
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
