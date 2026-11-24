/**
 * Masking for national identity numbers.
 *
 * A NIN or passport number is permanent and cannot be reissued the way a
 * password can, so it should not sit in plain sight in a list that an operator
 * screenshares, photographs or leaves open on a second monitor. The admin table
 * shows the last four digits and the ID type, which is enough to confirm a
 * record is present and to tell two people apart, and the full value stays one
 * deliberate action away in the editor.
 *
 * Masking is a display rule, not a security control: it does not change what is
 * stored. The database is the place that decides who may read the value at all
 * (profiles is own-or-admin), and this keeps the number off screen for everyone
 * else in the room.
 */

/** Characters kept visible at the end of a masked number. */
const VISIBLE_TAIL = 4;

/**
 * `12345678901` -> `•••••••8901`.
 *
 * Short values are masked in full rather than partially: a four-character
 * passport number whose last four are shown would be shown in its entirety.
 */
export function maskIdentityNumber(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (raw.length <= VISIBLE_TAIL) {
    return "•".repeat(raw.length);
  }
  return "•".repeat(raw.length - VISIBLE_TAIL) + raw.slice(-VISIBLE_TAIL);
}

/** True when the stored value is already short enough that masking hides all of it. */
export function isFullyMasked(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  return raw.length > 0 && raw.length <= VISIBLE_TAIL;
}
