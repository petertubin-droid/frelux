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
