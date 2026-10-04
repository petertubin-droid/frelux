/**
 * Canonical FRELUX admin status vocabulary.
 *
 * Exactly one word per meaning (Part 13 of the admin restructure):
 *   ACTIVE          working and in use
 *   INACTIVE        switched off on purpose (data/rows)
 *   IN DEVELOPMENT  being built, not ready
 *   UNVERIFIED      implemented but not yet proven against the backend
 *   ERROR           failing right now
 *   PLACEHOLDER     looks functional but is not (must never be concealed)
 *
 * Every status readout in the admin renders through StatusBadge so the
 * owner sees one consistent vocabulary everywhere.
 */

export const ADMIN_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "IN DEVELOPMENT",
  "UNVERIFIED",
  "ERROR",
  "PLACEHOLDER",
] as const;

export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export function statusTone(status: AdminStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "INACTIVE":
      return "bg-muted text-muted-foreground";
    case "IN DEVELOPMENT":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "UNVERIFIED":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "ERROR":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    case "PLACEHOLDER":
      return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400";
  }
}

/** Map arbitrary legacy words onto the canonical vocabulary. */
export function normalizeStatus(raw: string): AdminStatus {
  const s = raw.trim().toUpperCase();
  switch (s) {
    case "ACTIVE":
    case "ENABLED":
    case "LIVE":
    case "RUNNING":
    case "AVAILABLE":
      return "ACTIVE";
    case "INACTIVE":
    case "DISABLED":
    case "OFF":
      return "INACTIVE";
    default:
      return "UNVERIFIED";
  }
}
