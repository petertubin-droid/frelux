/** Return only a same-origin app path for post-auth navigation. */
export function getSafeAuthRedirect(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }
  try {
    const parsed = new URL(value, "https://frelux.invalid");
    if (parsed.origin !== "https://frelux.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
