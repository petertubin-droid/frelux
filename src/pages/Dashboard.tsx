import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Heart, Sparkles, Calculator, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import ColorSwatch from '@/components/ui/ColorSwatch';
import { fetchUserProjects, fetchFavoriteColors, fetchRecentlyViewedColors } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { useSeo } from '@/lib/seo';
import type { DbUserProject, DbPaintColor } from '@/types/database';

const PROJECT_ROUTES: Record<string, string> = {
  screeding: '/screeding-calculator',
  paint_calc: '/paint-calculator',
  cost_estimate: '/cost-estimator',
  ai_recommendation: '/ai-color-assistant',
  custom: '/paint-calculator',
  pop_ceiling: '/pop-ceiling-calculator',
  pop_estimate: '/pop-ceiling-cost-estimator',
  tile: '/tile-calculator',
  tile_estimate: '/tile-cost-estimator',
};

export default function Dashboard() {
  useSeo({
    title: 'Dashboard — FRELUX PAINT CALC',
    description: 'Your personal dashboard with recent projects, saved estimates, favorite colors, and AI recommendations.',
    canonicalPath: '/dashboard',
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
        <PageHeader eyebrow="Personal workspace" title="Dashboard" subtitle="Sign in to access your personal dashboard with recent projects, saved estimates, and favorite colors." />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <EmptyState
            illustration="generic"
            title="Sign in to view your dashboard"
            description="Track your projects, save calculations, and get personalized AI color recommendations."
            actionLabel="Sign in"
            actionTo="/login?redirect=/dashboard"
          />
        </div>
      </>
    );
  }

  const lastProject = projects[0];

  return (
    <>
      <PageHeader eyebrow="Personal workspace" title="Dashboard" subtitle="Pick up where you left off and explore your saved work." />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Continue Last Project */}
            {lastProject && (
              <section className="rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-white p-6 animate-fade-in-up">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-purple">
                  <Clock className="h-4 w-4" /> Continue where you left off
                </div>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-brand-navy">{lastProject.name}</h3>
                    {lastProject.description && <p className="mt-1 text-sm text-neutral-500">{lastProject.description}</p>}
                    <p className="mt-1 text-xs text-neutral-400">Updated {new Date(lastProject.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Link
                    to={PROJECT_ROUTES[lastProject.project_type] ?? '/paint-calculator'}
                    state={{ projectData: lastProject.project_data, projectId: lastProject.id, projectName: lastProject.name }}
                    className="btn-primary press-scale shrink-0"
                  >
                    Open Project <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            )}

            {/* Recent Calculations */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-brand-navy">
                  <Calculator className="h-5 w-5 text-brand-purple" /> Recent Calculations
                </h2>
                <Link to="/my-projects" className="text-sm font-semibold text-brand-purple hover:underline">View all</Link>
              </div>
              {projects.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.slice(0, 6).map((p) => (
                    <Link
                      key={p.id}
                      to={PROJECT_ROUTES[p.project_type] ?? '/paint-calculator'}
                      state={{ projectData: p.project_data, projectId: p.id, projectName: p.name }}
                      className="card-hover group rounded-xl border border-neutral-200 bg-white p-4"
                    >
                      <h3 className="text-sm font-bold text-brand-navy group-hover:text-brand-purple">{p.name}</h3>
                      {p.description && <p className="mt-0.5 text-xs text-neutral-500">{p.description}</p>}
                      <p className="mt-2 text-xs text-neutral-400">{new Date(p.updated_at).toLocaleDateString()}</p>
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
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-brand-navy">
                    <Heart className="h-5 w-5 text-rose-400" /> Favorite Colors
                  </h2>
                  <Link to="/my-projects" className="text-sm font-semibold text-brand-purple hover:underline">View all</Link>
                </div>
                {favColors.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {favColors.slice(0, 6).map((c) => (
                      <Link key={c.id} to={`/colors/paint/${c.slug}`} className="card-hover flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3">
                        <ColorSwatch hex={c.hex_code} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-brand-navy">{c.name}</p>
                          <p className="text-xs text-neutral-400">{c.hex_code}</p>
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
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-brand-navy">
                    <Clock className="h-5 w-5 text-neutral-400" /> Recently Viewed
                  </h2>
                  <Link to="/my-projects" className="text-sm font-semibold text-brand-purple hover:underline">View all</Link>
                </div>
                {recentColors.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {recentColors.slice(0, 6).map((c) => (
                      <Link key={c.id} to={`/colors/paint/${c.slug}`} className="card-hover flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3">
                        <ColorSwatch hex={c.hex_code} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-brand-navy">{c.name}</p>
                          <p className="text-xs text-neutral-400">{c.hex_code}</p>
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

            {/* AI Recommendations */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-brand-navy">
                  <Sparkles className="h-5 w-5 text-accent-orange" /> AI Recommendations
                </h2>
              </div>
              <div className="rounded-2xl border border-accent-orange/20 bg-gradient-to-br from-accent-orange/5 to-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-brand-navy">Get personalized color ideas</h3>
                    <p className="mt-1 text-sm text-neutral-500">Describe your space or upload a photo and let AI suggest the perfect palette.</p>
                  </div>
                  <Link to="/ai-color-assistant" className="btn-primary press-scale shrink-0">
                    <Sparkles className="h-4 w-4" /> Try AI Assistant
                  </Link>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
