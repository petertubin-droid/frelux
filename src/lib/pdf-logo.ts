/**
 * The FRELUX mark on PDF documents.
 *
 * Two jobs, both optional-safe: a printed stamp in the header band, and a very
 * faint background mark drawn before any text so it can never sit on top of a
 * figure. Drawing failures are swallowed, because a logo is never worth losing
 * a quotation over.
 */

import { FRELUX_LOGO_ASPECT, FRELUX_LOGO_DATA_URL } from "./pdf-logo-data";

export const FRELUX_PDF_MARK = {
  dataUrl: FRELUX_LOGO_DATA_URL,
  aspect: FRELUX_LOGO_ASPECT,
} as const;

export interface FreluxMarkOptions {
  pageWidth: number;
  /** Space kept clear on each side, in mm. */
  margin?: number;
  /** Printed height of the mark, in mm. Width follows the art's aspect. */
  heightMm?: number;
  /** Distance from the top edge. */
  top?: number;
  align?: "left" | "right" | "center";
  /** Fill a white plate behind the mark, for a dark header band. */
  plate?: boolean;
}

/**
 * Draws the mark in the header band and returns the x position where text may
 * resume, or null when the image could not be drawn.
 */
export function drawFreluxMark(
  doc: import("jspdf").jsPDF,
  options: FreluxMarkOptions,
): { x: number; y: number; width: number; height: number } | null {
  const { pageWidth, margin = 15, heightMm = 10, top = 12 } = options;
  const align = options.align ?? "right";
  const width = heightMm * FRELUX_LOGO_ASPECT;
  let x = pageWidth - margin - width;
  if (align === "left") x = margin;
  if (align === "center") x = (pageWidth - width) / 2;

  try {
    if (options.plate) {
      doc.setFillColor(255, 255, 255);
      doc.rect(x - 0.9, top - 0.9, width + 1.8, heightMm + 1.8, "F");
    }
    doc.addImage(
      FRELUX_LOGO_DATA_URL,
      "PNG",
      x,
      top,
      width,
      heightMm,
      "frelux-mark",
      "FAST",
    );
    return { x, y: top, width, height: heightMm };
  } catch {
    return null;
  }
}

export interface FreluxWatermarkOptions {
  pageWidth: number;
  pageHeight: number;
  /** Kept below 0.1 so printed figures stay legible on top of it. */
  opacity?: number;
  /** Mark width as a share of the page width. */
  widthRatio?: number;
}

/**
 * Draws the mark as a faint centred background. Call it before any text: PDF
 * content is painted in drawing order, so later text always sits above it.
 */
export function drawFreluxWatermark(
  doc: import("jspdf").jsPDF,
  options: FreluxWatermarkOptions,
): boolean {
  const { pageWidth, pageHeight } = options;
  const scene = doc as unknown as {
    saveGraphicsState?: () => void;
    restoreGraphicsState?: () => void;
    setGState?: (state: unknown) => void;
    GState?: new (parameters: { opacity: number }) => unknown;
  };
  const opacity = Math.min(0.1, Math.max(0.02, options.opacity ?? 0.06));
  const watermarkWidth = pageWidth * (options.widthRatio ?? 0.62);
  const watermarkHeight = watermarkWidth / FRELUX_LOGO_ASPECT;
  const x = (pageWidth - watermarkWidth) / 2;
  const y = (pageHeight - watermarkHeight) / 2;

  try {
    if (scene.GState && scene.setGState) {
      doc.saveGraphicsState();
      scene.setGState(new scene.GState({ opacity }));
    }
    doc.addImage(
      FRELUX_LOGO_DATA_URL,
      "PNG",
      x,
      y,
      watermarkWidth,
      watermarkHeight,
      "frelux-watermark",
      "FAST",
    );
    if (scene.GState && scene.setGState) doc.restoreGraphicsState();
    return true;
  } catch {
    try {
      doc.restoreGraphicsState();
    } catch {
      /* nothing left to restore */
    }
    return false;
  }
}
