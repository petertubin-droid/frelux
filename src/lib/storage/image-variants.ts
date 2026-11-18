/**
 * Image variants for Worker-hosted objects.
 *
 * The file Worker can return a resized, modern-format variant of any stored
 * image (`?w=`, `?h=`, `?q=`), cached immutably at the edge. Photos uploaded
 * from a phone are often several megabytes and a card needs a few hundred
 * pixels, so asking for the size the layout actually uses is the difference
 * between a responsive grid and a slow one on mobile data.
 *
 * Anything not served by the Worker, or a URL that already carries a width, is
 * returned untouched: this must never break an external image.
 */
const WORKER_HOSTS = ["files.freluxtools.com", "api.freluxtools.com"];

function workerBase(): string[] {
  const configured = (import.meta.env.VITE_R2_WORKER_URL as string | undefined)
    ?.trim()
    .replace(/\/+$/, "");
  const hosts = new Set(WORKER_HOSTS);
  if (configured) {
    try {
      hosts.add(new URL(configured).host);
    } catch {
      // A malformed variable must not stop the known hosts from working.
    }
  }
  return [...hosts];
}

export interface ImageVariantOptions {
  width?: number;
  height?: number;
  /** 1-100; the Worker defaults to 82 when omitted. */
  quality?: number;
}

export function sizedImageUrl(
  url: string | null | undefined,
  options: ImageVariantOptions,
): string {
  if (!url) return "";
  let parsed: URL;
  try {
    parsed = new URL(url, "https://freluxtools.com");
  } catch {
    return url;
  }
  if (!workerBase().includes(parsed.host)) return url;
  if (parsed.searchParams.has("w") || parsed.searchParams.has("h")) return url;
  if (options.width) parsed.searchParams.set("w", String(Math.round(options.width)));
  if (options.height)
    parsed.searchParams.set("h", String(Math.round(options.height)));
  if (options.quality)
    parsed.searchParams.set("q", String(Math.round(options.quality)));
  return parsed.toString();
}

/**
 * `srcset` for the widths a card, a detail view and a full-bleed header need.
 * The browser picks one, so a phone never downloads the desktop size.
 */
export function imageSrcSet(
  url: string | null | undefined,
  widths: number[],
  quality = 78,
): string | undefined {
  if (!url) return undefined;
  const sized = widths
    .map((width) => `${sizedImageUrl(url, { width, quality })} ${width}w`)
    .filter((entry) => !entry.startsWith(" "));
  return sized.length > 1 ? sized.join(", ") : undefined;
}
