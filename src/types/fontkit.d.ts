/**
 * fontkit ships no types on its browser entry, so the surface this project
 * uses is declared here rather than pulled in as `any`.
 */
declare module "fontkit" {
  export interface FontkitPath {
    toSVG: () => string;
  }
  export interface FontkitGlyph {
    id: number;
    path: FontkitPath;
  }
  export interface FontkitLayoutRun {
    glyphs: FontkitGlyph[];
    positions: { xAdvance: number; xOffset: number; yOffset: number }[];
  }
  export interface FontkitFont {
    unitsPerEm: number;
    layout: (text: string) => FontkitLayoutRun;
    getGlyph: (id: number) => FontkitGlyph;
  }
  export function create(buffer: Uint8Array): FontkitFont;
  export function openSync(path: string): FontkitFont;
}
