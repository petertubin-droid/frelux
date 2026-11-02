import type { ConfigurationValueStatus } from "./market-configuration";
export interface CalculationIssue { code: string; message: string; field?: string }
export interface AuditableCalculationResult<T> {
 engine: string; engineVersion: string; status: "valid" | "invalid"; outputs: T | null; units: Readonly<Record<string, string>>;
 methodology: string; assumptions: readonly string[]; wastage: { percent: number; applied: boolean; method: string };
 rounding: { internal: "IEEE-754 double precision"; purchase: string; display: string }; configurationVersion: string | null;
 material: { name: string; status: ConfigurationValueStatus; source: string | null } | null;
 errors: readonly CalculationIssue[]; warnings: readonly string[];
}
export const DEFAULT_CALCULATION_VERSION = "1.0.0";
