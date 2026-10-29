-- Two registered retailer patterns no longer matched the live sites, so every
-- one of their sources was scanning a URL that returns no product data.
-- Verified 2026-10-29: OBI's search lives at /search/<term>/ and B&Q expects
-- ?term= instead of ?query= (the old form returns HTTP 400).
UPDATE price_scan_sources
   SET product_url = regexp_replace(
         product_url,
         '^https://www\.obi\.de/search/text/(.*)$',
         'https://www.obi.de/search/\1/'
       ),
       last_scanned_at = NULL
 WHERE retailer = 'OBI'
   AND product_url LIKE 'https://www.obi.de/search/text/%';

UPDATE price_scan_sources
   SET product_url = regexp_replace(
         product_url,
         '^https://www\.diy\.com/search\?query=(.*)$',
         'https://www.diy.com/search?term=\1'
       ),
       last_scanned_at = NULL
 WHERE retailer = 'B&Q'
   AND product_url LIKE 'https://www.diy.com/search?query=%';
