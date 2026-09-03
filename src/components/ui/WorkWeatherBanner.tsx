import { useWorkWeather, type WorkType } from "@/lib/weather-work";
import {
  CloudRain,
  Droplets,
  Thermometer,
  Wind,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Sun,
  Cloud,
  CloudSun,
  CloudDrizzle,
  CloudLightning,
  CloudFog,

} from "lucide-react";
import { useState } from "react";
import { classNames } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";

const WORK_LABELS: Record<WorkType, string> = {
  painting: "Painting",
  screeding: "Screeding",
  tiling: "Tiling",
  tyrolene: "Tyrolene",
  finishing: "Finishing",
  general: "Outdoor Work",
};

// Map weather conditions to premium Lucide icons instead of emoji
function conditionIcon(condition: string, className?: string) {
  const map: Record<string, typeof Sun> = {
    Clear: Sun,
    Clouds: Cloud,
    Rain: CloudRain,
    Drizzle: CloudDrizzle,
    Thunderstorm: CloudLightning,
    Mist: CloudFog,
    Fog: CloudFog,
    Haze: CloudFog,
  };
  const Icon = map[condition] ?? CloudSun;
  return <Icon aria-hidden="true" className={className} />;
}

export function WorkWeatherBanner({ workType }: { workType: WorkType }) {
  const { today, days, city, loading, canWorkToday, workRating } =
    useWorkWeather(workType);
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/50 p-4 dark:border-white/10 dark:from-card dark:to-background">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <CloudRain className="h-5 w-5 animate-pulse text-brand-purple" />
        </div>
        <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
          Checking weather for {WORK_LABELS[workType].toLowerCase()}…
        </p>
      </div>
    );
  }

  if (!today) return null;

  const ratingConfig = {
    good: {
      Icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800/50",
      glow: "shadow-emerald-100 dark:shadow-emerald-900/20",
      label: "Favorable",
    },
    fair: {
      Icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800/50",
      glow: "shadow-amber-100 dark:shadow-amber-900/20",
      label: "Marginal",
    },
    poor: {
      Icon: XCircle,
      color: "text-red-500 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800/50",
      glow: "shadow-red-100 dark:shadow-red-900/20",
      label: "Unfavorable",
    },
  };
  const config = ratingConfig[workRating];
  const { Icon } = config;
  const goodDays = days.filter((d) => d.paintRating === "good").length;

  return (
    <div
      className={classNames(
        "mb-4 overflow-hidden rounded-2xl border shadow-sm",
        config.border,
        config.bg,
        config.glow,
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        {/* Weather condition icon badge */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm dark:bg-white/10">
          {conditionIcon(today.condition, "h-6 w-6 text-foreground dark:text-primary-foreground")}
        </div>

        {/* Rating + condition */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className={classNames("h-4 w-4 shrink-0", config.color)} />
            <span className={classNames("text-sm font-bold", config.color)}>
              {canWorkToday
                ? `${config.label} for ${WORK_LABELS[workType]}`
                : `${config.label} — postpone ${WORK_LABELS[workType].toLowerCase()}`}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground dark:text-muted-foreground">
            {city} · {today.dayName} {today.condition}
          </p>
        </div>

        {/* Metrics badges */}
        <div className="hidden sm:flex items-center gap-1.5">
          <MetricChip icon={<Thermometer className="h-3.5 w-3.5" />} value={`${Math.round(today.tempMax)}°`} />
          <MetricChip icon={<Droplets className="h-3.5 w-3.5" />} value={`${today.humidity}%`} />
          {today.precipitation > 0 && (
            <MetricChip icon={<CloudRain className="h-3.5 w-3.5" />} value={`${today.precipitation}mm`} />
          )}
          <MetricChip icon={<Wind className="h-3.5 w-3.5" />} value={`${today.windSpeed}m/s`} />
        </div>

        {/* Expand toggle */}
        <Button variant="ghost"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/50 hover:text-card-foreground dark:text-muted-foreground dark:hover:bg-white/5 dark:hover:text-muted-foreground/60"
        >
          {goodDays}/5
          <ChevronDown className={classNames("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>

      {/* Mobile metrics */}
      <div className="flex items-center gap-2 px-4 pb-3 sm:hidden">
        <MetricChip icon={<Thermometer className="h-3.5 w-3.5" />} value={`${Math.round(today.tempMax)}°`} />
        <MetricChip icon={<Droplets className="h-3.5 w-3.5" />} value={`${today.humidity}%`} />
        {today.precipitation > 0 && (
          <MetricChip icon={<CloudRain className="h-3.5 w-3.5" />} value={`${today.precipitation}mm`} />
        )}
        <MetricChip icon={<Wind className="h-3.5 w-3.5" />} value={`${today.windSpeed}m/s`} />
      </div>

      {/* Expandable 5-day forecast */}
      {expanded && (
        <div className="border-t border-border/50 bg-white/40 p-3 dark:border-white/10 dark:bg-white/5">
          <div className="grid grid-cols-5 gap-2">
            {days.map((day) => {
              const r = ratingConfig[day.paintRating];
              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white/70 p-2.5 text-center shadow-sm dark:bg-white/5"
                >
                  <p className="text-[11px] font-semibold text-muted-foreground dark:text-muted-foreground/80">
                    {day.dayName}
                  </p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted dark:bg-white/5">
                    {conditionIcon(day.condition, "h-4 w-4 text-foreground dark:text-muted-foreground/60")}
                  </div>
                  <r.Icon className={classNames("h-3.5 w-3.5", r.color)} />
                  <p className="text-[10px] font-medium text-muted-foreground dark:text-muted-foreground">
                    {Math.round(day.tempMax)}°
                  </p>
                  <p className="text-[9px] text-muted-foreground dark:text-muted-foreground">
                    {day.humidity}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricChip({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/60 px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm dark:bg-white/10 dark:text-muted-foreground/80">
      {icon}
      {value}
    </div>
  );
}
