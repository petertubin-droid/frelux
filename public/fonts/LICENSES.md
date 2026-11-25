# Font licences

Every self-hosted font in this directory, its upstream source and the licence it
ships under. The licence text for each family must stay beside the files: both
the SIL OFL and the ITF licence require the notice to travel with the font,
including when the font is served from our own origin.

| Family | Files | Licence | Notice |
| --- | --- | --- | --- |
| Inter | `inter-400/500/600/700.woff2` | SIL Open Font License 1.1 | `Inter-OFL.txt` |
| Plus Jakarta Sans | `plus-jakarta-600/700/800.woff2` | SIL Open Font License 1.1 | `PlusJakartaSans-OFL.txt` |
| Clash Display | `clash-display-600/700.woff2` | ITF Free Font License (Fontshare) | `ClashDisplay-NOTICE.txt` |
| Noto Sans (PDF) | `pdf/NotoSans-Regular/Bold.ttf` | SIL Open Font License 1.1 | `pdf/OFL.txt` |

## Sources

- Inter: https://github.com/rsms/inter, via google/fonts `ofl/inter`.
- Plus Jakarta Sans: https://github.com/tokotype/PlusJakartaSans, via
  google/fonts `ofl/plusjakartasans`.
- Clash Display: Indian Type Foundry, distributed by Fontshare
  (https://www.fontshare.com/fonts/clash-display). The ITF licence permits
  commercial use and self-hosting but does not allow redistributing the font
  files as font software, so they are served only as part of this site and are
  not offered for download as a font package.
- Noto Sans: https://github.com/notofonts, via google/fonts `ofl/notosans`.

## Why the woff2 files are committed

The fonts are self-hosted to avoid a render-blocking third-party request. That
makes us the distributor, so the notices above are an obligation, not a
courtesy. `src/lib/font-licences.test.ts` fails if a family in `fonts.css` has no
notice in this file or no licence text beside it.
