// Tracking abstraction. Real providers (Meta Pixel, GA) are loaded only when
// configured IDs are present in siteConfig. Events are also logged to the
// Supabase analytics_events table for the admin dashboard.

import { siteConfig } from '@/config/site';
import { logAnalyticsEvent } from '@/lib/queries';

export type TrackEvent =
  | 'calculator_started'
  | 'calculator_completed'
  | 'cost_estimator_started'
  | 'cost_estimate_completed'
  | 'screeding_calculator_opened'
  | 'screeding_calculation_completed'
  | 'screeding_estimator_opened'
  | 'screeding_estimate_generated'
  | 'screeding_material_selected'
  | 'screeding_navigate_to_paint_calculator'
  | 'color_gallery_viewed'
  | 'color_library_viewed'
  | 'color_page_viewed'
  | 'ai_assistant_opened'
  | 'text_consultation_submitted'
  | 'image_analysis_started'
  | 'image_upload_started'
  | 'image_upload_invalid'
  | 'ai_recommendation_generated'
  | 'ai_request_failed'
  | 'ai_usage_limit_reached'
  | 'rewarded_access_requested'
  | 'rewarded_access_verified'
  | 'color_recommendation_clicked'
  | 'contact_form_submitted'
  | 'whatsapp_clicked'
  | 'pop_ceiling_calculated'
  | 'pop_ceiling_estimate_generated'
  | 'tile_calculated'
  | 'tile_estimate_generated'
  | 'ai_learn_asked'
  | 'screeding_mix_estimate_generated'
  | 'rewarded_ad_watched'
  | 'advanced_calculator_opened'
  | 'advanced_estimate_saved';

export function track(event: TrackEvent, params?: Record<string, unknown>): void {
  // Meta Pixel
  if (siteConfig.metaPixel.pixelId && typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (typeof w.fbq === 'function') {
      w.fbq('trackCustom', event, params);
    }
  }

  // GA4
  if (siteConfig.analytics.gaMeasurementId && typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (typeof w.gtag === 'function') {
      w.gtag('event', event, params);
    }
  }

  // Log to Supabase for the admin analytics dashboard (fire-and-forget).
  logAnalyticsEvent(event, params, typeof window !== 'undefined' ? window.location.pathname : undefined);

  // Always log in dev for visibility; safe no-op in production when unconfigured.
  if (import.meta.env.DEV) {
    console.debug('[track]', event, params ?? {});
  }
}

// Builds a WhatsApp click-to-chat URL in international format.
export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${siteConfig.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
