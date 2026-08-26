import { usePaintingWeather, type WeatherDay } from '@/lib/weather';
import { classNames } from '@/lib/utils';
import { CloudRain, Sun, Droplets, Thermometer, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function WeatherWidget() {
  const { city, days, loading, error } = usePaintingWeather();

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2">
          <CloudRain aria-hidden="true" className="h-5 w-5 text-brand-purple animate-pulse" />
          <h3 className="text-sm font-bold text-brand-navy dark:text-white">Best Days to Paint</h3>
        </div>
        <div className="mt-4 flex items-center justify-center py-8 text-sm text-neutral-500">
          Loading weather data...
        </div>
      </div>
    );
  }

  if (error || days.length === 0) return null;

  const goodDays = days.filter((d) => d.paintRating === 'good').length;

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-brand-navy to-brand-navy-light p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sun aria-hidden="true" className="h-5 w-5 text-yellow-300" />
              <h3 className="text-sm font-bold">Best Days to Paint</h3>
            </div>
            <p className="mt-0.5 text-xs text-white/60">{city} · 5-day forecast</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{goodDays}/5</p>
            <p className="text-xs text-white/60">good days</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-1 p-3">
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
    good: { icon: CheckCircle2, color: 'text-accent-green', bg: 'bg-accent-green/10', label: 'Good' },
    fair: { icon: AlertTriangle, color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', label: 'Fair' },
    poor: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Poor' },
  };

  const config = ratingConfig[day.paintRating];
  const RatingIcon = config.icon;

  return (
    <div className={classNames('rounded-lg p-2 text-center transition-all', config.bg)}>
      <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{day.dayName}</p>
      <p className="my-1 text-2xl">{day.icon}</p>
      <div className="flex items-center justify-center gap-0.5">
        <RatingIcon className={classNames('h-3 w-3', config.color)} />
      </div>
      <p className={classNames('mt-0.5 text-[10px] font-medium', config.color)}>{config.label}</p>
      <div className="mt-1.5 space-y-0.5">
        <p className="flex items-center justify-center gap-0.5 text-[10px] text-neutral-500">
          <Droplets aria-hidden="true" className="h-2.5 w-2.5" /> {day.humidity}%
        </p>
        <p className="flex items-center justify-center gap-0.5 text-[10px] text-neutral-500">
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
  const goodDays = days.filter((d) => d.paintRating === 'good').length;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
      <span className="text-2xl">{today.icon}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-brand-navy dark:text-white">
          {today.dayName} in {city}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          {today.paintNote}
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-brand-purple">{goodDays}/5</p>
        <p className="text-[10px] text-neutral-500">good days</p>
      </div>
    </div>
  );
}
