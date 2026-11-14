/**
 * Refuses to build against the wrong Supabase project.
 *
 * FRELUX has two Supabase projects, and they are easy to confuse:
 *
 *   nfgaaohweygwydoelxnf  FRELUX production ("freluxproject") - real users,
 *                         real estimates, the data the ledger targets.
 *   hqhvlkunkdrxyuvziorm  ARCHIE ("Freluxtools") - a separate product.
 *
 * A build configured with the ARCHIE credentials looks completely healthy: it
 * signs in, it saves, and its admin user list shows one account. That is how a
 * deploy went out reading the wrong database and appeared to have "lost" six
 * real users - nothing was deleted, it was pointed at the other project.
 *
 * So the URL is checked at build time. Staging or a deliberate ARCHIE build can
 * opt out with ALLOW_NON_PRODUCTION_SUPABASE=1.
 */

const PRODUCTION_REF = "nfgaaohweygwydoelxnf";
const OTHER_KNOWN_REFS = {
  hqhvlkunkdrxyuvziorm: "ARCHIE (a separate product, not FRELUX production)",
};

function projectRef(url) {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return null;
  }
}

const url = (process.env.VITE_SUPABASE_URL ?? "").trim();

if (!url) {
  // Local dev and CI run without a database; nothing to verify.
  console.log("supabase-target: VITE_SUPABASE_URL not set, skipping check");
  process.exit(0);
}

const ref = projectRef(url);
const override = process.env.ALLOW_NON_PRODUCTION_SUPABASE === "1";

if (ref === PRODUCTION_REF) {
  console.log(`supabase-target: ok (${PRODUCTION_REF})`);
  process.exit(0);
}

const description = OTHER_KNOWN_REFS[ref] ?? "an unrecognised Supabase project";
const message = [
  "",
  "supabase-target: this build is not pointed at FRELUX production.",
  "",
  `  VITE_SUPABASE_URL = ${ref ? `https://${ref}.supabase.co` : url}`,
  `  that project is    ${description}`,
  `  production is      https://${PRODUCTION_REF}.supabase.co`,
  "",
  "FRELUX data lives in production. An ARCHIE build signs in and saves normally,",
  "but it reads and writes a different database - which is how a deploy shipped",
  "with one admin instead of the real accounts.",
  "",
  "Fix the deployment's VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or set",
  "ALLOW_NON_PRODUCTION_SUPABASE=1 if this build really is meant for ARCHIE.",
  "",
].join("\n");

if (override) {
  console.warn(message);
  console.warn("supabase-target: continuing because ALLOW_NON_PRODUCTION_SUPABASE=1");
  process.exit(0);
}

console.error(message);
process.exit(1);
