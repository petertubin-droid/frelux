#!/usr/bin/env python3
"""Regenerate the FRELUX mark that PDF exports stamp and watermark with.

Source of truth is the approved artwork in scripts/assets/brand-icon-art.png.
The mark is trimmed, reduced to 420 px wide and quantised, then embedded as a
base64 data URL in src/lib/pdf-logo-data.ts so a PDF never needs a network
request to draw it. Run from the repo root: python3 scripts/generate-pdf-logo.py
"""
import base64
import io
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "scripts/assets/brand-icon-art.png"
OUT_PNG = ROOT / "scripts/assets/pdf-logo.png"
OUT_TS = ROOT / "src/lib/pdf-logo-data.ts"
WIDTH = 420

art = Image.open(SOURCE).convert("RGBA")
art = art.crop(art.split()[3].getbbox())
height = round(art.height * WIDTH / art.width)
art = art.resize((WIDTH, height), Image.LANCZOS)
art = art.quantize(colors=64, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)

buffer = io.BytesIO()
art.save(buffer, format="PNG", optimize=True)
OUT_PNG.write_bytes(buffer.getvalue())
encoded = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()

OUT_TS.write_text(
    '''/**
 * The FRELUX mark for PDF documents, embedded so every export can stamp it
 * without a network request.
 *
 * Generated from scripts/assets/pdf-logo.png, which itself comes from the
 * approved artwork in scripts/assets/brand-icon-art.png, trimmed and reduced
 * to 420 px wide with a 64-colour palette. Regenerate with
 * scripts/generate-pdf-logo.py rather than editing the string.
 */
export const FRELUX_LOGO_DATA_URL =
  "%s";

/** Width divided by height, so a stamp keeps the art's proportions. */
export const FRELUX_LOGO_ASPECT = %s;
'''
    % (encoded, round(WIDTH / height, 4))
)
print(f"wrote {OUT_PNG.relative_to(ROOT)} ({len(buffer.getvalue())} bytes) and {OUT_TS.relative_to(ROOT)}")
