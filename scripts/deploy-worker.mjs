#!/usr/bin/env node
/**
 * Deploys the FRELUX file Worker through the Cloudflare API.
 *
 * Wrangler is the usual tool, but this account authenticates with an
 * account-owned API token, so the deploy is done directly: bundle with esbuild,
 * then PUT the script with its bindings in the metadata. The R2 buckets must
 * already exist (see docs/cloudflare-r2-workers.md).
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/deploy-worker.mjs
 *   node scripts/deploy-worker.mjs --domain files.freluxtools.com --zone <zone id>
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WORKER_NAME = "frelux-files";
const BUCKETS = [
  ["BUCKET_AVATARS", "frelux-avatars"],
  ["BUCKET_BRAND_ASSETS", "frelux-brand-assets"],
  ["BUCKET_MARKETPLACE", "frelux-marketplace"],
  ["BUCKET_PLAN_DOCUMENTS", "frelux-plan-documents"],
  ["BUCKET_PRO_VERIFICATION", "frelux-pro-verification"],
];

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !accountId) {
  console.error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required");
  process.exit(1);
}

const argValue = (flag) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
};

/** Reads a key from .env.local without exposing it on the command line. */
function envValue(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    try {
      const line = readFileSync(file, "utf8")
        .split("\n")
        .find((entry) => entry.startsWith(`${name}=`));
      if (line)
        return line
          .slice(name.length + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
    } catch {
      // file absent, keep looking
    }
  }
  return "";
}

const supabaseUrl = envValue("VITE_SUPABASE_URL");
const supabaseAnonKey = envValue("VITE_SUPABASE_ANON_KEY");
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are needed as Worker vars",
  );
  process.exit(1);
}

const workdir = mkdtempSync(join(tmpdir(), "frelux-worker-"));
const bundlePath = join(workdir, "worker.mjs");

console.log("bundling cloudflare/src/index.ts");
execFileSync(
  "npx",
  [
    "esbuild",
    "cloudflare/src/index.ts",
    "--bundle",
    "--format=esm",
    "--target=es2022",
    "--platform=neutral",
    `--outfile=${bundlePath}`,
    "--log-level=warning",
  ],
  { stdio: "inherit" },
);

const metadata = {
  main_module: "worker.mjs",
  compatibility_date: "2026-11-01",
  bindings: [
    { type: "plain_text", name: "SUPABASE_URL", text: supabaseUrl },
    { type: "plain_text", name: "SUPABASE_ANON_KEY", text: supabaseAnonKey },
    {
      type: "plain_text",
      name: "ALLOWED_ORIGINS",
      text: "https://freluxtools.com,https://www.freluxtools.com,http://localhost:5173",
    },
    {
      type: "plain_text",
      name: "PUBLIC_BASE_URL",
      text: "https://files.freluxtools.com",
    },
    ...BUCKETS.map(([name, bucket_name]) => ({
      type: "r2_bucket",
      name,
      bucket_name,
    })),
  ],
};

const form = new FormData();
form.append(
  "metadata",
  new Blob([JSON.stringify(metadata)], { type: "application/json" }),
);
form.append(
  "worker.mjs",
  new Blob([readFileSync(bundlePath)], {
    type: "application/javascript+module",
  }),
  "worker.mjs",
);

console.log(`uploading ${WORKER_NAME}`);
const upload = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${WORKER_NAME}`,
  { method: "PUT", headers: { authorization: `Bearer ${token}` }, body: form },
);
const uploadBody = await upload.json().catch(() => ({}));
if (!upload.ok) {
  console.error("upload failed", upload.status, JSON.stringify(uploadBody));
  rmSync(workdir, { recursive: true, force: true });
  process.exit(1);
}
console.log("script uploaded:", uploadBody.result?.id ?? WORKER_NAME);

const domain = argValue("--domain");
const zone = argValue("--zone");
if (domain) {
  if (!zone) {
    console.error("--domain needs --zone <zone id>");
    process.exit(1);
  }
  console.log(`attaching ${domain}`);
  const attach = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        zone_id: zone,
        hostname: domain,
        service: WORKER_NAME,
        environment: "production",
      }),
    },
  );
  const attachBody = await attach.json().catch(() => ({}));
  console.log(
    attach.ok
      ? `domain attached: ${domain}`
      : `domain failed: ${JSON.stringify(attachBody)}`,
  );
}

rmSync(workdir, { recursive: true, force: true });
console.log("done");
