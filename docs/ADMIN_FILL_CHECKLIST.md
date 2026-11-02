# Admin fill checklist

Audit of the live database (project `nfgaaohweygwydoelxnf`, 30 Oct 2026) against every
admin section, listing only what is **empty or blank and needs the owner to supply a
value**. Row counts come from `pg_stat_user_tables`; fields come from
`information_schema` (required columns) and from the panel that owns each table.

Already populated, no action: calculator templates (77), learn library (272 articles,
198 FAQs, 19 categories), legal pages (5), testimonials (3), case studies (6), paint
colours (724), POP/tile/screeding materials, labour rates, estimation prices (1,956),
market calculator config (1,728), plans (12), plan prices (192), ad providers (37) and
placements (40), rewarded config, translations (see B6 for the gap).

Legend: **Blocking** means a live page is degraded now. **Partial** means some data
exists. **Optional** means the feature is dormant by choice.

---

## A. Store identity and analytics

| #   | Where        | Field                                | State                                              | Needed                                                                    |
| --- | ------------ | ------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| A1  | Settings     | `site_settings.logo_url`             | null                                               | Logo image URL (or file to upload)                                        |
| A2  | Settings     | `seo_title`                          | null                                               | Site-wide title, 50-60 chars                                              |
| A3  | Settings     | `seo_description`                    | null                                               | Site-wide description, 150-160 chars                                      |
| A4  | Integrations | `google_analytics` (disabled, empty) | **Blocking** for measurement                       | GA4 measurement ID `G-XXXXXXX`                                            |
| A5  | Integrations | `meta_pixel` (disabled, empty)       | Optional                                           | Pixel ID                                                                  |
| A6  | Integrations | `google_search_console`              | configured (`google61eb…html`)                     | nothing                                                                   |
| A7  | Settings     | `ad_slots`                           | `{}`                                               | Per-slot AdSense unit IDs, only if manual slots wanted (auto ads run now) |
| A8  | Settings     | `display_currencies`                 | null                                               | Which currencies the selectors offer                                      |
| A9  | Settings     | `loader_config`                      | null                                               | Splash/loader style choice                                                |
| A10 | Settings     | `payment_provider_configured`        | `false` while Flutterwave + Paystack keys are live | flip to true (consistency bug)                                            |

## B. Money, documents and trust (settings)

| #   | Where               | Field                             | State                                                                          | Needed                                           |
| --- | ------------------- | --------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ |
| B1  | PDF Branding        | `pdf_default_contact_email`       | `petertubin@gmail.com` (site contact is `frenzyanthony39@gmail.com`)           | which address is official                        |
| B2  | PDF Branding        | `pdf_template_id`                 | null                                                                           | default document template choice                 |
| B3  | Integrations        | `stripe`                          | disabled, empty keys                                                           | decide: keep Flutterwave/Paystack only           |
| B4  | Integrations        | `cloud_storage`                   | disabled, empty                                                                | bucket/region if external storage wanted         |
| B5  | Integrations        | `whatsapp_business`               | disabled, empty                                                                | WhatsApp Cloud API token + number, if wanted     |
| B6  | Translations        | `content_translations`            | 150 rows, Spanish only                                                         | other locales need copy                          |
| B7  | Social Brand Center | `frelux_social_accounts`          | 0                                                                              | handles/tokens per network                       |
| B8  | Pro Connect         | `credential_verification_sources` | 0 rows (`country_code`, `credential_class`, `lookup_type`)                     | registry URLs per body/country                   |
| B9  | Currency            | `settlement_fx_config`            | 0 rows (market, provider, charge/settle currency, reviewer, legal review date) | settlement + review policy                       |
| B10 | Marketplace         | `merchant_punchout_configs`       | 0 rows                                                                         | merchant name + protocol, if B2B punchout wanted |

## C. Estimation engine configuration (all empty)

Every panel below is a working CRUD screen over an empty table, so the calculators
that read it either fall back or stop.

| #   | Panel                 | Table (rows)                                           | Required fields                                               |
| --- | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| C1  | Engine Config         | `em_material_profiles` (0)                             | material coverage / package / waste                           |
| C2  | Engine Config         | `em_roof_materials` (0)                                | roof covering specs                                           |
| C3  | Engine Config         | `em_roof_sections` (0)                                 | section + pitch configs                                       |
| C4  | Carbon Factors        | `carbon_factors` (0)                                   | category, unit, kg CO2e per unit, source                      |
| C5  | Thermal Factors       | `thermal_finish_factors` (0)                           | surface type, category, solar reflectance, source             |
| C6  | Reuse Factors         | `material_reuse_factors` (0)                           | category, unit, recovery, reuse, recycle, source              |
| C7  | Maintenance Profiles  | `maintenance_profiles` (0)                             | finish category, service life min/max, cost factor, source    |
| C8  | Defects               | `defects` (0) + `defect_causes` (0)                    | symptom key/label; then causes per defect                     |
| C9  | Solar Prices          | `solar_component_prices` (0)                           | component key, unit, naira price, source                      |
| C10 | Cash Flow Templates   | `cash_flow_templates` (0)                              | name + milestone list                                         |
| C11 | Regional Cost Indices | `regional_cost_indices` (6 rows, 6 states, 1 category) | remaining states and categories, with source + review date    |
| C12 | Macro Tracker         | `macro_economic_indicators` (0)                        | market, currency, indicator, current + baseline index, source |
| C13 | Market Intelligence   | `mi_sources` (0), `mi_approved_prices` (0)             | competitor source names; approved price book rows             |

Affected live pages: Carbon Footprint, Circular Reuse, Maintenance Planner, Defect
Diagnosis, Solar PV estimator, Cash Flow Timeline, Macro Tracker, Market Intelligence.

## D. Presentation and discovery

| #   | Where         | Field                    | State                                    | Needed                                      |
| --- | ------------- | ------------------------ | ---------------------------------------- | ------------------------------------------- |
| D1  | Header Images | `header_image_overrides` | 0 rows (`route`, `image_url`)            | image per route, or keep defaults           |
| D2  | SEO           | `seo_page_settings`      | 0 rows (`page_type`, title, description) | per-page-type overrides                     |
| D3  | PDF Branding  | `pdf_studio_templates`   | 0 rows                                   | document templates (owner or user supplied) |
| D4  | Brand Studio  | `brand_profiles`         | 0 rows                                   | per-user, created on use                    |
| D5  | Roof View     | `roof_view_config`       | 0 rows                                   | satellite provider + key choice             |

## E. Platform and governance

| #   | Where                | Table                          | State  | Needed                                        |
| --- | -------------------- | ------------------------------ | ------ | --------------------------------------------- |
| E1  | Engine Config        | `frelux_archie_model_registry` | 0 rows | register an ARCHIE engine (owner gate)        |
| E2  | Intelligence Sources | `frelux_intelligence_sources`  | 0 rows | approved learning sources                     |
| E3  | Intelligence Sources | `frelux_search_providers`      | 0 rows | search adapter + credentials                  |
| E4  | Owner Authority      | `frelux_owner_credentials`     | 0 rows | owner credential enrolment                    |
| E5  | Security             | `encryption_key_registry`      | 0 rows | key scope/provider/alias (no secrets in repo) |

## F. Supply side (empty because nothing has been posted)

`pro_profiles` 0, `supplier_profiles` 0, `marketplace_seller_profiles` 0,
`marketplace_listings` 0, `marketplace_products` 0. The posting forms capture
coordinates from the seller's device, so pins appear as real users post. Nothing for
the owner to type here, and nothing may be invented.

---

## Order of work I recommend

1. **A1-A4, A10, B1** — five minutes of input, unblocks logo, SEO defaults, GA and the
   payment flag fix.
2. **C1-C3** — engine material/roof profiles; several calculators depend on them.
3. **C4-C10** — factor tables; each needs unit + source, so the honest values come from
   published references the owner accepts.
4. **D1-D2, B6** — presentation and localisation, largest volume of input.
5. **E1-E5** — owner-gated platform steps, only when the owner wants them live.
