import { useWorkWeather, type WorkType } from "@/lib/weather-work";
import {
  CloudRain,
  Sun,
  Droplets,
  Thermometer,
  Wind,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { classNames } from "@/lib/utils";

const WORK_LABELS: Record<WorkType, string> = {
  painting: "Painting",
  screeding: "Screeding",
  tiling: "Tiling",
  tyrolene: "Tyrolene",
  finishing: "Finishing",
  general: "Outdoor Work",
};

export function WorkWeatherBanner({ workType }: { workType: WorkType }) {
  const { today, days, city, loading, canWorkToday, workRating, workNote } =
    useWorkWeather(workType);
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
        <CloudRain className="h-5 w-5 animate-pulse text-brand-purple" />
        <p className="text-sm text-neutral-500">
          Checking weather conditions for {WORK_LABELS[workType].toLowerCase()}…
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
      border: "border-emerald-200 dark:border-emerald-800",
    },
    fair: {
      Icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
    },
    poor: {
      Icon: XCircle,
      color: "text-red-500 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
    },
  };
  const config = ratingConfig[workRating];
  const { Icon } = config;
  const goodDays = days.filter((d) => d.paintRating === "good").length;

  return (
    <div
      className={classNames(
        "mb-4 rounded-xl border p-4",
        config.border,
        config.bg,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={classNames("mt-0.5 h-5 w-5 shrink-0", config.color)} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={classNames("text-sm font-semibold", config.color)}>
              {canWorkToday
                ? `Good to work — ${WORK_LABELS[workType]} conditions OK today`
                : `Not ideal — ${workNote}`}
            </p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              5-day forecast
              <ChevronDown
                className={classNames(
                  "h-3 w-3 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <Sun className="h-3.5 w-3.5" /> {today.icon}{" "}
              {Math.round(today.tempMax)}°C
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5" /> {today.humidity}%
            </span>
            {today.precipitation > 0 && (
              <span className="flex items-center gap-1">
                <CloudRain className="h-3.5 w-3.5" /> {today.precipitation}mm
              </span>
            )}
            <span className="flex items-center gap-1">
              <Wind className="h-3.5 w-3.5" /> {today.windSpeed} m/s
            </span>
            <span className="text-neutral-400">· {city}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 grid grid-cols-5 gap-1 border-t border-neutral-200/50 pt-3 dark:border-white/10">
          {days.map((day) => {
            const r = ratingConfig[day.paintRating];
            const DayIcon = r.Icon;
            return (
              <div
                key={day.date}
                className="flex flex-col items-center gap-1 rounded-lg bg-white/50 p-2 text-center dark:bg-white/5"
              >
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  {day.dayName}
                </p>
                <span className="text-lg">{day.icon}</span>
                <DayIcon className={classNames("h-3.5 w-3.5", r.color)} />
                <p className="text-[10px] text-neutral-400">
                  {Math.round(day.tempMax)}°C
                </p>
                <p className="text-[10px] text-neutral-400">{day.humidity}%</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
