-- Phase 1 read-scope audit, 2026-11-01.
--
-- Every anon-executable callable function was inspected (45 of them, the
-- trigger functions having been dealt with in the previous migration). Twelve
-- carry no identity check, and eleven of those are intentional public
-- endpoints: marketplace browse and search, nearby lookups, published
-- translations, community size, public shared project, and the two view
-- counters, which anonymous visitors are meant to drive.
--
-- Two were neither public by design nor used by anything:
--   generate_marketplace_order_number()  anon could burn order numbers
--   contact_messages_rate_ok(email)      answered whether an address had
--                                        already written in, an oracle on a
--                                        table anon cannot read
--
-- Neither name appears in src/ or supabase/functions, so no caller loses
-- access. Both are left callable by service_role for future server-side use.

revoke all on function public.generate_marketplace_order_number() from public, anon, authenticated;
grant execute on function public.generate_marketplace_order_number() to service_role;

revoke all on function public.contact_messages_rate_ok(text) from public, anon, authenticated;
grant execute on function public.contact_messages_rate_ok(text) to service_role;
