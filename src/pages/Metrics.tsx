import { useSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo";

/**
 * Public platform metrics - real, verifiable numbers, no vanity
 * inflation. Update the constants after each release (they are the
 * same numbers CI validates).
 */
const TOOLS_SHIPPED = 45; // calculators + construction tools (Oct 2026)
const TESTS_PASSING = 6627; // vitest suite, verified 2026-10-04
const TEST_FILES = 764;
const REPO = "petertubin-droid/frelux";

export default function Metrics() {
  useSeo({
    title: "Platform Metrics",
    description:
      "Public FRELUX platform metrics: tools shipped, test coverage, CI status, and platform health. Verified numbers, updated every release.",
    canonicalPath: "/metrics",
  });

  const stats = [
    {
      label: "Calculators & tools",
      value: `${TOOLS_SHIPPED}+`,
      note: "All free to run, no signup",
    },
    {
      label: "Tests passing",
      value: TESTS_PASSING.toLocaleString(),
      note: `${TEST_FILES} test files, enforced in CI`,
    },
    {
      label: "Deploy pipeline",
      value: "Green CI → auto-deploy",
      note: "Every push typechecked, tested, built",
    },
    {
      label: "Price-crawling markets",
      value: "1 live, expanding",
      note: "Nigeria live; US reference price book seeded",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold sm:text-4xl">Platform metrics</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Real numbers from the FRELUX build. Every release ships through CI:
        typecheck, {TESTS_PASSING.toLocaleString()} tests, build, then
        auto-deploy. Nothing here is hand-waved.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-14 text-2xl font-semibold">Platform status</h2>
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full bg-green-500"
            aria-hidden="true"
          />
          <span>Application: operational (Netlify edge deployment)</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full bg-green-500"
            aria-hidden="true"
          />
          <span>CI: every commit typechecked, tested, built before deploy</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full bg-green-500"
            aria-hidden="true"
          />
          <span>Database: Supabase (Postgres) with row-level security</span>
        </div>
      </div>

      <h2 className="mt-14 text-2xl font-semibold">
        For investors &amp; buyers
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        We maintain a full metrics pack: traffic (GA4), registered users,
        estimates run, MRR, churn, and revenue by source (ads vs subscriptions
        vs marketplace). Contact us for the current pack and the technical
        due-diligence binder.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Due-diligence material:{" "}
        <a className="text-primary underline" href={`${SITE_URL}/pricing`}>
          product surface
        </a>
        ,{" "}
        <a
          className="text-primary underline"
          href={`${SITE_URL}/construction-tools/`}
        >
          tool library
        </a>
        . Source repository: <code>{REPO}</code> (private; access on request
        during diligence).
      </p>
    </div>
  );
}
