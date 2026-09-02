import { useState, useEffect } from 'react';
import { ACHIEVEMENTS, getAchievements, type UnlockedAchievement, type UsageStats } from '@/lib/achievements';
import { classNames } from '@/lib/utils';
import { Trophy, Lock, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/shadcn/button";

interface Props {
  compact?: boolean;
}

export function AchievementBadges({ compact = false }: Props) {
  const [unlocked, setUnlocked] = useState<UnlockedAchievement[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    const data = getAchievements();
    setUnlocked(data.unlocked);
    setStats(data.stats);
  }, []);

  const unlockedIds = new Set(unlocked.map(a => a.id));
  const totalUnlocked = unlocked.length;
  const totalAchievements = ACHIEVEMENTS.length;
  const progress = Math.round((totalUnlocked / totalAchievements) * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 dark:border-white/5 dark:bg-card">
        <Trophy className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">{totalUnlocked}/{totalAchievements}</span>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted dark:bg-white/5">
          <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 dark:border-white/5 dark:bg-card">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="text-base font-bold text-foreground dark:text-primary-foreground">Achievements</h3>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
          {totalUnlocked}/{totalAchievements} unlocked
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 overflow-hidden rounded-full bg-muted dark:bg-white/5">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatTile label="Calculations" value={stats.totalCalculations} />
          <StatTile label="Colors viewed" value={stats.colorsViewed} />
          <StatTile label="Projects saved" value={stats.projectsSaved} />
          <StatTile label="Day streak" value={stats.visitStreak} icon={<TrendingUp className="h-3 w-3" />} />
        </div>
      )}

      {/* Badges grid */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {ACHIEVEMENTS.map(ach => {
          const isUnlocked = unlockedIds.has(ach.id);
          return (
            <div
              key={ach.id}
              className={classNames(
                'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all',
                isUnlocked
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10'
                  : 'border-border/50 bg-muted/50 opacity-60 dark:border-white/5 dark:bg-white/5',
              )}
            >
              <span className={classNames('text-2xl', !isUnlocked && 'grayscale')}>{ach.icon}</span>
              <span className={classNames('text-xs font-bold', isUnlocked ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>
                {isUnlocked ? ach.title : '???'}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {isUnlocked ? ach.description : `Unlock: ${ach.description}`}
              </span>
              {!isUnlocked && <Lock className="h-3 w-3 text-muted-foreground/80" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/50 px-2 py-2 text-center dark:border-white/5 dark:bg-white/5">
      <p className="flex items-center justify-center gap-1 text-lg font-bold text-foreground dark:text-primary-foreground">{value}{icon}</p>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

/** Achievement unlock toast/notification */
export function AchievementToast({ achievements, onDismiss }: { achievements: { id: string; title: string; icon: string; description: string }[]; onDismiss: () => void }) {
  if (achievements.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[95] space-y-2 sm:bottom-8 sm:right-6">
      {achievements.map((ach, i) => (
        <div
          key={ach.id}
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-card px-4 py-3 shadow-xl animate-fade-in-up dark:border-amber-500/20 dark:bg-card"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <span className="text-2xl">{ach.icon}</span>
          <div>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Achievement Unlocked!</p>
            <p className="text-xs font-semibold text-card-foreground dark:text-muted-foreground/60">{ach.title}</p>
            <p className="text-[11px] text-muted-foreground">{ach.description}</p>
          </div>
          <Button variant="ghost" onClick={onDismiss} className="ml-2 text-muted-foreground/80 hover:text-muted-foreground" aria-label="Dismiss">
            <span className="text-lg leading-none">×</span>
          </Button>
        </div>
      ))}
    </div>
  );
}
