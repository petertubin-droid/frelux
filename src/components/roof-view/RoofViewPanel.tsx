/**
 * FRELUX ROOF VIEW — Panel Component
 *
 * Renders the Roof View section within the Building-to-Roof Estimator's
 * Roof step. Shows:
 *   - "Not configured" state when no imagery provider is active
 *   - Location input + fetch button when a provider IS configured
 *   - Retrieved imagery when available
 *   - Clear error states
 *
 * This component is ALWAYS OPTIONAL. Manual measurement continues working
 * regardless of whether Roof View is available.
 *
 * Feature 2: Roof View
 */

import { useState } from 'react';
import {
  Satellite,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Eye,
  X,
} from 'lucide-react';
import { useRoofView } from '@/lib/roof/use-roof-view';
import type {} from '@/lib/roof/types';
import { Button } from "@/components/ui/shadcn/button";

export function RoofViewPanel() {
  const {
    state,
    config,
    imagery,
    loadingConfig,
    loadingImagery,
    fetchImagery,
    resetImagery,
  } = useRoofView();

  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const handleFetch = () => {
    const location = {
      address: address || undefined,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
    };
    fetchImagery(location);
  };

  // ── Loading config state ──
  if (loadingConfig) {
    return (
      <div className="rounded-xl border border-border bg-muted/50 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
          Checking roof view availability...
        </div>
      </div>
    );
  }

  // ── Not configured state ──
  if (state === 'not_configured') {
    return (
      <div className="rounded-xl border border-border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
            <Satellite aria-hidden="true" className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-card-foreground">
              Roof View (Aerial Imagery)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Aerial or satellite imagery can help you trace your roof outline for more accurate measurements.
              No imagery provider is currently configured.
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-xs font-medium text-amber-700">
              <Info aria-hidden="true" className="w-3 h-3" />
              Ready for provider connection
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              You can still enter your roof dimensions manually below.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Configured: show location input ──
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Satellite aria-hidden="true" className="w-5 h-5 text-brand-purple" />
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              Roof View (Aerial Imagery)
            </p>
            <p className="text-xs text-muted-foreground">
              Provider: {config?.display_name}
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md bg-green-50 border border-green-200 px-2 py-1 text-xs font-medium text-green-700">
          <CheckCircle2 aria-hidden="true" className="w-3 h-3" />
          Provider active
        </div>
      </div>

      {/* Location input */}
      {state !== 'available' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Property address
            </label>
            <div className="relative">
              <MapPin aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g. 12 Adeola Odeku, Victoria Island, Lagos"
                className="w-full rounded-lg border border-border pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Latitude (optional)
              </label>
              <input
                type="number"
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                placeholder="6.4474"
                step="0.0001"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Longitude (optional)
              </label>
              <input
                type="number"
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                placeholder="3.4089"
                step="0.0001"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <Button variant="default"
            onClick={handleFetch}
            disabled={loadingImagery || (!address && !latitude)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium hover:/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingImagery ? (
              <>
                <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                Retrieving imagery...
              </>
            ) : (
              <>
                <Satellite aria-hidden="true" className="w-4 h-4" />
                Get Aerial Image
              </>
            )}
          </Button>
        </div>
      )}

      {/* Fetching state */}
      {state === 'fetching' && !imagery && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
          Contacting {config?.display_name}...
        </div>
      )}

      {/* Imagery available */}
      {state === 'available' && imagery?.imagery_url && (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img
              src={imagery.imagery_url}
              alt="Aerial roof view"
              className="w-full h-auto"
            />
            <Button
              onClick={resetImagery}
              className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/50 backdrop-blur px-2 py-1 text-xs text-primary-foreground hover:bg-black/70"
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye aria-hidden="true" className="w-3.5 h-3.5" />
            Retrieved from {imagery.provider_display_name} on{' '}
            {imagery.retrieved_at
              ? new Date(imagery.retrieved_at).toLocaleDateString()
              : 'unknown date'}
          </div>
          <p className="text-xs text-muted-foreground">
            Use this image as a reference to trace your roof outline in the geometry editor below.
          </p>
        </div>
      )}

      {/* Error states */}
      {(state === 'error' || state === 'provider_error') && imagery?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
          <AlertCircle aria-hidden="true" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-red-700">Could not retrieve imagery</p>
            <p className="text-xs text-red-600 mt-1">{imagery.error}</p>
            <p className="text-xs text-muted-foreground mt-2">
              You can still enter your roof dimensions manually below.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoofViewPanel;
