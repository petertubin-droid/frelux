// FRELUX wall-finishing researched typology registry (research pass 2026-10-17).
// Candidate titles only: these are NOT yet verified catalog entries. Each must
// pass editorial review (verification_status candidate -> verified) before it
// enters the required five-article pipeline. Evidence URLs are market-proof
// captured during research; sources marked "capture at drafting" need
// authoritative standards/manufacturer citations when the articles are written.

export type ResearchedTypologyCategory =
  | "ceiling"
  | "board_system"
  | "cladding"
  | "leveling"
  | "paint"
  | "exterior"
  | "decorative"
  | "wet_area"
  | "repair_prep"
  | "traditional"
  | "wallpaper";

export interface ResearchedTypology {
  marketCode: string;
  title: string;
  topicType: "wall_system" | "finish_assembly";
  category: ResearchedTypologyCategory;
  localTerm?: string;
  note?: string;
  evidenceUrl?: string;
}

export const RESEARCHED_TYPOLOGIES: ResearchedTypology[] = [
  // NG - Nigeria
  { marketCode: "NG", title: "POP (plaster of Paris) false ceiling and cornices", topicType: "finish_assembly", category: "ceiling", localTerm: "POP", note: "Ubiquitous interior ceiling system; established local practice, capture manufacturer/standard sources at drafting." },
  { marketCode: "NG", title: "Gypsum board partition with skim finish", topicType: "finish_assembly", category: "board_system", localTerm: "drywall", note: "Growing in urban residential and commercial fit-outs." },
  { marketCode: "NG", title: "Ceramic wall tile cladding for wet areas", topicType: "finish_assembly", category: "cladding", localTerm: "wall tiles", note: "Standard for bathrooms and kitchens." },
  { marketCode: "NG", title: "PVC and 3D decorative wall panels", topicType: "finish_assembly", category: "cladding", localTerm: "3D panels", evidenceUrl: "https://jiji.ng/53-3d-wall-panels", note: "Active Lagos retail market confirmed." },
  { marketCode: "NG", title: "Screeding putty leveling application", topicType: "finish_assembly", category: "leveling", localTerm: "screeding putty", note: "Distinct from the full paint chain; leveling-only scope." },
  { marketCode: "NG", title: "Gloss enamel finish for trim and doors", topicType: "finish_assembly", category: "paint", localTerm: "gloss", note: "Oil-based trim finishes remain standard." },
  { marketCode: "NG", title: "Exterior textured acrylic coating over render", topicType: "finish_assembly", category: "exterior", localTerm: "texture", note: "Used on feature walls and facades." },
  { marketCode: "NG", title: "Crack repair and surface preparation for repainting", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain distinct from new-build finishing." },
  // GH - Ghana
  { marketCode: "GH", title: "POP false ceiling and cornices", topicType: "finish_assembly", category: "ceiling", localTerm: "POP", note: "Established local practice; capture sources at drafting." },
  { marketCode: "GH", title: "Gypsum board partition with skim finish", topicType: "finish_assembly", category: "board_system", note: "Common in Accra residential and commercial fit-outs." },
  { marketCode: "GH", title: "Ceramic wall tile cladding for wet areas", topicType: "finish_assembly", category: "cladding", note: "Standard wet-area finish." },
  { marketCode: "GH", title: "PVC and 3D decorative wall panels", topicType: "finish_assembly", category: "cladding", note: "Retail market active; capture sources at drafting." },
  { marketCode: "GH", title: "Gypsum putty leveling application", topicType: "finish_assembly", category: "leveling", localTerm: "putty", note: "Leveling-only scope." },
  { marketCode: "GH", title: "Gloss enamel finish for trim and doors", topicType: "finish_assembly", category: "paint", note: "Established practice." },
  { marketCode: "GH", title: "Exterior textured coating over render", topicType: "finish_assembly", category: "exterior", note: "Established practice." },
  { marketCode: "GH", title: "Crack repair and surface preparation for repainting", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  // KE - Kenya
  { marketCode: "KE", title: "POP and gypsum board false ceiling with cornices", topicType: "finish_assembly", category: "ceiling", localTerm: "POP ceiling", note: "Standard in Nairobi residential finishing." },
  { marketCode: "KE", title: "Gypsum board partition with skim finish", topicType: "finish_assembly", category: "board_system", note: "Growing with Knauf East Africa supply." },
  { marketCode: "KE", title: "Ceramic wall tile cladding for wet areas", topicType: "finish_assembly", category: "cladding", note: "Standard wet-area finish." },
  { marketCode: "KE", title: "PVC and 3D decorative wall panels", topicType: "finish_assembly", category: "cladding", note: "Retail market active." },
  { marketCode: "KE", title: "Wall putty leveling application", topicType: "finish_assembly", category: "leveling", localTerm: "putty", note: "Leveling-only scope." },
  { marketCode: "KE", title: "Gloss enamel finish for trim and doors", topicType: "finish_assembly", category: "paint", note: "Established practice." },
  { marketCode: "KE", title: "Exterior textured coating over render", topicType: "finish_assembly", category: "exterior", note: "Established practice." },
  { marketCode: "KE", title: "Crack repair and surface preparation for repainting", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  // TZ - Tanzania
  { marketCode: "TZ", title: "Gypsum board ceiling and partition finishing", topicType: "finish_assembly", category: "board_system", localTerm: "gypsum board", evidenceUrl: "https://www.magicbuilders.co.tz/", note: "Local board/putty supply chain confirmed (BBG, Knauf, Magic Builders)." },
  { marketCode: "TZ", title: "Putty powder leveling application", topicType: "finish_assembly", category: "leveling", localTerm: "putty powder", evidenceUrl: "https://jakonda.co.tz/finishes", note: "Local putty brands confirmed (BBG, Yapfix, white skim putty)." },
  { marketCode: "TZ", title: "Ceramic wall tile cladding for wet areas", topicType: "finish_assembly", category: "cladding", note: "Standard wet-area finish." },
  { marketCode: "TZ", title: "PVC and 3D decorative wall panels", topicType: "finish_assembly", category: "cladding", note: "Retail market active." },
  { marketCode: "TZ", title: "Gypsum cornice and ceiling mouldings", topicType: "finish_assembly", category: "ceiling", note: "Common decorative ceiling detail." },
  { marketCode: "TZ", title: "Exterior textured coating over render", topicType: "finish_assembly", category: "exterior", note: "Established practice." },
  { marketCode: "TZ", title: "Gloss enamel finish for trim and doors", topicType: "finish_assembly", category: "paint", note: "Established practice." },
  { marketCode: "TZ", title: "Crack repair and surface preparation for repainting", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  // ET - Ethiopia
  { marketCode: "ET", title: "Gypsum board ceiling and partition finishing", topicType: "finish_assembly", category: "board_system", localTerm: "gypsum board", evidenceUrl: "https://www.tiktok.com/@modernfinishing2026/video/7660145125577805077", note: "Market evidence is social-media trade content; capture authoritative supplier sources at drafting." },
  { marketCode: "ET", title: "Gypsum putty leveling application", topicType: "finish_assembly", category: "leveling", localTerm: "putty", note: "Interior leveling before emulsion." },
  { marketCode: "ET", title: "Ceramic wall tile cladding for wet areas", topicType: "finish_assembly", category: "cladding", note: "Standard in urban apartments." },
  { marketCode: "ET", title: "Chika traditional mud plaster finish", topicType: "finish_assembly", category: "traditional", localTerm: "chika", note: "Traditional mud-and-straw plaster; verify applicability and current usage during review." },
  { marketCode: "ET", title: "Exterior textured coating over render", topicType: "finish_assembly", category: "exterior", note: "Established practice." },
  { marketCode: "ET", title: "Gloss enamel finish for trim and doors", topicType: "finish_assembly", category: "paint", note: "Established practice." },
  { marketCode: "ET", title: "Crack repair and surface preparation for repainting", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  { marketCode: "ET", title: "PVC and 3D decorative wall panels", topicType: "finish_assembly", category: "cladding", note: "Urban retail market active." },
  // EG - Egypt
  { marketCode: "EG", title: "Ceramic wall tile cladding for wet areas", topicType: "finish_assembly", category: "cladding", localTerm: "sarmouk/ceramic", note: "Ubiquitous in Egyptian apartments; capture sources at drafting." },
  { marketCode: "EG", title: "Gypsum board false ceilings and partitions", topicType: "finish_assembly", category: "ceiling", localTerm: "gypsum board", note: "Growing interior fit-out system." },
  { marketCode: "EG", title: "Exterior textured plastic paint over render", topicType: "finish_assembly", category: "exterior", localTerm: "plastic paint", note: "Common facade finish." },
  { marketCode: "EG", title: "Gloss enamel finish for trim and doors", topicType: "finish_assembly", category: "paint", note: "Established practice." },
  { marketCode: "EG", title: "Crack repair and surface preparation for repainting", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  { marketCode: "EG", title: "Interior stone and marble cladding", topicType: "finish_assembly", category: "cladding", localTerm: "marble", note: "Common feature-wall finish; capture sources at drafting." },
  // CI - Cote d'Ivoire
  { marketCode: "CI", title: "Habillage en plaques de platre (cloisons et plafonds)", topicType: "finish_assembly", category: "board_system", localTerm: "placo", evidenceUrl: "http://www.cote-d-ivoire.prix-construction.info/construction_neuve/Amenagements_et_finitions/Doublages/Habillages_en_plaques_de_platre/FDH010_Systeme_d_habillage__PLACO___en_plaques.html", note: "Placoplatre systems priced locally in Abidjan." },
  { marketCode: "CI", title: "Carrelage mural pour pieces humides", topicType: "finish_assembly", category: "cladding", localTerm: "carrelage", evidenceUrl: "http://www.cote-d-ivoire.prix-construction.info/renovation/Amenagements_et_finitions/Revetements_de_murs/Carrelage/FMC040_Carrelage_sur_surface_support_inter.html", note: "Wall tile priced locally (faience 20x20 and large format)." },
  { marketCode: "CI", title: "Enduit de finition glace (nivellation interieure)", topicType: "finish_assembly", category: "leveling", localTerm: "enduit de finition", note: "Fine finishing coat before paint." },
  { marketCode: "CI", title: "Crepi textile exterieur sur enduit", topicType: "finish_assembly", category: "exterior", localTerm: "crepi", note: "Facade texture finish." },
  { marketCode: "CI", title: "Peinture email pour boiseries", topicType: "finish_assembly", category: "paint", localTerm: "peinture email", note: "Trim enamel finish." },
  { marketCode: "CI", title: "Reparation de fissures avant repinture", topicType: "finish_assembly", category: "repair_prep", localTerm: "reparation fissures", note: "Repaint prep chain." },
  // IN - India
  { marketCode: "IN", title: "POP false ceiling and cornices", topicType: "finish_assembly", category: "ceiling", localTerm: "POP", evidenceUrl: "https://www.birlawhite.com/en/media/blogs/which-one-is-better-pop-or-wall-putty", note: "POP vs putty use confirmed by manufacturer content." },
  { marketCode: "IN", title: "White cement wall putty leveling application", topicType: "finish_assembly", category: "leveling", localTerm: "wall putty", evidenceUrl: "https://www.birlawhite.com/en/media/blogs/how-to-make-use-of-wall-putty-to-beautify-your-home", note: "Birla White wall putty is the dominant leveling product." },
  { marketCode: "IN", title: "Gypsum board drywall partition finishing", topicType: "finish_assembly", category: "board_system", note: "Growing urban drywall use; capture sources at drafting." },
  { marketCode: "IN", title: "Interior texture paint and stucco finishes", topicType: "finish_assembly", category: "decorative", localTerm: "texture paint", note: "Feature-wall finishes; established retail category." },
  { marketCode: "IN", title: "Ceramic wall tile cladding for wet areas", topicType: "finish_assembly", category: "cladding", note: "Standard wet-area finish." },
  { marketCode: "IN", title: "PVC and HPL wall panelling", topicType: "finish_assembly", category: "cladding", localTerm: "wall panels", note: "Growing modular panelling market." },
  { marketCode: "IN", title: "Crack repair and waterproofing preparation", topicType: "finish_assembly", category: "repair_prep", note: "Includes seepage-driven repaint prep; established practice." },
  { marketCode: "IN", title: "Enamel finish for trim and doors", topicType: "finish_assembly", category: "paint", localTerm: "enamel", note: "Standard trim finish." },
  // ZA - South Africa
  { marketCode: "ZA", title: "RhinoLite skimmed ceilings and cornices", topicType: "finish_assembly", category: "ceiling", localTerm: "RhinoLite", evidenceUrl: "https://www.gyproc.co.za/news/comprehensive-guide-using-gypsum-plaster", note: "Gyproc RhinoLite range confirmed (Multipurpose, Natural Plus, CreteStone)." },
  { marketCode: "ZA", title: "Plaster crack repair and reinstatement", topicType: "finish_assembly", category: "repair_prep", evidenceUrl: "https://plasterer.co.za/rhinolite-plastering/", note: "Crack repair part of standard skim trade scope." },
  { marketCode: "ZA", title: "Ceramic wall tile cladding for wet areas", topicType: "finish_assembly", category: "cladding", note: "Standard wet-area finish." },
  { marketCode: "ZA", title: "Drywall tape and joint finishing", topicType: "finish_assembly", category: "board_system", note: "Finishing chain for metal-stud drywall (assembly does not exist yet in catalog)." },
  { marketCode: "ZA", title: "Exterior roughcast and texture coat", topicType: "finish_assembly", category: "exterior", note: "Common facade finish over render." },
  { marketCode: "ZA", title: "Suspended T-grid ceiling installation", topicType: "finish_assembly", category: "ceiling", note: "Commercial and residential suspended ceilings." },
  { marketCode: "ZA", title: "Preparation and repaint of previously painted walls", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  // US - United States
  { marketCode: "US", title: "Drywall levels of finish (Level 0-5)", topicType: "finish_assembly", category: "board_system", note: "Reference: GA-214 recommended levels of gypsum board finish; confirm current edition at drafting." },
  { marketCode: "US", title: "Veneer plaster skim over gypsum board", topicType: "finish_assembly", category: "board_system", localTerm: "veneer plaster", note: "Blue-board veneer systems; capture manufacturer sources at drafting." },
  { marketCode: "US", title: "Exterior stucco and EIFS cladding", topicType: "finish_assembly", category: "exterior", note: "Established cladding systems; ASTM references to confirm at drafting." },
  { marketCode: "US", title: "Ceramic tile for wet areas", topicType: "finish_assembly", category: "wet_area", note: "TCNA handbook references to confirm at drafting." },
  { marketCode: "US", title: "Drywall repair and patching", topicType: "finish_assembly", category: "repair_prep", note: "Patch/repair scope distinct from new finishing." },
  { marketCode: "US", title: "Interior spray textures (orange peel, knockdown)", topicType: "finish_assembly", category: "decorative", note: "Texture-only scope; established practice." },
  // GB - United Kingdom
  { marketCode: "GB", title: "Two-coat wet plaster (browning or hardwall plus multi-finish skim)", topicType: "finish_assembly", category: "leveling", localTerm: "wet plaster", note: "Traditional backing+skim; BS EN 998-1 references to confirm at drafting." },
  { marketCode: "GB", title: "Lime plaster and render for heritage solid walls", topicType: "finish_assembly", category: "traditional", note: "Heritage sector standard practice; capture conservation guidance at drafting." },
  { marketCode: "GB", title: "Dot and dab plasterboard drylining over masonry", topicType: "finish_assembly", category: "board_system", note: "Standard drylining method over blockwork." },
  { marketCode: "GB", title: "Through-colour silicone render systems", topicType: "finish_assembly", category: "exterior", localTerm: "K-rend", note: "Established modern facade render; capture manufacturer sources at drafting." },
  { marketCode: "GB", title: "Wet room and bathroom tiling", topicType: "finish_assembly", category: "wet_area", note: "Wet-area tanking plus tile; established practice." },
  { marketCode: "GB", title: "Plaster crack and patch repair", topicType: "finish_assembly", category: "repair_prep", note: "Repair scope distinct from new finishing." },
  // CA - Canada
  { marketCode: "CA", title: "Drywall levels of finish and taping standards", topicType: "finish_assembly", category: "board_system", note: "Canadian taping/finishing levels; confirm references at drafting." },
  { marketCode: "CA", title: "Exterior stucco cladding", topicType: "finish_assembly", category: "exterior", note: "Ubiquitous in Western Canada; confirm standards at drafting." },
  { marketCode: "CA", title: "Ceramic tile for wet areas", topicType: "finish_assembly", category: "wet_area", note: "Standard wet-area finish." },
  { marketCode: "CA", title: "Drywall repair and patching", topicType: "finish_assembly", category: "repair_prep", note: "Patch/repair scope." },
  { marketCode: "CA", title: "Stipple and textured ceiling finishes", topicType: "finish_assembly", category: "decorative", note: "Common ceiling texture; includes stipple repair/removal context." },
  // AU - Australia
  { marketCode: "AU", title: "Solid plastering (render, set and skim coats)", topicType: "finish_assembly", category: "leveling", localTerm: "solid plaster", note: "Traditional trade over masonry; capture AS references at drafting." },
  { marketCode: "AU", title: "Exterior acrylic texture coat over render", topicType: "finish_assembly", category: "exterior", note: "Standard painted-render facade system." },
  { marketCode: "AU", title: "Ceramic tile for wet areas", topicType: "finish_assembly", category: "wet_area", note: "AS 3958.1 references to confirm at drafting." },
  { marketCode: "AU", title: "Plasterboard repair and patching", topicType: "finish_assembly", category: "repair_prep", note: "Patch/repair scope." },
  { marketCode: "AU", title: "Cornice installation and finishing", topicType: "finish_assembly", category: "ceiling", note: "Standard cornice trade scope." },
  { marketCode: "AU", title: "Wallpaper hanging and removal", topicType: "finish_assembly", category: "wallpaper", note: "Active trade; established practice." },
  // NZ - New Zealand
  { marketCode: "NZ", title: "GIB stopping and finishing levels", topicType: "finish_assembly", category: "board_system", localTerm: "stopping", note: "GIB stopping levels are the local standard; capture Winstone/manufacturer sources at drafting." },
  { marketCode: "NZ", title: "Solid plaster (cement render and skim)", topicType: "finish_assembly", category: "leveling", note: "Traditional solid plaster trade." },
  { marketCode: "NZ", title: "Wet-area linings (villaboard and tile)", topicType: "finish_assembly", category: "wet_area", localTerm: "villaboard", note: "Villaboard plus tile is the standard wet-area chain." },
  { marketCode: "NZ", title: "Plasterboard repair and patching", topicType: "finish_assembly", category: "repair_prep", note: "Patch/repair scope." },
  { marketCode: "NZ", title: "Ceramic wall tile cladding", topicType: "finish_assembly", category: "cladding", note: "Standard wet-area finish." },
  // DE - Germany
  { marketCode: "DE", title: "Kalkputz (lime interior render)", topicType: "finish_assembly", category: "traditional", localTerm: "Kalkputz", note: "Established interior lime render; DIN 18550 references to confirm at drafting." },
  { marketCode: "DE", title: "Filzputz and Spachtelputz decorative renders", topicType: "finish_assembly", category: "decorative", note: "Felt and spatula texture renders; established product category." },
  { marketCode: "DE", title: "Fliesen for wet rooms", topicType: "finish_assembly", category: "wet_area", localTerm: "Fliesen", note: "Standard wet-room tile." },
  { marketCode: "DE", title: "Rissinstandsetzung (crack repair and injection)", topicType: "finish_assembly", category: "repair_prep", note: "Systematic crack repair trade; established practice." },
  { marketCode: "DE", title: "WDVS exterior insulation with Oberputz", topicType: "finish_assembly", category: "exterior", note: "ETICS plus top render; established facade system." },
  { marketCode: "DE", title: "Wood panelling and timber interior cladding", topicType: "finish_assembly", category: "cladding", localTerm: "Holzverkleidung", note: "Traditional and modern interior timber finishes." },
  // FR - France
  { marketCode: "FR", title: "Carrelage mural interieur", topicType: "finish_assembly", category: "cladding", localTerm: "carrelage", note: "Standard wall tile; capture CPT and DTU 52 sources at drafting." },
  { marketCode: "FR", title: "Cloison seche BA13: bande, enduit et peinture", topicType: "finish_assembly", category: "board_system", note: "Drywall finishing chain (jointing assembly does not exist yet for FR)." },
  { marketCode: "FR", title: "Stuc decoratif (effet beton, tadelakt, enduits de finition)", topicType: "finish_assembly", category: "decorative", localTerm: "stuc", note: "Growing decorative plaster category." },
  { marketCode: "FR", title: "Traitement des fissures avant peinture", topicType: "finish_assembly", category: "repair_prep", note: "Fissure repair plus calicot; established practice." },
  { marketCode: "FR", title: "Staff, moulures et corniches en platre", topicType: "finish_assembly", category: "ceiling", localTerm: "staff", note: "Plaster cornices and mouldings; heritage and modern." },
  // ES - Spain
  { marketCode: "ES", title: "Azulejo y porcelanico para humedades", topicType: "finish_assembly", category: "cladding", localTerm: "azulejo", note: "Standard wall tile; UNE references to confirm at drafting." },
  { marketCode: "ES", title: "Estuco veneciano y pasta de marmol", topicType: "finish_assembly", category: "decorative", note: "Established decorative plaster category." },
  { marketCode: "ES", title: "Yeso tradicional y esgrafiado", topicType: "finish_assembly", category: "traditional", note: "Heritage gypsum finishes; verify regional applicability during review." },
  { marketCode: "ES", title: "Pintura de cal para muros", topicType: "finish_assembly", category: "paint", localTerm: "pintura de cal", note: "Lime paint for heritage and healthy-building use." },
  { marketCode: "ES", title: "Techos de pladur (falsos techos)", topicType: "finish_assembly", category: "ceiling", note: "False ceilings with plasterboard; established practice." },
  { marketCode: "ES", title: "Reparacion de grietas y preparacion para repintar", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  // IT - Italy
  { marketCode: "IT", title: "Grassello di calce (heritage lime finish)", topicType: "finish_assembly", category: "traditional", localTerm: "grassello", note: "Herage lime finishing; capture norms (UNI 11437 context) at drafting." },
  { marketCode: "IT", title: "Stucco veneziano and marmorino", topicType: "finish_assembly", category: "decorative", note: "Established decorative plaster category." },
  { marketCode: "IT", title: "Piastrelle e porcellanato per bagni", topicType: "finish_assembly", category: "wet_area", localTerm: "piastrelle", note: "Standard wet-area tile." },
  { marketCode: "IT", title: "Cappotto termico con rasatura", topicType: "finish_assembly", category: "exterior", note: "ETICS plus skim; established facade system." },
  { marketCode: "IT", title: "Restauro intonaci e riparazione fessure", topicType: "finish_assembly", category: "repair_prep", note: "Plaster restoration and crack repair." },
  { marketCode: "IT", title: "Controsoffitto in cartongesso", topicType: "finish_assembly", category: "ceiling", note: "False ceilings in plasterboard; established practice." },
  // NL - Netherlands
  { marketCode: "NL", title: "Sierpleister (decorative plaster)", topicType: "finish_assembly", category: "decorative", note: "Established decorative plaster category." },
  { marketCode: "NL", title: "Wandtegel voor natte ruimten", topicType: "finish_assembly", category: "wet_area", localTerm: "wandtegel", note: "Standard wet-room tile." },
  { marketCode: "NL", title: "Kalkverf en kalkverfzalf", topicType: "finish_assembly", category: "paint", localTerm: "kalkverf", note: "Lime paint for heritage interiors." },
  { marketCode: "NL", title: "Reparatiepleister en scheurherstel", topicType: "finish_assembly", category: "repair_prep", note: "Crack repair trade scope." },
  // PL - Poland
  { marketCode: "PL", title: "Gladz gipsowa (gypsum smoothing coat)", topicType: "finish_assembly", category: "leveling", localTerm: "gladz gipsowa", note: "Dominant interior smoothing method; PN-EN 998-1 references to confirm at drafting." },
  { marketCode: "PL", title: "Tynki dekoracyjne (decorative plasters)", topicType: "finish_assembly", category: "decorative", note: "Established decorative category." },
  { marketCode: "PL", title: "Plytki ceramiczne na sciany", topicType: "finish_assembly", category: "cladding", localTerm: "plytki", note: "Standard wall tile." },
  { marketCode: "PL", title: "G-K zabudowa: spoinowanie i szpachlowanie", topicType: "finish_assembly", category: "board_system", note: "Drywall finishing chain (jointing assembly does not exist yet for PL)." },
  { marketCode: "PL", title: "Naprawa pekniec i przygotowanie do malowania", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  // SE - Sweden
  { marketCode: "SE", title: "Gipsputs for inner tak och vagg (interior fine plaster)", topicType: "finish_assembly", category: "leveling", localTerm: "gipsputs", note: "Interior skim plaster; established practice." },
  { marketCode: "SE", title: "Vatrumskakel (wet room tiling)", topicType: "finish_assembly", category: "wet_area", localTerm: "vatrum", note: "Regulated wet-room build-up (board, sealing layer, tile); capture Boverket/BBR and industry rules at drafting." },
  { marketCode: "SE", title: "Fog och spackel for gipsplank", topicType: "finish_assembly", category: "board_system", note: "Drywall jointing chain." },
  { marketCode: "SE", title: "Sprickreparation och omalningsforberedelse", topicType: "finish_assembly", category: "repair_prep", note: "Crack repair scope." },
  { marketCode: "SE", title: "Tapetsering (wallpaper hanging)", topicType: "finish_assembly", category: "wallpaper", localTerm: "tapetsering", note: "Common interior finishing method." },
  // CH - Switzerland
  { marketCode: "CH", title: "Kalkputz mit Kaseinfarbe (lime render and casein paint)", topicType: "finish_assembly", category: "traditional", note: "Heritage finishing combination; SIA references to confirm at drafting." },
  { marketCode: "CH", title: "Gipsplatten mit Gipsspachtel (board jointing)", topicType: "finish_assembly", category: "board_system", note: "Drywall jointing chain." },
  { marketCode: "CH", title: "Fliesen fuer Nassraeume", topicType: "finish_assembly", category: "wet_area", localTerm: "Fliesen", note: "Standard wet-room tile." },
  { marketCode: "CH", title: "Rissanierung (crack rehabilitation)", topicType: "finish_assembly", category: "repair_prep", note: "Systematic crack repair practice." },
  { marketCode: "CH", title: "Sierputz (decorative render)", topicType: "finish_assembly", category: "decorative", note: "Established decorative category." },
  // JP - Japan
  { marketCode: "JP", title: "Kabekami kurosu hari (wallpaper over gypsum board)", topicType: "finish_assembly", category: "wallpaper", localTerm: "kurosu", evidenceUrl: "https://miyagawa38.com/column/388.html", note: "Wallpaper is the dominant Japanese interior finish over gypsum board." },
  { marketCode: "JP", title: "Binilon board lining", topicType: "finish_assembly", category: "board_system", localTerm: "vinylon", note: "Vinylon cement board for wet and impact areas." },
  { marketCode: "JP", title: "Shikkui and nuri-kabe traditional plaster finishes", topicType: "finish_assembly", category: "traditional", localTerm: "shikkui", note: "Lime and earth plasters; heritage and modern reinterpretations." },
  { marketCode: "JP", title: "Kabe tile cladding", topicType: "finish_assembly", category: "cladding", localTerm: "tile", note: "Exterior tiling over ALC/mortar substrates." },
  { marketCode: "JP", title: "Pate board repair and repapering preparation", topicType: "finish_assembly", category: "repair_prep", localTerm: "pate", evidenceUrl: "https://e-sumaile.net/word/interior-putty", note: "Putty and substrate prep before papering." },
  // KR - South Korea
  { marketCode: "KR", title: "Dobae and byeokji (wallpaper finishing)", topicType: "finish_assembly", category: "wallpaper", localTerm: "dobae", evidenceUrl: "https://karipaint.com/why-do-korean-apartments-use-so-much-wallpaper-%ED%95%9C%EA%B5%AD-%EC%95%84%ED%8C%8C%ED%8A%B8%EB%8A%94-%EC%99%9C-%EB%8F%84%EB%B0%B0%EA%B0%80-%EB%A7%8E%EC%9D%84%EA%B9%8C%EC%9A%94/", note: "Wallpaper is the standard Korean apartment wall finish." },
  { marketCode: "KR", title: "Mortar mijang (cement mortar finishing)", topicType: "finish_assembly", category: "leveling", localTerm: "mijang", note: "Mortar smoothing over concrete; established practice." },
  { marketCode: "KR", title: "Wall tile cladding", topicType: "finish_assembly", category: "cladding", localTerm: "tile", note: "Wet-area tile standard." },
  { marketCode: "KR", title: "Interior film (fildeureom) surface renewal", topicType: "finish_assembly", category: "decorative", localTerm: "interior film", note: "Popular retrofit finish; established retail category." },
  { marketCode: "KR", title: "Crack repair and repainting preparation", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  // CN - China
  { marketCode: "CN", title: "Guizao ni (diatom mud decorative finish)", topicType: "finish_assembly", category: "decorative", localTerm: "guizao ni", evidenceUrl: "https://m.fang.com/news/wf/12188_27070488.html", note: "Mainstream interior decorative material alongside latex paint and wallpaper." },
  { marketCode: "CN", title: "Bizhi and qiangbu (wallpaper and fabric wall finishes)", topicType: "finish_assembly", category: "wallpaper", localTerm: "bizhi", evidenceUrl: "https://www.sohu.com/a/238072618_628288", note: "Major interior finish category." },
  { marketCode: "CN", title: "Gypsum board ceiling with joint treatment", topicType: "finish_assembly", category: "ceiling", localTerm: "shigao ban diaoding", note: "Standard residential false ceiling system." },
  { marketCode: "CN", title: "Qiangzhuan (wall tile cladding)", topicType: "finish_assembly", category: "cladding", localTerm: "qiangzhuan", note: "Standard wet-area tile." },
  { marketCode: "CN", title: "Jili qi and yishu qi (texture and art paints)", topicType: "finish_assembly", category: "decorative", localTerm: "jili qi", note: "Growing art-paint category." },
  { marketCode: "CN", title: "Jicheng qiangban (integrated WPC wall panels)", topicType: "finish_assembly", category: "cladding", localTerm: "jicheng qiangban", note: "Fast-growing modular panelling category." },
  { marketCode: "CN", title: "Crack repair and substrate preparation (kailie xiufu)", topicType: "finish_assembly", category: "repair_prep", localTerm: "kailie xiufu", note: "Substrate prep before putty and repaint." },
  // MX - Mexico
  { marketCode: "MX", title: "Pasta fina interior smoothing finish", topicType: "finish_assembly", category: "leveling", localTerm: "pasta fina", evidenceUrl: "https://www.tiktok.com/@oropesarq/video/7500615869094202632", note: "Resin-cement-lime fine paste confirmed; capture technical sources at drafting." },
  { marketCode: "MX", title: "Pasta veneciana and estuco veneciano", topicType: "finish_assembly", category: "decorative", localTerm: "pasta veneciana", note: "Marble-look decorative finish; established category." },
  { marketCode: "MX", title: "Pasta de chukum (regional Mayan finish)", topicType: "finish_assembly", category: "traditional", localTerm: "chukum", note: "Regional Yucatan finish; verify scope and usage during review." },
  { marketCode: "MX", title: "Tablaroca with estuco joint finishing", topicType: "finish_assembly", category: "board_system", localTerm: "tablaroca", note: "Drywall finishing chain." },
  { marketCode: "MX", title: "Azulejo wall tile cladding", topicType: "finish_assembly", category: "cladding", localTerm: "azulejo", note: "Standard wet-area tile." },
  { marketCode: "MX", title: "PVC marble-look wall panels", topicType: "finish_assembly", category: "cladding", note: "Retail panels confirmed; capture technical sources at drafting." },
  { marketCode: "MX", title: "Reparacion de grietas en repello", topicType: "finish_assembly", category: "repair_prep", note: "Crack repair in rendered walls." },
  // BR - Brazil
  { marketCode: "BR", title: "Gesso acartonado finishing (fita e massa)", topicType: "finish_assembly", category: "board_system", localTerm: "gesso acartonado", note: "Drywall finishing chain; capture NBR 13215/ABNT references at drafting." },
  { marketCode: "BR", title: "Textura acrilica decorative finish", topicType: "finish_assembly", category: "decorative", localTerm: "textura", note: "Established decorative category." },
  { marketCode: "BR", title: "Azulejo and porcelanato wall cladding", topicType: "finish_assembly", category: "cladding", localTerm: "azulejo", note: "Extremely common wall finish." },
  { marketCode: "BR", title: "PVC wall panels (roletes)", topicType: "finish_assembly", category: "cladding", note: "Retail panelling category." },
  { marketCode: "BR", title: "Massa corrida smoothing application", topicType: "finish_assembly", category: "leveling", localTerm: "massa corrida", note: "Leveling-only scope distinct from the paint chain." },
  { marketCode: "BR", title: "Reparo de trincas e prep para pintura", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  { marketCode: "BR", title: "Impermeabilizacao e revestimento de areas molhadas", topicType: "finish_assembly", category: "wet_area", localTerm: "impermeabilizacao", note: "Waterproofing plus render/tile in wet areas." },
  // ID - Indonesia
  { marketCode: "ID", title: "Plamir smoothing application", topicType: "finish_assembly", category: "leveling", localTerm: "plamir", evidenceUrl: "https://www.indosteger.co.id/berita/detail/perbedaan-acian-dan-plamir", note: "Plamir (gypsum-based putty) distinct from cement acian confirmed." },
  { marketCode: "ID", title: "Gypsum board plafon and partition with compound finishing", topicType: "finish_assembly", category: "board_system", localTerm: "gypsum plafon", evidenceUrl: "https://ibb.jatimprov.go.id/page/artikel/RkpxOUw3ZHpzSTdCNmdYdFlzNU5ldz09", note: "Plafon finishing products confirmed (Top Mortar plamir instan)." },
  { marketCode: "ID", title: "Keramik and granite wall cladding", topicType: "finish_assembly", category: "cladding", localTerm: "keramik", note: "Standard wet-area tile." },
  { marketCode: "ID", title: "PVC wall panels", topicType: "finish_assembly", category: "cladding", note: "Large retail category." },
  { marketCode: "ID", title: "Perbaikan retak dan persiapan pengecatan ulang", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  // TR - Turkiye
  { marketCode: "TR", title: "Saten alci (satin gypsum interior finish)", topicType: "finish_assembly", category: "leveling", localTerm: "saten alci", evidenceUrl: "https://www.yapikatalogu.com/blog/saten-alci-nedir-ozellikleri_524", note: "The standard Turkish interior wall finish." },
  { marketCode: "TR", title: "Alcipan derz and saten finishing", topicType: "finish_assembly", category: "board_system", localTerm: "alcipan", evidenceUrl: "https://dalsan.com.tr/Belgeler", note: "Board jointing plus satin gypsum; Dalsan product range confirmed." },
  { marketCode: "TR", title: "Seramik karo wall cladding", topicType: "finish_assembly", category: "cladding", localTerm: "seramik karo", note: "Standard wet-area tile." },
  { marketCode: "TR", title: "Mantolama with mineral siva (ETICS facade)", topicType: "finish_assembly", category: "exterior", note: "Standard insulated facade render system." },
  { marketCode: "TR", title: "Venezien siva (Venetian plaster)", topicType: "finish_assembly", category: "decorative", note: "Established decorative category." },
  { marketCode: "TR", title: "Catlak onarimi ve yeniden boyama hazirligi", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  // SA - Saudi Arabia
  { marketCode: "SA", title: "Gypsum board skim finishing (partition assembly)", topicType: "finish_assembly", category: "board_system", note: "Board plus skim chain for partitions (assembly missing from catalog)." },
  { marketCode: "SA", title: "Ceramic and porcelain tile cladding", topicType: "finish_assembly", category: "cladding", note: "Standard wet-area and feature-wall finish." },
  { marketCode: "SA", title: "Exterior decorative stucco render", topicType: "finish_assembly", category: "exterior", note: "Facade texture render; established practice." },
  { marketCode: "SA", title: "Crack repair in gypsum and cement finishes", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  { marketCode: "SA", title: "Natural stone and marble wall cladding", topicType: "finish_assembly", category: "cladding", localTerm: "marble", note: "Common premium feature-wall finish." },
  // AE - United Arab Emirates
  { marketCode: "AE", title: "Gypsum board skim finishing (partition assembly)", topicType: "finish_assembly", category: "board_system", note: "Board plus skim chain for partitions (assembly missing from catalog)." },
  { marketCode: "AE", title: "Porcelain and ceramic tile cladding", topicType: "finish_assembly", category: "cladding", note: "Standard wet-area and feature-wall finish." },
  { marketCode: "AE", title: "Exterior texture and spatter-dash render", topicType: "finish_assembly", category: "exterior", note: "Facade texture build-up; established practice." },
  { marketCode: "AE", title: "Crack repair in gypsum and cement finishes", topicType: "finish_assembly", category: "repair_prep", note: "Repaint prep chain." },
  { marketCode: "AE", title: "Acoustic wall panel systems", topicType: "finish_assembly", category: "decorative", note: "Commercial fit-out category." },
  // SG - Singapore
  { marketCode: "SG", title: "HDB skim coat and putty plastering", topicType: "finish_assembly", category: "leveling", localTerm: "skim coat", evidenceUrl: "https://dkconstructionandengineering.com/our-services/plastering-works", note: "Cement plaster and skim to level HDB walls before painting." },
  { marketCode: "SG", title: "Gypsum board false ceiling and L-box finishing", topicType: "finish_assembly", category: "ceiling", note: "Standard residential false ceiling system." },
  { marketCode: "SG", title: "Homogeneous and porcelain wall tiles", topicType: "finish_assembly", category: "cladding", note: "Standard wet-area and facade tile." },
  { marketCode: "SG", title: "Waterproofing and wet-area tiling", topicType: "finish_assembly", category: "wet_area", note: "Sealing plus tile build-up; established practice." },
  { marketCode: "SG", title: "Spalling concrete repair", topicType: "finish_assembly", category: "repair_prep", localTerm: "spalling", note: "HDB-specific concrete ceiling and wall repair scope." },
  { marketCode: "SG", title: "Wallpaper hanging", topicType: "finish_assembly", category: "wallpaper", note: "Common condo and commercial finish." },
];
