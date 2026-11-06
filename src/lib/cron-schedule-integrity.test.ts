import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationsDir = join(root, "supabase/migrations");

const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((file) => ({
    file,
    version: Number(file.split("_", 1)[0]) || 0,
    sql: readFileSync(join(migrationsDir, file), "utf8"),
  }));

function latestScheduling(jobName: string) {
  const matches = migrations.filter(
    (m) => m.sql.includes("cron.schedule(") && m.sql.includes(jobName),
  );
  return matches[matches.length - 1];
}

describe("cron schedule integrity", () => {
  it("schedules the digest jobs with a json object, not one argument", () => {
    // jsonb_build_object('{}') raises "argument list must have even number of
    // elements" at run time, which is how signup-digest-daily failed at 07:05
    // and how price-digest-weekly failed every Monday before that.
    for (const job of [
      "signup-digest-daily",
      "product-updates-digest",
      "price-digest-weekly",
    ]) {
      const latest = latestScheduling(job);
      expect(latest, `no migration schedules ${job}`).toBeTruthy();
      expect(latest!.sql).toContain("'{}'::jsonb");
      expect(latest!.sql).not.toContain("jsonb_build_object('{}')");
    }
  });

  it("refuses to leave a single-argument body in a live job", () => {
    const repair = migrations.find(
      (m) => m.file === "20261106170000_fix_single_arg_jsonb_cron.sql",
    );
    expect(repair).toBeTruthy();
    expect(repair!.sql).toContain(
      "cron jobs still build a json object from one argument",
    );
    // Unschedule before reschedule so the schedule does not double up.
    expect(repair!.sql.match(/cron\.unschedule/g)?.length).toBe(2);
  });

  it("seeds the attribution account before any migration references it", () => {
    // Supabase Preview replays against an empty database. 27 files attribute
    // editorial review to the owner account, whose row exists only in
    // production, so the replay stopped on the first foreign key.
    const ownerId = "d74ffbd7-281b-4445-9728-ad87c287e0b9";
    const seed = migrations.find((m) => m.file.startsWith("20260101000000"));
    expect(seed, "attribution seed migration missing").toBeTruthy();
    expect(seed!.sql).toContain(ownerId);
    expect(seed!.sql).toContain("on conflict (id) do nothing");
    expect(seed!.sql).toContain("owner attribution row missing after seed");

    const firstReference = migrations.find(
      (m) => m.version > seed!.version && m.sql.includes(ownerId),
    );
    expect(firstReference!.version).toBeGreaterThan(seed!.version);

    const earliest = migrations[0]!;
    expect(seed!.version).toBeLessThanOrEqual(earliest.version);
  });
});
