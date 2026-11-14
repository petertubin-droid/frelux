/**
 * site_settings has two optional columns that older databases may not carry yet:
 * maintenance_banner_enabled and maintenance_banner_message.
 *
 * Selecting `*` asks PostgREST for the whole row, so a database missing either
 * column answers PGRST204 ("Could not find the 'maintenance_banner_enabled'
 * column of 'site_settings' in the schema cache") for the entire query. The
 * admin settings page then had no row at all and showed "Couldn't load
 * settings", even though every other field was readable and saveable.
 *
 * So the page asks for the whole row first, and if only the banner columns are
 * what's missing it retries with this explicit list and says plainly that the
 * ticker is unavailable, instead of failing the page. The list is derived from
 * the production schema (src/types/database.ts DbSiteSettings) and a test keeps
 * it covering every field the page saves.
 */

export const MAINTENANCE_BANNER_COLUMNS = [
  "maintenance_banner_enabled",
  "maintenance_banner_message",
] as const;

export const SITE_SETTINGS_COLUMNS_WITHOUT_BANNER = [
  "id",
  "site_name",
  "short_name",
  "tagline",
  "description",
  "logo_url",
  "contact_email",
  "whatsapp_number",
  "default_currency",
  "default_currency_symbol",
  "default_unit",
  "maintenance_mode",
  "seo_title",
  "seo_description",
  "updated_at",
  "ai_enabled",
  "ai_access_mode",
  "ai_daily_free_uses",
  "ai_rewarded_enabled",
  "ai_paid_enabled",
  "ai_paid_price",
  "ai_paid_currency",
  "ai_reset_period",
  "ai_admin_override",
  "ads_enabled",
  "adsense_publisher_id",
  "ad_slots",
  "payment_provider_configured",
  "typography_config",
  "ga_measurement_id",
  "google_site_verification",
  "meta_pixel_id",
  "hero_headline",
  "hero_subheadline",
  "hero_cta_primary_label",
  "hero_cta_primary_href",
  "hero_cta_secondary_label",
  "hero_cta_secondary_href",
  "estimation_enabled",
  "estimation_access_mode",
  "estimation_daily_free_uses",
  "estimation_rewarded_enabled",
  "estimation_paid_enabled",
  "estimation_paid_price",
  "estimation_paid_currency",
  "estimation_reset_period",
  "estimation_admin_override",
  "premium_subscriptions_enabled",
  "manual_paint_bucket_sizes",
  "solas_api_key",
  "solas_agent_id",
  "solas_chat_url",
  "pdf_default_logo_url",
  "pdf_default_brand_name",
  "pdf_default_tagline",
  "pdf_default_contact_email",
  "pdf_default_contact_phone",
  "pdf_default_address",
  "pdf_default_primary_color",
  "pdf_default_secondary_color",
  "pdf_template_id",
  "pdf_watermark_enabled",
  "pdf_watermark_opacity",
  "pdf_watermark_scale",
  "pdf_watermark_position",
  "pdf_watermark_diagonal",
  "brand_studio_enabled",
  "ai_logo_daily_limit",
  "archie_knowledge_source",
  "loader_config",
  "display_currencies",
  "payment_gateway",
  "adsense_additional_publisher_ids",
  "ad_provider_mode",
  "ad_provider_slug",
].join(",");

/** True when a query failed only because the maintenance banner columns are absent. */
export function isMissingMaintenanceBannerColumn(
  error: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "PGRST204" ||
    MAINTENANCE_BANNER_COLUMNS.some((column) => message.includes(column)) ||
    message.toLowerCase().includes("schema cache")
  );
}
