import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ACHIEVEMENTS, getAchievements, type UnlockedAchievement, type UsageStats } from '@/lib/achievements';
import { useSeo } from '@/lib/seo';
import { classNames } from '@/lib/utils';

export default function Achievements() {
  const [unlocked, setUnlocked] = useState<UnlockedAchievement[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);

  useSeo({
    title: 'Achievements & Rewards',
    description: 'Track your FRELUX milestones and unlock badges as you use the platform.',
    canonicalPath: '/achievements',
    noIndex: true,
  });

  useEffect(() => {
    const data = getAchievements();
    setUnlocked(data.unlocked);
    setStats(data.stats);
  }, []);

  const unlockedIds = new Set(unlocked.map(a => a.id));
  const totalUnlocked = unlocked.length;
  const totalAchievements = ACHIEVEMENTS.length;
  const progress = Math.round((totalUnlocked / totalAchievements) * 100);

  const categories = [
    { id: 'calculations', label: 'Calculations', color: 'text-brand-purple' },
    { id: 'colors', label: 'Colors', color: 'text-pink-500' },
    { id: 'projects', label: 'Projects', color: 'text-blue-500' },
    { id: 'social', label: 'Social', color: 'text-emerald-500' },
    { id: 'streak', label: 'Streaks', color: 'text-amber-500' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Back link */}
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-purple dark:text-neutral-400 dark:hover:text-brand-purple-lighter">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to home
      </Link>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-brand-navy dark:text-white">Achievements</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Unlock badges as you use FRELUX. Track your progress and milestones.
        </p>
        <Link to="/rewards" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90">
          💎 View FRELUX Rewards
        </Link>
      </div>

      {/* Progress overview */}
      <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/5 dark:bg-brand-navy-mid">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Total Progress</p>
            <p className="text-2xl font-bold text-brand-navy dark:text-white">{totalUnlocked} / {totalAchievements} unlocked</p>
          </div>
          <div className="text-3xl font-bold text-brand-purple dark:text-brand-purple-lighter">{progress}%</div>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-purple-light transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Calculations" value={stats.totalCalculations} />
          <StatCard label="Colors Viewed" value={stats.colorsViewed} />
          <StatCard label="Projects Saved" value={stats.projectsSaved} />
          <StatCard label="Visit Streak" value={stats.visitStreak} />
        </div>
      )}

      {/* Achievement badges by category */}
      {categories.map((cat) => {
        const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat.id);
        if (catAchievements.length === 0) return null;
        return (
          <div key={cat.id} className="mb-8">
            <h2 className={classNames('mb-4 text-lg font-bold', cat.color)}>{cat.label}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catAchievements.map((ach) => {
                const isUnlocked = unlockedIds.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={classNames(
                      'flex items-center gap-3 rounded-xl border p-4 transition-all',
                      isUnlocked
                        ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                        : 'border-neutral-200 bg-neutral-50 opacity-60 dark:border-white/5 dark:bg-brand-navy'
                    )}
                  >
                    <span className="text-2xl">{isUnlocked ? ach.icon : '🔒'}</span>
                    <div className="min-w-0 flex-1">
                      <p className={classNames('text-sm font-bold', isUnlocked ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400')}>
                        {ach.title}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-500">{ach.description}</p>
                    </div>
                    {isUnlocked && (
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white">DONE</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center dark:border-white/5 dark:bg-brand-navy-mid">
      <p className="text-2xl font-bold text-brand-navy dark:text-white">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  );
}
