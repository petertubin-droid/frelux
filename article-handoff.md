# Wall Finishing Knowledge Library — Article Handoff

**Project:** FRELUX Global Wall Finishing Knowledge Library (32 markets)
**Status:** Architecture live on main (topics, sources, editorial review, admin console, public library pages).
**This document:** the authoritative content-production handoff — how many articles, on which topics, per market, and the running completion state.

---

## 1. Scope and volume

Total required articles = sum over markets of (verified wall-finishing titles × 5).

All 32 markets have native wall-finishing profiles in the verified FRELUX catalog
(`src/lib/wallfinishing/` + `knowledge-library.ts`). The verified candidate registry
resolves to **140 titles** (86 wall systems + 54 finish assemblies):

| Titles per market | Markets | Articles per market |
|---|---|---|
| 4 | 21 markets | 20 |
| 5 | 10 markets | 25 |
| 6 | 1 market (GB) | 30 |

**TOTAL: 140 titles × 5 articles = 700 articles.**

Every title needs five genuinely distinct articles (no rewrites of the same text):
1. Introduction and material fundamentals
2. Materials, tools and technical specifications
3. Installation and application procedure
4. Quantity calculation and cost estimation (linked to FRELUX calculators; no fabricated coverage rates or prices)
5. Troubleshooting, quality, maintenance and compliance

Titles may only be added from real, verifiable market typologies — never inflated
to chase a count. If research adds a genuinely used local system to a market,
add it via the admin console (verification_status candidate → verified) and this
document's counts must be updated in the same change.

## 2. Market × topic registry (auto-derived from the code catalog)

## NG — Nigeria (4 titles → 20 articles)
- [system] Sandcrete block wall (system:ng-sandcrete-block)
- [system] RC frame + block infill (system:ng-concrete-frame-block)
- [assembly] Block → render → screeding putty → primer → emulsion (assembly:ng-interior-block-paint)
- [assembly] Block → render → exterior acrylic (assembly:ng-exterior-block-render-paint)
## US — United States (5 titles → 25 articles)
- [system] Timber stud + drywall (system:us-timber-stud-drywall)
- [system] Steel stud + drywall (system:us-steel-stud-drywall)
- [system] Masonry veneer over framing (system:us-masonry-veneer)
- [assembly] Drywall → tape → joint compound → sand → primer → paint (assembly:us-interior-drywall-paint)
- [assembly] Exterior masonry → primer → exterior acrylic (assembly:us-exterior-masonry-paint)
## GB — United Kingdom (6 titles → 30 articles)
- [system] Brick/block cavity wall (system:gb-brick-block)
- [system] Timber frame + drylining (system:gb-timber-frame-dryline)
- [system] Solid masonry wall (system:gb-solid-masonry)
- [assembly] Block/brick → undercoat where required → skim plaster → mist coat → emulsion (assembly:gb-interior-block-skim-paint)
- [assembly] Plasterboard → jointing → optional skim → mist → emulsion (assembly:gb-interior-plasterboard-paint)
- [assembly] Exterior render (optional) → masonry paint (assembly:gb-exterior-render-paint)
## CA — Canada (5 titles → 25 articles)
- [system] Wood frame + drywall (system:ca-wood-frame-drywall)
- [system] Steel frame + drywall (system:ca-steel-frame-drywall)
- [system] ICF (insulated concrete forms) (system:ca-icf)
- [assembly] Drywall → tape → joint compound → sand → primer → paint (assembly:ca-interior-drywall-paint)
- [assembly] Exterior masonry → primer → exterior acrylic (assembly:ca-exterior-masonry-paint)
## AU — Australia (5 titles → 25 articles)
- [system] Brick veneer + plasterboard (system:au-brick-veneer-plasterboard)
- [system] Double brick (cavity masonry) (system:au-double-brick)
- [system] Light steel frame + plasterboard (system:au-light-steel-frame)
- [assembly] Plasterboard → tape + base/topping compound → sand → sealer → low sheen (assembly:au-interior-plasterboard-paint)
- [assembly] Masonry → render (optional) → exterior acrylic (assembly:au-exterior-render-paint)
## DE — Germany (5 titles → 25 articles)
- [system] Masonry + gypsum plaster (system:de-masonry-gypsum)
- [system] Blockwork + lime/mineral render (system:de-blockwork-lime)
- [system] Drywall (metal stud) (system:de-drywall-metal-stud)
- [assembly] Masonry → gypsum base plaster → fine filler → Tiefgrund → interior paint (assembly:de-interior-masonry-paint)
- [assembly] Masonry → mineral base render → facade paint (assembly:de-exterior-render-paint)
## IN — India (5 titles → 25 articles)
- [system] Brick/block masonry (system:in-brick-block-plaster)
- [system] AAC block wall (system:in-aac-block)
- [system] RCC frame + brick infill (system:in-rcc-frame-brick)
- [assembly] Brick/block → cement-sand plaster → wall putty → primer → paint (assembly:in-interior-brick-paint)
- [assembly] Brick/block → plaster → exterior emulsion (assembly:in-exterior-render-paint)
## GH — Ghana (4 titles → 20 articles)
- [system] Sandcrete block wall with render (system:gh-sandcrete-render)
- [system] Timber frame + gypsum board (system:gh-timber-frame-gypsum)
- [assembly] Render → gypsum putty → primer → emulsion (assembly:gh-interior-block-paint)
- [assembly] Render → primer → exterior emulsion (assembly:gh-exterior-render-paint)
## KE — Kenya (4 titles → 20 articles)
- [system] Machine-cut stone wall with render (system:ke-stone-render)
- [system] Concrete block wall with render (system:ke-block-render)
- [assembly] Render → skim/putty → primer → emulsion (assembly:ke-interior-stone-paint)
- [assembly] Render → primer → exterior emulsion (assembly:ke-exterior-render-paint)
## ZA — South Africa (4 titles → 20 articles)
- [system] Clay brick + plaster (system:za-brick-plaster)
- [system] Drywall on metal stud (system:za-drywall-metal-stud)
- [assembly] Plaster → RhinoLite skim → bonding liquid → paint (assembly:za-interior-skim-paint)
- [assembly] Plaster → exterior undercoat → exterior acrylic (assembly:za-exterior-render-paint)
## JP — Japan (4 titles → 20 articles)
- [system] Timber frame + gypsum board (system:jp-timber-frame-gypsum)
- [system] RC frame + ALC panel infill (system:jp-rc-alc-panel)
- [assembly] Gypsum board → パテ → sand → primer → emulsion paint (assembly:jp-interior-gypsum-paint)
- [assembly] ALC panel → sealing primer → elastic exterior paint (assembly:jp-exterior-alc-paint)
## FR — France (4 titles → 20 articles)
- [system] Bloc/brique + enduit de platre (system:fr-masonry-plaster)
- [system] Cloison platre BA13 sur ossature metal (system:fr-drywall-metal-stud)
- [assembly] Enduit de lissage → poncage → sous-couche → peinture (assembly:fr-interior-masonry-paint)
- [assembly] Enduit de facade → peinture de facade (assembly:fr-exterior-render-paint)
## BR — Brazil (4 titles → 20 articles)
- [system] Alvenaria de tijolo/bloco com reboco (system:br-brick-plaster)
- [system] Drywall steel stud (placa de gesso) (system:br-drywall-steel-stud)
- [assembly] Reboco → massa corrida → selador → tinta acrilica (assembly:br-interior-massa-paint)
- [assembly] Reboco → selador → tinta acrilica externa (assembly:br-exterior-render-paint)
## SA — Saudi Arabia (4 titles → 20 articles)
- [system] RC frame + block + gypsum plaster (system:sa-block-gypsum-plaster)
- [system] Gypsum board partition (system:sa-drywall-partition)
- [assembly] Gypsum plaster → sand → primer → paint (assembly:sa-interior-gypsum-paint)
- [assembly] Cement render → primer → heat-resistant exterior paint (assembly:sa-exterior-render-paint)
## AE — United Arab Emirates (4 titles → 20 articles)
- [system] RC frame + block + gypsum plaster (system:ae-rc-block-gypsum)
- [system] Gypsum board partition (system:ae-drywall-partition)
- [assembly] Gypsum plaster → sand → primer → paint (assembly:ae-interior-gypsum-paint)
- [assembly] Cement render → primer → heat-resistant exterior paint (assembly:ae-exterior-render-paint)
## CN — China (4 titles → 20 articles)
- [system] Concrete block / masonry with render (system:cn-concrete-block-render)
- [system] Light steel stud drywall (system:cn-gypsum-board-metal-stud)
- [assembly] Plaster → interior putty (腻子) → latex emulsion (assembly:cn-interior-putty-paint)
- [assembly] Light steel stud → gypsum board → tape/joint → paint (assembly:cn-drywall-paint)
## ID — Indonesia (4 titles → 20 articles)
- [system] Bata merah (red brick) with plesteran (system:id-brick-plaster)
- [system] Bata ringan (AAC block) with thin render (system:id-aac-block-render)
- [assembly] Plesteran semen → acian skim → cat interior (assembly:id-interior-plaster-acian-paint)
- [assembly] Plesteran eksterior → weathershield paint (assembly:id-exterior-plaster-paint)
## MX — Mexico (4 titles → 20 articles)
- [system] Block de concreto with repello (system:mx-concrete-block-plaster)
- [system] Tabique rojo recocido with repello (system:mx-red-brick-render)
- [assembly] Yeso muestreado → sellador → pintura vinílica (assembly:mx-interior-yeso-paint)
- [assembly] Repello rúspido → pintura impermeable exterior (assembly:mx-exterior-repello-paint)
## KR — South Korea (4 titles → 20 articles)
- [system] RC shear wall with direct gypsum lining (system:kr-rc-wall-gypsum)
- [system] Drywall on steel stud framing (system:kr-drywall-steel-stud)
- [assembly] Concrete/block → 2-pass putty (핸디코트) → eco paint (assembly:kr-interior-putty-paint)
- [assembly] Steel stud drywall → joint treatment → paint (assembly:kr-drywall-paint)
## IT — Italy (4 titles → 20 articles)
- [system] Laterizio forato with intonaco (system:it-perforated-brick-plaster)
- [system] Cartongesso on metal stud framing (system:it-drywall-metal-stud)
- [assembly] Intonaco calce/cemento → rasatura → idropittura (assembly:it-interior-intonaco-paint)
- [assembly] Cartongesso → stuccatura giunti → idropittura (assembly:it-drywall-pittura)
## ET — Ethiopia (4 titles → 20 articles)
- [system] RC frame + hollow concrete block (HCB) infill (system:et-hcb-frame-plaster)
- [system] Solid fired-clay brick + plaster (system:et-solid-brick-plaster)
- [assembly] Plaster → putty → sand → primer → emulsion (assembly:et-interior-plaster-putty-paint)
- [assembly] Render → exterior emulsion (assembly:et-exterior-render-paint)
## EG — Egypt (4 titles → 20 articles)
- [system] Red brick + plaster (system:eg-red-brick-plaster)
- [system] AAC block + plaster (system:eg-aac-block-plaster)
- [assembly] Plaster → gypsum skim → primer → emulsion (assembly:eg-interior-plaster-gypsum-paint)
- [assembly] Render → exterior emulsion (assembly:eg-exterior-render-paint)
## TZ — Tanzania (4 titles → 20 articles)
- [system] Hollow concrete block + render (system:tz-hollow-block-render)
- [system] Quarry-stone masonry + render (system:tz-stone-masonry-render)
- [assembly] Render → putty → primer → emulsion (assembly:tz-interior-render-putty-paint)
- [assembly] Render → exterior emulsion (assembly:tz-exterior-render-paint)
## CI — Côte d'Ivoire (4 titles → 20 articles)
- [system] Parpaings de ciment + enduit (system:ci-parpaing-enduit)
- [system] Briques cuites + enduit (system:ci-brique-cuite-enduit)
- [assembly] Enduit de ciment → enduit de finition → sous-couche → peinture (assembly:ci-interior-enduit-peinture)
- [assembly] Enduit de ciment → peinture extérieure (assembly:ci-exterior-enduit-peinture)
## ES — Spain (5 titles → 25 articles)
- [system] Ladrillo hueco + yeso (system:es-ladrillo-hueco-yeso)
- [system] Pladur en perfilería metálica (system:es-pladur-metal-stud)
- [assembly] Guía de cemento → enlucido de yeso → imprimación → pintura plástica (assembly:es-interior-enlucido-paint)
- [assembly] Mortero monocapa → pintura fachada (assembly:es-exterior-monocapa-paint)
- [assembly] Pladur → cinta y masilla → pintura (assembly:es-pladur-paint)
## NL — Netherlands (5 titles → 25 articles)
- [system] Kalkzandsteen + pleisterwerk (system:nl-kalkzandsteen-pleister)
- [system] Gipsplaat op metal stud (system:nl-gipsplaat-metal-stud)
- [assembly] Pleisterwerk → grondverf → latex (assembly:nl-interior-pleister-paint)
- [assembly] Kalkcementpleister → buitenverf (assembly:nl-exterior-pleister-paint)
- [assembly] Gipsplaat → tape + voegvuller → verf (assembly:nl-drywall-paint)
## PL — Poland (4 titles → 20 articles)
- [system] Beton komórkowy (AAC) + tynk (system:pl-beton-komorkowy-tynk)
- [system] Ceramic brick + tynk (system:pl-ceramic-brick-tynk)
- [assembly] Tynk cementowo-wapienny → gładź gipsowa → grunt → farba (assembly:pl-interior-tynk-gladz-paint)
- [assembly] Tynk cementowy → farba elewacyjna (assembly:pl-exterior-tynk-paint)
## SE — Sweden (4 titles → 20 articles)
- [system] Tegel (clay brick) + putssystem (system:se-tegel-puts)
- [system] Lättbetong + puts/gips (system:se-lattbetong-gips)
- [assembly] Grovt putsetapp → finpapp/putspapper → grundfärg → täckfärg (assembly:se-interior-puts-paint)
- [assembly] Utomhusputs → täckfärg (assembly:se-exterior-puts-paint)
## CH — Switzerland (5 titles → 25 articles)
- [system] Backstein + Kalkputz (system:ch-backstein-kalkputz)
- [system] Gipsplatte auf Metallständerwerk (system:ch-gipsplatte-metal-stud)
- [assembly] Kalkputz (Grund) → Gipsputz → Grundierung → Dispersionsfarbe (assembly:ch-interior-gipsputz-paint)
- [assembly] Kalkputz Aussenputz → Aussenfarbe (assembly:ch-exterior-kalkputz-paint)
- [assembly] Gipsplatten → Tapezieren/Spachteln → Farbe (assembly:ch-gipsplatte-paint)
## SG — Singapore (5 titles → 25 articles)
- [system] RC frame + brick/AAC infill + plaster (system:sg-brick-infill-plaster)
- [system] Drywall on metal stud (system:sg-drywall-metal-stud)
- [assembly] Plaster → putty → primer → emulsion (assembly:sg-interior-plaster-putty-paint)
- [assembly] Render → exterior emulsion (assembly:sg-exterior-render-paint)
- [assembly] Drywall → tape + joint compound → paint (assembly:sg-drywall-paint)
## TR — Türkiye (5 titles → 25 articles)
- [system] Tuğla duvar + sıva (system:tr-tugla-siva)
- [system] Alçı diyvar (drywall partition) (system:tr-alci-diyvar)
- [assembly] Sıva → saten alçı → astar → silikonlu boya (assembly:tr-interior-siva-alci-paint)
- [assembly] Sıva → dış cephe boyası (assembly:tr-exterior-siva-paint)
- [assembly] Alçıpan → bant + macun → boya (assembly:tr-drywall-paint)
## NZ — New Zealand (4 titles → 20 articles)
- [system] Timber frame + Gib plasterboard (system:nz-timber-gib-plasterboard)
- [system] Brick veneer + render (system:nz-brick-veneer-render)
- [assembly] Gib board → tape + compound → sand → primer → paint (assembly:nz-interior-gib-paint)
- [assembly] Render → exterior acrylic (assembly:nz-exterior-render-paint)


---

## 3. Completion tracking

| Market | Titles | Required articles | Drafted | Reviewed | Approved | Published |
|---|---|---|---|---|---|---|
| US | 5 | 25 | 5 (timber-stud drywall topic) | 0 | 0 | 0 |
| all other 31 | 4–6 | 20–30 each | 0 | 0 | 0 | 0 |

- **Drafted to date: 5 / 700** (US timber-stud drywall, five editorial themes, seeded as `draft` / editorial_review_status `draft`, market='US').
- **Published to date: 0.** Nothing may publish without real technical review (DB CHECK constraint enforces reviewer identity on every approval transition).
- 34 manually inserted Learn articles (Oct 9–10) are part of the general Learn hub, not this wall-finishing library, and are not counted here.

## 4. Production rules (binding)

1. Five distinct articles per title per market — never shared between markets, never five rewrites of one text.
2. Every factual claim carries a real, retrievable source URL recorded in `learn_wall_finishing_sources`; unverified claims are labeled unverified or held in draft.
3. No fabricated coverage rates, prices, labour rates, or standards citations. Prices only from FRELUX's configured price data with provenance and update dates.
4. Drafts enter with status `draft` + editorial_review_status `draft`; publication requires an authorized reviewer (DB-enforced).
5. Idempotent generation: retries never create duplicates (unique constraints on slots and slugs).
6. The five-article theme slots per topic are the five editorial themes above (learn_wall_finishing_article_slots).

## 5. Write order (resumable batches)

Process markets in the registry order below, one topic at a time, five articles per
topic, before moving on. Record progress in section 3 after every batch.

1. NG — 4 titles — 20 articles
2. US — 5 titles — 25 articles (1 topic already drafted)
3. GB — 6 titles — 30 articles
4. CA — 5 titles — 25
5. AU — 5 — 25
6. DE — 5 — 25
7. IN — 5 — 25
8. GH — 4 — 20
9. KE — 4 — 20
10. ZA — 4 — 20
11. JP — 4 — 20
12. FR — 4 — 20
13. BR — 4 — 20
14. SA — 4 — 20
15. AE — 4 — 20
16. CN — 4 — 20
17. ID — 4 — 20
18. MX — 4 — 20
19. KR — 4 — 20
20. IT — 4 — 20
21. ET — 4 — 20
22. EG — 4 — 20
23. TZ — 4 — 20
24. CI — 4 — 20
25. ES — 5 — 25
26. NL — 5 — 25
27. PL — 4 — 20
28. SE — 4 — 20
29. CH — 5 — 25
30. SG — 5 — 25
31. TR — 5 — 25
32. NZ — 4 — 20
