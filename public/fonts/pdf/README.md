# Embedded PDF fonts

`NotoSans-Regular.ttf` and `NotoSans-Bold.ttf` are Noto Sans (Latin, Greek,
Cyrillic), used by `src/lib/boq/fonts.ts` to give BOQ PDF exports glyphs that
jsPDF's WinAnsi core fonts do not have.

- Source: Noto Project Authors, via google/fonts `ofl/notosans`.
- Licence: SIL Open Font License 1.1. The full text is in `OFL.txt` next to the
  fonts, and must stay in this directory: the OFL requires the notice to travel
  with the font, including when the font is redistributed inside a build.

Only Latin/Greek/Cyrillic are shipped. Arabic, Hebrew, Indic and CJK are not
included on purpose: they need contextual shaping or a multi-megabyte font, so
those documents are rendered through the browser print view instead (see
`boqSummaryPrintHtml` / `openBoqPrint` in `src/lib/boq/print.ts`).
