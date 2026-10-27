# MUST DO — Sustainability Pillar 5 go-live blockers

The Pillar 5 EPD integration (commit `fe1007e2`) is fully coded, tested and
pushed, but live EC3 lookups need two manual steps the repo cannot do for
itself. Until they are done, the CarbonFootprint page honestly refuses EPD
data and falls back to admin-configured carbon factors with a visible
notice. No number is ever invented.

## 1. Get an EC3 API key from Building Transparency

- Register at https://buildingtransparency.org and request API access
  (EC3 account → API → request a key).
- The key is a personal/org credential: only the OWNER can obtain it —
  it cannot be generated from the repo.

## 2. Configure + deploy the edge function

Once the key exists:

1. **Set the secret on the live Supabase project** (`Freluxtools`, NOT the
   unused `Frelukx` project):
   - Supabase Dashboard → Edge Functions → `ec3-epd-lookup` → Secrets
   - Add: `EC3_API_KEY = <the key>`
   - (CLI alternative: `supabase secrets set EC3_API_KEY=... --project-ref <freluxproject-ref>`)
2. **Deploy the function** to the live project:
   - `supabase functions deploy ec3-epd-lookup --project-ref <freluxproject-ref>`
   - (or Dashboard → Edge Functions → deploy from the repo)
3. **Apply the DB migration** `20261027190000_carbon_factors_rics_epd.sql`
   (adds `module_stage` / `epd_id` / `epd_plant` to `carbon_factors` with the
   RICS check constraint) if migrations are not auto-applied.
4. **Verify**: open the CarbonFootprint page — the green notice should read
   "Plant-specific verified EPDs loaded from Building Transparency EC3".
   If it still shows the amber refusal notice, check the function logs
   (`supabase functions logs ec3-epd-lookup`) for the exact reason.

## Notes

- Without the key the platform behaves correctly: static admin factors,
  visible amber notice, no crash, no guessed numbers.
- The key must ONLY ever live in the edge function env — never in the
  bundle, repo, or client code (enforced by the architecture).
- Double-check the EC3 search endpoint path (`/api/ec3/epds/v2`) against
  the current EC3 API docs on first live use; the function passes upstream
  statuses through so a moved endpoint surfaces honestly as a 404 refusal
  rather than a silent failure.
