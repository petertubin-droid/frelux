import { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, X, Loader2, Crosshair } from 'lucide-react';
import { useLocation, DISTANCE_FILTERS } from '@/lib/location';
import { fetchLocations } from '@/lib/pro-connect';
import type { DbProLocation } from '@/types/pro-connect';
import { classNames } from '@/lib/utils';
import { Button } from "@/components/ui/shadcn/button";

// ============================================================
// LocationPicker — "Use My Location" + manual selection
// ============================================================
// Privacy-first: only requests GPS on explicit click,
// stores in sessionStorage, provides manual fallback.

interface LocationPickerProps {
  onLocationChange?: (location: ReturnType<typeof useLocation>['location']) => void;
  onRadiusChange?: (radiusKm: number) => void;
  showRadius?: boolean;
  compact?: boolean;
}

export default function LocationPicker({
  onLocationChange,
  onRadiusChange,
  showRadius = true,
  compact = false,
}: LocationPickerProps) {
  const { location, loading, error, permissionDenied, detect, setManual, clear } = useLocation();
  const [showManual, setShowManual] = useState(false);
  const [dbLocations, setDbLocations] = useState<DbProLocation[]>([]);
  const [manualState, setManualState] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [radius, setRadius] = useState(25);

  // Load DB locations for manual selection
  useEffect(() => {
    fetchLocations().then(setDbLocations).catch(() => {});
  }, []);

  // Notify parent on location change
  useEffect(() => {
    onLocationChange?.(location);
  }, [location, onLocationChange]);

  const handleRadiusChange = useCallback((r: number) => {
    setRadius(r);
    onRadiusChange?.(r);
  }, [onRadiusChange]);

  const states = [...new Set(dbLocations.map((l) => l.state))].sort();
  const cities = [...new Set(dbLocations.filter((l) => l.state === manualState).map((l) => l.city))].sort();

  function handleManualSelect() {
    if (!manualState) return;
    const dbLoc = dbLocations.find((l) => l.state === manualState && l.city === manualCity);
    if (dbLoc?.latitude && dbLoc?.longitude) {
      setManual({
        latitude: dbLoc.latitude,
        longitude: dbLoc.longitude,
        city: manualCity || undefined,
        state: manualState,
        label: [manualCity, manualState].filter(Boolean).join(', '),
      });
    } else {
      // Even without coordinates, set the label for filtering
      setManual({
        latitude: 0,
        longitude: 0,
        city: manualCity || undefined,
        state: manualState,
        label: [manualCity, manualState].filter(Boolean).join(', '),
      });
    }
    setShowManual(false);
  }

  if (location && !compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-brand-purple/30 bg-primary/5 px-3 py-1.5 text-sm text-card-foreground dark:text-muted-foreground/60">
          <MapPin className="h-3.5 w-3.5 text-brand-purple" />
          <span className="font-medium">{location.label || 'Location set'}</span>
          {location.source === 'gps' && (
            <Crosshair className="h-3 w-3 text-brand-purple/60" aria-label="GPS detected" />
          )}
        </div>
        {showRadius && (
          <div className="flex items-center gap-1">
            {DISTANCE_FILTERS.map((f) => (
              <Button variant="ghost"
                key={f.value}
                onClick={() => handleRadiusChange(f.value)}
                className={classNames(
                  'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                  radius === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-muted-foreground hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground'
                )}
              >
                {f.label}
              </Button>
            ))}
          </div>
        )}
        <Button variant="ghost"
          onClick={clear}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-muted-foreground dark:text-muted-foreground dark:hover:text-muted-foreground/80"
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      </div>
    );
  }

  if (compact && location) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground dark:text-muted-foreground">
          <MapPin className="h-3 w-3 text-brand-purple" />
          {location.label || 'Location set'}
        </span>
        <Button variant="ghost"
          onClick={clear}
          className="text-xs text-muted-foreground hover:text-muted-foreground dark:text-muted-foreground"
        >
          ×
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="default"
          onClick={detect}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:/90 active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          {loading ? 'Detecting...' : 'Use My Location'}
        </Button>
        <Button variant="ghost"
          onClick={() => setShowManual(!showManual)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground"
        >
          <MapPin className="h-4 w-4" />
          Select Manually
        </Button>
      </div>

      {error && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p>
      )}

      {showManual && (
        <div className="rounded-lg border border-border bg-muted/50 p-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap gap-2">
            <select
              value={manualState}
              onChange={(e) => { setManualState(e.target.value); setManualCity(''); }}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
            >
              <option value="">Select State</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              disabled={!manualState}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground disabled:opacity-50"
            >
              <option value="">Select City</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Button variant="default"
              onClick={handleManualSelect}
              disabled={!manualState}
              className="rounded-md px-4 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              Set Location
            </Button>
          </div>
          {permissionDenied && (
            <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
              Tip: You can allow location access in your browser settings, or select your city manually above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
