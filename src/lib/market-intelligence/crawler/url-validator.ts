/**
 * FRELUX DIRECT CRAWLER — URL Validator & SSRF Protection
 *
 * Validates URLs before any server-side fetch.
 * Prevents SSRF attacks by blocking private IPs, localhost, and internal protocols.
 */

import type { UrlValidationResult } from '@/types/crawler';

// ============================================================
// BLOCKED PROTOCOLS
// ============================================================

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '::1',
  '[::1]',
  'ip6-localhost',
]);

// Private/internal IP ranges (checked via parsed octets)
// 10.0.0.0/8
// 172.16.0.0/12
// 192.168.0.0/16
// 127.0.0.0/8
// 169.254.0.0/16 (link-local + cloud metadata)
// 0.0.0.0/8

// Cloud metadata endpoints
const CLOUD_METADATA_HOSTS = new Set([
  '169.254.169.254',     // AWS / GCP / Azure metadata
  'metadata.google.internal',
  'metadata',
  'fd00:ec2::254',       // AWS IPv6 metadata
]);

// ============================================================
// IP ADDRESS VALIDATION
// ============================================================

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }
  const [a, b] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (link-local + cloud metadata)
  if (a === 169 && b === 254) return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // ::1 loopback
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
  // fc00::/7 unique local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // fe80::/10 link-local
  if (lower.startsWith('fe8') || lower.startsWith('fe9') ||
      lower.startsWith('fea') || lower.startsWith('feb')) return true;
  return false;
}

function isIPAddress(hostname: string): boolean {
  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  // IPv6
  if (hostname.startsWith('[') || hostname.includes(':')) return true;
  return false;
}

// ============================================================
// URL VALIDATION
// ============================================================

export function validateUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, reason: 'URL is empty', sanitized: null, domain: null, protocol: null };
  }

  const trimmed = rawUrl.trim();

  // Reject obviously dangerous protocols
  if (/^(file|ftp|gopher|ws|wss|ldap|dict|sftp|tftp|jar|netdoc)/i.test(trimmed)) {
    return { valid: false, reason: 'Protocol not allowed', sanitized: null, domain: null, protocol: null };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Invalid URL format', sanitized: null, domain: null, protocol: null };
  }

  // Protocol check
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return {
      valid: false,
      reason: `Protocol "${parsed.protocol}" not allowed. Only http and https are supported.`,
      sanitized: null,
      domain: null,
      protocol: parsed.protocol,
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // Blocked hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, reason: `Blocked hostname: ${hostname}`, sanitized: null, domain: hostname, protocol: parsed.protocol };
  }

  // Cloud metadata endpoints
  if (CLOUD_METADATA_HOSTS.has(hostname)) {
    return { valid: false, reason: 'Cloud metadata endpoint blocked', sanitized: null, domain: hostname, protocol: parsed.protocol };
  }

  // IP address checks (SSRF protection)
  if (isIPAddress(hostname)) {
    const ipStr = hostname.replace(/^\[|\]$/g, '');

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ipStr)) {
      if (isPrivateIPv4(ipStr)) {
        return { valid: false, reason: `Private/internal IP blocked: ${ipStr}`, sanitized: null, domain: hostname, protocol: parsed.protocol };
      }
    }

    if (ipStr.includes(':')) {
      if (isPrivateIPv6(ipStr)) {
        return { valid: false, reason: `Private/internal IPv6 blocked: ${ipStr}`, sanitized: null, domain: hostname, protocol: parsed.protocol };
      }
    }
  }

  // Reject URLs with credentials embedded
  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'URLs with embedded credentials are not allowed', sanitized: null, domain: hostname, protocol: parsed.protocol };
  }

  // Reject port 0 and non-standard ports for metadata services
  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80;
  if (port === 0) {
    return { valid: false, reason: 'Port 0 is not allowed', sanitized: null, domain: hostname, protocol: parsed.protocol };
  }

  // Return sanitized URL (without credentials, with normalized path)
  const sanitized = parsed.toString();

  return {
    valid: true,
    reason: null,
    sanitized,
    domain: hostname,
    protocol: parsed.protocol,
  };
}

// ============================================================
// DOMAIN MATCHING — check if URL belongs to approved source domain
// ============================================================

export function isUrlInDomain(url: string, allowedDomain: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const domain = allowedDomain.toLowerCase().replace(/^\./, '');

    // Exact match
    if (hostname === domain) return true;
    // Subdomain match
    if (hostname.endsWith('.' + domain)) return true;

    return false;
  } catch {
    return false;
  }
}

// ============================================================
// SAME-DOMAIN CHECK
// ============================================================

export function isSameDomain(url1: string, url2: string): boolean {
  try {
    const h1 = new URL(url1).hostname.toLowerCase();
    const h2 = new URL(url2).hostname.toLowerCase();
    return h1 === h2;
  } catch {
    return false;
  }
}
