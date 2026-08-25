/**
 * FRELUX SOURCE TRACKING — Engine
 *
 * Tracks the origin of every piece of roof data:
 *   - plan_import: traced from an imported plan file
 *   - manual: user entered manually
 *   - ai_estimated: AI estimated from image analysis
 *   - calculated: derived from other data
 *   - imported: imported from another project
 *
 * Every measurement, geometry vertex, pitch, and area has a source.
 * The source is displayed in the UI and included in reports.
 *
 * Feature 12: Source Tracking
 * Feature 13: Audit Trail (combined — audit entries reference sources)
 */

// =========================================================
// Source Types
// =========================================================

export type DataSource =
  | 'plan_import'
  | 'manual'
  | 'ai_estimated'
  | 'calculated'
  | 'imported'
  | 'default';

export interface SourceRecord {
  /** What this source refers to */
  field: string;
  /** Source type */
  source: DataSource;
  /** Human-readable description */
  description: string;
  /** Timestamp when the source was set */
  timestamp: string;
  /** Whether this source has been user-verified */
  verified: boolean;
  /** Confidence if AI-estimated (0-1) */
  aiConfidence?: number;
  /** Reference to plan file if from plan import */
  planFileId?: string;
}

// =========================================================
// Audit Trail
// =========================================================

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'verify'
  | 'estimate'
  | 'calculate'
  | 'import'
  | 'confirm';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  /** What was changed (field path, e.g. "section.pitchDegrees") */
  target: string;
  /** Previous value (stringified) */
  oldValue?: string;
  /** New value (stringified) */
  newValue?: string;
  /** Source of the change */
  source: DataSource;
  /** User note */
  note?: string;
}

export interface AuditTrail {
  entries: AuditEntry[];
}

// =========================================================
// Audit Trail Management
// =========================================================

let auditIdCounter = 0;

function createAuditId(): string {
  auditIdCounter += 1;
  return `audit_${Date.now()}_${auditIdCounter}`;
}

export function createAuditEntry(
  action: AuditAction,
  target: string,
  source: DataSource,
  options: {
    oldValue?: string;
    newValue?: string;
    note?: string;
  } = {},
): AuditEntry {
  return {
    id: createAuditId(),
    timestamp: new Date().toISOString(),
    action,
    target,
    source,
    oldValue: options.oldValue,
    newValue: options.newValue,
    note: options.note,
  };
}

export function appendAuditEntry(
  trail: AuditTrail,
  entry: AuditEntry,
): AuditTrail {
  return { entries: [...trail.entries, entry] };
}

export function createEmptyAuditTrail(): AuditTrail {
  return { entries: [] };
}

/**
 * Get audit entries for a specific target (field path).
 */
export function getAuditForTarget(
  trail: AuditTrail,
  target: string,
): AuditEntry[] {
  return trail.entries.filter(e => e.target === target || e.target.startsWith(target + '.'));
}

/**
 * Get the most recent audit entry for a target.
 */
export function getLatestAuditForTarget(
  trail: AuditTrail,
  target: string,
): AuditEntry | null {
  const entries = getAuditForTarget(trail, target);
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

/**
 * Filter audit entries by source type.
 */
export function getAuditBySource(
  trail: AuditTrail,
  source: DataSource,
): AuditEntry[] {
  return trail.entries.filter(e => e.source === source);
}

/**
 * Get all AI-estimated entries that haven't been verified.
 */
export function getUnverifiedAiEstimates(trail: AuditTrail): AuditEntry[] {
  return trail.entries.filter(
    e => e.source === 'ai_estimated' && e.action !== 'verify'
  );
}

// =========================================================
// Source Display
// =========================================================

export const SOURCE_LABELS: Record<DataSource, string> = {
  plan_import: 'From Plan Import',
  manual: 'Manual Entry',
  ai_estimated: 'AI Estimated',
  calculated: 'Calculated',
  imported: 'Imported',
  default: 'Default Value',
};

export const SOURCE_COLORS: Record<DataSource, string> = {
  plan_import: '#3b82f6',   // blue
  manual: '#10b981',         // green
  ai_estimated: '#f59e0b',  // amber
  calculated: '#8b5cf6',    // purple
  imported: '#06b6d4',       // cyan
  default: '#9ca3af',        // gray
};

/**
 * Whether a source type requires user verification.
 */
export function requiresVerification(source: DataSource): boolean {
  return source === 'ai_estimated' || source === 'imported';
}

// =========================================================
// Source Record Factory
// =========================================================

export function createSourceRecord(
  field: string,
  source: DataSource,
  description: string,
  options: {
    verified?: boolean;
    aiConfidence?: number;
    planFileId?: string;
  } = {},
): SourceRecord {
  return {
    field,
    source,
    description,
    timestamp: new Date().toISOString(),
    verified: options.verified ?? false,
    aiConfidence: options.aiConfidence,
    planFileId: options.planFileId,
  };
}

/**
 * Mark a source record as verified.
 */
export function verifySourceRecord(record: SourceRecord): SourceRecord {
  return { ...record, verified: true, timestamp: new Date().toISOString() };
}
