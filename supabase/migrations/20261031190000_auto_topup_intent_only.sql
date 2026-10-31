-- =========================================================
-- Auto top-up columns record intent, not a mandate (2026-10-31)
--
-- frelux_api_wallets carries auto_topup_enabled, a threshold and an amount.
-- Nothing charges from them: doing so needs a stored payment method, a consent
-- flow, and an explicit owner decision, because it moves money without being
-- asked each time.
--
-- The columns stay because the preference is real and the Developer Portal
-- shows it. The comments below make the semantics impossible to misread from
-- the database side, which is where a future reader is most likely to assume a
-- scheduled job exists.
-- =========================================================

comment on column frelux_api_wallets.auto_topup_enabled is
  'Owner preference only. No code charges from this flag: auto top-up needs a '
  'saved payment method and an explicit owner decision. Do not treat true as an '
  'active mandate.';

comment on column frelux_api_wallets.auto_topup_threshold_usd is
  'Balance at which the owner would like a top-up to happen. Not evaluated by '
  'anything: there is no scheduler and no charge path.';

comment on column frelux_api_wallets.auto_topup_amount_usd is
  'Amount the owner would like added. Not charged by anything; the wallet only '
  'grows through a verified provider webhook.';
