import { usePaintingWeather, type WeatherDay } from "@/lib/weather";
import { classNames } from "@/lib/utils";
import {
  CloudRain,
  Sun,
  Cloud,
  CloudSun,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  Droplets,
  Thermometer,
  Wind,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

// Map weather conditions to premium Lucide icons
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

export function WeatherWidget() {
  const { city, days, loading, error } = usePaintingWeather();

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10">
            <CloudRain aria-hidden="true" className="h-4 w-4 animate-pulse text-brand-purple" />
          </div>
          <h3 className="text-sm font-bold text-brand-navy dark:text-white">Best Days to Paint</h3>
        </div>
        <div className="mt-4 flex items-center justify-center py-8 text-sm text-neutral-500">
          Loading weather data...
        </div>
      </div>
    );
  }

  if (error || days.length === 0) return null;

  const goodDays = days.filter((d) => d.paintRating === "good").length;

  return (
    <div className="card overflow-hidden">
      {/* Premium gradient header */}
      <div className="bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy-light p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Sun aria-hidden="true" className="h-5 w-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Best Days to Paint</h3>
              <p className="mt-0.5 text-xs text-white/60">{city} · 5-day forecast</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-sm">
            <span className="text-2xl font-bold">{goodDays}</span>
            <span className="text-xs text-white/60">/ 5 good</span>
          </div>
        </div>
      </div>

      {/* Day cards with premium icons */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 p-3">
        {days.map((day) => (
          <WeatherDayCard key={day.date} day={day} />
        ))}
      </div>

      <div className="border-t border-neutral-100 p-3 dark:border-white/5">
        <Link to="/learn" className="text-xs font-medium text-brand-purple hover:underline dark:text-brand-purple-lighter">
          Learn how weather affects painting →
        </Link>
      </div>
    </div>
  );
}

function WeatherDayCard({ day }: { day: WeatherDay }) {
  const ratingConfig = {
    good: { Icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20", label: "Good" },
    fair: { Icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20", label: "Fair" },
    poor: { Icon: XCircle, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/20", label: "Poor" },
  };

  const config = ratingConfig[day.paintRating];
  const { Icon } = config;

  return (
    <div className={classNames("rounded-xl border border-transparent p-2.5 text-center transition-all hover:shadow-sm", config.bg)}>
      <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{day.dayName}</p>
      <div className="my-1.5 flex items-center justify-center">
        {conditionIcon(day.condition, "h-6 w-6 text-brand-navy dark:text-white")}
      </div>
      <div className="flex items-center justify-center gap-0.5">
        <Icon className={classNames("h-3.5 w-3.5", config.color)} />
      </div>
      <p className={classNames("mt-0.5 text-[10px] font-medium", config.color)}>{config.label}</p>
      <div className="mt-2 space-y-0.5">
        <p className="flex items-center justify-center gap-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
          <Droplets aria-hidden="true" className="h-2.5 w-2.5" /> {day.humidity}%
        </p>
        <p className="flex items-center justify-center gap-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
          <Thermometer aria-hidden="true" className="h-2.5 w-2.5" /> {Math.round(day.tempMax)}°
        </p>
      </div>
    </div>
  );
}

export function WeatherWidgetCompact() {
  const { city, days, loading } = usePaintingWeather();

  if (loading || days.length === 0) return null;

  const today = days[0];
  const goodDays = days.filter((d) => d.paintRating === "good").length;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-3 dark:border-neutral-700 dark:from-brand-navy-mid dark:to-brand-navy">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/10">
        {conditionIcon(today.condition, "h-5 w-5 text-brand-purple")}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-brand-navy dark:text-white">
          {today.dayName} in {city}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {today.condition} · {Math.round(today.tempMax)}°C · {today.humidity}% humidity
        </p>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg bg-brand-purple/10 px-2.5 py-1.5">
        <span className="text-lg font-bold text-brand-purple">{goodDays}</span>
        <span className="text-[10px] text-neutral-500">/ 5 good</span>
      </div>
    </div>
  );
}
