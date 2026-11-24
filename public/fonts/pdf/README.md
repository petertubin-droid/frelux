# Embedded PDF fonts

This directory contains fonts used by FRELUX BOQ PDF exports:

- `NotoSans-Regular.ttf` and `NotoSans-Bold.ttf`: Noto Sans (Latin, Greek, Cyrillic),
  used by `src/lib/boq/fonts.ts` to give BOQ PDF exports glyphs that jsPDF's WinAnsi
  core fonts do not have.
- `NotoNaskhArabic-Regular.ttf`: Noto Naskh Arabic (Arabic script), used by
  `src/lib/boq/pdf-arabic.ts` / `src/lib/boq/pdf-outline.ts` for outline rendering.
- `NotoSansDevanagari-Regular.ttf`: Noto Sans Devanagari (Hindi, Marathi, Nepali,
  Sanskrit, and Indic scripts), used for outline rendering of Indic documents.
- `NotoSansCJK-Regular.otf`: Noto Sans CJK SC (Simplified Chinese, Traditional
  Chinese, Japanese Kana/Kanji, Korean Hangul), used for outline rendering of CJK documents.

## Licences

- Source: Noto Project Authors, via google/fonts and Noto CJK open repositories.
- Licence: SIL Open Font License 1.1. The full text is in `OFL.txt` next to the
  fonts, and must stay in this directory: the OFL requires the notice to travel
  with the font, including when the font is redistributed inside a build.
