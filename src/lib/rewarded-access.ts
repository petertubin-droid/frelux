import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchRewardedToolConfig,
  checkRewardedUnlock,
  recordRewardedUnlock,
  logRewardedAdEvent,
} from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { logAdEvent } from '@/lib/ad-config';
import type { DbRewardedToolConfig, DbAdProvider, DbRewardedFeatureConfig } from '@/types/database';

export interface RewardedAccessState {
  toolKey: string;
  config: DbRewardedToolConfig | null;
  featureConfig: DbRewardedFeatureConfig | null;
  primaryProvider: DbAdProvider | null;
  fallbackProvider: DbAdProvider | null;
  isUnlocked: boolean;
  expiresAt: string | null;
  loading: boolean;
  error: string | null;
  showAdModal: boolean;
  adLoading: boolean;
  adProviderUsed: string | null;
  clientHash: string;
  dailyUnlockCount: number;
  isCooldownActive: boolean;
}

export interface RewardedAccessActions {
  requestUnlock: () => void;
  cancelUnlock: () => void;
  watchAd: () => Promise<void>;
  refresh: () => Promise<void>;
}

export type RewardedAccess = RewardedAccessState & RewardedAccessActions;

const STORAGE_PREFIX = 'frelux_rewarded_';
const COOLDOWN_PREFIX = 'frelux_cooldown_';
const DAILY_COUNT_PREFIX = 'frelux_daily_';

function getClientHash(): string {
  const key = 'frelux_client_hash';
  let hash = localStorage.getItem(key);
  if (!hash) {
    hash = 'ch_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, hash);
  }
  return hash;
}

function getLocalExpiry(toolKey: string): string | null {
  const stored = localStorage.getItem(STORAGE_PREFIX + toolKey);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as { expiresAt: string };
    return parsed.expiresAt;
  } catch {
    return null;
  }
}

function setLocalExpiry(toolKey: string, expiresAt: string): void {
  localStorage.setItem(STORAGE_PREFIX + toolKey, JSON.stringify({ expiresAt }));
}

function clearLocalExpiry(toolKey: string): void {
  localStorage.removeItem(STORAGE_PREFIX + toolKey);
}

function endOfDayISO(): string {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return end.toISOString();
}

function getCooldownExpiry(toolKey: string): number | null {
  const stored = localStorage.getItem(COOLDOWN_PREFIX + toolKey);
  if (!stored) return null;
  const expiry = parseInt(stored, 10);
  if (Date.now() > expiry) {
    localStorage.removeItem(COOLDOWN_PREFIX + toolKey);
    return null;
  }
  return expiry;
}

function setCooldownExpiry(toolKey: string, minutes: number): void {
  const expiry = Date.now() + minutes * 60_000;
  localStorage.setItem(COOLDOWN_PREFIX + toolKey, String(expiry));
}

function getDailyUnlockCount(toolKey: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const stored = localStorage.getItem(DAILY_COUNT_PREFIX + toolKey);
  if (!stored) return 0;
  try {
    const parsed = JSON.parse(stored) as { date: string; count: number };
    if (parsed.date !== today) return 0;
    return parsed.count;
  } catch {
    return 0;
  }
}

function incrementDailyUnlockCount(toolKey: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const current = getDailyUnlockCount(toolKey);
  const next = current + 1;
  localStorage.setItem(DAILY_COUNT_PREFIX + toolKey, JSON.stringify({ date: today, count: next }));
  return next;
}

export function useRewardedAccess(toolKey: string): RewardedAccess {
  const [config, setConfig] = useState<DbRewardedToolConfig | null>(null);
  const [featureConfig, setFeatureConfig] = useState<DbRewardedFeatureConfig | null>(null);
  const [primaryProvider, setPrimaryProvider] = useState<DbAdProvider | null>(null);
  const [fallbackProvider, setFallbackProvider] = useState<DbAdProvider | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [adProviderUsed, setAdProviderUsed] = useState<string | null>(null);
  const [dailyUnlockCount, setDailyUnlockCount] = useState(0);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const clientHashRef = useRef<string>('');

  useEffect(() => {
    clientHashRef.current = getClientHash();
  }, []);

  const refresh = useCallback(async () => {
    if (!clientHashRef.current) clientHashRef.current = getClientHash();
    setLoading(true);
    setError(null);

    const [cfgRes, unlockRes, featRes] = await Promise.all([
      fetchRewardedToolConfig(toolKey),
      checkRewardedUnlock(toolKey, clientHashRef.current),
      supabase.from('rewarded_feature_config').select('*').eq('feature_key', toolKey).maybeSingle(),
    ]);

    setConfig(cfgRes.data);
    setFeatureConfig(featRes.data as DbRewardedFeatureConfig | null);

    if (cfgRes.error) setError(cfgRes.error);

    if (unlockRes.error) {
      setError(unlockRes.error);
    } else if (unlockRes.unlocked && unlockRes.expiresAt) {
      setIsUnlocked(true);
      setExpiresAt(unlockRes.expiresAt);
      setLocalExpiry(toolKey, unlockRes.expiresAt);
    } else {
      const localExpiry = getLocalExpiry(toolKey);
      if (localExpiry && new Date(localExpiry) > new Date()) {
        setIsUnlocked(true);
        setExpiresAt(localExpiry);
      } else {
        setIsUnlocked(false);
        setExpiresAt(null);
        clearLocalExpiry(toolKey);
      }
    }

    // Fetch provider details if config has provider IDs
    const cfg = cfgRes.data;
    const feat = featRes.data as DbRewardedFeatureConfig | null;
    const primaryId = feat?.primary_provider_id ?? cfg?.primary_provider_id;
    const fallbackId = feat?.fallback_provider_id ?? cfg?.fallback_provider_id;

    if (primaryId || fallbackId) {
      const ids = [primaryId, fallbackId].filter(Boolean) as string[];
      const { data: provData } = await supabase.from('ad_providers').select('*').in('id', ids);
      const providers = (provData as DbAdProvider[]) ?? [];
      setPrimaryProvider(primaryId ? providers.find((p) => p.id === primaryId) ?? null : null);
      setFallbackProvider(fallbackId ? providers.find((p) => p.id === fallbackId) ?? null : null);
    }

    // Check daily limit and cooldown
    setDailyUnlockCount(getDailyUnlockCount(toolKey));
    setIsCooldownActive(getCooldownExpiry(toolKey) !== null);

    setLoading(false);
  }, [toolKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-expire
  useEffect(() => {
    if (!expiresAt) return;
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      setIsUnlocked(false);
      setExpiresAt(null);
      clearLocalExpiry(toolKey);
      return;
    }
    const timer = setTimeout(() => {
      setIsUnlocked(false);
      setExpiresAt(null);
      clearLocalExpiry(toolKey);
    }, ms);
    return () => clearTimeout(timer);
  }, [expiresAt, toolKey]);

  // Cooldown ticker
  useEffect(() => {
    if (!isCooldownActive) return;
    const interval = setInterval(() => {
      if (getCooldownExpiry(toolKey) === null) {
        setIsCooldownActive(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isCooldownActive, toolKey]);

  const requestUnlock = useCallback(() => {
    if (isUnlocked) return;
    // Check daily limit
    const feat = featureConfig;
    const cfg = config;
    const dailyLimit = feat?.daily_usage_limit ?? cfg?.daily_usage_limit ?? 0;
    if (dailyLimit > 0 && getDailyUnlockCount(toolKey) >= dailyLimit) {
      setError(`Daily limit reached (${dailyLimit} unlocks per day). Please try again tomorrow.`);
      return;
    }
    // Check cooldown
    const cooldown = getCooldownExpiry(toolKey);
    if (cooldown) {
      const remaining = Math.ceil((cooldown - Date.now()) / 60_000);
      setError(`Please wait ${remaining} minute${remaining > 1 ? 's' : ''} before trying again.`);
      return;
    }
    setShowAdModal(true);
  }, [isUnlocked, featureConfig, config, toolKey]);

  const cancelUnlock = useCallback(() => {
    setShowAdModal(false);
    setAdLoading(false);
  }, []);

  const watchAd = useCallback(async () => {
    if (!config || !config.is_enabled) {
      setError('This feature is currently disabled.');
      return;
    }
    setAdLoading(true);
    setError(null);

    const clientHash = clientHashRef.current;
    const providerName = primaryProvider?.name ?? config.ad_provider ?? 'adsense';
    const providerId = primaryProvider?.id ?? null;
    const adUnitId = primaryProvider?.credentials?.ad_unit_id ?? config.ad_unit_id ?? null;

    // Log impression to both legacy and new analytics tables
    await logRewardedAdEvent({
      toolKey,
      eventType: 'impression',
      clientHash,
      adProvider: providerName,
    });
    await logAdEvent({
      event_type: 'impression',
      provider_id: providerId,
      tool_key: toolKey,
      client_hash: clientHash,
      metadata: { ad_unit_id: adUnitId, provider_slug: primaryProvider?.slug },
    });

    // No rewarded ad SDK is integrated yet. Surface an honest message
    // instead of simulating a successful ad watch.
    const failureMsg = featureConfig?.reward_rules?.failure_message
      ?? 'Rewarded ads are not available yet. Please check back later.';
    await logAdEvent({
      event_type: 'error',
      provider_id: providerId,
      tool_key: toolKey,
      client_hash: clientHash,
      metadata: { error: 'no_ad_provider_configured' },
    });
    await logRewardedAdEvent({
      toolKey,
      eventType: 'error',
      clientHash,
      adProvider: providerName,
    });
    setError(failureMsg);
    setAdLoading(false);
    return;

    // Log reward
    const revenue = 0.05;
    await logRewardedAdEvent({
      toolKey,
      eventType: 'reward',
      clientHash,
      adProvider: providerName,
      revenueEstimated: revenue,
    });
    await logAdEvent({
      event_type: 'reward',
      provider_id: providerId,
      tool_key: toolKey,
      client_hash: clientHash,
      revenue_estimated: revenue,
      metadata: { ad_unit_id: adUnitId },
    });

    // Determine unlock duration (feature config takes priority)
    const durationMinutes = featureConfig?.unlock_duration_minutes ?? config?.unlock_duration_hours ?? 60 * 60;
    let expiry: string;
    if (durationMinutes >= 1440) {
      expiry = endOfDayISO();
    } else {
      expiry = new Date(Date.now() + durationMinutes * 60_000).toISOString();
    }

    const { error: recError } = await recordRewardedUnlock({
      toolKey,
      clientHash,
      expiresAt: expiry,
      adProvider: providerName,
    });

    if (recError) {
      setError(recError);
      setAdLoading(false);
      return;
    }

    setLocalExpiry(toolKey, expiry);
    setIsUnlocked(true);
    setExpiresAt(expiry);
    setShowAdModal(false);
    setAdLoading(false);
    setAdProviderUsed(providerName);

    // Track daily count and set cooldown
    const newCount = incrementDailyUnlockCount(toolKey);
    setDailyUnlockCount(newCount);
    const cooldownMinutes = featureConfig?.cooldown_minutes ?? config?.cooldown_minutes ?? 0;
    if (cooldownMinutes > 0) {
      setCooldownExpiry(toolKey, cooldownMinutes);
      setIsCooldownActive(true);
    }
  }, [config, featureConfig, primaryProvider, toolKey]);

  return {
    toolKey,
    config,
    featureConfig,
    primaryProvider,
    fallbackProvider,
    isUnlocked,
    expiresAt,
    loading,
    error,
    showAdModal,
    adLoading,
    adProviderUsed,
    clientHash: clientHashRef.current,
    dailyUnlockCount,
    isCooldownActive,
    requestUnlock,
    cancelUnlock,
    watchAd,
    refresh,
  };
}

export function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const d = new Date(expiresAt);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `Unlocked until 11:59 PM today`;
  }
  return `Unlocked until ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
