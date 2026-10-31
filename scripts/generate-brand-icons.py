"""
Derives the site icon set from the approved brand mark.

The master is scripts/assets/brand-icon-master.png: the FRELUXTOOLS mark (house,
hammer, calculator and swoosh) on deep indigo, the version signed off as matching
the previous logo. Every icon the site serves comes from this one file, so the
tab, the home screen, the manifest and the PDF footer cannot drift apart.

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

master = Image.open(MASTER).convert("RGBA")
size = master.size[0]
if master.size[0] != master.size[1]:
    raise SystemExit(f"master must be square, got {master.size}")


def at(px: int) -> Image.Image:
    return master.resize((px, px), Image.LANCZOS)


def maskable(px: int, pad: float = 0.12) -> Image.Image:
    """Re-pad the art inside a larger canvas so a circular mask cannot clip it."""
    inner = round(px * (1 - 2 * pad))
    canvas = Image.new("RGBA", (px, px), master.getpixel((1, 1)))
    art = master.resize((inner, inner), Image.LANCZOS)
    canvas.paste(art, ((px - inner) // 2, (px - inner) // 2), art)
    return canvas


PUBLIC.joinpath("icon-512.png").write_bytes(b"")  # ensure writable
at(512).save(PUBLIC / "icon-512.png", "PNG", optimize=True)
at(192).save(PUBLIC / "icon-192.png", "PNG", optimize=True)
maskable(512).save(PUBLIC / "icon-maskable-512.png", "PNG", optimize=True)
at(180).save(PUBLIC / "apple-touch-icon.png", "PNG", optimize=True)
at(32).save(PUBLIC / "favicon-32.png", "PNG", optimize=True)
at(16).save(PUBLIC / "favicon-16.png", "PNG", optimize=True)
at(256).save(PUBLIC / "logo-mark.png", "PNG", optimize=True)

at(512).save(
    PUBLIC / "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)

print(f"brand icons written from {MASTER.name} ({size}px master)")
