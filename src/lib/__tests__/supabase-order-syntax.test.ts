import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards against PostgREST ordering written as SQL.
 *
 * supabase-js `order()` takes a column name and an options object:
 *
 *   .order("created_at", { ascending: false })
 *
 * Writing `.order("created_at DESC")` compiles, type-checks and passes every
 * mock-based test, then fails in production with
 *
 *   42703: column pro_messages.created_at DESC does not exist
 *
 * and because the callers treat an error as "no rows", the failure looks like
 * empty data rather than an error. That is how a sent message vanished from the
 * thread and thirteen Pro Connect lists (reviews, verification requests and
 * documents, credentials, the admin report queues) came back blank. A type
 * checker cannot see it, so this reads the source.
 */

const ROOTS = ["src", "supabase/functions"];
const SQL_ORDER = /\.order\(\s*(["'`])[A-Za-z_][\w.]*\s+(asc|desc)\b[^"'`]*\1/i;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      if (entry === "node_modules" || entry === "vendor") continue;
      out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("supabase order() calls", () => {
  it("never pass a column plus a direction as one string", () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const file of sourceFiles(join(process.cwd(), root))) {
        const lines = readFileSync(file, "utf8").split("\n");
        lines.forEach((line, index) => {
          if (SQL_ORDER.test(line)) {
            offenders.push(`${file.replace(process.cwd() + "/", "")}:${index + 1}  ${line.trim()}`);
          }
        });
      }
    }
    expect(
      offenders,
      'use .order("column", { ascending: boolean }) instead of .order("column DESC")',
    ).toEqual([]);
  });

  it("recognises the shape it is meant to catch", () => {
    // A guard that matches nothing would pass forever, so pin the pattern.
    expect(SQL_ORDER.test('.order("created_at DESC")')).toBe(true);
    expect(SQL_ORDER.test(".order('created_at ASC')")).toBe(true);
    expect(SQL_ORDER.test('.order("created_at", { ascending: false })')).toBe(false);
    expect(SQL_ORDER.test('.order("created_at")')).toBe(false);
  });
});
