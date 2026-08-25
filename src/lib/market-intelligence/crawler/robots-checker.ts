/**
 * FRELUX DIRECT CRAWLER — Robots.txt Checker
 *
 * Fetches and parses robots.txt for a domain.
 * Respects disallow rules and crawl-delay directives.
 * Does NOT bypass robots.txt.
 */

import type { RobotsRule } from '@/types/crawler';

// ============================================================
// ROBOTS.TXT CACHE (per domain, per session)
// ============================================================

const robotsCache = new Map<string, { rules: Map<string, RobotsRule>; fetchedAt: number }>();

const CACHE_TTL_MS = 3600_000; // 1 hour

// ============================================================
// FETCH ROBOTS.TXT
// ============================================================

export async function fetchRobotsTxt(
  domain: string,
  protocol: string = 'https',
  userAgent: string = 'FRELUX-Market-Intelligence-Bot',
): Promise<Map<string, RobotsRule>> {
  const cacheKey = domain;
  const cached = robotsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rules;
  }

  const rules = new Map<string, RobotsRule>();
  const robotsUrl = `${protocol}://${domain}/robots.txt`;

  try {
    const response = await fetch(robotsUrl, {
      method: 'GET',
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    if (!response.ok) {
      // No robots.txt or error — default to allowed
      rules.set('*', { allowed: true, crawlDelay: null });
      robotsCache.set(cacheKey, { rules, fetchedAt: Date.now() });
      return rules;
    }

    const text = await response.text();
    parseRobotsTxt(text, userAgent, rules);
  } catch {
    // If we can't fetch robots.txt, default to allowed (conservative assumption)
    rules.set('*', { allowed: true, crawlDelay: null });
  }

  robotsCache.set(cacheKey, { rules, fetchedAt: Date.now() });
  return rules;
}

// ============================================================
// PARSE ROBOTS.TXT
// ============================================================

function parseRobotsTxt(
  text: string,
  userAgent: string,
  rules: Map<string, RobotsRule>,
): void {
  const lines = text.split('\n');
  let currentUserAgents: string[] = [];
  let inRelevantSection = false;
  let crawlDelay: number | null = null;
  let disallowedPaths: string[] = [];

  const uaLower = userAgent.toLowerCase();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const directive = trimmed.substring(0, colonIdx).trim().toLowerCase();
    const value = trimmed.substring(colonIdx + 1).trim();

    if (directive === 'user-agent') {
      // If we were in a relevant section, save its rules
      if (inRelevantSection && currentUserAgents.length > 0) {
        for (const _ua of currentUserAgents) {
          for (const path of disallowedPaths) {
            rules.set(path, { allowed: false, crawlDelay });
          }
        }
      }

      currentUserAgents = [value.toLowerCase()];
      inRelevantSection = value === '*' || uaLower.includes(value.toLowerCase());
      disallowedPaths = [];
      crawlDelay = null;
      continue;
    }

    if (!inRelevantSection) continue;

    if (directive === 'disallow') {
      if (value === '') {
        // Empty disallow = allow everything
        continue;
      }
      disallowedPaths.push(value);
    } else if (directive === 'allow') {
      // Explicit allow overrides disallow for specific paths
      rules.set(value, { allowed: true, crawlDelay });
    } else if (directive === 'crawl-delay') {
      crawlDelay = parseFloat(value) || null;
    }
  }

  // Save final section
  if (inRelevantSection && currentUserAgents.length > 0) {
    for (const path of disallowedPaths) {
      rules.set(path, { allowed: false, crawlDelay });
    }
  }

  // If no rules were found, default to allowed
  if (rules.size === 0) {
    rules.set('*', { allowed: true, crawlDelay: null });
  }
}

// ============================================================
// CHECK IF URL IS ALLOWED
// ============================================================

export function isUrlAllowed(
  url: string,
  rules: Map<string, RobotsRule>,
): { allowed: boolean; crawlDelay: number | null } {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.search;

    // Check specific path rules
    for (const [pattern, rule] of rules.entries()) {
      if (pattern === '*') continue;

      // Exact match
      if (path === pattern) {
        return rule;
      }

      // Prefix match (robots.txt uses prefix matching)
      if (path.startsWith(pattern)) {
        return rule;
      }
    }

    // Check wildcard rule
    const wildcard = rules.get('*');
    if (wildcard) {
      return wildcard;
    }

    // Default: allowed
    return { allowed: true, crawlDelay: null };
  } catch {
    return { allowed: false, crawlDelay: null };
  }
}

// ============================================================
// CLEAR CACHE
// ============================================================

export function clearRobotsCache(): void {
  robotsCache.clear();
}
