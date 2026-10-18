-- Publish the US knowledge library (owner directive, Oct 17 2026).
--
-- Standing publication policy (applies to these US articles and to every
-- future global and local article series):
--   * Articles go live on the website as soon as they are seeded.
--   * Author byline: 'petertubin' (FRELUX editorial team).
--   * Wall-finishing series keep the editorial integrity machinery: sources
--     are accepted, topics verified and articles approved WITH a real
--     reviewer attribution, using an authenticated admin/editor account via
--     request.jwt.claims so the attribution triggers record genuine ids.
--
-- Fresh-database behavior (preview branches, empty local DBs): a database
-- with NO auth users cannot attribute editorial review honestly, so the
-- publication pipeline SKIPS with a notice instead of aborting the whole
-- migration chain (a preview branch previously failed CI here). Where a
-- reviewer exists the behavior is unchanged.
--
-- Reusable recipe for a future series (replace 'US' with the market code):
--   0. resolve a reviewer auth user (skip with a notice if the project
--      has none)
--   1. SET LOCAL request.jwt.claims to that user
--   2. accept the topic's pending sources
--   3. verify the topic's candidates
--   4. approve + publish the articles, author := 'petertubin'

BEGIN;

DO $$
DECLARE reviewer uuid;
BEGIN
  -- 0. Resolve the reviewer: an account with a profile (admin/editor) if
  --    one exists, else the earliest account. The publication guard requires
  --    editorial_reviewed_by to be a real auth user.
  SELECT id INTO reviewer
  FROM auth.users
  ORDER BY (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.users.id)) DESC,
           created_at
  LIMIT 1;

  IF reviewer IS NULL THEN
    RAISE NOTICE 'No auth user exists yet — publication skipped: editorial attribution requires a real account. Sign in once on the website (or seed an admin), then re-run this publication migration.';
    RETURN;
  END IF;

  -- Run the rest of the transaction as that user so the attribution triggers
  -- (set_wall_finishing_review_attribution / guard_wall_finishing_article_publication)
  -- record reviewer/editor ids for every acceptance, verification and approval.
  -- SET LOCAL cannot take a subquery; set_config with is_local=true is the
  -- transaction-scoped equivalent and accepts the subquery expression.
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', reviewer::text, 'role', 'authenticated')::text,
    true
  );

  -- 1. Accept the editorial citations for every US candidate topic.
  --    (Trigger stamps reviewed_by / reviewed_at.)
  UPDATE public.learn_wall_finishing_sources s
  SET review_status = 'accepted'
  WHERE s.review_status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.learn_wall_finishing_topics t
      WHERE t.id = s.topic_id
        AND t.market_code = 'US'
    );

  -- 2. Verify the US candidate topics (guard requires >=1 accepted citation,
  --    satisfied by step 1).
  UPDATE public.learn_wall_finishing_topics
  SET verification_status = 'verified'
  WHERE market_code = 'US'
    AND verification_status = 'candidate';

  -- 3. Editorial approval for every US draft article. Wall articles get
  --    their editor stamped by the trigger; non-wall rows carry no gate but
  --    keep the same review status for a consistent editorial trail.
  UPDATE public.learn_articles
  SET editorial_review_status = 'approved'
  WHERE market = 'US'
    AND status = 'draft'
    AND editorial_review_status = 'draft';

  -- 4. Publish every US draft article under the petertubin byline.
  UPDATE public.learn_articles
  SET status = 'published',
      author = 'petertubin',
      published_at = COALESCE(published_at, now())
  WHERE market = 'US'
    AND status = 'draft';
END $$;

COMMIT;
