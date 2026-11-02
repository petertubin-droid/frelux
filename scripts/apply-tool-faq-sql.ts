/**
 * Applies the generated tool FAQ migration to the project it points at, then
 * registers the version so the ledger stays level with the schema.
 *
 * The SQL is idempotent (create if not exists, upsert on slug), so running this
 * after every content change is safe. Usage: npm run faqs:apply
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const TOKEN = process.env.SUPABASE_ANON_KEY ?? "";

const projectRef = SUPABASE_URL.match(
  /https:\/\/([a-z0-9]+)\.supabase\.co/,
)?.[1];

if (!projectRef || !TOKEN) {
  console.error(
    "VITE_SUPABASE_URL and SUPABASE_ANON_KEY must be set. SUPABASE_ANON_KEY holds the personal access token used for management calls.",
  );
  process.exit(1);
}

const MIGRATION_VERSION = "20261031770000";

async function query(sql: string): Promise<unknown> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

const { readFileSync } = await import("node:fs");
const sql = readFileSync(
  "supabase/migrations/20261031770000_tool_faq_articles.sql",
  "utf8",
);

await query(sql);
await query(
  `insert into supabase_migrations.schema_migrations (version, name)
   values ('${MIGRATION_VERSION}', 'tool_faq_articles')
   on conflict (version) do nothing`,
);

const [summary] = (await query(
  `select count(*)::int as rows, coalesce(sum(question_count), 0)::int as questions,
          coalesce(sum(case when source = 'longform' then 1 else 0 end), 0)::int as longform
     from public.tool_faq_articles`,
)) as { rows: number; questions: number; longform: number }[];

console.log(
  `tool_faq_articles: ${summary.rows} rows, ${summary.questions} questions, ${summary.longform} long form`,
);
