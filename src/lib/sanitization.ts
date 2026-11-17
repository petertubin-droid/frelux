/**
 * FRELUX Central Security Sanitization Utilities
 *
 * Standardized sanitization functions across the platform to prevent:
 * 1. HTML Injection / Cross-Site Scripting (XSS) in print, document, and DOM outputs
 * 2. Protocol Injection (e.g. javascript:, vbscript:, data:) in user-supplied links
 * 3. Spreadsheet Formula Injection (CSV / Excel injection via =, +, -, @, \t, \r)
 */

/**
 * Escapes characters with special meaning in HTML to their respective character entities.
 * Safe for interpolating untrusted text into HTML element bodies and quoted attributes.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hasControlChars(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 31) || (code >= 127 && code <= 159)) {
      return true;
    }
  }
  return false;
}

/**
 * Validates and sanitizes web URLs (HTTP and HTTPS only).
 * Automatically normalizes bare domain names like 'example.com' or 'www.example.com' to 'https://...'.
 * Blocks dangerous schemes (javascript:, data:, vbscript:, file:) and invalid URLs.
 * Returns null if the URL is invalid or unsafe.
 */
export function sanitizeHttpUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  let trimmed = url.trim();
  if (!trimmed) return null;

  if (hasControlChars(trimmed)) {
    return null;
  }

  // If user entered "example.com" or "www.example.com", prepend https://
  if (/^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

const ALLOWED_MARKDOWN_SCHEMES = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
]);

/**
 * Validates URLs used in markdown rendering.
 * Allows safe absolute HTTP/HTTPS, mailto, tel, and relative internal links (/path, #hash).
 * Returns empty string if the URL attempts dangerous protocol execution.
 */
export function sanitizeMarkdownUrl(url: unknown): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (hasControlChars(trimmed)) {
    return "";
  }

  // Safe relative paths: /path, #hash, ./path, ?query
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("?") ||
    trimmed.startsWith("./")
  ) {
    // Block protocol-relative URLs (//evil.com)
    if (trimmed.startsWith("//")) {
      return "";
    }
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (ALLOWED_MARKDOWN_SCHEMES.has(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    return "";
  }

  return "";
}

/**
 * Sanitizes a cell for CSV export to prevent spreadsheet formula injection.
 * Spreadsheets (Excel, Google Sheets, Calc) treat cells starting with =, +, -, @, \t, \r
 * as formulas or DDE execution commands.
 *
 * Legitimate numbers (e.g. -42.50 or +10) are preserved as numeric literals.
 * Formula symbols or formula-like prefixes are prepended with a single quote (')
 * and enclosed in double quotes.
 */
export function sanitizeCsvCell(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  let str = typeof raw === "string" ? raw : String(raw);

  // Check if string might trigger formula execution in spreadsheets.
  // Strip only standard spaces before checking for formula triggers.
  const withoutSpaces = str.replace(/^[ \f\v]+/, "");
  if (/^[=@\t\r]/.test(withoutSpaces)) {
    str = `'${str}`;
  } else if (
    /^[+-]/.test(withoutSpaces) &&
    !/^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(withoutSpaces)
  ) {
    str = `'${str}`;
  }

  // Enclose in RFC 4180 quotes if it contains delimiter, quotes, newlines, tabs, or was formula-escaped
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r") ||
    str.includes("\t") ||
    str.startsWith("'")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}
