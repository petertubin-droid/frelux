-- FRELUX PAY could not be selected as the site's payment gateway.
--
-- The console offered Paystack and Flutterwave only, and the column itself
-- rejected anything else: site_settings_payment_gateway_check allowed
-- ('paystack', 'stripe', 'flutterwave'). NOWPayments (multi-crypto, settles in
-- the market currency) and BTCPay (Bitcoin) were fully implemented - edge
-- functions, verification, webhooks, a browser checkout modal and the key
-- registry - but the gateway resolver parses anything it does not recognise
-- back to Paystack, so selecting them was impossible rather than merely hidden.
--
-- 'stripe' stays in the list because rows may still hold it and this migration
-- must not invalidate existing data.
ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_payment_gateway_check;

ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_payment_gateway_check
  CHECK (
    payment_gateway IN (
      'paystack',
      'stripe',
      'flutterwave',
      'nowpayments',
      'btcpay'
    )
  );

COMMENT ON COLUMN public.site_settings.payment_gateway IS
  'Default checkout rail. paystack and flutterwave settle fiat; nowpayments settles multi-crypto in the market currency; btcpay settles Bitcoin.';
