-- =========================================================
-- Structured locations outside Nigeria.
--
-- pro_locations held 89 Nigerian rows and nothing else, so a pro in
-- Nairobi or Dubai had no city to select and buyers could not filter by
-- one. Those pros had to fall back on the 160-character service area text,
-- which no structured filter can query.
--
-- These are the principal commercial centres of the markets FRELUX serves,
-- not a complete gazetteer: enough for a real filter, with the service area
-- text still open for anywhere else. Add cities as pros join them rather
-- than guessing coverage.
-- =========================================================

INSERT INTO public.pro_locations (state, city, area, slug, country, sort_order, is_active)
VALUES
  ('Dubai', 'Dubai', NULL, 'dubai-ae', 'AE', 100, true),
  ('Abu Dhabi', 'Abu Dhabi', NULL, 'abu-dhabi-ae', 'AE', 101, true),
  ('Sharjah', 'Sharjah', NULL, 'sharjah-ae', 'AE', 102, true),
  ('Ajman', 'Ajman', NULL, 'ajman-ae', 'AE', 103, true),
  ('Abu Dhabi', 'Al Ain', NULL, 'al-ain-ae', 'AE', 104, true),
  ('Ras Al Khaimah', 'Ras Al Khaimah', NULL, 'ras-al-khaimah-ae', 'AE', 105, true),
  ('New South Wales', 'Sydney', NULL, 'sydney-au', 'AU', 200, true),
  ('Victoria', 'Melbourne', NULL, 'melbourne-au', 'AU', 201, true),
  ('Queensland', 'Brisbane', NULL, 'brisbane-au', 'AU', 202, true),
  ('Western Australia', 'Perth', NULL, 'perth-au', 'AU', 203, true),
  ('South Australia', 'Adelaide', NULL, 'adelaide-au', 'AU', 204, true),
  ('Australian Capital Territory', 'Canberra', NULL, 'canberra-au', 'AU', 205, true),
  ('Ontario', 'Toronto', NULL, 'toronto-ca', 'CA', 300, true),
  ('British Columbia', 'Vancouver', NULL, 'vancouver-ca', 'CA', 301, true),
  ('Alberta', 'Calgary', NULL, 'calgary-ca', 'CA', 302, true),
  ('Quebec', 'Montreal', NULL, 'montreal-ca', 'CA', 303, true),
  ('Ontario', 'Ottawa', NULL, 'ottawa-ca', 'CA', 304, true),
  ('Alberta', 'Edmonton', NULL, 'edmonton-ca', 'CA', 305, true),
  ('England', 'London', NULL, 'london-gb', 'GB', 400, true),
  ('England', 'Manchester', NULL, 'manchester-gb', 'GB', 401, true),
  ('England', 'Birmingham', NULL, 'birmingham-gb', 'GB', 402, true),
  ('England', 'Leeds', NULL, 'leeds-gb', 'GB', 403, true),
  ('Scotland', 'Glasgow', NULL, 'glasgow-gb', 'GB', 404, true),
  ('England', 'Bristol', NULL, 'bristol-gb', 'GB', 405, true),
  ('Greater Accra', 'Accra', NULL, 'accra-gh', 'GH', 500, true),
  ('Ashanti', 'Kumasi', NULL, 'kumasi-gh', 'GH', 501, true),
  ('Western', 'Takoradi', NULL, 'takoradi-gh', 'GH', 502, true),
  ('Northern', 'Tamale', NULL, 'tamale-gh', 'GH', 503, true),
  ('Greater Accra', 'Tema', NULL, 'tema-gh', 'GH', 504, true),
  ('Central', 'Cape Coast', NULL, 'cape-coast-gh', 'GH', 505, true),
  ('Maharashtra', 'Mumbai', NULL, 'mumbai-in', 'IN', 600, true),
  ('Delhi', 'Delhi', NULL, 'delhi-in', 'IN', 601, true),
  ('Karnataka', 'Bengaluru', NULL, 'bengaluru-in', 'IN', 602, true),
  ('Telangana', 'Hyderabad', NULL, 'hyderabad-in', 'IN', 603, true),
  ('Tamil Nadu', 'Chennai', NULL, 'chennai-in', 'IN', 604, true),
  ('Maharashtra', 'Pune', NULL, 'pune-in', 'IN', 605, true),
  ('Nairobi County', 'Nairobi', NULL, 'nairobi-ke', 'KE', 700, true),
  ('Mombasa County', 'Mombasa', NULL, 'mombasa-ke', 'KE', 701, true),
  ('Kisumu County', 'Kisumu', NULL, 'kisumu-ke', 'KE', 702, true),
  ('Nakuru County', 'Nakuru', NULL, 'nakuru-ke', 'KE', 703, true),
  ('Uasin Gishu County', 'Eldoret', NULL, 'eldoret-ke', 'KE', 704, true),
  ('Kiambu County', 'Thika', NULL, 'thika-ke', 'KE', 705, true),
  ('New York', 'New York', NULL, 'new-york-us', 'US', 800, true),
  ('California', 'Los Angeles', NULL, 'los-angeles-us', 'US', 801, true),
  ('Illinois', 'Chicago', NULL, 'chicago-us', 'US', 802, true),
  ('Texas', 'Houston', NULL, 'houston-us', 'US', 803, true),
  ('Georgia', 'Atlanta', NULL, 'atlanta-us', 'US', 804, true),
  ('Florida', 'Miami', NULL, 'miami-us', 'US', 805, true),
  ('Gauteng', 'Johannesburg', NULL, 'johannesburg-za', 'ZA', 900, true),
  ('Western Cape', 'Cape Town', NULL, 'cape-town-za', 'ZA', 901, true),
  ('KwaZulu-Natal', 'Durban', NULL, 'durban-za', 'ZA', 902, true),
  ('Gauteng', 'Pretoria', NULL, 'pretoria-za', 'ZA', 903, true),
  ('Eastern Cape', 'Port Elizabeth', NULL, 'port-elizabeth-za', 'ZA', 904, true),
  ('Free State', 'Bloemfontein', NULL, 'bloemfontein-za', 'ZA', 905, true)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.pro_locations IS
  'Structured location filter list. Nigeria is complete; other markets carry principal cities only, so keep service_area_text as the open fallback.';
