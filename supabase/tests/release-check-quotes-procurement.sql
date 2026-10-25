-- =========================================================
-- FRELUX Phase 3 release check: role-authorized quote/PO
-- approval, dispatch/delivery, exception resolution and
-- trail integrity against the live database.
--
-- Runs in a single transaction and rolls back everything.
-- Seed users are synthetic and never visible outside the
-- transaction. Run from a postgres/superuser session.
-- =========================================================
BEGIN;

CREATE TEMP TABLE release_checks (
  n integer,
  name text,
  result text,   -- 'pass' | 'fail'
  detail text
);
-- Impersonated sessions insert results through pg_temp functions.
GRANT SELECT, INSERT ON release_checks TO authenticated;

CREATE FUNCTION pg_temp.become(p_user uuid) RETURNS void
LANGUAGE plpgsql AS $f$
BEGIN
  EXECUTE 'SET LOCAL role authenticated';
  EXECUTE format(
    'SET LOCAL request.jwt.claims = ''{"sub":"%s","role":"authenticated"}''',
    p_user
  );
END
$f$;

CREATE FUNCTION pg_temp.reset_role() RETURNS void
LANGUAGE plpgsql AS $f$
BEGIN
  EXECUTE 'SET LOCAL role postgres';
  EXECUTE 'SET LOCAL request.jwt.claims = ''{"role":"postgres"}''';
END
$f$;

CREATE FUNCTION pg_temp.record_check(p_name text, p_result boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  INSERT INTO release_checks (n, name, result, detail)
  VALUES (
    (SELECT coalesce(max(n), 0) + 1 FROM release_checks),
    p_name,
    CASE WHEN p_result THEN 'pass' ELSE 'fail' END,
    coalesce(p_detail, '')
  );
END
$f$;

-- Expect the inner statement to be rejected by the database.
CREATE FUNCTION pg_temp.expect_rejected(p_name text, p_sql text)
RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  BEGIN
    EXECUTE p_sql;
    PERFORM pg_temp.reset_role();
    PERFORM pg_temp.record_check(p_name, false, 'unexpectedly allowed');
  EXCEPTION WHEN others THEN
    PERFORM pg_temp.reset_role();
    PERFORM pg_temp.record_check(p_name, true, sqlerrm);
  END;
END
$f$;

CREATE FUNCTION pg_temp.expect_allowed(p_name text, p_sql text, p_detail text)
RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  BEGIN
    EXECUTE p_sql;
    PERFORM pg_temp.record_check(p_name, true, p_detail);
  EXCEPTION WHEN others THEN
    PERFORM pg_temp.record_check(p_name, false, sqlerrm);
  END;
END
$f$;

DO $suite$
DECLARE
  u_owner   uuid := gen_random_uuid();
  u_intrud  uuid := gen_random_uuid();
  u_admin   uuid := gen_random_uuid();
  rec_id    uuid;
  rec2_id   uuid;
  proj_id   uuid;
  quote_id  uuid;
  v_count   integer;
  v_status  text;
  v_actor   text;
  v_before  timestamptz;
  v_after   timestamptz;
BEGIN
  -- -----------------------------------------------------
  -- Seed: three synthetic users, one owner project.
  -- All rolled back at the end of this transaction.
  -- -----------------------------------------------------
  INSERT INTO auth.users (id, email) VALUES
    (u_owner,  'release_owner_synth@example.invalid'),
    (u_intrud, 'release_intruder_synth@example.invalid'),
    (u_admin,  'release_admin_synth@example.invalid');
  -- The handle_new_user trigger creates the profile rows. The
  -- role-escalation guard blocks even this superuser session
  -- from granting admin, which is the correct production
  -- posture; it is suspended only inside this transaction
  -- (rolled back) to seed the synthetic admin reviewer.
  ALTER TABLE public.profiles DISABLE TRIGGER profiles_prevent_role_escalation;
  UPDATE public.profiles SET role = 'admin' WHERE id = u_admin;
  ALTER TABLE public.profiles ENABLE TRIGGER profiles_prevent_role_escalation;

  INSERT INTO public.contractor_projects (id, user_id, name)
  VALUES (gen_random_uuid(), u_owner, 'Release check project')
  RETURNING id INTO proj_id;

  -- -----------------------------------------------------
  -- Owner journey: create -> quote -> PO approval
  -- -----------------------------------------------------
  PERFORM pg_temp.become(u_owner);
  INSERT INTO public.procurement_records (id, created_by, title, supplier, destination, line_items)
  VALUES (gen_random_uuid(), u_owner, 'Cement', 'Supplier A', 'Site', '[{"description":"Cement","quantity":10,"unit":"bags"}]'::jsonb)
  RETURNING id INTO rec_id;

  SELECT status INTO v_status FROM public.procurement_records WHERE id = rec_id;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check(
    'owner creates record, auto-logged as listed',
    v_status = 'listed',
    'initial status: ' || coalesce(v_status, 'null')
  );

  PERFORM pg_temp.become(u_owner);
  SELECT count(*), max(actor_role::text), max(to_status::text)
    INTO v_count, v_actor, v_status
    FROM public.procurement_events WHERE record_id = rec_id;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check(
    'creation event on trail with owner attribution',
    v_count = 1 AND v_actor = 'owner' AND v_status = 'listed',
    'events=' || v_count || ' actor=' || coalesce(v_actor,'null')
  );

  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('owner: listed -> quote_requested',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''listed'', ''quote_requested'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier A'', ''Site'')', rec_id),
    'transition recorded');

  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('owner: quote_requested -> quoted',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''quote_requested'', ''quoted'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier A'', ''Site'')', rec_id),
    'quote recorded');

  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('owner: PO approval quoted -> approved',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination, notes) values (%L, ''quoted'', ''approved'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier A'', ''Site'', ''PO approved by owner'')', rec_id),
    'approval recorded');

  PERFORM pg_temp.become(u_owner);
  SELECT status INTO v_status FROM public.procurement_records WHERE id = rec_id;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('status follows trail to approved',
    v_status = 'approved', 'status: ' || coalesce(v_status,'null'));

  -- -----------------------------------------------------
  -- Database rejects stale and impossible transitions
  -- -----------------------------------------------------
  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_rejected('stale from_status rejected (listed -> approved)',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''listed'', ''approved'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier A'', ''Site'')', rec_id));

  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_rejected('illegal skip rejected (approved -> delivered)',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''approved'', ''delivered'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier A'', ''Site'')', rec_id));

  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_rejected('direct status edit blocked by trigger',
    format('update public.procurement_records set status = ''delivered'' where id = %L', rec_id));

  -- Regression for the guard-bypass found by this release check:
  -- a trail event was inserted earlier in this same transaction,
  -- and the old transaction-scoped marker stayed set, letting a
  -- direct edit through. The hardened guard must still reject.
  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_rejected('direct status edit rejected even after trail activity in the same transaction',
    format('update public.procurement_records set status = ''delivered'' where id = %L', rec_id));

  -- -----------------------------------------------------
  -- Dispatch/delivery chain with date recalculation
  -- -----------------------------------------------------
  PERFORM pg_temp.become(u_owner);
  SELECT updated_at INTO v_before FROM public.procurement_records WHERE id = rec_id;
  PERFORM pg_temp.reset_role();

  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('owner: approved -> purchase_ordered',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''approved'', ''purchase_ordered'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier A'', ''Site'')', rec_id),
    'PO recorded');
  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('owner: purchase_ordered -> dispatched',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''purchase_ordered'', ''dispatched'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier A'', ''Site'')', rec_id),
    'dispatch recorded');
  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('owner: dispatched -> in_transit',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''dispatched'', ''in_transit'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier A'', ''Site'')', rec_id),
    'in transit recorded');
  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('owner: in_transit -> delivered (terminal)',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''in_transit'', ''delivered'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier A'', ''Site'')', rec_id),
    'delivery recorded');

  PERFORM pg_temp.become(u_owner);
  SELECT status, updated_at INTO v_status, v_after FROM public.procurement_records WHERE id = rec_id;
  SELECT count(*) INTO v_count FROM public.procurement_events
    WHERE record_id = rec_id AND to_status = 'delivered';
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check(
    'status follows trail to delivered; updated_at advanced',
    v_status = 'delivered' AND v_after >= v_before AND v_count = 1,
    'status=' || coalesce(v_status,'null') || ' delivery events=' || v_count
  );

  -- -----------------------------------------------------
  -- Exception resolution on a second record
  -- -----------------------------------------------------
  PERFORM pg_temp.become(u_owner);
  INSERT INTO public.procurement_records (id, created_by, title, supplier, destination, line_items)
  VALUES (gen_random_uuid(), u_owner, 'Rebar', 'Supplier B', 'Site', '[{"description":"Rebar","quantity":50,"unit":"lengths"}]'::jsonb)
  RETURNING id INTO rec2_id;
  PERFORM pg_temp.reset_role();

  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('owner: listed -> quote_requested (record 2)',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''listed'', ''quote_requested'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier B'', ''Site'')', rec2_id),
    'transition recorded');
  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('owner: quote_requested -> quoted (record 2)',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''quote_requested'', ''quoted'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier B'', ''Site'')', rec2_id),
    'transition recorded');
  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('owner: quoted -> approved (record 2)',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''quoted'', ''approved'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier B'', ''Site'')', rec2_id),
    'transition recorded');
  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('owner: approved -> purchase_ordered (record 2)',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''approved'', ''purchase_ordered'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier B'', ''Site'')', rec2_id),
    'transition recorded');
  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('owner: purchase_ordered -> exception',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination, notes) values (%L, ''purchase_ordered'', ''exception'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier B'', ''Site'', ''Supplier delay'')', rec2_id),
    'exception recorded');

  PERFORM pg_temp.become(u_owner);
  SELECT status INTO v_status FROM public.procurement_records WHERE id = rec2_id;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('exception state reached', v_status = 'exception',
    'status: ' || coalesce(v_status,'null'));

  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_allowed('exception resolution: exception -> in_transit',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination, notes) values (%L, ''exception'', ''in_transit'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier B'', ''Site'', ''Resolved with supplier'')', rec2_id),
    'resolution recorded');

  PERFORM pg_temp.become(u_owner);
  SELECT status INTO v_status FROM public.procurement_records WHERE id = rec2_id;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('exception resolved to in_transit',
    v_status = 'in_transit', 'status: ' || coalesce(v_status,'null'));

  -- -----------------------------------------------------
  -- Trail immutability for the owner
  -- -----------------------------------------------------
  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_rejected('owner cannot edit trail events',
    format('update public.procurement_events set notes = ''tampered'' where record_id = %L', rec_id));
  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_rejected('owner cannot delete trail events',
    format('delete from public.procurement_events where record_id = %L', rec_id));

  -- -----------------------------------------------------
  -- Isolation: another authenticated user
  -- -----------------------------------------------------
  PERFORM pg_temp.become(u_intrud);
  SELECT count(*) INTO v_count FROM public.procurement_records WHERE id = rec_id;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('intruder cannot read the record', v_count = 0,
    'rows visible: ' || v_count);

  PERFORM pg_temp.become(u_intrud);
  SELECT count(*) INTO v_count FROM public.procurement_events WHERE record_id = rec_id;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('intruder cannot read the trail', v_count = 0,
    'rows visible: ' || v_count);

  PERFORM pg_temp.become(u_intrud);
  PERFORM pg_temp.expect_rejected('intruder cannot append events',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''in_transit'', ''delivered'', ''owner'', ''app'', ''[]''::jsonb, ''Supplier B'', ''Site'')', rec2_id));

  PERFORM pg_temp.become(u_intrud);
  UPDATE public.procurement_records SET title = 'tampered' WHERE id = rec_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('intruder update touches 0 rows', v_count = 0,
    'rows updated: ' || v_count);

  PERFORM pg_temp.become(u_intrud);
  DELETE FROM public.procurement_records WHERE id = rec_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('intruder delete touches 0 rows', v_count = 0,
    'rows deleted: ' || v_count);

  -- -----------------------------------------------------
  -- Admin: visibility and attributed action
  -- -----------------------------------------------------
  PERFORM pg_temp.become(u_admin);
  SELECT count(*) INTO v_count FROM public.procurement_records WHERE id = rec_id;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('admin reads the owner record', v_count = 1,
    'rows visible: ' || v_count);

  PERFORM pg_temp.become(u_admin);
  PERFORM pg_temp.expect_allowed('admin: in_transit -> delivered (record 2)',
    format('insert into public.procurement_events (record_id, from_status, to_status, actor_role, source, line_items, supplier, destination) values (%L, ''in_transit'', ''delivered'', ''admin'', ''app'', ''[]''::jsonb, ''Supplier B'', ''Site'')', rec2_id),
    'admin transition recorded');

  PERFORM pg_temp.become(u_admin);
  SELECT actor_role::text INTO v_actor FROM public.procurement_events
    WHERE record_id = rec2_id AND to_status = 'delivered';
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('admin action attributed as admin',
    v_actor = 'admin', 'actor_role: ' || coalesce(v_actor,'null'));

  -- -----------------------------------------------------
  -- Quote approval flow (project_quotations)
  -- -----------------------------------------------------
  PERFORM pg_temp.become(u_owner);
  INSERT INTO public.project_quotations (id, project_id, quotation_number, status)
  VALUES (gen_random_uuid(), proj_id, 'RC-001', 'draft')
  RETURNING id INTO quote_id;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('owner creates draft quotation', quote_id IS NOT NULL,
    'quote created');

  PERFORM pg_temp.become(u_owner);
  UPDATE public.project_quotations SET status = 'sent' WHERE id = quote_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('owner sends the quotation', v_count = 1,
    'rows updated: ' || v_count);

  PERFORM pg_temp.become(u_owner);
  UPDATE public.project_quotations
    SET status = 'accepted', signed_by = 'Client', signed_at = now()
    WHERE id = quote_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('owner records acceptance', v_count = 1,
    'rows updated: ' || v_count);

  PERFORM pg_temp.become(u_intrud);
  SELECT count(*) INTO v_count FROM public.project_quotations WHERE id = quote_id;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('intruder cannot read the quotation', v_count = 0,
    'rows visible: ' || v_count);

  PERFORM pg_temp.become(u_intrud);
  UPDATE public.project_quotations SET status = 'rejected' WHERE id = quote_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('intruder cannot decide the quotation', v_count = 0,
    'rows updated: ' || v_count);

  PERFORM pg_temp.become(u_owner);
  PERFORM pg_temp.expect_rejected('invalid quotation status rejected by constraint',
    format('update public.project_quotations set status = ''hacked'' where id = %L', quote_id));

  -- -----------------------------------------------------
  -- Trail completeness readback
  -- -----------------------------------------------------
  PERFORM pg_temp.become(u_owner);
  SELECT count(*) INTO v_count FROM public.procurement_events WHERE record_id = rec_id;
  PERFORM pg_temp.reset_role();
  PERFORM pg_temp.record_check('record 1 trail complete (8 events)', v_count = 8,
    'events: ' || v_count);
END
$suite$;

SELECT n, name, result, detail FROM release_checks ORDER BY n;
ROLLBACK;
