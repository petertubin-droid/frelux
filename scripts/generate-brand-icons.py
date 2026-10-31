"""
Derives the site icon set from the approved brand mark.

The artwork is scripts/assets/brand-icon-art.png: the FRELUXTOOLS mark (house,
hammer, calculator and swoosh) on transparency. Icons are composed from it on
white, which is the tile the previous icon used, so a tab or a home screen shows
the same thing it did before the wordmark changed. The in-app mark stays
transparent, so the header does not gain a white tile in dark mode.

scripts/assets/brand-icon-master.png records the approved 512 composition. Every
icon is generated, so the tab, the home screen and the manifest cannot drift
apart.

    python3 scripts/generate-brand-icons.py

Outputs, all in public/:
  icon-512.png, icon-192.png            web app manifest
  icon-maskable-512.png                 Android adaptive icon, wider safe zone
  apple-touch-icon.png                  180, iOS home screen
  favicon-32.png, favicon-16.png        browser tab
  favicon.ico                           16/32/48, for clients that ask for it
  logo-mark.png                         in-app header and document marks
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "scripts" / "assets" / "brand-icon-master.png"
PUBLIC = ROOT / "public"

ART = ROOT / "scripts" / "assets" / "brand-icon-art.png"
WHITE = (255, 255, 255, 255)

art = Image.open(ART).convert("RGBA")


def at(px: int, pad: float = 0.16, background=WHITE) -> Image.Image:
    """Fit the mark into a square tile on the icon background."""
    canvas = Image.new("RGBA", (px, px), background)
    inner = round(px * (1 - 2 * pad))
    ratio = min(inner / art.width, inner / art.height)
    scaled = art.resize(
        (max(1, round(art.width * ratio)), max(1, round(art.height * ratio))),
        Image.LANCZOS,
    )
    canvas.paste(
        scaled, ((px - scaled.width) // 2, (px - scaled.height) // 2), scaled
    )
    return canvas


def maskable(px: int) -> Image.Image:
    """Wider safe zone, so an adaptive mask cannot clip the swoosh."""
    return at(px, pad=0.24)


at(512).save(PUBLIC / "icon-512.png", "PNG", optimize=True)
at(192).save(PUBLIC / "icon-192.png", "PNG", optimize=True)
maskable(512).save(PUBLIC / "icon-maskable-512.png", "PNG", optimize=True)
at(180).save(PUBLIC / "apple-touch-icon.png", "PNG", optimize=True)
at(32).save(PUBLIC / "favicon-32.png", "PNG", optimize=True)
at(16).save(PUBLIC / "favicon-16.png", "PNG", optimize=True)
at(256, pad=0.06, background=(0, 0, 0, 0)).save(
    PUBLIC / "logo-mark.png", "PNG", optimize=True
)

at(512).save(
    PUBLIC / "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)

print(f"brand icons written from {ART.name} on white")
