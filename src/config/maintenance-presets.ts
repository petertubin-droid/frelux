/**
 * Preset maintenance ticker messages an administrator can drop into the banner
 * without writing copy from scratch. The admin can still type anything; these
 * exist so the common announcements are one click and read consistently.
 *
 * Kept in code rather than the database: they are editorial defaults, not
 * configuration, and the live message is what the banner actually renders.
 */
export type MaintenancePreset = {
  id: string;
  /** Short name shown on the preset button in the admin panel. */
  label: string;
  /** The sentence that scrolls across the site. */
  message: string;
};

export const MAINTENANCE_PRESETS: MaintenancePreset[] = [
  {
    id: "scheduled-tonight",
    label: "Scheduled tonight",
    message:
      "Scheduled maintenance tonight, 11:00 pm to 1:00 am. Calculators and checkout may be briefly unavailable.",
  },
  {
    id: "in-progress",
    label: "Work in progress",
    message:
      "We're updating FRELUX right now. Some tools may load slowly or show older prices for a few minutes.",
  },
  {
    id: "payments",
    label: "Payment maintenance",
    message:
      "Payment maintenance in progress. New orders resume shortly; anything already paid is safe and unaffected.",
  },
  {
    id: "prices",
    label: "Price data refresh",
    message:
      "Refreshing local material prices across all markets. Estimates may lag for the next hour while we sync.",
  },
  {
    id: "degraded",
    label: "Slow performance",
    message:
      "Some parts of FRELUX are running slower than usual while we stabilise the servers. Thanks for bearing with us.",
  },
  {
    id: "all-clear",
    label: "Maintenance finished",
    message:
      "Maintenance complete. Everything is back up and running normally. Thank you for your patience.",
  },
];
