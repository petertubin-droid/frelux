-- FRELUX global wall-finishing editorial library. Additive and fail-closed.
-- Seeds candidate associations from existing app catalogs only; no claims or citations are asserted.
BEGIN;
CREATE TABLE IF NOT EXISTS public.learn_wall_finishing_market_status (
 market_code text PRIMARY KEY REFERENCES public.market_profiles(country_code) ON DELETE RESTRICT,
 has_native_catalog boolean NOT NULL DEFAULT false,
 coverage_status text NOT NULL DEFAULT 'not_implemented' CHECK (coverage_status IN ('not_implemented','needs_research','verified')),
 reviewed_by uuid REFERENCES auth.users(id), reviewed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((coverage_status='verified') = (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS public.learn_wall_finishing_article_themes (
 theme_key text PRIMARY KEY, label text NOT NULL, sort_order integer NOT NULL UNIQUE
);
INSERT INTO public.learn_wall_finishing_article_themes(theme_key,label,sort_order) VALUES
 ('overview','System overview',1),('materials','Materials and specifications',2),('installation','Installation sequence',3),('quality','Quality checks and common defects',4),('maintenance','Maintenance and repair',5)
ON CONFLICT(theme_key) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.learn_wall_finishing_topics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), market_code text NOT NULL REFERENCES public.learn_wall_finishing_market_status(market_code) ON DELETE CASCADE,
 candidate_key text NOT NULL, title text NOT NULL, topic_type text NOT NULL CHECK(topic_type IN ('wall_system','finish_assembly')),
 verification_status text NOT NULL DEFAULT 'candidate' CHECK(verification_status IN ('candidate','verified','rejected')),
 verified_by uuid REFERENCES auth.users(id), verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(market_code,candidate_key), UNIQUE(id,market_code),
 CHECK ((verification_status IN ('verified','rejected')) = (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS public.learn_wall_finishing_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), topic_id uuid NOT NULL REFERENCES public.learn_wall_finishing_topics(id) ON DELETE CASCADE,
 article_id uuid REFERENCES public.learn_articles(id) ON DELETE CASCADE, title text NOT NULL, url text NOT NULL CHECK (url ~* '^https?://'), publisher text NOT NULL,
 published_on date, retrieved_at timestamptz NOT NULL DEFAULT now(), claim_scope text NOT NULL,
 review_status text NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','accepted','rejected')),
 reviewed_by uuid REFERENCES auth.users(id), reviewed_at timestamptz, created_by uuid REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((review_status IN ('accepted','rejected')) = (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
ALTER TABLE public.learn_articles ADD COLUMN IF NOT EXISTS wall_market_code text;
ALTER TABLE public.learn_articles ADD COLUMN IF NOT EXISTS wall_topic_id uuid;
ALTER TABLE public.learn_articles ADD COLUMN IF NOT EXISTS wall_article_theme text;
ALTER TABLE public.learn_articles ADD COLUMN IF NOT EXISTS wall_language_code text;
ALTER TABLE public.learn_articles ADD COLUMN IF NOT EXISTS editorial_review_status text NOT NULL DEFAULT 'not_required' CHECK(editorial_review_status IN ('not_required','draft','in_review','approved','rejected'));
ALTER TABLE public.learn_articles ADD COLUMN IF NOT EXISTS editorial_reviewed_by uuid REFERENCES auth.users(id);
ALTER TABLE public.learn_articles ADD COLUMN IF NOT EXISTS editorial_reviewed_at timestamptz;
CREATE TABLE IF NOT EXISTS public.learn_wall_finishing_article_slots (
 topic_id uuid NOT NULL, market_code text NOT NULL, theme_key text NOT NULL REFERENCES public.learn_wall_finishing_article_themes(theme_key) ON DELETE RESTRICT,
 language_code text NOT NULL CHECK(language_code ~ '^[a-z]{2,3}(-[A-Z]{2})?$'), article_id uuid UNIQUE REFERENCES public.learn_articles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(topic_id,theme_key,language_code),
 UNIQUE(topic_id,market_code,theme_key,language_code), FOREIGN KEY(topic_id,market_code) REFERENCES public.learn_wall_finishing_topics(id,market_code) ON DELETE CASCADE
);
ALTER TABLE public.learn_articles DROP CONSTRAINT IF EXISTS learn_articles_wall_slot_fk;
ALTER TABLE public.learn_articles ADD CONSTRAINT learn_articles_wall_slot_fk FOREIGN KEY(wall_topic_id,wall_market_code,wall_article_theme,wall_language_code) REFERENCES public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code) DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX IF NOT EXISTS learn_articles_wall_slot_unique ON public.learn_articles(wall_topic_id,wall_article_theme,wall_language_code) WHERE wall_topic_id IS NOT NULL;
ALTER TABLE public.learn_wall_finishing_market_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_wall_finishing_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_wall_finishing_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_wall_finishing_article_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_wall_finishing_article_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wall_market_admin ON public.learn_wall_finishing_market_status;
CREATE POLICY wall_market_admin ON public.learn_wall_finishing_market_status FOR ALL TO authenticated USING(public.is_current_user_admin()) WITH CHECK(public.is_current_user_admin());
DROP POLICY IF EXISTS wall_topics_admin ON public.learn_wall_finishing_topics;
CREATE POLICY wall_topics_admin ON public.learn_wall_finishing_topics FOR ALL TO authenticated USING(public.is_current_user_admin()) WITH CHECK(public.is_current_user_admin());
DROP POLICY IF EXISTS wall_topics_public_verified ON public.learn_wall_finishing_topics;
CREATE POLICY wall_topics_public_verified ON public.learn_wall_finishing_topics FOR SELECT TO anon,authenticated USING(verification_status='verified');
DROP POLICY IF EXISTS wall_sources_admin ON public.learn_wall_finishing_sources;
CREATE POLICY wall_sources_admin ON public.learn_wall_finishing_sources FOR ALL TO authenticated USING(public.is_current_user_admin()) WITH CHECK(public.is_current_user_admin());
DROP POLICY IF EXISTS wall_sources_public_accepted ON public.learn_wall_finishing_sources;
CREATE POLICY wall_sources_public_accepted ON public.learn_wall_finishing_sources FOR SELECT TO anon,authenticated USING(review_status='accepted');
DROP POLICY IF EXISTS wall_themes_public_read ON public.learn_wall_finishing_article_themes;
CREATE POLICY wall_themes_public_read ON public.learn_wall_finishing_article_themes FOR SELECT TO anon,authenticated USING(true);
DROP POLICY IF EXISTS wall_slots_admin ON public.learn_wall_finishing_article_slots;
CREATE POLICY wall_slots_admin ON public.learn_wall_finishing_article_slots FOR ALL TO authenticated USING(public.is_current_user_admin()) WITH CHECK(public.is_current_user_admin());
GRANT SELECT ON public.learn_wall_finishing_topics, public.learn_wall_finishing_sources, public.learn_wall_finishing_article_themes TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.learn_wall_finishing_market_status, public.learn_wall_finishing_topics, public.learn_wall_finishing_sources, public.learn_wall_finishing_article_slots TO authenticated;
GRANT SELECT ON public.learn_wall_finishing_article_slots TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.set_wall_finishing_review_attribution() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_TABLE_NAME='learn_wall_finishing_topics' THEN
  IF TG_OP='INSERT' THEN NEW.verification_status:='candidate'; NEW.verified_by:=NULL; NEW.verified_at:=NULL;
  ELSIF NEW.market_code IS DISTINCT FROM OLD.market_code OR NEW.candidate_key IS DISTINCT FROM OLD.candidate_key OR NEW.title IS DISTINCT FROM OLD.title OR NEW.topic_type IS DISTINCT FROM OLD.topic_type THEN NEW.verification_status:='candidate'; NEW.verified_by:=NULL; NEW.verified_at:=NULL;
  ELSIF NEW.verification_status IS DISTINCT FROM OLD.verification_status AND NEW.verification_status IN ('verified','rejected') THEN NEW.verified_by:=auth.uid(); NEW.verified_at:=now();
  ELSIF NEW.verification_status='candidate' THEN NEW.verified_by:=NULL; NEW.verified_at:=NULL; ELSE NEW.verified_by:=OLD.verified_by; NEW.verified_at:=OLD.verified_at; END IF;
  IF NEW.verification_status='verified' AND NOT EXISTS(SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=NEW.id AND s.review_status='accepted') THEN RAISE EXCEPTION 'A topic needs at least one accepted local citation before verification'; END IF;
 ELSIF TG_TABLE_NAME='learn_wall_finishing_sources' THEN
  IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid(); NEW.review_status:='pending'; NEW.reviewed_by:=NULL; NEW.reviewed_at:=NULL;
  ELSIF NEW.title IS DISTINCT FROM OLD.title OR NEW.url IS DISTINCT FROM OLD.url OR NEW.publisher IS DISTINCT FROM OLD.publisher OR NEW.claim_scope IS DISTINCT FROM OLD.claim_scope THEN NEW.review_status:='pending'; NEW.reviewed_by:=NULL; NEW.reviewed_at:=NULL;
  ELSIF NEW.review_status IS DISTINCT FROM OLD.review_status AND NEW.review_status IN ('accepted','rejected') THEN NEW.reviewed_by:=auth.uid(); NEW.reviewed_at:=now();
  ELSIF NEW.review_status='pending' THEN NEW.reviewed_by:=NULL; NEW.reviewed_at:=NULL; ELSE NEW.reviewed_by:=OLD.reviewed_by; NEW.reviewed_at:=OLD.reviewed_at; END IF;
 ELSIF TG_TABLE_NAME='learn_articles' THEN
  IF TG_OP='INSERT' AND NEW.wall_topic_id IS NOT NULL THEN NEW.editorial_review_status:='draft'; NEW.editorial_reviewed_by:=NULL; NEW.editorial_reviewed_at:=NULL; NEW.status:='draft'; NEW.published_at:=NULL;
  ELSIF TG_OP='UPDATE' AND NEW.wall_topic_id IS NOT NULL AND (NEW.title IS DISTINCT FROM OLD.title OR NEW.slug IS DISTINCT FROM OLD.slug OR NEW.excerpt IS DISTINCT FROM OLD.excerpt OR NEW.content IS DISTINCT FROM OLD.content OR NEW.category_slug IS DISTINCT FROM OLD.category_slug OR NEW.wall_market_code IS DISTINCT FROM OLD.wall_market_code OR NEW.wall_topic_id IS DISTINCT FROM OLD.wall_topic_id OR NEW.wall_article_theme IS DISTINCT FROM OLD.wall_article_theme OR NEW.wall_language_code IS DISTINCT FROM OLD.wall_language_code) THEN NEW.editorial_review_status:='draft'; NEW.editorial_reviewed_by:=NULL; NEW.editorial_reviewed_at:=NULL; NEW.status:='draft'; NEW.published_at:=NULL;
  ELSIF TG_OP='UPDATE' AND NEW.editorial_review_status IS DISTINCT FROM OLD.editorial_review_status AND NEW.editorial_review_status IN ('approved','rejected') THEN NEW.editorial_reviewed_by:=auth.uid(); NEW.editorial_reviewed_at:=now(); ELSIF TG_OP='UPDATE' AND NEW.editorial_review_status='draft' THEN NEW.editorial_reviewed_by:=NULL; NEW.editorial_reviewed_at:=NULL; ELSE NEW.editorial_reviewed_by:=OLD.editorial_reviewed_by; NEW.editorial_reviewed_at:=OLD.editorial_reviewed_at; END IF;
 END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS wall_topic_review_attribution ON public.learn_wall_finishing_topics;
CREATE TRIGGER wall_topic_review_attribution BEFORE INSERT OR UPDATE ON public.learn_wall_finishing_topics FOR EACH ROW EXECUTE FUNCTION public.set_wall_finishing_review_attribution();
DROP TRIGGER IF EXISTS wall_source_review_attribution ON public.learn_wall_finishing_sources;
CREATE TRIGGER wall_source_review_attribution BEFORE INSERT OR UPDATE ON public.learn_wall_finishing_sources FOR EACH ROW EXECUTE FUNCTION public.set_wall_finishing_review_attribution();
DROP TRIGGER IF EXISTS wall_article_review_attribution ON public.learn_articles;
CREATE TRIGGER wall_article_review_attribution BEFORE INSERT OR UPDATE ON public.learn_articles FOR EACH ROW WHEN (NEW.wall_topic_id IS NOT NULL) EXECUTE FUNCTION public.set_wall_finishing_review_attribution();
CREATE OR REPLACE FUNCTION public.guard_wall_finishing_article_publication() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='UPDATE' AND NEW.wall_topic_id IS NOT NULL AND NEW.editorial_review_status IS DISTINCT FROM OLD.editorial_review_status AND NEW.editorial_review_status='approved' THEN NEW.editorial_reviewed_by:=auth.uid(); NEW.editorial_reviewed_at:=now(); END IF;
 IF NEW.wall_topic_id IS NOT NULL AND NEW.status='published' THEN
  IF NEW.editorial_review_status<>'approved' OR NEW.editorial_reviewed_by IS NULL OR NEW.editorial_reviewed_at IS NULL THEN RAISE EXCEPTION 'Market wall-finishing articles require recorded editorial approval'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.learn_wall_finishing_topics t WHERE t.id=NEW.wall_topic_id AND t.market_code=NEW.wall_market_code AND t.verification_status='verified' AND EXISTS(SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=t.id AND s.review_status='accepted')) THEN RAISE EXCEPTION 'Market wall-finishing articles require a verified topic and accepted citation'; END IF;
 END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS guard_wall_finishing_article_publication ON public.learn_articles;
DROP TRIGGER IF EXISTS zz_guard_wall_finishing_article_publication ON public.learn_articles;
CREATE TRIGGER zz_guard_wall_finishing_article_publication BEFORE INSERT OR UPDATE ON public.learn_articles FOR EACH ROW WHEN (NEW.wall_topic_id IS NOT NULL) EXECUTE FUNCTION public.guard_wall_finishing_article_publication();
DROP POLICY IF EXISTS public_read_learn_articles ON public.learn_articles;
CREATE POLICY public_read_learn_articles ON public.learn_articles FOR SELECT TO anon,authenticated USING(status='published' AND (published_at IS NULL OR published_at<=now()) AND (wall_topic_id IS NULL OR (editorial_review_status='approved' AND EXISTS(SELECT 1 FROM public.learn_wall_finishing_topics t WHERE t.id=wall_topic_id AND t.market_code=wall_market_code AND t.verification_status='verified') AND EXISTS(SELECT 1 FROM public.learn_wall_finishing_sources s WHERE s.topic_id=wall_topic_id AND s.review_status='accepted'))));
-- Seed only the selector's existing profiles; ON CONFLICT preserves configured database values.
INSERT INTO public.market_profiles(country_code,country_name,region,currency_code,currency_symbol,currency_name,default_measurement_system,supported_length_units,supported_area_units,default_length_unit,default_area_unit,default_language,local_terminology,status,inherits_from,profile_version,sort_order,is_visible) VALUES
('NG','Nigeria','West Africa','NGN','₦','Nigerian Naira','mixed',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"gallon (4 litres)","cement_bag":"50kg bag","white_cement_bag":"40kg bag","screeding_mix":"Plastering Sand + Cement","tile_carton":"carton","pop_bag":"25kg bag"}'::jsonb,'active',NULL,'1.0.0',10,true),
('US','United States','North America','USD','$','US Dollar','imperial',ARRAY['feet','inches','meters'],ARRAY['sqft','sqm'],'feet','sqft','en','{"paint_bucket":"1 gal / 5 gal pail","cement_bag":"94lb bag","white_cement_bag":"94lb bag","screeding_mix":"Joint Compound / Sheetrock Skim Coat","tile_carton":"box","pop_bag":"drywall sheet (4x8)"}'::jsonb,'active',NULL,'1.0.0',20,true),
('GB','United Kingdom','Europe','GBP','£','British Pound','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"5L / 10L tub","cement_bag":"25kg bag","white_cement_bag":"25kg bag","screeding_mix":"Gyproc Easi-Fill / Plaster","tile_carton":"box","pop_bag":"plasterboard sheet"}'::jsonb,'active',NULL,'1.0.0',30,true),
('CA','Canada','North America','CAD','C$','Canadian Dollar','imperial',ARRAY['feet','inches','meters'],ARRAY['sqft','sqm'],'feet','sqft','en','{"paint_bucket":"1 gal / 5 gal pail","cement_bag":"40kg / 88lb bag","white_cement_bag":"40kg bag","screeding_mix":"Drywall Joint Compound","tile_carton":"box","pop_bag":"drywall sheet"}'::jsonb,'active',NULL,'1.0.0',40,true),
('AU','Australia','Oceania','AUD','A$','Australian Dollar','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"4L / 10L tin","cement_bag":"20kg bag","white_cement_bag":"20kg bag","screeding_mix":"Render / Basecoat Plaster","tile_carton":"box","pop_bag":"plasterboard sheet"}'::jsonb,'active',NULL,'1.0.0',50,true),
('DE','Germany','Europe','EUR','€','Euro','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','de','{"paint_bucket":"10L Eimer","cement_bag":"25kg Sack","white_cement_bag":"25kg Sack","screeding_mix":"Spachtelmasse","tile_carton":"Karton","pop_bag":"Gipskartonplatte"}'::jsonb,'active',NULL,'1.0.0',60,true),
('IN','India','Asia','INR','₹','Indian Rupee','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"10L / 20L bucket","cement_bag":"50kg bag","white_cement_bag":"40kg / 50kg bag","screeding_mix":"Birla White WallCare Putty","tile_carton":"box","pop_bag":"25kg POP bag"}'::jsonb,'active',NULL,'1.0.0',70,true),
('GH','Ghana','West Africa','GHS','GH₵','Ghanaian Cedi','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"gallon (4.5 litres)","cement_bag":"42.5kg / 50kg bag","white_cement_bag":"40kg bag","screeding_mix":"Plastering Sand + Cement","tile_carton":"carton","pop_bag":"25kg bag"}'::jsonb,'active',NULL,'1.0.0',80,true),
('KE','Kenya','East Africa','KES','KSh','Kenyan Shilling','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"4L / 20L tin","cement_bag":"50kg bag","white_cement_bag":"40kg bag","screeding_mix":"Plaster & Wall Skim","tile_carton":"carton","pop_bag":"gypsum board sheet"}'::jsonb,'active',NULL,'1.0.0',90,true),
('ZA','South Africa','Southern Africa','ZAR','R','South African Rand','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"5L / 20L bucket","cement_bag":"50kg bag","white_cement_bag":"40kg bag","screeding_mix":"Skim Plaster / Cretestone","tile_carton":"box","pop_bag":"rhinoboard ceiling sheet"}'::jsonb,'active',NULL,'1.0.0',100,true),
('JP','Japan','East Asia','JPY','¥','Japanese Yen','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"18L can","cement_bag":"25kg bag","white_cement_bag":"20kg bag","screeding_mix":"Plaster (sand + cement)","tile_carton":"box","pop_bag":"plasterboard sheet"}'::jsonb,'active',NULL,'1.0.0',110,true),
('FR','France','Europe','EUR','€','Euro','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','fr','{"paint_bucket":"pot 12L","cement_bag":"sac 25kg","white_cement_bag":"sac 25kg","screeding_mix":"Enduit de platre","tile_carton":"colis","pop_bag":"plaque de platre BA13"}'::jsonb,'active','DE','1.0.0',120,true),
('BR','Brazil','South America','BRL','R$','Brazilian Real','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','pt','{"paint_bucket":"lata 18L","cement_bag":"saco 50kg","white_cement_bag":"saco 40kg","screeding_mix":"Massa corrida / gesso","tile_carton":"caixa","pop_bag":"placa de gesso"}'::jsonb,'active',NULL,'1.0.0',130,true),
('SA','Saudi Arabia','Middle East','SAR','﷼','Saudi Riyal','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','ar','{"paint_bucket":"bucket 18L","cement_bag":"50kg bag","white_cement_bag":"40kg bag","screeding_mix":"Gypsum plaster / cement render","tile_carton":"carton","pop_bag":"gypsum board sheet"}'::jsonb,'active',NULL,'1.0.0',140,true),
('AE','United Arab Emirates','Middle East','AED','د.إ','UAE Dirham','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"bucket 20L","cement_bag":"50kg bag","white_cement_bag":"40kg bag","screeding_mix":"Gypsum plaster / skim coat","tile_carton":"carton","pop_bag":"gypsum board sheet"}'::jsonb,'active','SA','1.0.0',150,true),
('CN','China','East Asia','CNY','¥','Chinese Yuan','metric',ARRAY['meters','millimeters'],ARRAY['sqm'],'meters','sqm','zh','{"paint_bucket":"18L drum (漆桶)","cement_bag":"50kg bag (水泥袋)","white_cement_bag":"40kg bag (白水泥)","screeding_mix":"Water-resistant wall putty (耐水腻子粉 20kg)","tile_carton":"box / carton (瓷砖箱)","pop_bag":"gypsum plasterboard (石膏板 1200x2400x9.5mm / 12mm)","waterproofing":"JS polymer waterproof coating (JS复合防水涂料 20kg)","tile_adhesive":"C1/C2 tile adhesive (瓷砖胶 20kg)"}'::jsonb,'active',NULL,'1.0.0',160,true),
('ID','Indonesia','Southeast Asia','IDR','Rp','Indonesian Rupiah','metric',ARRAY['meters','millimeters'],ARRAY['sqm'],'meters','sqm','id','{"paint_bucket":"pail 20kg (Pail cat)","cement_bag":"40kg / 50kg sak (Semen sak)","white_cement_bag":"40kg sak (Semen putih)","screeding_mix":"Semen instan acian / skim coat (Acian 40kg)","tile_carton":"dus (Dus keramik)","pop_bag":"papan gipsum (Papan gipsum 1200x2400x9mm)","waterproofing":"pelapis kedap air (Pelapis kedap air 20kg)","tile_adhesive":"perekat keramik (Semen perekat keramik 25kg)"}'::jsonb,'active',NULL,'1.0.0',170,true),
('MX','Mexico','Americas','MXN','MX$','Mexican Peso','metric',ARRAY['meters','centimeters'],ARRAY['sqm'],'meters','sqm','es','{"paint_bucket":"cubeta 19L (Cubeta de pintura)","cement_bag":"50kg bulto (Bulto de cemento gris)","white_cement_bag":"50kg bulto (Bulto de cemento blanco)","screeding_mix":"Pasta para reboco / yeso / redimix (Bulto de pasta 20kg)","tile_carton":"caja (Caja de piso / azulejo)","pop_bag":"panel de yeso (Tablaroca / Panel Rey 1.22x2.44m x 12.7mm)","waterproofing":"impermeabilizante acrílico (Cubeta 19L)","tile_adhesive":"pegazulejo / adhesivo (Bulto 20kg)"}'::jsonb,'active',NULL,'1.0.0',180,true),
('KR','South Korea','East Asia','KRW','₩','South Korean Won','metric',ARRAY['meters','millimeters'],ARRAY['sqm'],'meters','sqm','ko','{"paint_bucket":"18L pail (페인트 18L 말통)","cement_bag":"40kg bag (포대 시멘트 40kg)","white_cement_bag":"20kg / 40kg bag (백시멘트)","screeding_mix":"Remitar / handycoat putty (핸디코트 / 퍼티 25kg)","tile_carton":"box (타일 박스)","pop_bag":"gypsum board sheet (석고보드 900x1800x9.5mm / 12.5mm)","waterproofing":"polyurethane / cementitious waterproof (방수제 18L/20kg)","tile_adhesive":"tile bond / cement (타일 압착시멘트 20kg)"}'::jsonb,'active',NULL,'1.0.0',190,true),
('IT','Italy','Europe','EUR','€','Euro','metric',ARRAY['meters','millimeters'],ARRAY['sqm'],'meters','sqm','it','{"paint_bucket":"latta 14L / 15L (Secchio pittura)","cement_bag":"25kg sacco (Sacco cemento 32.5 / 42.5)","white_cement_bag":"25kg sacco (Sacco cemento bianco)","screeding_mix":"Intonaco / rasante per finitura (Rasante a gesso/cemento 25kg)","tile_carton":"scatola / collo (Scatola piastrelle)","pop_bag":"lastra cartongesso (Lastra cartongesso 1200x2000/2500x12.5mm)","waterproofing":"guaina liquida elastometrica (Fusto 20kg)","tile_adhesive":"colla per piastrelle C2TE (Sacco 25kg)"}'::jsonb,'active','DE','1.0.0',200,true),
('ET','Ethiopia','East Africa','ETB','Br','Ethiopian Birr','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"4L tin / 20L bucket","cement_bag":"50kg bag","white_cement_bag":"50kg bag","screeding_mix":"cement-sand plaster","tile_carton":"carton","pop_bag":"25kg gypsum bag"}'::jsonb,'active',NULL,'1.0.0',210,true),
('EG','Egypt','North Africa','EGP','E£','Egyptian Pound','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"4L tin / 20L bucket","cement_bag":"50kg bag","white_cement_bag":"50kg bag","screeding_mix":"cement-sand plaster","tile_carton":"carton","pop_bag":"25kg gypsum bag"}'::jsonb,'active',NULL,'1.0.0',220,true),
('TZ','Tanzania','East Africa','TZS','TSh','Tanzanian Shilling','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"4L tin / 20L bucket","cement_bag":"50kg bag","white_cement_bag":"50kg bag","screeding_mix":"cement-sand plaster","tile_carton":"carton","pop_bag":"25kg gypsum bag"}'::jsonb,'active',NULL,'1.0.0',230,true),
('CI','Côte d''Ivoire','West Africa','XOF','CFA','West African CFA Franc','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"5L pot / 20L bucket","cement_bag":"50kg bag","white_cement_bag":"50kg bag","screeding_mix":"cement-sand plaster","tile_carton":"carton","pop_bag":"25kg gypsum bag"}'::jsonb,'active',NULL,'1.0.0',240,true),
('ES','Spain','Europe','EUR','€','Euro','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"lata 4L / cubeta 15L","cement_bag":"saco 35kg","white_cement_bag":"saco 25kg","screeding_mix":"mortero de yeso / enlucido","tile_carton":"caja","pop_bag":"placa de yeso laminado"}'::jsonb,'active',NULL,'1.0.0',250,true),
('NL','Netherlands','Europe','EUR','€','Euro','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"emmer 10L / blik 2,5L","cement_bag":"zak 25kg","white_cement_bag":"zak 25kg","screeding_mix":"stucwerk / pleister","tile_carton":"doos","pop_bag":"gipsplaat 1200x2600x12,5mm"}'::jsonb,'active',NULL,'1.0.0',260,true),
('PL','Poland','Europe','PLN','zł','Polish Złoty','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"wiadro 10L / puszka 4L","cement_bag":"worek 25kg","white_cement_bag":"worek 25kg","screeding_mix":"tynk gipsowy","tile_carton":"karton","pop_bag":"płyta gipsowo-kartonowa"}'::jsonb,'active',NULL,'1.0.0',270,true),
('SE','Sweden','Europe','SEK','kr','Swedish Krona','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"hink 10L / burk 3L","cement_bag":"säck 25kg","white_cement_bag":"säck 25kg","screeding_mix":"spackel / gips","tile_carton":"kartong","pop_bag":"gipsplatta 1200x2400x13mm"}'::jsonb,'active',NULL,'1.0.0',280,true),
('CH','Switzerland','Europe','CHF','CHF','Swiss Franc','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"Eimer 10L / Gebinde 5L","cement_bag":"Sack 25kg","white_cement_bag":"Sack 25kg","screeding_mix":"Gips / Glattputz","tile_carton":"Karton","pop_bag":"Gipsplatte 1200x2500x12,5mm"}'::jsonb,'active',NULL,'1.0.0',290,true),
('SG','Singapore','Southeast Asia','SGD','S$','Singapore Dollar','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"5L tin / 20L pail","cement_bag":"50kg bag","white_cement_bag":"50kg bag","screeding_mix":"cement-sand screed","tile_carton":"carton","pop_bag":"25kg gypsum bag"}'::jsonb,'active',NULL,'1.0.0',300,true),
('TR','Türkiye','Middle East','TRY','₺','Turkish Lira','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"kova 15L / kutu 2,5L","cement_bag":"çuval 50kg","white_cement_bag":"çuval 50kg","screeding_mix":"sıva (çimento-alçı)","tile_carton":"kol","pop_bag":"alçıpan 1200x2500x12,5mm"}'::jsonb,'active',NULL,'1.0.0',310,true),
('NZ','New Zealand','Oceania','NZD','NZ$','New Zealand Dollar','metric',ARRAY['meters','feet','inches'],ARRAY['sqm','sqft'],'meters','sqm','en','{"paint_bucket":"10L pail / 4L can","cement_bag":"40kg bag","white_cement_bag":"40kg bag","screeding_mix":"plaster / gib stopping","tile_carton":"carton","pop_bag":"GIB sheet 1200x2400x10mm"}'::jsonb,'active',NULL,'1.0.0',320,true)
ON CONFLICT(country_code) DO NOTHING;
INSERT INTO public.learn_wall_finishing_market_status(market_code,has_native_catalog,coverage_status)
SELECT m.country_code,m.has_native_catalog,CASE WHEN m.has_native_catalog THEN 'needs_research' ELSE 'not_implemented' END FROM (VALUES
('NG',true),
('US',true),
('GB',true),
('CA',true),
('AU',true),
('DE',true),
('IN',true),
('GH',true),
('KE',true),
('ZA',true),
('JP',true),
('FR',true),
('BR',true),
('SA',true),
('AE',true),
('CN',true),
('ID',true),
('MX',true),
('KR',true),
('IT',true),
('ET',false),
('EG',false),
('TZ',false),
('CI',false),
('ES',false),
('NL',false),
('PL',false),
('SE',false),
('CH',false),
('SG',false),
('TR',false),
('NZ',false)
) AS m(country_code,has_native_catalog) JOIN public.market_profiles mp ON mp.country_code=m.country_code ON CONFLICT(market_code) DO NOTHING;
INSERT INTO public.learn_wall_finishing_topics(market_code,candidate_key,title,topic_type)
SELECT v.market_code,v.candidate_key,v.title,v.topic_type FROM (VALUES
('NG','system:ng-sandcrete-block','Sandcrete block wall','wall_system'),
('NG','system:ng-concrete-frame-block','RC frame + block infill','wall_system'),
('US','system:us-timber-stud-drywall','Timber stud + drywall','wall_system'),
('US','system:us-steel-stud-drywall','Steel stud + drywall','wall_system'),
('US','system:us-masonry-veneer','Masonry veneer over framing','wall_system'),
('GB','system:gb-brick-block','Brick/block cavity wall','wall_system'),
('GB','system:gb-timber-frame-dryline','Timber frame + drylining','wall_system'),
('GB','system:gb-solid-masonry','Solid masonry wall','wall_system'),
('DE','system:de-masonry-gypsum','Masonry + gypsum plaster','wall_system'),
('DE','system:de-blockwork-lime','Blockwork + lime/mineral render','wall_system'),
('DE','system:de-drywall-metal-stud','Drywall (metal stud)','wall_system'),
('IN','system:in-brick-block-plaster','Brick/block masonry','wall_system'),
('IN','system:in-aac-block','AAC block wall','wall_system'),
('IN','system:in-rcc-frame-brick','RCC frame + brick infill','wall_system'),
('CA','system:ca-wood-frame-drywall','Wood frame + drywall','wall_system'),
('CA','system:ca-steel-frame-drywall','Steel frame + drywall','wall_system'),
('CA','system:ca-icf','ICF (insulated concrete forms)','wall_system'),
('AU','system:au-brick-veneer-plasterboard','Brick veneer + plasterboard','wall_system'),
('AU','system:au-double-brick','Double brick (cavity masonry)','wall_system'),
('AU','system:au-light-steel-frame','Light steel frame + plasterboard','wall_system'),
('JP','system:jp-timber-frame-gypsum','Timber frame + gypsum board','wall_system'),
('JP','system:jp-rc-alc-panel','RC frame + ALC panel infill','wall_system'),
('FR','system:fr-masonry-plaster','Bloc/brique + enduit de platre','wall_system'),
('FR','system:fr-drywall-metal-stud','Cloison platre BA13 sur ossature metal','wall_system'),
('BR','system:br-brick-plaster','Alvenaria de tijolo/bloco com reboco','wall_system'),
('BR','system:br-drywall-steel-stud','Drywall steel stud (placa de gesso)','wall_system'),
('SA','system:sa-block-gypsum-plaster','RC frame + block + gypsum plaster','wall_system'),
('SA','system:sa-drywall-partition','Gypsum board partition','wall_system'),
('AE','system:ae-rc-block-gypsum','RC frame + block + gypsum plaster','wall_system'),
('AE','system:ae-drywall-partition','Gypsum board partition','wall_system'),
('GH','system:gh-sandcrete-render','Sandcrete block wall with render','wall_system'),
('GH','system:gh-timber-frame-gypsum','Timber frame + gypsum board','wall_system'),
('KE','system:ke-stone-render','Machine-cut stone wall with render','wall_system'),
('KE','system:ke-block-render','Concrete block wall with render','wall_system'),
('ZA','system:za-brick-plaster','Clay brick + plaster','wall_system'),
('ZA','system:za-drywall-metal-stud','Drywall on metal stud','wall_system'),
('CN','system:cn-concrete-block-render','Concrete block / masonry with render','wall_system'),
('CN','system:cn-gypsum-board-metal-stud','Light steel stud drywall','wall_system'),
('ID','system:id-brick-plaster','Bata merah (red brick) with plesteran','wall_system'),
('ID','system:id-aac-block-render','Bata ringan (AAC block) with thin render','wall_system'),
('MX','system:mx-concrete-block-plaster','Block de concreto with repello','wall_system'),
('MX','system:mx-red-brick-render','Tabique rojo recocido with repello','wall_system'),
('KR','system:kr-rc-wall-gypsum','RC shear wall with direct gypsum lining','wall_system'),
('KR','system:kr-drywall-steel-stud','Drywall on steel stud framing','wall_system'),
('IT','system:it-perforated-brick-plaster','Laterizio forato with intonaco','wall_system'),
('IT','system:it-drywall-metal-stud','Cartongesso on metal stud framing','wall_system'),
('NG','assembly:ng-interior-block-paint','Block → render → screeding putty → primer → emulsion','finish_assembly'),
('NG','assembly:ng-exterior-block-render-paint','Block → render → exterior acrylic','finish_assembly'),
('US','assembly:us-interior-drywall-paint','Drywall → tape → joint compound → sand → primer → paint','finish_assembly'),
('US','assembly:us-exterior-masonry-paint','Exterior masonry → primer → exterior acrylic','finish_assembly'),
('GB','assembly:gb-interior-block-skim-paint','Block/brick → undercoat where required → skim plaster → mist coat → emulsion','finish_assembly'),
('GB','assembly:gb-interior-plasterboard-paint','Plasterboard → jointing → optional skim → mist → emulsion','finish_assembly'),
('GB','assembly:gb-exterior-render-paint','Exterior render (optional) → masonry paint','finish_assembly'),
('DE','assembly:de-interior-masonry-paint','Masonry → gypsum base plaster → fine filler → Tiefgrund → interior paint','finish_assembly'),
('DE','assembly:de-exterior-render-paint','Masonry → mineral base render → facade paint','finish_assembly'),
('IN','assembly:in-interior-brick-paint','Brick/block → cement-sand plaster → wall putty → primer → paint','finish_assembly'),
('IN','assembly:in-exterior-render-paint','Brick/block → plaster → exterior emulsion','finish_assembly'),
('CA','assembly:ca-interior-drywall-paint','Drywall → tape → joint compound → sand → primer → paint','finish_assembly'),
('CA','assembly:ca-exterior-masonry-paint','Exterior masonry → primer → exterior acrylic','finish_assembly'),
('AU','assembly:au-interior-plasterboard-paint','Plasterboard → tape + base/topping compound → sand → sealer → low sheen','finish_assembly'),
('AU','assembly:au-exterior-render-paint','Masonry → render (optional) → exterior acrylic','finish_assembly'),
('JP','assembly:jp-interior-gypsum-paint','Gypsum board → パテ → sand → primer → emulsion paint','finish_assembly'),
('JP','assembly:jp-exterior-alc-paint','ALC panel → sealing primer → elastic exterior paint','finish_assembly'),
('FR','assembly:fr-interior-masonry-paint','Enduit de lissage → poncage → sous-couche → peinture','finish_assembly'),
('FR','assembly:fr-exterior-render-paint','Enduit de facade → peinture de facade','finish_assembly'),
('BR','assembly:br-interior-massa-paint','Reboco → massa corrida → selador → tinta acrilica','finish_assembly'),
('BR','assembly:br-exterior-render-paint','Reboco → selador → tinta acrilica externa','finish_assembly'),
('SA','assembly:sa-interior-gypsum-paint','Gypsum plaster → sand → primer → paint','finish_assembly'),
('SA','assembly:sa-exterior-render-paint','Cement render → primer → heat-resistant exterior paint','finish_assembly'),
('AE','assembly:ae-interior-gypsum-paint','Gypsum plaster → sand → primer → paint','finish_assembly'),
('AE','assembly:ae-exterior-render-paint','Cement render → primer → heat-resistant exterior paint','finish_assembly'),
('GH','assembly:gh-interior-block-paint','Render → gypsum putty → primer → emulsion','finish_assembly'),
('GH','assembly:gh-exterior-render-paint','Render → primer → exterior emulsion','finish_assembly'),
('KE','assembly:ke-interior-stone-paint','Render → skim/putty → primer → emulsion','finish_assembly'),
('KE','assembly:ke-exterior-render-paint','Render → primer → exterior emulsion','finish_assembly'),
('ZA','assembly:za-interior-skim-paint','Plaster → RhinoLite skim → bonding liquid → paint','finish_assembly'),
('ZA','assembly:za-exterior-render-paint','Plaster → exterior undercoat → exterior acrylic','finish_assembly'),
('CN','assembly:cn-interior-putty-paint','Plaster → interior putty (腻子) → latex emulsion','finish_assembly'),
('CN','assembly:cn-drywall-paint','Light steel stud → gypsum board → tape/joint → paint','finish_assembly'),
('ID','assembly:id-interior-plaster-acian-paint','Plesteran semen → acian skim → cat interior','finish_assembly'),
('ID','assembly:id-exterior-plaster-paint','Plesteran eksterior → weathershield paint','finish_assembly'),
('MX','assembly:mx-interior-yeso-paint','Yeso muestreado → sellador → pintura vinílica','finish_assembly'),
('MX','assembly:mx-exterior-repello-paint','Repello rúspido → pintura impermeable exterior','finish_assembly'),
('KR','assembly:kr-interior-putty-paint','Concrete/block → 2-pass putty (핸디코트) → eco paint','finish_assembly'),
('KR','assembly:kr-drywall-paint','Steel stud drywall → joint treatment → paint','finish_assembly'),
('IT','assembly:it-interior-intonaco-paint','Intonaco calce/cemento → rasatura → idropittura','finish_assembly'),
('IT','assembly:it-drywall-pittura','Cartongesso → stuccatura giunti → idropittura','finish_assembly')
) AS v(market_code,candidate_key,title,topic_type) JOIN public.learn_wall_finishing_market_status ms ON ms.market_code=v.market_code
ON CONFLICT(market_code,candidate_key) DO NOTHING;
INSERT INTO public.learn_wall_finishing_article_slots(topic_id,market_code,theme_key,language_code)
SELECT t.id,t.market_code,th.theme_key,mp.default_language FROM public.learn_wall_finishing_topics t JOIN public.learn_wall_finishing_article_themes th ON true JOIN public.market_profiles mp ON mp.country_code=t.market_code
ON CONFLICT(topic_id,theme_key,language_code) DO NOTHING;
COMMIT;
