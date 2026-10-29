# Wall Finishing Knowledge Library — Article Handoff

**Project:** FRELUX Global Wall Finishing Knowledge Library (32 markets)
**Status:** Architecture live on main (topics, sources, editorial review, admin console, public library pages).
**This document:** the authoritative content-production handoff — how many articles, on which topics, per market, and the running completion state.

---

## 1. Scope and volume

Total required articles = sum over markets of (verified wall-finishing titles × 5).

All 32 markets have native wall-finishing profiles in the verified FRELUX catalog
(`src/lib/wallfinishing/` + `knowledge-library.ts`). The verified candidate registry
resolves to **140 titles** (86 wall systems + 54 finish assemblies).

**Research pass (2026-10-17)** added **195 researched candidate titles** covering
real local typologies in every market (local decorative plasters, wet-area tiling,
cladding, false ceilings, crack repair and repaint prep, traditional finishes,
wallpaper where it is the local standard, and board-jointing chains missing from
the verified catalog). Candidates are recorded in
`src/lib/wallfinishing/researched-typologies.ts` with local terms and evidence
URLs, and must pass editorial review (candidate -> verified) before entering the
required five-article pipeline. See section 2b for the per-market lists.

| Registry | Titles | Articles |
|---|---|---|
| Verified catalog (existing) | 140 | 700 |
| Researched candidates (pending review) | 195 | 975 |
| **Expanded library total** | **335** | **1,675** |

**TOTAL: 335 titles × 5 articles = 1,675 articles.**

**EXCLUSION (owner directive 2026-10-17): Nigeria is DONE.** Its wall-finishing
articles already exist (the 66 seeded NG Learn articles across screeding, POP,
tile, finishing and construction categories). NG's 12 titles / 60 articles are
removed from the production queue. **Remaining production target: 323 titles
× 5 = 1,615 articles across the other 31 markets.**

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

## 2b. Research pass 2026-10-17: researched typology candidates per market

### NG Nigeria: 4 verified + 8 researched = 12 titles -> 60 articles

- [ceiling] POP (plaster of Paris) false ceiling and cornices (local: POP) Ubiquitous interior ceiling system; established local practice, capture manufacturer/standard sources at drafting.
- [board_system] Gypsum board partition with skim finish (local: drywall) Growing in urban residential and commercial fit-outs.
- [cladding] Ceramic wall tile cladding for wet areas (local: wall tiles) Standard for bathrooms and kitchens.
- [cladding] PVC and 3D decorative wall panels (local: 3D panels) [evidence: https://jiji.ng/53-3d-wall-panels] Active Lagos retail market confirmed.
- [leveling] Screeding putty leveling application (local: screeding putty) Distinct from the full paint chain; leveling-only scope.
- [paint] Gloss enamel finish for trim and doors (local: gloss) Oil-based trim finishes remain standard.
- [exterior] Exterior textured acrylic coating over render (local: texture) Used on feature walls and facades.
- [repair_prep] Crack repair and surface preparation for repainting Repaint prep chain distinct from new-build finishing.

### US United States: 5 verified + 6 researched = 11 titles -> 55 articles

- [board_system] Drywall levels of finish (Level 0-5) Reference: GA-214 recommended levels of gypsum board finish; confirm current edition at drafting.
- [board_system] Veneer plaster skim over gypsum board (local: veneer plaster) Blue-board veneer systems; capture manufacturer sources at drafting.
- [exterior] Exterior stucco and EIFS cladding Established cladding systems; ASTM references to confirm at drafting.
- [wet_area] Ceramic tile for wet areas TCNA handbook references to confirm at drafting.
- [repair_prep] Drywall repair and patching Patch/repair scope distinct from new finishing.
- [decorative] Interior spray textures (orange peel, knockdown) Texture-only scope; established practice.

### GB United Kingdom: 6 verified + 6 researched = 12 titles -> 60 articles

- [leveling] Two-coat wet plaster (browning or hardwall plus multi-finish skim) (local: wet plaster) Traditional backing+skim; BS EN 998-1 references to confirm at drafting.
- [traditional] Lime plaster and render for heritage solid walls Heritage sector standard practice; capture conservation guidance at drafting.
- [board_system] Dot and dab plasterboard drylining over masonry Standard drylining method over blockwork.
- [exterior] Through-colour silicone render systems (local: K-rend) Established modern facade render; capture manufacturer sources at drafting.
- [wet_area] Wet room and bathroom tiling Wet-area tanking plus tile; established practice.
- [repair_prep] Plaster crack and patch repair Repair scope distinct from new finishing.

### CA Canada: 5 verified + 5 researched = 10 titles -> 50 articles

- [board_system] Drywall levels of finish and taping standards Canadian taping/finishing levels; confirm references at drafting.
- [exterior] Exterior stucco cladding Ubiquitous in Western Canada; confirm standards at drafting.
- [wet_area] Ceramic tile for wet areas Standard wet-area finish.
- [repair_prep] Drywall repair and patching Patch/repair scope.
- [decorative] Stipple and textured ceiling finishes Common ceiling texture; includes stipple repair/removal context.

### AU Australia: 5 verified + 6 researched = 11 titles -> 55 articles

- [leveling] Solid plastering (render, set and skim coats) (local: solid plaster) Traditional trade over masonry; capture AS references at drafting.
- [exterior] Exterior acrylic texture coat over render Standard painted-render facade system.
- [wet_area] Ceramic tile for wet areas AS 3958.1 references to confirm at drafting.
- [repair_prep] Plasterboard repair and patching Patch/repair scope.
- [ceiling] Cornice installation and finishing Standard cornice trade scope.
- [wallpaper] Wallpaper hanging and removal Active trade; established practice.

### DE Germany: 5 verified + 6 researched = 11 titles -> 55 articles

- [traditional] Kalkputz (lime interior render) (local: Kalkputz) Established interior lime render; DIN 18550 references to confirm at drafting.
- [decorative] Filzputz and Spachtelputz decorative renders Felt and spatula texture renders; established product category.
- [wet_area] Fliesen for wet rooms (local: Fliesen) Standard wet-room tile.
- [repair_prep] Rissinstandsetzung (crack repair and injection) Systematic crack repair trade; established practice.
- [exterior] WDVS exterior insulation with Oberputz ETICS plus top render; established facade system.
- [cladding] Wood panelling and timber interior cladding (local: Holzverkleidung) Traditional and modern interior timber finishes.

### IN India: 5 verified + 8 researched = 13 titles -> 65 articles

- [ceiling] POP false ceiling and cornices (local: POP) [evidence: https://www.birlawhite.com/en/media/blogs/which-one-is-better-pop-or-wall-putty] POP vs putty use confirmed by manufacturer content.
- [leveling] White cement wall putty leveling application (local: wall putty) [evidence: https://www.birlawhite.com/en/media/blogs/how-to-make-use-of-wall-putty-to-beautify-your-home] Birla White wall putty is the dominant leveling product.
- [board_system] Gypsum board drywall partition finishing Growing urban drywall use; capture sources at drafting.
- [decorative] Interior texture paint and stucco finishes (local: texture paint) Feature-wall finishes; established retail category.
- [cladding] Ceramic wall tile cladding for wet areas Standard wet-area finish.
- [cladding] PVC and HPL wall panelling (local: wall panels) Growing modular panelling market.
- [repair_prep] Crack repair and waterproofing preparation Includes seepage-driven repaint prep; established practice.
- [paint] Enamel finish for trim and doors (local: enamel) Standard trim finish.

### GH Ghana: 4 verified + 8 researched = 12 titles -> 60 articles

- [ceiling] POP false ceiling and cornices (local: POP) Established local practice; capture sources at drafting.
- [board_system] Gypsum board partition with skim finish Common in Accra residential and commercial fit-outs.
- [cladding] Ceramic wall tile cladding for wet areas Standard wet-area finish.
- [cladding] PVC and 3D decorative wall panels Retail market active; capture sources at drafting.
- [leveling] Gypsum putty leveling application (local: putty) Leveling-only scope.
- [paint] Gloss enamel finish for trim and doors Established practice.
- [exterior] Exterior textured coating over render Established practice.
- [repair_prep] Crack repair and surface preparation for repainting Repaint prep chain.

### KE Kenya: 4 verified + 8 researched = 12 titles -> 60 articles

- [ceiling] POP and gypsum board false ceiling with cornices (local: POP ceiling) Standard in Nairobi residential finishing.
- [board_system] Gypsum board partition with skim finish Growing with Knauf East Africa supply.
- [cladding] Ceramic wall tile cladding for wet areas Standard wet-area finish.
- [cladding] PVC and 3D decorative wall panels Retail market active.
- [leveling] Wall putty leveling application (local: putty) Leveling-only scope.
- [paint] Gloss enamel finish for trim and doors Established practice.
- [exterior] Exterior textured coating over render Established practice.
- [repair_prep] Crack repair and surface preparation for repainting Repaint prep chain.

### ZA South Africa: 4 verified + 7 researched = 11 titles -> 55 articles

- [ceiling] RhinoLite skimmed ceilings and cornices (local: RhinoLite) [evidence: https://www.gyproc.co.za/news/comprehensive-guide-using-gypsum-plaster] Gyproc RhinoLite range confirmed (Multipurpose, Natural Plus, CreteStone).
- [repair_prep] Plaster crack repair and reinstatement [evidence: https://plasterer.co.za/rhinolite-plastering/] Crack repair part of standard skim trade scope.
- [cladding] Ceramic wall tile cladding for wet areas Standard wet-area finish.
- [board_system] Drywall tape and joint finishing Finishing chain for metal-stud drywall (assembly does not exist yet in catalog).
- [exterior] Exterior roughcast and texture coat Common facade finish over render.
- [ceiling] Suspended T-grid ceiling installation Commercial and residential suspended ceilings.
- [repair_prep] Preparation and repaint of previously painted walls Repaint prep chain.

### JP Japan: 4 verified + 5 researched = 9 titles -> 45 articles

- [wallpaper] Kabekami kurosu hari (wallpaper over gypsum board) (local: kurosu) [evidence: https://miyagawa38.com/column/388.html] Wallpaper is the dominant Japanese interior finish over gypsum board.
- [board_system] Binilon board lining (local: vinylon) Vinylon cement board for wet and impact areas.
- [traditional] Shikkui and nuri-kabe traditional plaster finishes (local: shikkui) Lime and earth plasters; heritage and modern reinterpretations.
- [cladding] Kabe tile cladding (local: tile) Exterior tiling over ALC/mortar substrates.
- [repair_prep] Pate board repair and repapering preparation (local: pate) [evidence: https://e-sumaile.net/word/interior-putty] Putty and substrate prep before papering.

### FR France: 4 verified + 5 researched = 9 titles -> 45 articles

- [cladding] Carrelage mural interieur (local: carrelage) Standard wall tile; capture CPT and DTU 52 sources at drafting.
- [board_system] Cloison seche BA13: bande, enduit et peinture Drywall finishing chain (jointing assembly does not exist yet for FR).
- [decorative] Stuc decoratif (effet beton, tadelakt, enduits de finition) (local: stuc) Growing decorative plaster category.
- [repair_prep] Traitement des fissures avant peinture Fissure repair plus calicot; established practice.
- [ceiling] Staff, moulures et corniches en platre (local: staff) Plaster cornices and mouldings; heritage and modern.

### BR Brazil: 4 verified + 7 researched = 11 titles -> 55 articles

- [board_system] Gesso acartonado finishing (fita e massa) (local: gesso acartonado) Drywall finishing chain; capture NBR 13215/ABNT references at drafting.
- [decorative] Textura acrilica decorative finish (local: textura) Established decorative category.
- [cladding] Azulejo and porcelanato wall cladding (local: azulejo) Extremely common wall finish.
- [cladding] PVC wall panels (roletes) Retail panelling category.
- [leveling] Massa corrida smoothing application (local: massa corrida) Leveling-only scope distinct from the paint chain.
- [repair_prep] Reparo de trincas e prep para pintura Repaint prep chain.
- [wet_area] Impermeabilizacao e revestimento de areas molhadas (local: impermeabilizacao) Waterproofing plus render/tile in wet areas.

### SA Saudi Arabia: 4 verified + 5 researched = 9 titles -> 45 articles

- [board_system] Gypsum board skim finishing (partition assembly) Board plus skim chain for partitions (assembly missing from catalog).
- [cladding] Ceramic and porcelain tile cladding Standard wet-area and feature-wall finish.
- [exterior] Exterior decorative stucco render Facade texture render; established practice.
- [repair_prep] Crack repair in gypsum and cement finishes Repaint prep chain.
- [cladding] Natural stone and marble wall cladding (local: marble) Common premium feature-wall finish.

### AE United Arab Emirates: 4 verified + 5 researched = 9 titles -> 45 articles

- [board_system] Gypsum board skim finishing (partition assembly) Board plus skim chain for partitions (assembly missing from catalog).
- [cladding] Porcelain and ceramic tile cladding Standard wet-area and feature-wall finish.
- [exterior] Exterior texture and spatter-dash render Facade texture build-up; established practice.
- [repair_prep] Crack repair in gypsum and cement finishes Repaint prep chain.
- [decorative] Acoustic wall panel systems Commercial fit-out category.

### CN China: 4 verified + 7 researched = 11 titles -> 55 articles

- [decorative] Guizao ni (diatom mud decorative finish) (local: guizao ni) [evidence: https://m.fang.com/news/wf/12188_27070488.html] Mainstream interior decorative material alongside latex paint and wallpaper.
- [wallpaper] Bizhi and qiangbu (wallpaper and fabric wall finishes) (local: bizhi) [evidence: https://www.sohu.com/a/238072618_628288] Major interior finish category.
- [ceiling] Gypsum board ceiling with joint treatment (local: shigao ban diaoding) Standard residential false ceiling system.
- [cladding] Qiangzhuan (wall tile cladding) (local: qiangzhuan) Standard wet-area tile.
- [decorative] Jili qi and yishu qi (texture and art paints) (local: jili qi) Growing art-paint category.
- [cladding] Jicheng qiangban (integrated WPC wall panels) (local: jicheng qiangban) Fast-growing modular panelling category.
- [repair_prep] Crack repair and substrate preparation (kailie xiufu) (local: kailie xiufu) Substrate prep before putty and repaint.

### ID Indonesia: 4 verified + 5 researched = 9 titles -> 45 articles

- [leveling] Plamir smoothing application (local: plamir) [evidence: https://www.indosteger.co.id/berita/detail/perbedaan-acian-dan-plamir] Plamir (gypsum-based putty) distinct from cement acian confirmed.
- [board_system] Gypsum board plafon and partition with compound finishing (local: gypsum plafon) [evidence: https://ibb.jatimprov.go.id/page/artikel/RkpxOUw3ZHpzSTdCNmdYdFlzNU5ldz09] Plafon finishing products confirmed (Top Mortar plamir instan).
- [cladding] Keramik and granite wall cladding (local: keramik) Standard wet-area tile.
- [cladding] PVC wall panels Large retail category.
- [repair_prep] Perbaikan retak dan persiapan pengecatan ulang Repaint prep chain.

### MX Mexico: 4 verified + 7 researched = 11 titles -> 55 articles

- [leveling] Pasta fina interior smoothing finish (local: pasta fina) [evidence: https://www.tiktok.com/@oropesarq/video/7500615869094202632] Resin-cement-lime fine paste confirmed; capture technical sources at drafting.
- [decorative] Pasta veneciana and estuco veneciano (local: pasta veneciana) Marble-look decorative finish; established category.
- [traditional] Pasta de chukum (regional Mayan finish) (local: chukum) Regional Yucatan finish; verify scope and usage during review.
- [board_system] Tablaroca with estuco joint finishing (local: tablaroca) Drywall finishing chain.
- [cladding] Azulejo wall tile cladding (local: azulejo) Standard wet-area tile.
- [cladding] PVC marble-look wall panels Retail panels confirmed; capture technical sources at drafting.
- [repair_prep] Reparacion de grietas en repello Crack repair in rendered walls.

### KR South Korea: 4 verified + 5 researched = 9 titles -> 45 articles

- [wallpaper] Dobae and byeokji (wallpaper finishing) (local: dobae) [evidence: https://karipaint.com/why-do-korean-apartments-use-so-much-wallpaper-%ED%95%9C%EA%B5%AD-%EC%95%84%ED%8C%8C%ED%8A%B8%EB%8A%94-%EC%99%9C-%EB%8F%84%EB%B0%B0%EA%B0%80-%EB%A7%8E%EC%9D%84%EA%B9%8C%EC%9A%94/] Wallpaper is the standard Korean apartment wall finish.
- [leveling] Mortar mijang (cement mortar finishing) (local: mijang) Mortar smoothing over concrete; established practice.
- [cladding] Wall tile cladding (local: tile) Wet-area tile standard.
- [decorative] Interior film (fildeureom) surface renewal (local: interior film) Popular retrofit finish; established retail category.
- [repair_prep] Crack repair and repainting preparation Repaint prep chain.

### IT Italy: 4 verified + 6 researched = 10 titles -> 50 articles

- [traditional] Grassello di calce (heritage lime finish) (local: grassello) Herage lime finishing; capture norms (UNI 11437 context) at drafting.
- [decorative] Stucco veneziano and marmorino Established decorative plaster category.
- [wet_area] Piastrelle e porcellanato per bagni (local: piastrelle) Standard wet-area tile.
- [exterior] Cappotto termico con rasatura ETICS plus skim; established facade system.
- [repair_prep] Restauro intonaci e riparazione fessure Plaster restoration and crack repair.
- [ceiling] Controsoffitto in cartongesso False ceilings in plasterboard; established practice.

### ET Ethiopia: 4 verified + 8 researched = 12 titles -> 60 articles

- [board_system] Gypsum board ceiling and partition finishing (local: gypsum board) [evidence: https://www.tiktok.com/@modernfinishing2026/video/7660145125577805077] Market evidence is social-media trade content; capture authoritative supplier sources at drafting.
- [leveling] Gypsum putty leveling application (local: putty) Interior leveling before emulsion.
- [cladding] Ceramic wall tile cladding for wet areas Standard in urban apartments.
- [traditional] Chika traditional mud plaster finish (local: chika) Traditional mud-and-straw plaster; verify applicability and current usage during review.
- [exterior] Exterior textured coating over render Established practice.
- [paint] Gloss enamel finish for trim and doors Established practice.
- [repair_prep] Crack repair and surface preparation for repainting Repaint prep chain.
- [cladding] PVC and 3D decorative wall panels Urban retail market active.

### EG Egypt: 4 verified + 6 researched = 10 titles -> 50 articles

- [cladding] Ceramic wall tile cladding for wet areas (local: sarmouk/ceramic) Ubiquitous in Egyptian apartments; capture sources at drafting.
- [ceiling] Gypsum board false ceilings and partitions (local: gypsum board) Growing interior fit-out system.
- [exterior] Exterior textured plastic paint over render (local: plastic paint) Common facade finish.
- [paint] Gloss enamel finish for trim and doors Established practice.
- [repair_prep] Crack repair and surface preparation for repainting Repaint prep chain.
- [cladding] Interior stone and marble cladding (local: marble) Common feature-wall finish; capture sources at drafting.

### TZ Tanzania: 4 verified + 8 researched = 12 titles -> 60 articles

- [board_system] Gypsum board ceiling and partition finishing (local: gypsum board) [evidence: https://www.magicbuilders.co.tz/] Local board/putty supply chain confirmed (BBG, Knauf, Magic Builders).
- [leveling] Putty powder leveling application (local: putty powder) [evidence: https://jakonda.co.tz/finishes] Local putty brands confirmed (BBG, Yapfix, white skim putty).
- [cladding] Ceramic wall tile cladding for wet areas Standard wet-area finish.
- [cladding] PVC and 3D decorative wall panels Retail market active.
- [ceiling] Gypsum cornice and ceiling mouldings Common decorative ceiling detail.
- [exterior] Exterior textured coating over render Established practice.
- [paint] Gloss enamel finish for trim and doors Established practice.
- [repair_prep] Crack repair and surface preparation for repainting Repaint prep chain.

### CI Côte d'Ivoire: 4 verified + 6 researched = 10 titles -> 50 articles

- [board_system] Habillage en plaques de platre (cloisons et plafonds) (local: placo) [evidence: http://www.cote-d-ivoire.prix-construction.info/construction_neuve/Amenagements_et_finitions/Doublages/Habillages_en_plaques_de_platre/FDH010_Systeme_d_habillage__PLACO___en_plaques.html] Placoplatre systems priced locally in Abidjan.
- [cladding] Carrelage mural pour pieces humides (local: carrelage) [evidence: http://www.cote-d-ivoire.prix-construction.info/renovation/Amenagements_et_finitions/Revetements_de_murs/Carrelage/FMC040_Carrelage_sur_surface_support_inter.html] Wall tile priced locally (faience 20x20 and large format).
- [leveling] Enduit de finition glace (nivellation interieure) (local: enduit de finition) Fine finishing coat before paint.
- [exterior] Crepi textile exterieur sur enduit (local: crepi) Facade texture finish.
- [paint] Peinture email pour boiseries (local: peinture email) Trim enamel finish.
- [repair_prep] Reparation de fissures avant repinture (local: reparation fissures) Repaint prep chain.

### ES Spain: 5 verified + 6 researched = 11 titles -> 55 articles

- [cladding] Azulejo y porcelanico para humedades (local: azulejo) Standard wall tile; UNE references to confirm at drafting.
- [decorative] Estuco veneciano y pasta de marmol Established decorative plaster category.
- [traditional] Yeso tradicional y esgrafiado Heritage gypsum finishes; verify regional applicability during review.
- [paint] Pintura de cal para muros (local: pintura de cal) Lime paint for heritage and healthy-building use.
- [ceiling] Techos de pladur (falsos techos) False ceilings with plasterboard; established practice.
- [repair_prep] Reparacion de grietas y preparacion para repintar Repaint prep chain.

### NL Netherlands: 5 verified + 4 researched = 9 titles -> 45 articles

- [decorative] Sierpleister (decorative plaster) Established decorative plaster category.
- [wet_area] Wandtegel voor natte ruimten (local: wandtegel) Standard wet-room tile.
- [paint] Kalkverf en kalkverfzalf (local: kalkverf) Lime paint for heritage interiors.
- [repair_prep] Reparatiepleister en scheurherstel Crack repair trade scope.

### PL Poland: 4 verified + 5 researched = 9 titles -> 45 articles

- [leveling] Gladz gipsowa (gypsum smoothing coat) (local: gladz gipsowa) Dominant interior smoothing method; PN-EN 998-1 references to confirm at drafting.
- [decorative] Tynki dekoracyjne (decorative plasters) Established decorative category.
- [cladding] Plytki ceramiczne na sciany (local: plytki) Standard wall tile.
- [board_system] G-K zabudowa: spoinowanie i szpachlowanie Drywall finishing chain (jointing assembly does not exist yet for PL).
- [repair_prep] Naprawa pekniec i przygotowanie do malowania Repaint prep chain.

### SE Sweden: 4 verified + 5 researched = 9 titles -> 45 articles

- [leveling] Gipsputs for inner tak och vagg (interior fine plaster) (local: gipsputs) Interior skim plaster; established practice.
- [wet_area] Vatrumskakel (wet room tiling) (local: vatrum) Regulated wet-room build-up (board, sealing layer, tile); capture Boverket/BBR and industry rules at drafting.
- [board_system] Fog och spackel for gipsplank Drywall jointing chain.
- [repair_prep] Sprickreparation och omalningsforberedelse Crack repair scope.
- [wallpaper] Tapetsering (wallpaper hanging) (local: tapetsering) Common interior finishing method.

### CH Switzerland: 5 verified + 5 researched = 10 titles -> 50 articles

- [traditional] Kalkputz mit Kaseinfarbe (lime render and casein paint) Heritage finishing combination; SIA references to confirm at drafting.
- [board_system] Gipsplatten mit Gipsspachtel (board jointing) Drywall jointing chain.
- [wet_area] Fliesen fuer Nassraeume (local: Fliesen) Standard wet-room tile.
- [repair_prep] Rissanierung (crack rehabilitation) Systematic crack repair practice.
- [decorative] Sierputz (decorative render) Established decorative category.

### SG Singapore: 5 verified + 6 researched = 11 titles -> 55 articles

- [leveling] HDB skim coat and putty plastering (local: skim coat) [evidence: https://dkconstructionandengineering.com/our-services/plastering-works] Cement plaster and skim to level HDB walls before painting.
- [ceiling] Gypsum board false ceiling and L-box finishing Standard residential false ceiling system.
- [cladding] Homogeneous and porcelain wall tiles Standard wet-area and facade tile.
- [wet_area] Waterproofing and wet-area tiling Sealing plus tile build-up; established practice.
- [repair_prep] Spalling concrete repair (local: spalling) HDB-specific concrete ceiling and wall repair scope.
- [wallpaper] Wallpaper hanging Common condo and commercial finish.

### TR Türkiye: 5 verified + 6 researched = 11 titles -> 55 articles

- [leveling] Saten alci (satin gypsum interior finish) (local: saten alci) [evidence: https://www.yapikatalogu.com/blog/saten-alci-nedir-ozellikleri_524] The standard Turkish interior wall finish.
- [board_system] Alcipan derz and saten finishing (local: alcipan) [evidence: https://dalsan.com.tr/Belgeler] Board jointing plus satin gypsum; Dalsan product range confirmed.
- [cladding] Seramik karo wall cladding (local: seramik karo) Standard wet-area tile.
- [exterior] Mantolama with mineral siva (ETICS facade) Standard insulated facade render system.
- [decorative] Venezien siva (Venetian plaster) Established decorative category.
- [repair_prep] Catlak onarimi ve yeniden boyama hazirligi Repaint prep chain.

### NZ New Zealand: 4 verified + 5 researched = 9 titles -> 45 articles

- [board_system] GIB stopping and finishing levels (local: stopping) GIB stopping levels are the local standard; capture Winstone/manufacturer sources at drafting.
- [leveling] Solid plaster (cement render and skim) Traditional solid plaster trade.
- [wet_area] Wet-area linings (villaboard and tile) (local: villaboard) Villaboard plus tile is the standard wet-area chain.
- [repair_prep] Plasterboard repair and patching Patch/repair scope.
- [cladding] Ceramic wall tile cladding Standard wet-area finish.


---

## 3. Completion tracking

| Market | Titles (verified + researched) | Required articles | Drafted | Reviewed | Approved | Published |
|---|---|---|---|---|---|---|
| NG | 12 | 60 | 60 | 60 | n/a (pre-review pipeline) | 60 (already live in Learn hub) |
| US | 5 + 6 = 11 | 55 | 55 (5 verified topics + 6 researched candidates: drywall-finish-levels, veneer-plaster-skim, stucco-eifs-cladding, wet-area-tile, drywall-repair-patching, interior-spray-textures) - US QUEUE COMPLETE | 0 | 0 | 0 |
| GB | 6 + 6 = 12 | 60 | 40 (catalog topics done: brick-block cavity wall, timber-frame-dryline, solid-masonry, interior-block-skim-paint, interior-plasterboard-paint, exterior-render-paint; GB researched CANDIDATES so far: two-coat-wet-plaster, lime-heritage-plaster, both registered verification_status=candidate pending admin promotion; all with real Commons cover photographs per the 2026-10-26 owner directive) | 0 | 0 | 0 |
| other 29 | 4–6 + 4–8 each | 45–65 each | 0 | 0 | 0 | 0 |

Per-market required-article totals after the research pass (NG excluded as complete):
US 55, GB 60, CA 50, AU 55, DE 55, IN 65, GH 60, KE 60, ZA 55, JP 45, FR 45, BR 55,
SA 45, AE 45, CN 55, ID 45, MX 55, KR 45, IT 50, ET 60, EG 50, TZ 60, CI 50, ES 55,
NL 45, PL 45, SE 45, CH 50, SG 55, TR 55, NZ 45. Remaining sum = 1,615. 0 |

- **Drafted to date: 155 / 1,615** remaining (US QUEUE COMPLETE: all 11 US topics done; GB series begun with the brick/block cavity wall topic, `system:gb-brick-block`, 5 drafted as `draft` / editorial_review_status `draft`, market='GB'. all five verified catalog topics PLUS all six researched candidates, `assembly:us-drywall-finish-levels`, `assembly:us-veneer-plaster-skim`, `assembly:us-stucco-eifs-cladding`, `assembly:us-wet-area-tile`, `assembly:us-drywall-repair-patching`, and `assembly:us-interior-spray-textures`, each seeded as verification_status `candidate` in the topics table (schema requires an authenticated admin to promote to `verified` via the admin console); their articles are `draft` / editorial_review_status `draft`, market='US'). Nigeria is complete and excluded from the queue. Next: GB researched candidates (6 topics, 30 articles), then the queue crosses to the next market. IMAGE POLICY (owner directive 2026-10-26): every NEW article carries a real photograph (Wikimedia Commons, attributed in content + sources table), never AI generated. PENDING RETROFIT: the 55 US articles (and 5 GB cavity wall covers are DONE via 20261024220000) still need cover images added once writing permits. 2026-10-29: GB plaster crack and patch repair (assembly:gb-plaster-crack-patch-repair) applied as 20261024330000, 5 articles 1,810 to 2,006 words, 8 sources, 5 verified Commons covers. GB now 12 topics / 60 articles, all with covers. 2026-10-29: CA wood frame + drywall (system:ca-wood-frame-drywall) applied as 20261024340000, the FIRST Canada batch. 5 articles 1,821 to 1,886 words, 8 Canadian sources (NRC codes + provincial adoption, NRCan, ASTM C1396, CMHC, Canadian Wood Council, CHBA, Ontario Reg 332/12), 5 verified Commons covers all returning 200. Canada is now 1 of 10 topics done. 2026-10-29: CA steel frame + drywall (system:ca-steel-frame-drywall) applied as 20261024350000. 5 articles 1,847 to 1,923 words, 9 sources (ASTM C645, SFIA, AISI, ULC, NRC x2, NRCan, CMHC, OBC), 5 verified Commons covers (navy metal framing, CFS stud cross-section, double stud acoustic detail, firestop deficiency, textured ceiling). Canada 2 of 10 topics done. 2026-10-29: CA insulated concrete forms (system:ca-icf) applied as 20261024360000. 5 articles 1,811 to 1,883 words, 9 sources (ICFMA, Cement Association of Canada, PCA, ULC, NRC x2, NRCan, CMHC, OBC), 5 verified real covers (ICF safe room wall section, Neopor block, wall rebar before pour, concrete pump placement, ICF home). Canada 3 of 3 seeded topics done; next CA topics must be seeded before drafting. 2026-10-29: CA interior drywall to paint (assembly:ca-interior-drywall-paint) applied as 20261024370000. 5 articles 1,813 to 1,914 words, 9 sources (CGC Canada, National Gypsum, Dulux Canada, Benjamin Moore Canada, NRC x2, NRCan, CMHC, OBC), 5 verified real covers (drywall worksite, drywall screw macro, 1960s board installation, rated assembly firestop failure, drywall repair and repainting). Canada 4 of 5 seeded topics done; only assembly:ca-exterior-masonry-paint remains before Canada is complete. 2026-10-29: CA exterior masonry paint (assembly:ca-exterior-masonry-paint) applied as 20261024380000. 5 articles 1,828 to 1,866 words, 9 sources (Dulux Canada, Benjamin Moore Canada, Sico, Cement Association of Canada, NRC x2, NRCan, CMHC, OBC), 5 verified real covers (white painted brick, painted brick Kronstadt, pressure washing, flaking paint failure, repainting exterior). CANADA COMPLETE: 5 of 5 seeded CA topics, 25 articles. Next market needs seeding before drafting. 2026-10-29: DE interior masonry paint (assembly:de-interior-masonry-paint) applied as 20261024390000. 5 articles 1,803 to 1,868 words, 9 sources (Caparol, Sto, Bundesverband Farbe, Beuth/DIN, DIN, VOB, Umweltbundesamt, DIBt, Brillux), 5 verified real covers (Kalkputz, Gipsputz, plasterer at work, plastering, painting a wall). Germany 1 of 5 seeded topics done (4 remain: de-exterior-render-paint, system:de-blockwork-lime, system:de-drywall-metal-stud, system:de-masonry-gypsum). Germany already seeded, no new topic rows needed. 2026-10-29: DE exterior render and facade paint (assembly:de-exterior-render-paint) applied as 20261024400000. 5 articles 1,801 to 1,956 words, 10 sources (Sto, Caparol, Brillux, Bundesverband Farbe, Beuth/DIN, DIN, VOB, DIBt for WDVS approvals, Wienerberger, Putz.de), 5 verified real covers (listed villa Putzfassade, render over natural stone Weimar, plasterers rendering, Gruenderzeit rendered facade, 1680 rendered timber frame). Germany 2 of 5 topics done; 3 remain (system:de-blockwork-lime, system:de-drywall-metal-stud, system:de-masonry-gypsum). 2026-10-29: DE metal stud drywall (system:de-drywall-metal-stud) applied as 20261024410000. 5 articles 1,800 to 1,894 words, 8 sources (Rigips, Fermacell, Bundesverband Gipsindustrie, Beuth/DIN, DIN, VOB, DIBt, Bundesverband Farbe), 5 DISTINCT verified real covers (Trockenbau site, Trockenbau Muenchen, Gipskartonduebel fixing, boards and tools, plasterboard repair). Germany 3 of 5 topics done; 2 remain (system:de-blockwork-lime, system:de-masonry-gypsum).
- **Researched candidates: 195 titles awaiting editorial review** (see section 2b); they enter the 1,675 total only after verification. The verified-catalog baseline of 700 articles stands regardless.
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
topic, before moving on. Record progress in section 3 after every batch. Counts below
are the expanded registry (verified catalog + researched candidates once reviewed):

0. NG — EXCLUDED, articles already done (66 NG articles live in the Learn hub)
1. US — 11 titles — 55 (1 topic already drafted)
2. GB — 12 — 60
3. CA — 10 — 50
4. AU — 11 — 55
5. DE — 11 — 55
6. IN — 13 — 65
7. GH — 12 — 60
8. KE — 12 — 60
9. ZA — 11 — 55
10. JP — 9 — 45
11. FR — 9 — 45
12. BR — 11 — 55
13. SA — 9 — 45
14. AE — 9 — 45
15. CN — 11 — 55
16. ID — 9 — 45
17. MX — 11 — 55
18. KR — 9 — 45
19. IT — 10 — 50
20. ET — 12 — 60
21. EG — 10 — 50
22. TZ — 12 — 60
23. CI — 10 — 50
24. ES — 11 — 55
25. NL — 9 — 45
26. PL — 9 — 45
27. SE — 9 — 45
28. CH — 10 — 50
29. SG — 11 — 55
30. TR — 11 — 55
31. NZ — 9 — 45
