import type { AdProviderSchema } from '@/types/database';

/**
 * Provider Registry — defines the configuration schema for each built-in ad provider.
 * New providers can be added by admin users from the panel; those will use a generic
 * schema. Built-in providers have custom credential fields shown in the admin UI.
 */
export const BUILTIN_PROVIDERS: AdProviderSchema[] = [
  {
    slug: 'google_adsense',
    name: 'Google AdSense',
    provider_type: 'display',
    icon: 'adsense',
    credential_fields: [
      { key: 'publisher_id', label: 'Publisher ID (ca-pub-XXXX)', type: 'text', required: true, placeholder: 'ca-pub-1234567890123456' },
      { key: 'client_id', label: 'Client ID (optional)', type: 'text', required: false, placeholder: 'ca-pub-1234567890123456' },
    ],
    setting_fields: [
      { key: 'auto_ads', label: 'Auto Ads', type: 'boolean', default: false },
      { key: 'lazy_load', label: 'Lazy Load', type: 'boolean', default: true },
    ],
  },
  {
    slug: 'google_ad_manager',
    name: 'Google Ad Manager',
    provider_type: 'display',
    icon: 'gam',
    credential_fields: [
      { key: 'network_code', label: 'Network Code', type: 'text', required: true, placeholder: '12345678' },
      { key: 'ad_unit_code', label: 'Ad Unit Code', type: 'text', required: false, placeholder: '/12345678/home_banner' },
    ],
    setting_fields: [
      { key: 'single_request', label: 'Single Request Architecture', type: 'boolean', default: false },
    ],
  },
  {
    slug: 'google_admob',
    name: 'Google AdMob',
    provider_type: 'rewarded',
    icon: 'admob',
    credential_fields: [
      { key: 'app_id', label: 'App ID', type: 'text', required: true, placeholder: 'ca-app-pub-XXXX~XXXX' },
      { key: 'ad_unit_id', label: 'Rewarded Ad Unit ID', type: 'text', required: true, placeholder: 'ca-app-pub-XXXX/XXXX' },
    ],
    setting_fields: [
      { key: 'test_mode', label: 'Test Mode', type: 'boolean', default: false },
    ],
  },
  {
    slug: 'unity_ads',
    name: 'Unity Ads',
    provider_type: 'rewarded',
    icon: 'unity',
    credential_fields: [
      { key: 'game_id', label: 'Game ID', type: 'text', required: true, placeholder: '1234567' },
      { key: 'placement_id', label: 'Placement ID', type: 'text', required: true, placeholder: 'rewardedVideo' },
    ],
    setting_fields: [
      { key: 'test_mode', label: 'Test Mode', type: 'boolean', default: false },
    ],
  },
  {
    slug: 'applovin',
    name: 'AppLovin',
    provider_type: 'rewarded',
    icon: 'applovin',
    credential_fields: [
      { key: 'sdk_key', label: 'SDK Key', type: 'password', required: true, placeholder: 'XXXX-XXXX-XXXX' },
      { key: 'zone_id', label: 'Zone ID', type: 'text', required: true, placeholder: 'rewarded_zone' },
    ],
    setting_fields: [
      { key: 'test_mode', label: 'Test Mode', type: 'boolean', default: false },
    ],
  },
  {
    slug: 'ironsource',
    name: 'ironSource',
    provider_type: 'rewarded',
    icon: 'ironsource',
    credential_fields: [
      { key: 'app_key', label: 'App Key', type: 'text', required: true, placeholder: 'a1b2c3d4' },
      { key: 'instance_id', label: 'Instance ID', type: 'text', required: true, placeholder: 'rewarded_instance' },
    ],
    setting_fields: [
      { key: 'test_mode', label: 'Test Mode', type: 'boolean', default: false },
    ],
  },
  {
    slug: 'chartboost',
    name: 'Chartboost',
    provider_type: 'rewarded',
    icon: 'chartboost',
    credential_fields: [
      { key: 'app_id', label: 'App ID', type: 'text', required: true, placeholder: '1234567890' },
      { key: 'app_signature', label: 'App Signature', type: 'password', required: true, placeholder: 'XXXX-XXXX-XXXX' },
    ],
    setting_fields: [
      { key: 'test_mode', label: 'Test Mode', type: 'boolean', default: false },
    ],
  },
  {
    slug: 'liftoff_monetize',
    name: 'Liftoff Monetize',
    provider_type: 'rewarded',
    icon: 'liftoff',
    credential_fields: [
      { key: 'app_id', label: 'App ID', type: 'text', required: true, placeholder: '12345' },
      { key: 'placement_id', label: 'Placement ID', type: 'text', required: true, placeholder: 'rewarded_placement' },
    ],
    setting_fields: [
      { key: 'test_mode', label: 'Test Mode', type: 'boolean', default: false },
    ],
  },
  // ─────────────────────────────────────────────────────────
  // Web display ad providers (work in browsers, not mobile-only)
  // ─────────────────────────────────────────────────────────
  {
    slug: 'media_net',
    name: 'Media.net',
    provider_type: 'display',
    icon: 'medianet',
    credential_fields: [
      { key: 'cid', label: 'Customer ID (CID)', type: 'text', required: true, placeholder: '8CXXXXXXX' },
      { key: 'crids', label: 'CRIDs (comma-separated)', type: 'text', required: false, placeholder: '1234567,2345678' },
    ],
    setting_fields: [
      { key: 'async', label: 'Async Loading', type: 'boolean', default: true },
    ],
  },
  {
    slug: 'adsterra',
    name: 'Adsterra',
    provider_type: 'display',
    icon: 'adsterra',
    credential_fields: [
      { key: 'key', label: 'Ad Zone Key', type: 'text', required: true, placeholder: 'e.g. abc123def456' },
      { key: 'placement_id', label: 'Placement ID', type: 'text', required: false, placeholder: 'banner_1' },
    ],
    setting_fields: [
      { key: 'format', label: 'Ad Format', type: 'text', default: 'banner' },
    ],
  },
  {
    slug: 'buysellads',
    name: 'BuySellAds',
    provider_type: 'display',
    icon: 'buysellads',
    credential_fields: [
      { key: 'site_key', label: 'Site Key', type: 'text', required: true, placeholder: 'frelux' },
      { key: 'zone_keys', label: 'Zone Keys (comma-separated)', type: 'text', required: false, placeholder: 'zone1,zone2' },
    ],
    setting_fields: [
      { key: 'passback', label: 'Enable Passback', type: 'boolean', default: true },
    ],
  },
  {
    slug: 'taboola',
    name: 'Taboola',
    provider_type: 'native',
    icon: 'taboola',
    credential_fields: [
      { key: 'publisher_id', label: 'Publisher ID', type: 'text', required: true, placeholder: 'frelux-publisher' },
      { key: 'placement', label: 'Placement Name', type: 'text', required: true, placeholder: 'Below Article Thumbnails' },
    ],
    setting_fields: [
      { key: 'mode', label: 'Mode', type: 'text', default: 'thumbnails-r' },
    ],
  },
  {
    slug: 'outbrain',
    name: 'Outbrain',
    provider_type: 'native',
    icon: 'outbrain',
    credential_fields: [
      { key: 'widget_id', label: 'Widget ID', type: 'text', required: true, placeholder: 'AR_1' },
      { key: 'publisher_key', label: 'Publisher Key', type: 'text', required: true, placeholder: 'FRELUX' },
    ],
    setting_fields: [],
  },
  {
    slug: 'propellerads',
    name: 'PropellerAds',
    provider_type: 'display',
    icon: 'propeller',
    credential_fields: [
      { key: 'zone_id', label: 'Zone ID', type: 'text', required: true, placeholder: '1234567' },
      { key: 'format', label: 'Ad Format', type: 'text', required: false, placeholder: 'push, banner, native' },
    ],
    setting_fields: [],
  },
  // ─────────────────────────────────────────────────────────
  // Web rewarded ad providers (offerwall / rewarded API based)
  // ─────────────────────────────────────────────────────────
  {
    slug: 'adgate_media',
    name: 'AdGate Media',
    provider_type: 'rewarded',
    icon: 'adgate',
    credential_fields: [
      { key: 'gateway_id', label: 'Gateway ID', type: 'text', required: true, placeholder: '1234' },
      { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'your-adgate-api-key' },
    ],
    setting_fields: [
      { key: 'postback_url', label: 'Postback URL', type: 'text', required: false, placeholder: 'https://freluxtools.netlify.app/api/adgate-postback' },
    ],
  },
  {
    slug: 'offertoro',
    name: 'OfferToro',
    provider_type: 'rewarded',
    icon: 'offertoro',
    credential_fields: [
      { key: 'app_id', label: 'App ID', type: 'text', required: true, placeholder: '12345' },
      { key: 'pub_id', label: 'Publisher ID', type: 'text', required: true, placeholder: 'pub_XXXX' },
      { key: 'secret', label: 'Secret Key', type: 'password', required: true, placeholder: 'your-secret-key' },
    ],
    setting_fields: [
      { key: 'postback_url', label: 'Postback URL', type: 'text', required: false, placeholder: 'https://freluxtools.netlify.app/api/offertoro-postback' },
    ],
  },
  {
    slug: 'adgem',
    name: 'AdGem',
    provider_type: 'rewarded',
    icon: 'adgem',
    credential_fields: [
      { key: 'placement_id', label: 'Placement ID', type: 'text', required: true, placeholder: '12345' },
      { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'your-adgem-api-key' },
    ],
    setting_fields: [
      { key: 'postback_url', label: 'Postback URL', type: 'text', required: false, placeholder: 'https://freluxtools.netlify.app/api/adgem-postback' },
    ],
  },
  {
    slug: 'cpx_research',
    name: 'CPX Research',
    provider_type: 'rewarded',
    icon: 'cpx',
    credential_fields: [
      { key: 'app_id', label: 'App ID', type: 'text', required: true, placeholder: '12345' },
      { key: 'secure_hash', label: 'Secure Hash', type: 'password', required: true, placeholder: 'your-secure-hash' },
    ],
    setting_fields: [
      { key: 'survey_mode', label: 'Survey Mode', type: 'text', default: 'full' },
    ],
  },
  {
    slug: 'ayet_studios',
    name: 'Ayet Studios',
    provider_type: 'rewarded',
    icon: 'ayet',
    credential_fields: [
      { key: 'app_id', label: 'App ID', type: 'text', required: true, placeholder: '12345' },
      { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'your-ayet-api-key' },
    ],
    setting_fields: [
      { key: 'postback_url', label: 'Postback URL', type: 'text', required: false, placeholder: 'https://freluxtools.netlify.app/api/ayet-postback' },
    ],
  },
  {
    slug: 'revu',
    name: 'RevU',
    provider_type: 'rewarded',
    icon: 'revu',
    credential_fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'your-revu-api-key' },
      { key: 'placement_id', label: 'Placement ID', type: 'text', required: true, placeholder: '12345' },
    ],
    setting_fields: [
      { key: 'postback_url', label: 'Postback URL', type: 'text', required: false, placeholder: 'https://freluxtools.netlify.app/api/revu-postback' },
    ],
  },
];

/**
 * Generic schema for admin-added custom providers.
 */
export const CUSTOM_PROVIDER_SCHEMA: AdProviderSchema = {
  slug: '',
  name: '',
  provider_type: 'mixed',
  icon: 'custom',
  credential_fields: [
    { key: 'api_key', label: 'API Key / Publisher ID', type: 'text', required: true, placeholder: 'Your provider API key' },
    { key: 'ad_unit_id', label: 'Ad Unit ID', type: 'text', required: false, placeholder: 'Ad unit identifier' },
  ],
  setting_fields: [
    { key: 'test_mode', label: 'Test Mode', type: 'boolean', default: false },
  ],
};

export function getProviderSchema(slug: string): AdProviderSchema | null {
  return BUILTIN_PROVIDERS.find((p) => p.slug === slug) ?? null;
}

export const AD_PLACEMENT_TYPES = ['banner', 'native', 'rewarded', 'interstitial', 'in_article'] as const;
export const AD_PAGE_TARGETS = ['home', 'calculator', 'learn', 'color_detail', 'gallery', 'ai', 'sidebar', 'global'] as const;

export const PLACEMENT_TYPE_LABELS: Record<string, string> = {
  banner: 'Banner Ad',
  native: 'Native Ad',
  rewarded: 'Rewarded Ad',
  interstitial: 'Interstitial Ad',
  in_article: 'In Article Ad',
};

export const PAGE_TARGET_LABELS: Record<string, string> = {
  home: 'Homepage',
  calculator: 'Calculator / Estimator',
  learn: 'Learn Section',
  color_detail: 'Color Detail Page',
  gallery: 'Color Gallery',
  ai: 'AI Features',
  sidebar: 'Sidebar (all pages)',
  global: 'Global (all pages)',
};

export const REWARDED_FEATURES = [
  { key: 'advanced_calculator', name: 'Advanced Calculators', icon: 'Calculator' },
  { key: 'ai_color_assistant', name: 'Smart Color Assistant', icon: 'Palette' },
  { key: 'ai_learning_assistant', name: 'AI Learning Assistant', icon: 'BookOpen' },
  { key: 'premium_reports', name: 'Premium Reports', icon: 'FileText' },
];
