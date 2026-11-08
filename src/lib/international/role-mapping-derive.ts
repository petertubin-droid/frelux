/**
 * Role mappings derived from each market's own price book.
 *
 * A market can hold a priced product and still fail to answer an engine,
 * because the engine asks for a role and nothing maps that role to the product.
 * That was true of every role in 38 markets, including the UAE, which had
 * cement, sand, paint, primer, putty and waterproofing priced and none of it
 * reachable.
 *
 * Every mapping below points at a product that already carries a price in that
 * same market. No figure is introduced here and none is converted: the mapping
 * says "when this market needs cement, use its cement", which is the smallest
 * claim that can be made without new evidence.
 *
 * The curated table in bundled-price-books.ts always wins. These fill gaps
 * only, and role-mapping-derive.test.ts enforces both properties.
 */

export interface DerivedRoleMapping {
  slug: string;
  name: string;
  unit: string;
  notes: string;
}

export const DERIVED_ROLE_MAPPINGS: Readonly<
  Record<string, Readonly<Record<string, DerivedRoleMapping>>>
> = {
  AE: {
    "concrete-mix": {
      slug: "ae-cement-50kg",
      name: "Emirates Cement 50 kg (AE)",
      unit: "50 kg",
      notes:
        "This market's own priced product (AED 22); Binja.ae web survey 2026-10-11 (AED 22 regular, 19 promo).",
    },
    sand: {
      slug: "ae-sand-25kg",
      name: "Sand 25 kg (AE)",
      unit: "25 kg",
      notes:
        "This market's own priced product (AED 10); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "ae-emulsion-4l",
      name: "National Paints water-based wall emulsion 18L (AE)",
      unit: "18l",
      notes:
        "This market's own priced product (AED 76); Misar.ae web survey 2026-10-11 (AED 76-90, base 76/18L).",
    },
    "exterior-paint": {
      slug: "ae-exterior-4l",
      name: "Exterior paint 4L (AE)",
      unit: "4l",
      notes:
        "This market's own priced product (AED 110); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "ae-primer-4l",
      name: "Jotun PVA Primer white 4L (AE)",
      unit: "4l",
      notes:
        "This market's own priced product (AED 61); Amazon.ae web survey 2026-10-11 (AED 61/4L).",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (AED 1); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "ae-putty-20kg",
      name: "Wall putty 20 kg (AE)",
      unit: "20 kg",
      notes:
        "This market's own priced product (AED 35); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "ae-waterproof-20l",
      name: "Waterproofing 20L (AE)",
      unit: "20l",
      notes:
        "This market's own priced product (AED 130); Indicative 2026 retail band; adjustable.",
    },
  },
  AT: {
    "concrete-mix": {
      slug: "at-cement-25kg",
      name: "CEM II 25 kg (AT)",
      unit: "25 kg",
      notes:
        "This market's own priced product (EUR 5.5); Indicative 2026 retail band; adjustable.",
    },
    sand: {
      slug: "at-bausand-25kg",
      name: "Bausand 25 kg (AT)",
      unit: "25 kg",
      notes:
        "This market's own priced product (EUR 4); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "at-alpina-weiss-10l",
      name: "Alpinaweiss Wandfarbe Original 10L (AT)",
      unit: "10l",
      notes:
        "This market's own priced product (EUR 49.95); Hornbach AT web survey 2026-10-11 (49.95 EUR/10L).",
    },
    "exterior-paint": {
      slug: "at-fassadenfarbe-10l",
      name: "Alpina Fassadenfarbe 10L (AT)",
      unit: "10l",
      notes:
        "This market's own priced product (EUR 55); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "at-tiefgrund-10l",
      name: "Tiefgrund 10L (AT)",
      unit: "10l",
      notes:
        "This market's own priced product (EUR 35); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (EUR 0.6); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "at-spachtel-5kg",
      name: "Spachtelmasse 5 kg (AT)",
      unit: "5 kg",
      notes:
        "This market's own priced product (EUR 9); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "at-abdicht-5l",
      name: "Abdichtung 5L (AT)",
      unit: "5l",
      notes:
        "This market's own priced product (EUR 25); Indicative 2026 retail band; adjustable.",
    },
  },
  BE: {
    "concrete-mix": {
      slug: "be-cement-25kg",
      name: "CEM II 25 kg (BE)",
      unit: "25 kg",
      notes:
        "This market's own priced product (EUR 6.5); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "be-grondverf-10l",
      name: "Histor Monodek primer wit 10L (BE)",
      unit: "10l",
      notes:
        "This market's own priced product (EUR 59.99); Gamma BE web survey 2026-10-11 (Monodek primer 10L 59.99 EUR, regular 99.99).",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (EUR 0.6); Indicative 2026 retail band; adjustable.",
    },
  },
  BR: {
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (BRL 2); Indicative 2026 retail band; adjustable.",
    },
  },
  CA: {
    "fine-filler": {
      slug: "ca-cgc-allpurpose-12l",
      name: "CGC Sheetrock All-Purpose Compound (12 L pail)",
      unit: "12 l",
      notes: "This market's own priced product (CAD 37.78); Home Depot Canada.",
    },
  },
  CH: {
    "concrete-mix": {
      slug: "ch-zement-25kg",
      name: "Zement CEM II 25 kg (CH)",
      unit: "25 kg",
      notes:
        "This market's own priced product (CHF 8); Indicative 2026 retail band; adjustable.",
    },
    sand: {
      slug: "ch-bausand-25kg",
      name: "Bausand 25 kg (CH)",
      unit: "25 kg",
      notes:
        "This market's own priced product (CHF 6); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "ch-wandfarbe-10l",
      name: "HORNBACH Naturweiss Wandfarbe 10L (CH)",
      unit: "10l",
      notes:
        "This market's own priced product (CHF 39.9); Hornbach CH web survey 2026-10-11 (39.90 CHF/10L).",
    },
    "exterior-paint": {
      slug: "ch-fassadenfarbe-10l",
      name: "Fassadenfarbe 10L (CH)",
      unit: "10l",
      notes:
        "This market's own priced product (CHF 45); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (CHF 1); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "ch-fuellspachtel-5kg",
      name: "Füllspachtel 5 kg (CH)",
      unit: "5 kg",
      notes:
        "This market's own priced product (CHF 12); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "ch-abdicht-5l",
      name: "Abdichtung 5L (CH)",
      unit: "5l",
      notes:
        "This market's own priced product (CHF 30); Indicative 2026 retail band; adjustable.",
    },
  },
  DK: {
    "concrete-mix": {
      slug: "dk-cement-25kg",
      name: "Probau cement 25 kg (DK)",
      unit: "25 kg",
      notes:
        "This market's own priced product (DKK 69.95); BAUHAUS DK web survey 2026-10-11 (69.95 DKK/25kg).",
    },
    sand: {
      slug: "dk-balsand-25kg",
      name: "Balsand 25 kg (DK)",
      unit: "25 kg",
      notes:
        "This market's own priced product (DKK 20); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (DKK 8); Indicative 2026 retail band; adjustable.",
    },
  },
  EG: {
    "concrete-mix": {
      slug: "eg-cement-50kg",
      name: "Cement 50 kg (EG)",
      unit: "50 kg",
      notes:
        "This market's own priced product (EGP 192.5); Egypt cement price tracker (Elwatan News) 2026-10-11 (Suez ton 3850 EGP = 192.50/50kg).",
    },
    sand: {
      slug: "eg-sand-25kg",
      name: "Sand 25 kg (EG)",
      unit: "25 kg",
      notes:
        "This market's own priced product (EGP 60); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "eg-emulsion-4l",
      name: "Interior emulsion 4L (EG)",
      unit: "4l",
      notes:
        "This market's own priced product (EGP 450); Indicative 2026 retail band; adjustable.",
    },
    "exterior-paint": {
      slug: "eg-exterior-4l",
      name: "Exterior paint 4L (EG)",
      unit: "4l",
      notes:
        "This market's own priced product (EGP 550); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "eg-primer-4l",
      name: "Primer 4L (EG)",
      unit: "4l",
      notes:
        "This market's own priced product (EGP 300); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (EGP 5); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "eg-putty-20kg",
      name: "Wall putty 20 kg (EG)",
      unit: "20 kg",
      notes:
        "This market's own priced product (EGP 180); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "eg-waterproof-20l",
      name: "Waterproofing 20L (EG)",
      unit: "20l",
      notes:
        "This market's own priced product (EGP 350); Indicative 2026 retail band; adjustable.",
    },
  },
  ES: {
    "concrete-mix": {
      slug: "es-cemento-25kg",
      name: "Cemento gris CEM 32,5N 25 kg (ES)",
      unit: "25 kg",
      notes:
        "This market's own priced product (EUR 5.7); Ferreteria La Llave web survey 2026-10-11 (5.70 EUR/25kg).",
    },
    "interior-paint": {
      slug: "es-plastica-15l",
      name: "Pintura de interior Lisomat BEISSIER blanco mate 15L (ES)",
      unit: "15l",
      notes:
        "This market's own priced product (EUR 98.99); Leroy Merlin ES web survey 2026-10-11 (98.99 EUR/15L).",
    },
    "exterior-paint": {
      slug: "es-fachada-15l",
      name: "Pintura exterior DEKKO mate 15L (ES)",
      unit: "15l",
      notes:
        "This market's own priced product (EUR 65.99); Leroy Merlin ES web survey 2026-10-11 (65.99 EUR/15L).",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (EUR 0.5); Indicative 2026 retail band; adjustable.",
    },
  },
  FI: {
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (EUR 1); Indicative 2026 retail band; adjustable.",
    },
  },
  GB: {
    "fine-filler": {
      slug: "gb-gyproc-easifill-10kg",
      name: "Gyproc Easi-Fill Joint Compound (10kg)",
      unit: "10kg",
      notes:
        "This market's own priced product (GBP 34.66); Selco GBP34.66 inc VAT (web survey 2026-10-10).",
    },
  },
  GH: {
    "concrete-mix": {
      slug: "gh-cement-50kg",
      name: "Cement 50 kg (GH)",
      unit: "50 kg",
      notes:
        "This market's own priced product (GHS 80); Ghana news reports 2026 (50kg bag above GHS 80 after manufacturer increase).",
    },
    sand: {
      slug: "gh-sand-50kg",
      name: "Sand 50 kg (GH)",
      unit: "50 kg",
      notes:
        "This market's own priced product (GHS 15); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "gh-emulsion-4l",
      name: "Homecharm emulsion paint 20L (GH)",
      unit: "20l",
      notes:
        "This market's own priced product (GHS 295); CETech Ghana web survey 2026-10-11 (GHS 295/20L).",
    },
    "exterior-paint": {
      slug: "gh-exterior-4l",
      name: "Exterior paint 4L (GH)",
      unit: "4l",
      notes:
        "This market's own priced product (GHS 220); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "gh-primer-4l",
      name: "Primer 4L (GH)",
      unit: "4l",
      notes:
        "This market's own priced product (GHS 120); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (GHS 3); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "gh-putty-20kg",
      name: "Wall putty 20 kg (GH)",
      unit: "20 kg",
      notes:
        "This market's own priced product (GHS 90); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "gh-waterproof-20l",
      name: "Waterproofing 20L (GH)",
      unit: "20l",
      notes:
        "This market's own priced product (GHS 150); Indicative 2026 retail band; adjustable.",
    },
  },
  ID: {
    "interior-paint": {
      slug: "id-cat-25kg",
      name: "Avitex Gold cat tembok interior 25 kg (ID)",
      unit: "25 kg",
      notes:
        "This market's own priced product (IDR 864900); Tokopedia web survey 2026-10-11 (Rp864,900/25kg).",
    },
    "exterior-paint": {
      slug: "id-cat-ext-25kg",
      name: "Avitex exterior cat tembok 25 kg (ID)",
      unit: "25 kg",
      notes:
        "This market's own priced product (IDR 999900); Monotaro web survey 2026-10-11 (Rp999,900/25kg).",
    },
    primer: {
      slug: "id-primer-25kg",
      name: "Avitex Alkali Resistance primer cat dasar 5 kg (ID)",
      unit: "5 kg",
      notes:
        "This market's own priced product (IDR 195648); Tokopedia web survey 2026-10-11 (Rp195,648/5kg).",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (IDR 3000); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "id-filler-25kg",
      name: "Wall filler 25 kg (ID)",
      unit: "25 kg",
      notes:
        "This market's own priced product (IDR 150000); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "id-waterproof-20kg",
      name: "Waterproofing 20kg (ID)",
      unit: "20kg",
      notes:
        "This market's own priced product (IDR 300000); Indicative 2026 retail band; adjustable.",
    },
  },
  IE: {
    "concrete-mix": {
      slug: "ie-cement-25kg",
      name: "Irish Cement 25 kg bag (IE)",
      unit: "25 kg",
      notes:
        "This market's own priced product (EUR 10.49); Woodies IE web survey 2026-10-11 (Irish Cement 25kg 10.49 EUR).",
    },
    sand: {
      slug: "ie-sand-25kg",
      name: "Bryko building sand 25 kg (IE)",
      unit: "25 kg",
      notes:
        "This market's own priced product (EUR 4.99); Woodies IE web survey 2026-10-11 (Bryko 25kg sand 4.99 EUR).",
    },
    "interior-paint": {
      slug: "ie-easycare-5l",
      name: "Dulux EasyCare Matt 5L (IE)",
      unit: "5l",
      notes:
        "This market's own priced product (EUR 45); Woodies IE web survey 2026-10-11 (Dulux EasyCare 5L at 45 EUR promo listing).",
    },
    "exterior-paint": {
      slug: "ie-weathershield-5l",
      name: "Woodie's Exterior Masonry 5L (IE)",
      unit: "5l",
      notes:
        "This market's own priced product (EUR 41); Woodies IE web survey 2026-10-11 (exterior masonry 5L 41.00 EUR).",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (EUR 0.8); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "ie-filler-5kg",
      name: "Lightweight filler 5 kg (IE)",
      unit: "5 kg",
      notes:
        "This market's own priced product (EUR 10); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "ie-waterproof-5l",
      name: "Waterproof coating 5L (IE)",
      unit: "5l",
      notes:
        "This market's own priced product (EUR 30); Indicative 2026 retail band; adjustable.",
    },
  },
  IN: {
    "fine-filler": {
      slug: "in-birla-white-putty-40kg",
      name: "Birla White WallCare Putty (40kg)",
      unit: "40kg",
      notes:
        "This market's own priced product (INR 700); India trade INR700 per 40kg bag (web survey 2026-10-10).",
    },
  },
  IT: {
    "concrete-mix": {
      slug: "it-cemento-25kg",
      name: "Cemento II/B-LL 25 kg (IT)",
      unit: "25 kg",
      notes:
        "This market's own priced product (EUR 5.45); TrovaPrezzi IT web survey 2026-10-11 (sacco cemento 25kg from 5.45 EUR).",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (EUR 0.6); Indicative 2026 retail band; adjustable.",
    },
  },
  JP: {
    "concrete-mix": {
      slug: "jp-cement-25kg",
      name: "Tokuyama futsu portland cement 25kg (JP)",
      unit: "25kg",
      notes:
        "This market's own priced product (JPY 934); Monotaro web survey 2026-10-11 (849 yen + tax = 934/25kg).",
    },
    "interior-paint": {
      slug: "jp-emulsion-16kg",
      name: "エマルジョンペイント 16kg (JP)",
      unit: "16kg",
      notes:
        "This market's own priced product (JPY 9000); Indicative 2026 retail band; adjustable.",
    },
    "exterior-paint": {
      slug: "jp-exterior-16kg",
      name: "外部用塗料 16kg (JP)",
      unit: "16kg",
      notes:
        "This market's own priced product (JPY 12000); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "jp-primer-16kg",
      name: "下塗り 16kg (JP)",
      unit: "16kg",
      notes:
        "This market's own priced product (JPY 6000); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (JPY 60); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "jp-waterproof-16kg",
      name: "防水塗料 16kg (JP)",
      unit: "16kg",
      notes:
        "This market's own priced product (JPY 8000); Indicative 2026 retail band; adjustable.",
    },
  },
  KE: {
    "concrete-mix": {
      slug: "ke-cement-50kg",
      name: "Cement 50 kg (KE)",
      unit: "50 kg",
      notes:
        "This market's own priced product (KES 850); Kenya retail price reports 2026-10 (50kg bag ~KES 850, up from 600).",
    },
    sand: {
      slug: "ke-sand-50kg",
      name: "Sand 50 kg (KE)",
      unit: "50 kg",
      notes:
        "This market's own priced product (KES 100); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "ke-emulsion-4l",
      name: "Crown Vinyl Matt Luxury Emulsion 20L (KE)",
      unit: "20l",
      notes:
        "This market's own priced product (KES 13150); aliglaziers.co.ke web survey 2026-10-11 (KES 13150/20L).",
    },
    "exterior-paint": {
      slug: "ke-exterior-4l",
      name: "Exterior paint 4L (KE)",
      unit: "4l",
      notes:
        "This market's own priced product (KES 3000); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "ke-primer-4l",
      name: "Primer 4L (KE)",
      unit: "4l",
      notes:
        "This market's own priced product (KES 1800); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (KES 20); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "ke-putty-20kg",
      name: "Wall putty 20 kg (KE)",
      unit: "20 kg",
      notes:
        "This market's own priced product (KES 1200); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "ke-waterproof-20l",
      name: "Waterproofing 20L (KE)",
      unit: "20l",
      notes:
        "This market's own priced product (KES 2000); Indicative 2026 retail band; adjustable.",
    },
  },
  KR: {
    "concrete-mix": {
      slug: "kr-cement-25kg",
      name: "시멘트 25kg (KR)",
      unit: "25kg",
      notes:
        "This market's own priced product (KRW 6000); Indicative 2026 retail band; adjustable.",
    },
    sand: {
      slug: "kr-sand-25kg",
      name: "모래 25kg (KR)",
      unit: "25kg",
      notes:
        "This market's own priced product (KRW 3000); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "kr-interior-18l",
      name: "Noru SooneSu100 Plus 18L naebu-aqueous (KR)",
      unit: "18l",
      notes:
        "This market's own priced product (KRW 117530); Coupang web survey 2026-10-11 (KRW 117,530/18L).",
    },
    "exterior-paint": {
      slug: "kr-exterior-18l",
      name: "KCC Sup-euro balsu oebu-aqueous 18L (KR)",
      unit: "18l",
      notes:
        "This market's own priced product (KRW 123500); Paintmarket.co.kr web survey 2026-10-11 (KRW 123,500/18L).",
    },
    primer: {
      slug: "kr-primer-18l",
      name: "프라이머 18L (KR)",
      unit: "18l",
      notes:
        "This market's own priced product (KRW 30000); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (KRW 500); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "kr-putty-18kg",
      name: "퍼티 18kg (KR)",
      unit: "18kg",
      notes:
        "This market's own priced product (KRW 25000); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "kr-waterproof-18l",
      name: "방수제 18L (KR)",
      unit: "18l",
      notes:
        "This market's own priced product (KRW 60000); Indicative 2026 retail band; adjustable.",
    },
  },
  MX: {
    "concrete-mix": {
      slug: "mx-cemento-50kg",
      name: "CEMEX Cemento Extra Gris 25 kg (MX)",
      unit: "25 kg",
      notes:
        "This market's own priced product (MXN 142); Home Depot MX web survey 2026-10-11 ($142/25kg).",
    },
    "interior-paint": {
      slug: "mx-vinilica-19l",
      name: "Pintura vinílica interior 19L (MX)",
      unit: "19l",
      notes:
        "This market's own priced product (MXN 1199); Mercado Libre MX / Amazon MX web survey 2026-10-11 (Comex 19L MX$1,199; band $899-1,400).",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (MXN 10); Indicative 2026 retail band; adjustable.",
    },
  },
  MY: {
    "concrete-mix": {
      slug: "my-cement-50kg",
      name: "YTL Castle Portland cement 50 kg (MY)",
      unit: "50 kg",
      notes:
        "This market's own priced product (MYR 38.79); Lazada MY web survey 2026-10-11 (RM38.79/50kg).",
    },
    sand: {
      slug: "my-sand-50kg",
      name: "Sand 50 kg (MY)",
      unit: "50 kg",
      notes:
        "This market's own priced product (MYR 15); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "my-emulsion-5l",
      name: "Interior emulsion 5L (MY)",
      unit: "5l",
      notes:
        "This market's own priced product (MYR 80); Indicative 2026 retail band; adjustable.",
    },
    "exterior-paint": {
      slug: "my-exterior-5l",
      name: "Exterior paint 5L (MY)",
      unit: "5l",
      notes:
        "This market's own priced product (MYR 100); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "my-primer-5l",
      name: "Primer 5L (MY)",
      unit: "5l",
      notes:
        "This market's own priced product (MYR 50); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (MYR 2); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "my-putty-20kg",
      name: "Wall putty 20 kg (MY)",
      unit: "20 kg",
      notes:
        "This market's own priced product (MYR 30); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "my-waterproof-5l",
      name: "Waterproofing 5L (MY)",
      unit: "5l",
      notes:
        "This market's own priced product (MYR 60); Indicative 2026 retail band; adjustable.",
    },
  },
  NL: {
    "concrete-mix": {
      slug: "nl-cement-25kg",
      name: "CEM II 25 kg (NL)",
      unit: "25 kg",
      notes:
        "This market's own priced product (EUR 6); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "nl-grondverf-10l",
      name: "SPS Primer Unitex 10L (NL)",
      unit: "10l",
      notes:
        "This market's own priced product (EUR 66.72); Bouwmaat NL web survey 2026-10-11 (55.15 EUR excl BTW = 66.72 incl).",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (EUR 0.6); Indicative 2026 retail band; adjustable.",
    },
  },
  NO: {
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (NOK 13); Indicative 2026 retail band; adjustable.",
    },
  },
  NZ: {
    "concrete-mix": {
      slug: "nz-cement-40kg",
      name: "Golden Bay EcoSure GP cement 20kg (NZ)",
      unit: "20kg",
      notes:
        "This market's own priced product (NZD 12.5); Kawakawa Farm & Build web survey 2026-10-11 (NZD 12.50/20kg).",
    },
    sand: {
      slug: "nz-sand-25kg",
      name: "Sand 25 kg (NZ)",
      unit: "25 kg",
      notes:
        "This market's own priced product (NZD 10); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "nz-interior-10l",
      name: "Resene interior paint 10L white (NZ)",
      unit: "10l",
      notes:
        "This market's own priced product (NZD 245); Mitre 10 NZ web survey 2026-10-11 (NZD 245/10L white).",
    },
    "exterior-paint": {
      slug: "nz-exterior-10l",
      name: "Exterior paint 10L (NZ)",
      unit: "10l",
      notes:
        "This market's own priced product (NZD 110); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "nz-primer-10l",
      name: "Primer 10L (NZ)",
      unit: "10l",
      notes:
        "This market's own priced product (NZD 60); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (NZD 2); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "nz-filler-5kg",
      name: "Wall filler 5 kg (NZ)",
      unit: "5 kg",
      notes:
        "This market's own priced product (NZD 20); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "nz-waterproof-10l",
      name: "Waterproofing 10L (NZ)",
      unit: "10l",
      notes:
        "This market's own priced product (NZD 80); Indicative 2026 retail band; adjustable.",
    },
  },
  PH: {
    "concrete-mix": {
      slug: "ph-cement-40kg",
      name: "Cement 40 kg (PH)",
      unit: "40 kg",
      notes:
        "This market's own priced product (PHP 260); Indicative 2026 retail band; adjustable.",
    },
    sand: {
      slug: "ph-sand-40kg",
      name: "Sand 40 kg (PH)",
      unit: "40 kg",
      notes:
        "This market's own priced product (PHP 50); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "ph-interior-4l",
      name: "Boysen Permacoat Latex white 4L (PH)",
      unit: "4l",
      notes:
        "This market's own priced product (PHP 920); Lazada PH web survey 2026-10-11 (920 PHP/4L).",
    },
    "exterior-paint": {
      slug: "ph-exterior-4l",
      name: "Boysen Permacoat Semi-Gloss Acrylic Latex 4L (PH)",
      unit: "4l",
      notes:
        "This market's own priced product (PHP 920); Lazada PH web survey 2026-10-11 (920 PHP/4L concrete & stone).",
    },
    primer: {
      slug: "ph-primer-4l",
      name: "Primer 4L (PH)",
      unit: "4l",
      notes:
        "This market's own priced product (PHP 800); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (PHP 15); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "ph-putty-25kg",
      name: "Wall putty 25 kg (PH)",
      unit: "25 kg",
      notes:
        "This market's own priced product (PHP 500); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "ph-waterproof-1gal",
      name: "Waterproofing 1 gal (PH)",
      unit: "1 gal",
      notes:
        "This market's own priced product (PHP 800); Indicative 2026 retail band; adjustable.",
    },
  },
  PK: {
    "concrete-mix": {
      slug: "pk-cement-50kg",
      name: "Maple Leaf OPC 53 Grade 50 kg (PK)",
      unit: "50 kg",
      notes:
        "This market's own priced product (PKR 1600); Homepoint.pk web survey 2026-10-11 (PKR 1600/50kg).",
    },
    sand: {
      slug: "pk-sand-50kg",
      name: "Sand 50 kg (PK)",
      unit: "50 kg",
      notes:
        "This market's own priced product (PKR 300); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "pk-emulsion-4l",
      name: "Interior plastic emulsion 4L (PK)",
      unit: "4l",
      notes:
        "This market's own priced product (PKR 3400); icons.com.pk paint tracker 2026-10-09 (~PKR 850/L basic interior, 4L pack).",
    },
    "exterior-paint": {
      slug: "pk-exterior-4l",
      name: "Exterior paint 4L (PK)",
      unit: "4l",
      notes:
        "This market's own priced product (PKR 2800); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "pk-primer-4l",
      name: "Primer 4L (PK)",
      unit: "4l",
      notes:
        "This market's own priced product (PKR 1500); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (PKR 25); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "pk-putty-25kg",
      name: "Wall putty 25 kg (PK)",
      unit: "25 kg",
      notes:
        "This market's own priced product (PKR 900); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "pk-waterproof-20l",
      name: "Waterproofing 20L (PK)",
      unit: "20l",
      notes:
        "This market's own priced product (PKR 2500); Indicative 2026 retail band; adjustable.",
    },
  },
  PL: {
    "concrete-mix": {
      slug: "pl-cement-25kg",
      name: "Cement 25 kg (PL)",
      unit: "25 kg",
      notes:
        "This market's own priced product (PLN 8); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (PLN 2); Indicative 2026 retail band; adjustable.",
    },
  },
  PT: {
    "exterior-paint": {
      slug: "pt-fachada-15l",
      name: "Tinta exterior fachada mate 15L (PT)",
      unit: "15l",
      notes:
        "This market's own priced product (EUR 42.9); Leroy Merlin PT web survey 2026-10-11 (42.90 EUR/15L NOSSO PRECO).",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (EUR 0.5); Indicative 2026 retail band; adjustable.",
    },
  },
  SA: {
    "concrete-mix": {
      slug: "sa-cement-50kg",
      name: "Cement 50 kg (SA)",
      unit: "50 kg",
      notes:
        "This market's own priced product (SAR 15); Indicative 2026 retail band; adjustable.",
    },
    sand: {
      slug: "sa-sand-25kg",
      name: "Sand 25 kg (SA)",
      unit: "25 kg",
      notes:
        "This market's own priced product (SAR 10); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "sa-emulsion-4l",
      name: "Interior emulsion 4L (SA)",
      unit: "4l",
      notes:
        "This market's own priced product (SAR 90); Indicative 2026 retail band; adjustable.",
    },
    "exterior-paint": {
      slug: "sa-exterior-4l",
      name: "Exterior weather paint 4L (SA)",
      unit: "4l",
      notes:
        "This market's own priced product (SAR 110); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "sa-primer-4l",
      name: "National PVA primer white for masonry 3.6L (SA)",
      unit: "3.6l",
      notes:
        "This market's own priced product (SAR 40); Noon KSA web survey 2026-10-11 (SAR 40 incl VAT).",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (SAR 1); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "sa-putty-20kg",
      name: "Wall putty 20 kg (SA)",
      unit: "20 kg",
      notes:
        "This market's own priced product (SAR 35); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "sa-waterproof-20l",
      name: "Waterproofing 20L (SA)",
      unit: "20l",
      notes:
        "This market's own priced product (SAR 120); Indicative 2026 retail band; adjustable.",
    },
  },
  SE: {
    "concrete-mix": {
      slug: "se-cement-25kg",
      name: "Finja betong/cement 25 kg (SE)",
      unit: "25 kg",
      notes:
        "This market's own priced product (SEK 63); Pricerunner SE web survey 2026-10-11 (Finja 25kg 63 kr).",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (SEK 10); Indicative 2026 retail band; adjustable.",
    },
  },
  SG: {
    "concrete-mix": {
      slug: "sg-cement-50kg",
      name: "Cement 50 kg (SG)",
      unit: "50 kg",
      notes:
        "This market's own priced product (SGD 8); Indicative 2026 retail band; adjustable.",
    },
    sand: {
      slug: "sg-sand-25kg",
      name: "Sand 25 kg (SG)",
      unit: "25 kg",
      notes:
        "This market's own priced product (SGD 5); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "sg-emulsion-5l",
      name: "Nippon Odour-less Easy Wash Low Sheen 5L (SG)",
      unit: "5l",
      notes:
        "This market's own priced product (SGD 57.5); Singapore Painting Service price list 2026-10-11 (SGD 50-65 band, mid applied).",
    },
    "exterior-paint": {
      slug: "sg-exterior-5l",
      name: "Exterior paint 5L (SG)",
      unit: "5l",
      notes:
        "This market's own priced product (SGD 55); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "sg-primer-5l",
      name: "Primer 5L (SG)",
      unit: "5l",
      notes:
        "This market's own priced product (SGD 25); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (SGD 1); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "sg-putty-20kg",
      name: "Wall putty 20 kg (SG)",
      unit: "20 kg",
      notes:
        "This market's own priced product (SGD 20); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "sg-waterproof-5l",
      name: "Waterproofing 5L (SG)",
      unit: "5l",
      notes:
        "This market's own priced product (SGD 30); Indicative 2026 retail band; adjustable.",
    },
  },
  TH: {
    "concrete-mix": {
      slug: "th-cement-50kg",
      name: "Cement 50 kg (TH)",
      unit: "50 kg",
      notes:
        "This market's own priced product (THB 150); Indicative 2026 retail band; adjustable.",
    },
    sand: {
      slug: "th-sand-25kg",
      name: "Thraiyao coarse sand ONGROUND 25 kg (TH)",
      unit: "25 kg",
      notes:
        "This market's own priced product (THB 46.73); OneStockHome TH web survey 2026-10-11 (46.73 THB/25kg).",
    },
    "interior-paint": {
      slug: "th-emulsion-4l",
      name: "JBP Airclean Plus interior water-based paint 8L (TH)",
      unit: "8l",
      notes:
        "This market's own priced product (THB 2650); HomePro TH web survey 2026-10-11 (1859 THB promo, regular 2650 THB/8L).",
    },
    "exterior-paint": {
      slug: "th-exterior-4l",
      name: "Exterior paint 4L (TH)",
      unit: "4l",
      notes:
        "This market's own priced product (THB 650); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "th-primer-4l",
      name: "Primer 4L (TH)",
      unit: "4l",
      notes:
        "This market's own priced product (THB 350); Indicative 2026 retail band; adjustable.",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (THB 8); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "th-putty-20kg",
      name: "Wall putty 20 kg (TH)",
      unit: "20 kg",
      notes:
        "This market's own priced product (THB 250); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "th-waterproof-4l",
      name: "Waterproofing 4L (TH)",
      unit: "4l",
      notes:
        "This market's own priced product (THB 450); Indicative 2026 retail band; adjustable.",
    },
  },
  TR: {
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (TRY 10); Indicative 2026 retail band; adjustable.",
    },
  },
  US: {
    "fine-filler": {
      slug: "us-joint-compound-45gal",
      name: "USG Sheetrock All-Purpose Joint Compound",
      unit: "pack",
      notes: "This market's own priced product (USD 24.09); Home Depot.",
    },
  },
  ZA: {
    "concrete-mix": {
      slug: "za-cement-50kg",
      name: "PPC Surebuild 42.5N cement 50 kg (ZA)",
      unit: "50 kg",
      notes:
        "This market's own priced product (ZAR 147.85); Cashbuild web survey 2026-10-11 (PPC Surebuild 42.5N 50kg R147.85).",
    },
    sand: {
      slug: "za-sand-25kg",
      name: "Builders river sand 40 kg (ZA)",
      unit: "40 kg",
      notes:
        "This market's own priced product (ZAR 30); Builders Warehouse web survey 2026-10-11 (river sand 40kg R30).",
    },
    "exterior-paint": {
      slug: "za-dulux-weatherguard-20l",
      name: "Dulux Weatherguard 20L (ZA)",
      unit: "20l",
      notes:
        "This market's own priced product (ZAR 1299); Builders Warehouse web survey 2026-10-11 (Weatherguard Fine Textured 20L R1,299).",
    },
    primer: {
      slug: "za-plascon-primer-5l",
      name: "Plascon Gypsum & Plaster Primer 5L (ZA)",
      unit: "5l",
      notes:
        "This market's own priced product (ZAR 671); Plascon Paint Expert web survey 2026-10-11 (R671).",
    },
    sandpaper: {
      slug: "gen-sandpaper-sheet",
      name: "Sandpaper Sheets (Fine, pack)",
      unit: "pack",
      notes:
        "This market's own priced product (ZAR 8); Indicative 2026 retail band; adjustable.",
    },
    waterproofer: {
      slug: "za-dampproof-5l",
      name: "Plascon Dampseal Waterproof Sealer 5L (ZA)",
      unit: "5l",
      notes:
        "This market's own priced product (ZAR 959); Builders Warehouse web survey 2026-10-11 (R959).",
    },
  },
  ci: {
    "concrete-mix": {
      slug: "ci-cement-50kg",
      name: "Cement 50 kg (ci)",
      unit: "50 kg",
      notes:
        "This market's own priced product (XOF 5800); Indicative 2026 retail band; adjustable.",
    },
    sand: {
      slug: "ci-sand-50kg",
      name: "Sand 50 kg (ci)",
      unit: "50 kg",
      notes:
        "This market's own priced product (XOF 2500); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "ci-emulsion-20l",
      name: "Interior emulsion 20L (ci)",
      unit: "20l",
      notes:
        "This market's own priced product (XOF 28000); Indicative 2026 retail band; adjustable.",
    },
    "exterior-paint": {
      slug: "ci-exterior-20l",
      name: "Exterior paint 20L (ci)",
      unit: "20l",
      notes:
        "This market's own priced product (XOF 32000); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "ci-primer-20l",
      name: "Primer 20L (ci)",
      unit: "20l",
      notes:
        "This market's own priced product (XOF 19000); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "ci-putty-25kg",
      name: "Wall putty 25 kg (ci)",
      unit: "25 kg",
      notes:
        "This market's own priced product (XOF 9500); Indicative 2026 retail band; adjustable.",
    },
  },
  et: {
    "concrete-mix": {
      slug: "et-cement-50kg",
      name: "Cement 50 kg (et)",
      unit: "50 kg",
      notes:
        "This market's own priced product (ETB 1050); Indicative 2026 retail band; adjustable.",
    },
    sand: {
      slug: "et-sand-50kg",
      name: "Sand 50 kg (et)",
      unit: "50 kg",
      notes:
        "This market's own priced product (ETB 250); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "et-emulsion-20l",
      name: "Interior emulsion 20L (et)",
      unit: "20l",
      notes:
        "This market's own priced product (ETB 7500); Indicative 2026 retail band; adjustable.",
    },
    "exterior-paint": {
      slug: "et-exterior-20l",
      name: "Exterior paint 20L (et)",
      unit: "20l",
      notes:
        "This market's own priced product (ETB 8500); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "et-primer-20l",
      name: "Primer 20L (et)",
      unit: "20l",
      notes:
        "This market's own priced product (ETB 5500); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "et-putty-25kg",
      name: "Wall putty 25 kg (et)",
      unit: "25 kg",
      notes:
        "This market's own priced product (ETB 2800); Indicative 2026 retail band; adjustable.",
    },
  },
  tz: {
    "concrete-mix": {
      slug: "tz-cement-50kg",
      name: "Cement 50 kg (tz)",
      unit: "50 kg",
      notes:
        "This market's own priced product (TZS 25000); Indicative 2026 retail band; adjustable.",
    },
    sand: {
      slug: "tz-sand-50kg",
      name: "Sand 50 kg (tz)",
      unit: "50 kg",
      notes:
        "This market's own priced product (TZS 6000); Indicative 2026 retail band; adjustable.",
    },
    "interior-paint": {
      slug: "tz-emulsion-20l",
      name: "Interior emulsion 20L (tz)",
      unit: "20l",
      notes:
        "This market's own priced product (TZS 95000); Indicative 2026 retail band; adjustable.",
    },
    "exterior-paint": {
      slug: "tz-exterior-20l",
      name: "Exterior paint 20L (tz)",
      unit: "20l",
      notes:
        "This market's own priced product (TZS 105000); Indicative 2026 retail band; adjustable.",
    },
    primer: {
      slug: "tz-primer-20l",
      name: "Primer 20L (tz)",
      unit: "20l",
      notes:
        "This market's own priced product (TZS 65000); Indicative 2026 retail band; adjustable.",
    },
    "fine-filler": {
      slug: "tz-putty-25kg",
      name: "Wall putty 25 kg (tz)",
      unit: "25 kg",
      notes:
        "This market's own priced product (TZS 38000); Indicative 2026 retail band; adjustable.",
    },
  },
};
