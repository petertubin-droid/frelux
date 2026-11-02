// Validation for third-party analytics identifiers.
//
// These IDs come from admin settings and end up interpolated into inline
// script text, so a strict format check is the only thing standing between a
// compromised settings row and script injection.

export const GA_MEASUREMENT_ID_RE = /^G-[A-Z0-9]{6,12}$/;
export const GTM_CONTAINER_ID_RE = /^GTM-[A-Z0-9]{4,9}$/;
export const META_PIXEL_ID_RE = /^\d{8,25}$/;

export function isValidGaMeasurementId(id: string): boolean {
  return GA_MEASUREMENT_ID_RE.test(id);
}

export function isValidGtmContainerId(id: string): boolean {
  return GTM_CONTAINER_ID_RE.test(id);
}

export function isValidMetaPixelId(id: string): boolean {
  return META_PIXEL_ID_RE.test(id);
}
